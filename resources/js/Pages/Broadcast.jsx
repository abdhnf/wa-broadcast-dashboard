import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  Users,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Zap,
  ArrowRight,
  Eye,
  Plus,
  Trash2,
  ListOrdered,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Smartphone,
  Square,
  Info,
  AlertCircle,
  X,
  Edit2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/Dialog';
import {
  clearQueue,
  clearBatch,
  pauseBatch,
  resumeBatch,
  fetchBatchStatus,
  fetchMessages,
  fetchQueueStatus,
  pauseQueue,
  resumeQueue,
  retryMessage,
  sendLocation,
  sendMedia,
  sendText,
} from '../lib/api';
import { renderMessage } from '../lib/utils';
import { PHONE_ERROR_MESSAGE, isValidPhone, normalizePhone, toPhoneInput } from '../lib/phone';
import { ContactSearchInput } from '../components/ContactSearchInput';

// Status antrean disamakan dengan `MessageStatus` wa-api (types.ts).
// Status yang sah dari wa-api gateway dan status draft lokal
const QUEUE_RUNNING_STATUSES = ['pending', 'pacing', 'sending'];
const QUEUE_SUCCESS_STATUSES = ['sent', 'delivered', 'read'];
const QUEUE_FAILURE_STATUSES = ['failed', 'invalid_number', 'not_registered'];
const QUEUE_PAGE_SIZE = 50;

const QUEUE_STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'draft', label: 'Siap Dikirim' },
  { value: 'pending', label: 'Antrean Gateway' },
  { value: 'pacing', label: 'Jeda anti-ban' },
  { value: 'sending', label: 'Sedang dikirim' },
  { value: 'sent', label: 'Terkirim' },
  { value: 'delivered', label: 'Sampai' },
  { value: 'read', label: 'Dibaca' },
  { value: 'failed', label: 'Gagal' },
  { value: 'invalid_number', label: 'Nomor tidak valid' },
  { value: 'not_registered', label: 'Tidak terdaftar' },
];

const QUEUE_STATUS_LABEL = Object.fromEntries(QUEUE_STATUS_OPTIONS.map((s) => [s.value, s.label]));

/**
 * Hitung metrik dan status turunan kampanye secara reaktif mengikuti isi antreannya.
 */
function getCampaignStats(camp) {
  const queue = Array.isArray(camp?.queue)
    ? camp.queue
    : (typeof camp?.queue === 'string'
        ? (() => { try { return JSON.parse(camp.queue) || []; } catch { return []; } })()
        : []);

  let total = Number(camp?.totalRecipients) || queue.length;
  if (total === 0 && queue.length > 0) total = queue.length;

  let successCount = Number(camp?.sentCount) || 0;
  let failedCount = Number(camp?.failedCount) || 0;
  let inFlightCount = 0;
  let draftCount = 0;

  const isCampActive = camp?.status === 'in_progress' || camp?.status === 'paused';

  if (queue.length > 0) {
    let qSuccess = 0;
    let qFailed = 0;
    let qInFlight = 0;
    let qDraft = 0;

    queue.forEach((item) => {
      const st = item?.status;
      if (['sent', 'delivered', 'read'].includes(st)) {
        qSuccess += 1;
      } else if (['failed', 'invalid_number', 'not_registered'].includes(st)) {
        qFailed += 1;
      } else if (['pacing', 'sending'].includes(st) || (st === 'pending' && isCampActive)) {
        qInFlight += 1;
      } else {
        qDraft += 1;
      }
    });

    if (qSuccess > 0 || qFailed > 0 || qInFlight > 0) {
      successCount = qSuccess;
      failedCount = qFailed;
      inFlightCount = qInFlight;
      draftCount = qDraft;
      total = queue.length;
    } else {
      draftCount = Math.max(0, total - (successCount + failedCount));
    }
  }

  // Tentukan status turunan yang sinkron dengan antrean
  let derivedStatus = camp?.status || 'idle';

  if (derivedStatus === 'in_progress') {
    if (inFlightCount === 0 && draftCount === 0 && total > 0) {
      derivedStatus = 'completed';
    }
  } else if (derivedStatus === 'idle') {
    if (total > 0 && draftCount === 0 && inFlightCount === 0) {
      derivedStatus = 'completed';
    }
  }

  const successPct = total > 0 ? (successCount / total) * 100 : 0;
  const failedPct = total > 0 ? (failedCount / total) * 100 : 0;
  const inFlightPct = total > 0 ? (inFlightCount / total) * 100 : 0;
  const draftPct = total > 0 ? (draftCount / total) * 100 : 0;

  return {
    total,
    successCount,
    failedCount,
    inFlightCount,
    draftCount,
    successPct,
    failedPct,
    inFlightPct,
    draftPct,
    derivedStatus,
  };
}

export function BroadcastPage({ groups, templates, sessions, contacts = [], onSessionsRefresh, campaigns: initialCampaigns, onCampaignCreate, onCampaignUpdate, onCampaignDelete }) {
  // Daftar kampanye berasal dari tabel `wa_campaigns` (MySQL, lewat app.jsx),
  // bukan lagi array di dalam memori komponen. Jadi kampanye yang dibuat di sini
  // tetap ada setelah halaman di-refresh atau dibuka dari perangkat lain.
  const campaigns = initialCampaigns || [];
  const [subView, setSubView] = useState('campaigns'); // 'campaigns' | 'queue'
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Kampanye di wa-api hanya terlihat sebagai kumpulan pesan ber-batch_id.
  // User harus memilih batch (mis. dari Dashboard) untuk dipantau di sini.
  const [batchId, setBatchId] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState('all');
  const [queueSearch, setQueueSearch] = useState('');
  const [queuePage, setQueuePage] = useState(1);

  const [queueMessages, setQueueMessages] = useState([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queuePaused, setQueuePaused] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [sending, setSending] = useState(false);
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);

  // Form State Setup Campaign
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null); // Kampanye yang sedang diedit
  const [campaignName, setCampaignName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('auto_rotate'); // Default: Auto Rotate
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  // Sumber antrean kampanye dibaca dari tabel `wa_campaigns.queue` (kolom JSON)
  // lewat app.jsx. wa-api tidak punya konsep "kampanye", jadi daftar nomor harus
  // disimpan di sisi dashboard -- kalau hanya di memori, nomor hilang begitu
  // halaman di-refresh dan blast berikutnya mengirim ke antrean kosong.
  const [recipientQueue, setRecipientQueue] = useState([]);

  // Antrean Filter & Modal State
  const [isAddRecipientModalOpen, setIsAddRecipientModalOpen] = useState(false);
  const [targetCampaignId, setTargetCampaignId] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientCustom, setNewRecipientCustom] = useState({});

  const activeSessionId = selectedSessionId === 'auto_rotate' ? 'auto' : selectedSessionId;
  const isRunning = Boolean(sending || selectedCampaign?.status === 'in_progress');

  // Resolusi nama sesi WhatsApp agar selalu ramah manusia (bukan ID teknis sess-xxx)
  const resolveSessionName = useCallback(
    (raw) => {
      if (!raw || raw === 'auto_rotate' || raw === 'all' || raw === 'auto' || raw === 'Auto-Rotate Pool') {
        return 'Auto-Rotate';
      }
      const s = sessions?.find((sess) => sess.id === raw || sess.name === raw);
      return s?.name || raw;
    },
    [sessions],
  );

  const groupMembers = useCallback(
    (groupName) => (contacts || []).filter((c) => c.group === groupName || c.group_name === groupName),
    [contacts],
  );

  useEffect(() => {
    if (selectedCampaign) {
      const liveCamp = campaigns.find((c) => c.id === selectedCampaign.id);
      if (liveCamp) {
        setSelectedCampaign(liveCamp);
        setRecipientQueue(liveCamp.queue || []);
        return;
      }
    }
    setRecipientQueue(selectedCampaign?.queue || []);
  }, [campaigns, selectedCampaign?.id]);

  /**
   * Simpan antrean kampanye ke MySQL.
   *
   * wa-api tidak mengenal konsep "kampanye", jadi daftar nomor harus hidup di
   * dashboard. State lokal diperbarui dulu supaya UI tetap responsif, lalu
   * perubahannya diteruskan ke app.jsx yang menyimpannya ke tabel `wa_campaigns`.
   */
  const persistQueue = (nextQueue) => {
    setRecipientQueue(nextQueue);
    if (selectedCampaign) {
      const updated = {
        ...selectedCampaign,
        queue: nextQueue,
        totalRecipients: nextQueue.length,
      };
      setSelectedCampaign(updated);
      void onCampaignUpdate?.(selectedCampaign.id, { queue: nextQueue, totalRecipients: nextQueue.length });
    }
  };

  // Handler Buka Antrean Kampanye Tertentu
  const handleOpenQueueView = (camp) => {
    setSelectedCampaign(camp);
    setRecipientQueue(camp?.queue || []);
    setSubView('queue');
  };

  const handleOpenAddRecipientModal = () => {
    setTargetCampaignId(selectedCampaign?.id || (campaigns.length > 0 ? campaigns[0].id : ''));
    setNewRecipientPhone('');
    setNewRecipientName('');
    setNewRecipientCustom({});
    setFormError('');
    setIsAddRecipientModalOpen(true);
  };

  /**
   * Handler Buat Kampanye Baru.
   *
   * Kampanye ditulis ke tabel `wa_campaigns` lewat app.jsx, dan antrean awalnya
   * diisi dari daftar kontak segmen yang dipilih (kalau ada). Kalau segmen masih
   * kosong, kampanye tetap dibuat dan pengguna menambah nomor secara manual.
   */
  // Handler Buka Modal Edit Kampanye (Hanya untuk kampanye yang belum 'completed')
  const handleOpenEditCampaign = (camp, e) => {
    e?.stopPropagation();
    if (camp.status === 'completed') return;
    setEditingCampaign(camp);
    setCampaignName(camp.name || '');
    setSelectedGroup(camp.groupName || '');
    setSelectedTemplate(camp.templateId || '');
    setSelectedSessionId(
      camp.sessionUsed === 'Auto-Rotate Pool' || !camp.sessionUsed ? 'auto_rotate' : (
        sessions?.find((s) => s.name === camp.sessionUsed || s.id === camp.sessionUsed)?.id || camp.sessionUsed
      )
    );
    setFormError('');
    setIsWizardOpen(true);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!campaignName.trim()) {
      setFormError('Nama kampanye wajib diisi.');
      return;
    }
    if (!selectedTemplate) {
      setFormError('Pilih template pesan terlebih dahulu.');
      return;
    }
    if (!selectedGroup) {
      setFormError('Pilih target segmen audiens terlebih dahulu.');
      return;
    }

    const tpl = templates?.find((t) => t.id === selectedTemplate);
    if (!tpl) {
      setFormError('Template yang dipilih tidak ditemukan. Muat ulang halaman lalu coba lagi.');
      return;
    }

    const chosenSession = sessions?.find((s) => s.id === selectedSessionId);
    const sessionLabel = selectedSessionId === 'auto_rotate' ? 'Auto-Rotate Pool' : chosenSession?.name || selectedSessionId;

    setCreating(true);
    try {
      if (editingCampaign) {
        // Mode Update Kampanye
        const updatedFields = {
          name: campaignName.trim(),
          groupName: selectedGroup,
          templateId: tpl.id,
          templateTitle: tpl.title,
          sessionUsed: sessionLabel,
        };
        await onCampaignUpdate?.(editingCampaign.id, updatedFields);
        if (selectedCampaign?.id === editingCampaign.id) {
          setSelectedCampaign((prev) => (prev ? { ...prev, ...updatedFields } : prev));
        }
        setEditingCampaign(null);
        setCampaignName('');
        setSelectedTemplate('');
        setSelectedGroup('');
        setIsWizardOpen(false);
      } else {
        // Mode Buat Kampanye Baru - gunakan batchId unik agar terisolasi dari kampanye lain
        const newBatchId = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const seed = groupMembers(selectedGroup).map((c, i) => ({
          id: `q_${Date.now()}_${i}`,
          campaignId: newBatchId,
          phone: normalizePhone(c.phone),
          name: c.name,
          custom: c.custom || {},
          status: 'draft',
          sentAt: '-',
          session: sessionLabel,
        }));

        const created = await onCampaignCreate?.({
          name: campaignName.trim(),
          batchId: newBatchId,
          groupName: selectedGroup,
          templateId: tpl.id,
          templateTitle: tpl.title,
          sessionUsed: sessionLabel,
          totalRecipients: seed.length,
          status: 'idle',
          campaignId: newBatchId,
          queue: seed,
        });

        if (!created) {
          setFormError('Kampanye gagal disimpan. Coba lagi.');
          return;
        }

        setCampaignName('');
        setSelectedTemplate('');
        setSelectedGroup('');
        setIsWizardOpen(false);
        setSelectedCampaign(created);
        setRecipientQueue(created.queue || []);
        setSubView('queue');
      }
    } catch (err) {
      setFormError(err?.message || 'Kampanye gagal disimpan.');
    } finally {
      setCreating(false);
    }
  };

  const [deletingRecipient, setDeletingRecipient] = useState(null); // { id, phone, name } untuk konfirmasi dialog
  const [retryingPhones, setRetryingPhones] = useState(new Set());
  const [isRetryingAllFailed, setIsRetryingAllFailed] = useState(false);

  // Handler Retry Pengiriman Pesan Gagal
  const handleRetryRecipient = async (item) => {
    if (!item?.phone) return;
    setRetryingPhones((prev) => new Set(prev).add(item.phone));

    try {
      if (item.messageId) {
        await retryMessage(item.messageId);
      } else {
        // Fallback kirim ulang langsung jika messageId belum ada
        const tpl = templates.find((t) => t.id === selectedCampaign?.templateId) || {
          messageType: 'text',
          content: selectedCampaign?.content || 'Pemberitahuan',
        };
        const rendered = renderMessage(tpl.content, {
          nama: item.name || 'Pelanggan',
          ...item.custom,
        });

        if (tpl.messageType === 'media') {
          await sendMedia({
            sessionId: activeSessionId,
            to: item.phone,
            mediaType: tpl.mediaType || 'image',
            mediaUrl: tpl.mediaUrl,
            caption: rendered,
            priority: 'normal',
            batchId: selectedCampaign?.batchId || undefined,
          });
        } else {
          await sendText({
            sessionId: activeSessionId,
            to: item.phone,
            text: rendered,
            priority: 'normal',
            batchId: selectedCampaign?.batchId || undefined,
          });
        }
      }

      // Perbarui status kontak di antrean lokal menjadi pending
      const nextQueue = recipientQueue.map((q) => {
        if (q.phone === item.phone) {
          return { ...q, status: 'pending', error: null };
        }
        return q;
      });
      persistQueue(nextQueue);
    } catch (err) {
      alert(`Gagal retry pengiriman: ${err.message}`);
    } finally {
      setRetryingPhones((prev) => {
        const next = new Set(prev);
        next.delete(item.phone);
        return next;
      });
    }
  };

  // Handler Hapus Nomor dari Antrean dengan fallback pencocokan id / phone
  const handleRemoveRecipient = (target) => {
    const targetId = typeof target === 'object' ? target.id : target;
    const targetPhone = typeof target === 'object' ? target.phone : null;

    const nextQueue = recipientQueue.filter((item) => {
      if (item.id && targetId && item.id === targetId) return false;
      if (targetPhone && item.phone === targetPhone) return false;
      return true;
    });

    persistQueue(nextQueue);
    setDeletingRecipient(null);
  };

  /**
   * Handler Tambah Nomor ke Antrean.
   *
   * Nomor dirapikan ke format 62xxx dan ditolak lebih awal bila bentuknya tidak
   * sah atau sudah ada di antrean - mencegah blast terkirim dua kali ke nomor
   * yang sama.
   */
  const handleAddRecipient = (e) => {
    e.preventDefault();
    const targetCampaign = campaigns.find((c) => String(c.id) === String(targetCampaignId))
      || selectedCampaign
      || (campaigns.length > 0 ? campaigns[0] : null);

    if (!targetCampaign) {
      setFormError('Pilih atau buat kampanye terlebih dahulu sebelum menambah nomor antrean.');
      return;
    }

    const phone = normalizePhone(newRecipientPhone);
    if (!phone) {
      setFormError('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!isValidPhone(phone)) {
      setFormError(PHONE_ERROR_MESSAGE);
      return;
    }

    const currentCampQueue = (targetCampaign.id === selectedCampaign?.id)
      ? recipientQueue
      : (targetCampaign.queue || []);

    if (currentCampQueue.some((item) => item.phone === phone)) {
      setFormError(`Nomor itu sudah ada di antrean kampanye "${targetCampaign.name}".`);
      return;
    }

    const newItem = {
      id: `q_${Date.now()}`,
      campaignId: targetCampaign.id,
      phone,
      name: newRecipientName.trim() || phone,
      custom: newRecipientCustom || {},
      status: 'draft',
      sentAt: '-',
      session: targetCampaign.sessionUsed || 'Auto-Rotate Pool',
    };

    const nextQueue = [newItem, ...currentCampQueue];
    const nextStatus = (targetCampaign.status === 'completed' || targetCampaign.status === 'failed')
      ? 'idle'
      : targetCampaign.status;

    // Jika kampanye yang dipilih sama dengan kampanye aktif di subview antrean
    if (!selectedCampaign || selectedCampaign.id === targetCampaign.id) {
      setRecipientQueue(nextQueue);
      setSelectedCampaign({
        ...targetCampaign,
        status: nextStatus,
        queue: nextQueue,
        totalRecipients: nextQueue.length,
      });
    }

    void onCampaignUpdate?.(targetCampaign.id, {
      status: nextStatus,
      queue: nextQueue,
      totalRecipients: nextQueue.length,
    });

    setNewRecipientPhone('');
    setNewRecipientName('');
    setNewRecipientCustom({});
    setFormError('');
    setIsAddRecipientModalOpen(false);
  };

  /**
   * Muat seluruh kontak segmen kampanye ke antrean sekaligus.
   * Nomor duplikat dilewati supaya tidak dobel kirim.
   */
  const handleLoadSegmentContacts = () => {
    if (!selectedCampaign) return;
    const { groupName } = selectedCampaign;
    const members = groupMembers(groupName);

    if (members.length === 0) {
      setQueueError(`Segmen "${groupName || '-'}" belum punya kontak. Tambahkan kontak lewat halaman Kontak dulu.`);
      return;
    }

    const existing = new Set(recipientQueue.map((i) => i.phone));
    const additions = members
      .map((c, i) => ({
        id: `q_${Date.now()}_${i}`,
        campaignId: selectedCampaign.id,
        phone: normalizePhone(c.phone),
        name: c.name,
        custom: c.custom || {},
        status: 'draft',
        sentAt: '-',
        session: selectedCampaign.sessionUsed || 'Auto-Rotate Pool',
      }))
      .filter((item) => isValidPhone(item.phone) && !existing.has(item.phone));

    if (additions.length === 0) {
      setQueueError(`Seluruh kontak (${members.length}) di segmen "${groupName}" sudah ada di antrean.`);
      return;
    }

    setQueueError('');
    persistQueue([...additions, ...recipientQueue]);
  };

  // Handler Mulai Blast - kirim antrean ke wa-api gateway dengan batchId kampanye
  const handleStartBlast = async () => {
    if (!selectedCampaign || sending) return;

    // Ambil target yang belum selesai (draft / pending lokal)
    const targets = recipientQueue.filter(
      (item) => !item.status || item.status === 'draft' || item.status === 'pending'
    );
    if (targets.length === 0) {
      setQueueError('Antrean masih kosong atau semua target sudah terkirim.');
      return;
    }

    const tpl = templates?.find((t) => t.id === selectedCampaign.templateId);
    if (!tpl) {
      setQueueError('Template pesan kampanye ini tidak ditemukan. Pilih ulang template sebelum mengirim.');
      return;
    }

    // Pastikan kampanye punya batchId unik yang konsisten
    const activeBatchId = selectedCampaign.batchId || `camp_${selectedCampaign.id}`;
    isPausedRef.current = false;
    isStoppedRef.current = false;
    setQueuePaused(false);
    setSending(true);
    setQueueError('');

    // Status kampanye aktif seketika menjadi in_progress
    const startingCamp = {
      ...selectedCampaign,
      batchId: activeBatchId,
      status: 'in_progress',
    };
    setSelectedCampaign(startingCamp);
    void onCampaignUpdate?.(selectedCampaign.id, {
      batchId: activeBatchId,
      status: 'in_progress',
    });

    const statusByPhone = new Map();
    let batch = activeBatchId;
    let okCount = 0;
    let failCount = 0;
    let lastError = '';

    for (const item of targets) {
      if (isPausedRef.current || isStoppedRef.current) {
        break;
      }
      try {
        const rendered = renderMessage(tpl.content, {
          name: item.name,
          nama: item.name,
          phone: item.phone,
          ...(item.custom || {}),
        });

        const res = tpl.messageType === 'media'
          ? await sendMedia({
              sessionId: activeSessionId,
              to: item.phone,
              mediaType: tpl.mediaType || 'image',
              mediaUrl: tpl.mediaUrl,
              caption: rendered,
              priority: 'normal',
              batchId: activeBatchId,
            })
          : tpl.messageType === 'location'
            ? await sendLocation({
                sessionId: activeSessionId,
                to: item.phone,
                latitude: tpl.location?.latitude,
                longitude: tpl.location?.longitude,
                name: tpl.location?.name,
                address: tpl.location?.address,
                batchId: activeBatchId,
              })
            : await sendText({
                sessionId: activeSessionId,
                to: item.phone,
                text: rendered,
                priority: 'normal',
                batchId: activeBatchId,
              });

        batch = batch || res?.batchId || activeBatchId;
        okCount += 1;
        // Status riil dari gateway adalah pending / pacing (bukan langsung sent)
        statusByPhone.set(item.phone, {
          status: res?.status || 'pending',
          messageId: res?.messageId,
          sentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (err) {
        failCount += 1;
        lastError = err?.message || 'Pengiriman gagal.';
        statusByPhone.set(item.phone, { status: 'failed', error: lastError, sentAt: '-' });
      }
    }

    setSending(false);

    // Update antrean lokal dengan status yang diterima gateway
    const nextQueue = recipientQueue.map((item) => {
      const result = statusByPhone.get(item.phone);
      return result ? { ...item, ...result } : item;
    });

    // Setelah seluruh target di-enqueue ke wa-api, pesan sedang diproses oleh gateway
    // Kampanye tetap in_progress (atau paused jika dijeda), bukan langsung completed.
    let finalStatus = 'in_progress';
    if (isStoppedRef.current) {
      finalStatus = 'completed';
    } else if (isPausedRef.current) {
      finalStatus = 'paused';
    } else if (failCount > 0 && okCount === 0) {
      finalStatus = 'failed';
    } else {
      finalStatus = 'in_progress';
    }

    const updated = {
      ...selectedCampaign,
      batchId: batch || selectedCampaign.batchId,
      status: finalStatus,
      sentCount: (selectedCampaign.sentCount || 0) + okCount,
      failedCount: (selectedCampaign.failedCount || 0) + failCount,
      totalRecipients: nextQueue.length,
      queue: nextQueue,
    };

    if (failCount > 0) {
      setQueueError(`${failCount} dari ${targets.length} pesan gagal diserahkan ke gateway. Terakhir: ${lastError}`);
    }

    void onCampaignUpdate?.(updated.id, {
      batchId: updated.batchId,
      status: updated.status,
      sentCount: updated.sentCount,
      failedCount: updated.failedCount,
      totalRecipients: updated.totalRecipients,
      queue: nextQueue,
    });

    setRecipientQueue(nextQueue);
    setSelectedCampaign(updated);
    setBatchId((prev) => prev || updated.batchId || '');
    if (okCount > 0) void onSessionsRefresh?.();
    void loadLiveQueue();
  };

  const mergedQueue = useMemo(() => {
    // Status live wa-api dipetakan per nomor yang sudah dinormalisasi
    const liveMap = new Map();
    queueMessages.forEach((m) => {
      const key = normalizePhone(m.to);
      if (key && !liveMap.has(key)) {
        liveMap.set(key, m);
      }
    });

    const isCampaignStarted = selectedCampaign && (
      selectedCampaign.status === 'in_progress' ||
      selectedCampaign.status === 'paused' ||
      selectedCampaign.status === 'completed' ||
      Number(selectedCampaign.sentCount) > 0 ||
      Boolean(selectedCampaign.batchId)
    );

    const contactMap = new Map();
    (contacts || []).forEach((c) => {
      const p = normalizePhone(c.phone);
      if (p && c.custom && typeof c.custom === 'object' && Object.keys(c.custom).length > 0) {
        contactMap.set(p, c.custom);
      }
    });

    const rawQueue = Array.isArray(selectedCampaign?.queue)
      ? selectedCampaign.queue
      : (typeof selectedCampaign?.queue === 'string'
          ? (() => { try { return JSON.parse(selectedCampaign.queue) || []; } catch { return []; } })()
          : (recipientQueue || []));
    const normalizedQueue = rawQueue.map((item, idx) => ({
      ...item,
      id: item.id || `q_${item.phone || idx}`,
    }));

    return normalizedQueue.map((item) => {
      const live = liveMap.get(normalizePhone(item.phone));

      // Diferensiasi status:
      // 1. Jika sudah diserahkan ke gateway (liveMap ada atau status lokal gateway): gunakan status gateway.
      // 2. Jika belum diserahkan ke gateway (belum di-start / draft): status 'draft' (Siap Dikirim).
      let realStatus = 'draft';
      let isEnqueuedToGateway = false;

      if (live && live.status) {
        realStatus = live.status;
        isEnqueuedToGateway = true;
      } else if (item.status && item.status !== 'pending' && item.status !== 'draft') {
        realStatus = item.status;
        isEnqueuedToGateway = true;
      } else if (isCampaignStarted && (selectedCampaign?.status === 'in_progress' || selectedCampaign?.status === 'paused')) {
        realStatus = 'pending';
        isEnqueuedToGateway = true;
      } else {
        realStatus = 'draft';
        isEnqueuedToGateway = false;
      }

      // canDelete HANYA berlaku untuk data draft lokal yang belum diserahkan ke gateway wa-api.
      // Pesan yang sudah berada di gateway wa-api terkunci (tidak bisa dihapus dari tabel lokal).
      const canDelete = !isEnqueuedToGateway && realStatus === 'draft' && !isRunning;
      const isFailed = QUEUE_FAILURE_STATUSES.includes(realStatus);
      const canRetry = isFailed && !isRunning;
      const mergedCustom = (item.custom && Object.keys(item.custom).length > 0)
        ? item.custom
        : (contactMap.get(item.phone) || {});

      const rawSession = live?.sessionId || item.session || selectedCampaign?.sessionUsed || 'Auto-Rotate';
      const sessionLabel = resolveSessionName(rawSession);

      return {
        id: item.id,
        name: item.name || live?.recipientName || 'Kontak',
        phone: item.phone,
        custom: mergedCustom,
        status: realStatus,
        sessionDisplay: sessionLabel,
        isEnqueuedToGateway,
        error: live?.errorDetail || live?.error || item.error || null,
        messageId: live?.id || item.messageId || null,
        liveData: isCampaignStarted ? (live || null) : null,
        canDelete,
        canRetry,
      };
    });
  }, [selectedCampaign, recipientQueue, queueMessages, sending, contacts]);

  const failedItems = useMemo(() => {
    return mergedQueue.filter((i) => i.canRetry);
  }, [mergedQueue]);

  const handleRetryAllFailed = async () => {
    if (failedItems.length === 0 || isRetryingAllFailed) return;
    setIsRetryingAllFailed(true);

    try {
      for (const item of failedItems) {
        await handleRetryRecipient(item);
      }
    } finally {
      setIsRetryingAllFailed(false);
    }
  };

  const filteredUnifiedQueue = useMemo(() => {
    const needle = queueSearch.toLowerCase();
    return mergedQueue.filter((item) => {
      const matchStatus = queueStatusFilter === 'all' || item.status === queueStatusFilter;
      const matchSearch =
        !needle ||
        String(item.name).toLowerCase().includes(needle) ||
        String(item.phone).includes(queueSearch) ||
        String(item.sessionDisplay || '').toLowerCase().includes(needle) ||
        String(item.liveData?.text || '').toLowerCase().includes(needle);
      return matchStatus && matchSearch;
    });
  }, [mergedQueue, queueStatusFilter, queueSearch]);

  const draftCount = filteredUnifiedQueue.filter((i) => i.status === 'draft').length;
  const pendingCount = filteredUnifiedQueue.filter((i) => i.status === 'pending').length;
  const sentCount = filteredUnifiedQueue.filter((i) => QUEUE_SUCCESS_STATUSES.includes(i.status)).length;
  const activePacingCount = filteredUnifiedQueue.filter((i) => i.status === 'pacing').length;

  // Paginasi: satu halaman berisi 50 baris. Setiap kali filter atau pencarian
  // berubah, halaman dikembalikan ke awal supaya user tidak mendarat di halaman
  // kosong.
  const totalQueuePages = Math.max(1, Math.ceil(filteredUnifiedQueue.length / QUEUE_PAGE_SIZE));
  const safeQueuePage = Math.min(queuePage, totalQueuePages);
  const pagedQueue = useMemo(
    () => filteredUnifiedQueue.slice((safeQueuePage - 1) * QUEUE_PAGE_SIZE, safeQueuePage * QUEUE_PAGE_SIZE),
    [filteredUnifiedQueue, safeQueuePage],
  );

  useEffect(() => {
    setQueuePage(1);
  }, [queueStatusFilter, queueSearch, selectedCampaign?.id]);

  const pagePhones = useMemo(
    () => pagedQueue.map((item) => item.phone).filter(Boolean),
    [pagedQueue],
  );

  const pagePhonesKey = useMemo(() => pagePhones.join(','), [pagePhones]);

  // Rata-rata jeda jitter riil yang dicatat backend saat status `pacing`.
  const avgPacingSec = useMemo(() => {
    const withDelay = queueMessages.filter((m) => Number(m.jitterDelayMs) > 0);
    if (withDelay.length === 0) return 0;
    const total = withDelay.reduce((acc, m) => acc + Number(m.jitterDelayMs), 0);
    return total / withDelay.length / 1000;
  }, [queueMessages]);

  // ---------------- Live queue dari wa-api (batch yang sudah dikirim) ----------------
  // Guard ref agar tidak terjadi request ganda / loop rate limit
  const inFlightRef = useRef(false);
  const backoffUntilRef = useRef(0);

  const loadLiveQueue = useCallback(async () => {
    if (inFlightRef.current) return;
    if (Date.now() < backoffUntilRef.current) return;
    if (pagePhones.length === 0) {
      setQueueMessages([]);
      setQueueTotal(0);
      return;
    }

    const campBatchId = selectedCampaign?.batchId;
    const isCampActiveOrStarted = selectedCampaign && (
      selectedCampaign.status === 'in_progress' ||
      selectedCampaign.status === 'paused' ||
      selectedCampaign.status === 'completed' ||
      Number(selectedCampaign.sentCount) > 0 ||
      Number(selectedCampaign.failedCount) > 0
    );

    // Proteksi isolasi: Kampanye baru / idle yang belum pernah di-start tidak boleh query wa-api
    // agar riwayat pesan nomor telepon dari kampanye terdahulu tidak bocor ke kampanye baru!
    if (!campBatchId || !isCampActiveOrStarted) {
      setQueueMessages([]);
      setQueueTotal(0);
      setLoadingQueue(false);
      return;
    }

    inFlightRef.current = true;
    setLoadingQueue(true);
    try {
      const [msgRes, batchStatus] = await Promise.all([
        fetchMessages('all', {
          limit: QUEUE_PAGE_SIZE,
          batchId: campBatchId,
          phones: pagePhones,
        }),
        fetchBatchStatus(campBatchId).catch(() => null),
      ]);

      const messages = Array.isArray(msgRes) ? msgRes : (msgRes?.messages || []);
      const total = typeof msgRes?.total === 'number' ? msgRes.total : messages.length;

      setQueueMessages(messages);
      setQueueTotal(total);
      setQueueError('');

      // Sinkronkan status pesan riil dari wa-api ke data antrean kampanye
      if (messages.length > 0 && selectedCampaign) {
        const liveMap = new Map();
        messages.forEach((m) => {
          const k = normalizePhone(m.to);
          if (k && m.status) liveMap.set(k, m.status);
        });

        const rawCampQueue = Array.isArray(selectedCampaign.queue)
          ? selectedCampaign.queue
          : (typeof selectedCampaign.queue === 'string'
              ? (() => { try { return JSON.parse(selectedCampaign.queue) || []; } catch { return []; } })()
              : []);

        let hasDiff = false;
        const nextQueue = rawCampQueue.map((item) => {
          const liveSt = liveMap.get(normalizePhone(item.phone));
          if (liveSt && liveSt !== item.status) {
            hasDiff = true;
            return { ...item, status: liveSt };
          }
          return item;
        });

        if (hasDiff) {
          const sCount = nextQueue.filter((i) => QUEUE_SUCCESS_STATUSES.includes(i.status)).length;
          const fCount = nextQueue.filter((i) => QUEUE_FAILURE_STATUSES.includes(i.status)).length;
          const allDone = nextQueue.length > 0 && nextQueue.every((i) =>
            QUEUE_SUCCESS_STATUSES.includes(i.status) || QUEUE_FAILURE_STATUSES.includes(i.status)
          );
          const nextCampStatus = allDone ? 'completed' : selectedCampaign.status;

          setSelectedCampaign((prev) =>
            prev ? { ...prev, queue: nextQueue, sentCount: sCount, failedCount: fCount, status: nextCampStatus } : prev
          );
          void onCampaignUpdate?.(selectedCampaign.id, {
            queue: nextQueue,
            sentCount: sCount,
            failedCount: fCount,
            status: nextCampStatus,
          });
        }
      }

      if (batchStatus && typeof batchStatus.isPaused === 'boolean') {
        setQueuePaused(batchStatus.isPaused);
        if (batchStatus.isPaused && selectedCampaign && selectedCampaign.status !== 'paused') {
          setSelectedCampaign((prev) => (prev ? { ...prev, status: 'paused' } : prev));
          void onCampaignUpdate?.(selectedCampaign.id, { status: 'paused' });
        }
      }
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('melebihi batas')) {
        backoffUntilRef.current = Date.now() + 15000;
        setQueueError('Menyesuaikan ritme monitoring gateway (rate limit backoff 15 detik)...');
      } else {
        setQueueError(msg || 'Gagal mengambil antrean dari wa-api.');
      }
    } finally {
      inFlightRef.current = false;
      setLoadingQueue(false);
    }
  }, [
    pagePhonesKey,
    selectedCampaign?.batchId,
    selectedCampaign?.id,
    selectedCampaign?.status,
    selectedCampaign?.sentCount,
    selectedCampaign?.failedCount,
  ]);

  const loadLiveQueueRef = useRef(loadLiveQueue);
  loadLiveQueueRef.current = loadLiveQueue;

  useEffect(() => {
    if (subView !== 'queue') return;
    void loadLiveQueueRef.current();
    const timer = setInterval(() => {
      void loadLiveQueueRef.current();
    }, 5000);
    return () => clearInterval(timer);
  }, [subView, selectedCampaign?.id, pagePhonesKey]);

  // Jeda/Lanjutkan antrean berbasis batchId kampanye agar tidak membekukan sesi secara global
  const handleTogglePause = async () => {
    const next = !queuePaused;
    isPausedRef.current = next;
    setQueuePaused(next);
    setQueueError('');

    if (selectedCampaign) {
      const nextStatus = next ? 'paused' : 'in_progress';
      setSelectedCampaign((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      void onCampaignUpdate?.(selectedCampaign.id, { status: nextStatus });
    }

    try {
      const campBatchId = selectedCampaign?.batchId;
      if (campBatchId) {
        if (next) await pauseBatch(campBatchId, `Kampanye "${selectedCampaign.name}" dijeda`);
        else await resumeBatch(campBatchId);
      } else {
        // Fallback per sesi hanya jika batchId belum terbentuk
        const fromQueue = queueMessages.map((m) => m.sessionId).filter(Boolean);
        const fromSessions = (sessions || [])
          .filter((s) => s.status === 'connected' || s.status === 'open')
          .map((s) => s.id);
        const sessionIds = Array.from(new Set(fromQueue.length > 0 ? fromQueue : fromSessions));
        for (const sid of sessionIds) {
          if (next) await pauseQueue(sid);
          else await resumeQueue(sid);
        }
      }
      await loadLiveQueue();

      // Jika dilanjutkan (resume) dan masih ada kontak pending yang belum terkirim ke wa-api,
      // jalankan kembali handleStartBlast untuk mendispatch sisa kontak
      if (!next && selectedCampaign) {
        const remainingTargets = recipientQueue.filter((item) => item.status === 'pending');
        if (remainingTargets.length > 0 && !sending) {
          void handleStartBlast();
        }
      }
    } catch (err) {
      isPausedRef.current = !next;
      setQueuePaused(!next);
      setQueueError(err?.message || 'Gagal mengubah status antrean di wa-api.');
    }
  };

  // Handler Hentikan (Stop) Antrean - hanya batalkan batch kampanye terpilih
  const handleStopBlast = async () => {
    if (!selectedCampaign) return;
    isStoppedRef.current = true;
    isPausedRef.current = false;
    setSending(false);
    setQueuePaused(false);

    const campBatchId = selectedCampaign.batchId;

    try {
      if (campBatchId) {
        // Bersihkan hanya antrean yang berasosiasi dengan batchId kampanye ini!
        try {
          await clearBatch(campBatchId, `Kampanye "${selectedCampaign.name}" dihentikan oleh pengguna`);
        } catch {}
      } else {
        // Fallback: jika belum ada batchId, bersihkan per sesi pengirim
        const fromQueue = queueMessages.map((m) => m.sessionId).filter(Boolean);
        const fromSessions = (sessions || [])
          .filter((s) => s.status === 'connected' || s.status === 'open')
          .map((s) => s.id);
        const sessionIds = Array.from(new Set(fromQueue.length > 0 ? fromQueue : fromSessions));
        if (sessionIds.length > 0) {
          for (const sid of sessionIds) {
            try {
              await clearQueue(sid, `Kampanye "${selectedCampaign.name}" dihentikan oleh pengguna`);
            } catch {}
          }
        }
      }

      const updated = {
        ...selectedCampaign,
        status: 'completed',
      };
      setSelectedCampaign(updated);
      void onCampaignUpdate?.(selectedCampaign.id, { status: 'completed' });
      await loadLiveQueue();
    } catch (err) {
      setQueueError(err?.message || 'Gagal menghentikan antrean di wa-api.');
    }
  };

  const liveQueued = filteredUnifiedQueue.filter((m) => QUEUE_RUNNING_STATUSES.includes(m.status)).length;

  // Status jeda antrean per sesi pengirim (endpoint queue/status wa-api).
  const monitorSessionId = activeSessionId !== 'auto'
    ? activeSessionId
    : sessions?.find((s) => s.status === 'connected')?.id;

  const loadQueueStatus = useCallback(async () => {
    if (!monitorSessionId) {
      setQueuePaused(false);
      return;
    }
    try {
      const res = await fetchQueueStatus(monitorSessionId);
      setQueuePaused(Boolean(res?.isPaused));
    } catch {
      // status jeda hanya informasi; kegagalan tidak perlu mengganggu UI
    }
  }, [monitorSessionId]);

  useEffect(() => {
    void loadQueueStatus();
  }, [loadQueueStatus]);

  return (
    <div className="space-y-4">
      {/* Sub-view Tab Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              {subView === 'campaigns' ? 'Blast Engine & Kampanye' : `Antrean Pesan: ${selectedCampaign?.name || 'Semua Kampanye'}`}
            </h1>
            <Badge variant="outline" className="text-[10px]">
              {subView === 'campaigns'
                ? `${campaigns.length} Kampanye`
                : `${filteredUnifiedQueue.length} Target · ${
                    selectedCampaign?.status === 'completed'
                      ? 'Selesai'
                      : isRunning
                      ? `${activeRunningCount} Berjalan`
                      : selectedCampaign?.status === 'in_progress'
                      ? 'Diproses Gateway'
                      : `${draftCount} Siap Kirim`
                  }`}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {subView === 'campaigns'
              ? 'Kelola kampanye broadcast WhatsApp dengan opsi nomor spesifik atau auto-rotate pool.'
              : 'Tambah nomor target, jalankan blast, lalu pantau status riil dari antrean wa-api.'}
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2">
          {subView === 'queue' ? (
            <>
              <Button
                onClick={() => setSubView('campaigns')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                <span>Daftar Kampanye</span>
              </Button>
              {failedItems.length > 0 && (
                <Button
                  onClick={handleRetryAllFailed}
                  disabled={isRetryingAllFailed}
                  variant="outline"
                  size="sm"
                  className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isRetryingAllFailed ? 'animate-spin' : ''}`} />
                  <span>Retry Semua Gagal ({failedItems.length})</span>
                </Button>
              )}
              <Button
                onClick={handleOpenAddRecipientModal}
                disabled={sending || selectedCampaign?.status === 'in_progress'}
                variant="default"
                size="sm"
                className="text-xs disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Tambah Nomor Antrean</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  setCampaignName('');
                  setIsWizardOpen(true);
                }}
                variant="default"
                size="sm"
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Buat Kampanye Baru</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* TAMPILAN 1: DAFTAR KAMPANYE (SUBVIEW = 'campaigns') */}
      {subView === 'campaigns' && (
        <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[750px]">
              <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">Nama Kampanye</th>
                  <th className="py-2.5 px-4">Segmen Audiens</th>
                  <th className="py-2.5 px-4">Template Pesan</th>
                  <th className="py-2.5 px-4">Sesi WhatsApp</th>
                  <th className="py-2.5 px-4">Status & Progres</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                      <div>{camp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{camp.createdAt}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[10px]">
                        {camp.groupName}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-zinc-200 font-medium">
                      {camp.templateTitle}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        <Smartphone className="w-3 h-3 text-slate-400" />
                        <span>{resolveSessionName(camp.sessionUsed)}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 w-56">
                      {(() => {
                        const stats = getCampaignStats(camp);
                        return (
                          <div className="space-y-1.5">
                            {/* Baris Atas: Badge Status & Rasio Ringkas */}
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              {stats.derivedStatus === 'in_progress' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Berjalan</span>
                                </span>
                              ) : stats.derivedStatus === 'paused' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>Dijeda</span>
                                </span>
                              ) : stats.derivedStatus === 'completed' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>Selesai</span>
                                </span>
                              ) : stats.derivedStatus === 'failed' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                                  <AlertCircle className="w-3 h-3 text-rose-500" />
                                  <span>Gagal</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-zinc-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
                                  <span>Siap Mulai</span>
                                </span>
                              )}

                              <span className="font-mono text-slate-500 dark:text-zinc-400">
                                {stats.successCount + stats.failedCount} / {stats.total}
                              </span>
                            </div>

                            {/* Baris Tengah: Multi-Segment Stacked Progress Bar */}
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex">
                              {stats.successPct > 0 && (
                                <div
                                  style={{ width: `${stats.successPct}%` }}
                                  className="h-full bg-emerald-500 transition-all duration-300"
                                  title={`${stats.successCount} Berhasil`}
                                />
                              )}
                              {stats.failedPct > 0 && (
                                <div
                                  style={{ width: `${stats.failedPct}%` }}
                                  className="h-full bg-rose-500 transition-all duration-300"
                                  title={`${stats.failedCount} Gagal`}
                                />
                              )}
                              {stats.inFlightPct > 0 && (
                                <div
                                  style={{ width: `${stats.inFlightPct}%` }}
                                  className="h-full bg-amber-400 animate-pulse transition-all duration-300"
                                  title={`${stats.inFlightCount} Sedang Diproses`}
                                />
                              )}
                            </div>

                            {/* Baris Bawah: Breakdown Angka Berhasil & Gagal */}
                            <div className="flex items-center gap-2 text-[10px] flex-wrap font-medium">
                              <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                                <span>✓</span>
                                <span>{stats.successCount} berhasil</span>
                              </span>
                              {stats.failedCount > 0 && (
                                <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5">
                                  <span>✕</span>
                                  <span>{stats.failedCount} gagal</span>
                                </span>
                              )}
                              {stats.inFlightCount > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5">
                                  <span>⏳</span>
                                  <span>{stats.inFlightCount} proses</span>
                                </span>
                              )}
                              {stats.draftCount > 0 && stats.derivedStatus === 'idle' && (
                                <span className="text-slate-400 dark:text-zinc-500">
                                  {stats.draftCount} siap
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {camp.status !== 'completed' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleOpenEditCampaign(camp, e)}
                            className="text-xs h-7 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            title="Edit informasi kampanye"
                          >
                            <Edit2 className="w-3 h-3 mr-1 text-slate-400" />
                            <span>Edit</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenQueueView(camp)}
                          className="text-xs h-7"
                        >
                          <ListOrdered className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                          <span>Buka Antrean</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAMPILAN 2: SUB-HALAMAN ANTREAN PESAN (SUBVIEW = 'queue') */}
      {subView === 'queue' && (
        <div className="space-y-3">
          {/* Detail Kampanye & Kontrol Pacing */}
          {selectedCampaign && (
            <div className="bg-white dark:bg-[#0f1117] p-3 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2 h-2 rounded-full ${sending ? 'bg-amber-500 animate-pulse' : (queuePaused || selectedCampaign.status === 'paused') ? 'bg-amber-500' : selectedCampaign.status === 'in_progress' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCampaign.name}</span>
                {selectedCampaign.batchId ? (
                  <span className="text-slate-400 text-[11px]">({selectedCampaign.batchId})</span>
                ) : (
                  <span className="text-slate-400 text-[11px]">(draft lokal)</span>
                )}
                <Badge variant={selectedCampaign.status === 'in_progress' ? 'default' : 'secondary'} className="text-[10px]">
                  {sending
                    ? 'Menyerahkan ke Gateway...'
                    : selectedCampaign.status === 'in_progress'
                      ? 'Berjalan di Gateway'
                      : selectedCampaign.status === 'paused' || queuePaused
                        ? 'Dijeda'
                        : selectedCampaign.status === 'completed'
                          ? 'Selesai'
                          : 'Siap Mulai'}
                </Badge>
                {avgPacingSec > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    Jeda riil {avgPacingSec.toFixed(1)}s
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sending || selectedCampaign?.status === 'in_progress' || selectedCampaign?.status === 'paused'}
                  onClick={handleLoadSegmentContacts}
                  className="h-7 text-xs disabled:opacity-50"
                >
                  <Users className="w-3 h-3 mr-1" />
                  <span>Muat Kontak Segmen</span>
                </Button>

                {/* Kontrol Antrean: Jeda / Lanjutkan / Stop / Mulai Blast */}
                {(sending || selectedCampaign.status === 'in_progress' || selectedCampaign.status === 'paused' || queuePaused || activePacingCount > 0) ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTogglePause}
                      className="h-7 text-xs"
                    >
                      {queuePaused || selectedCampaign.status === 'paused' ? (
                        <>
                          <Play className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                          <span>Lanjutkan Antrean</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3 mr-1 text-amber-500" />
                          <span>Jeda Antrean</span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStopBlast}
                      className="h-7 text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title="Hentikan dan batalkan sisa antrean blast di gateway"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      <span>Stop</span>
                    </Button>
                  </div>
                ) : selectedCampaign.status === 'completed' ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled
                      className="h-7 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium cursor-default"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      <span>Selesai</span>
                    </Button>
                    {recipientQueue.some((i) => !i.status || i.status === 'draft' || QUEUE_FAILURE_STATUSES.includes(i.status)) && (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleStartBlast}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        <span>Kirim Sisa Target</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={sending}
                    onClick={handleStartBlast}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    <span>{sending ? 'Menyerahkan ke Gateway...' : 'Mulai Blast'}</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {queueError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-300">
              {queueError}
            </div>
          )}

          {/* Filter Toolbar Antrean */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0f1117] p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={queueStatusFilter}
                onChange={(e) => setQueueStatusFilter(e.target.value)}
                className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Semua Status</option>
                {QUEUE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadLiveQueue()}
                disabled={loadingQueue}
                className="h-7 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loadingQueue ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </Button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, nomor, atau pesan..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Tabel Tunggal Terpadu: Target Kampanye & Status Live wa-api */}
          <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Daftar Antrean & Progres Pengiriman
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {sentCount} terkirim · {activePacingCount > 0 ? `${activePacingCount} jeda pacing · ` : ''}{pendingCount} menunggu
                  {selectedCampaign?.batchId ? ` · Batch: ${selectedCampaign.batchId}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {loadingQueue && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Sinkron wa-api
                  </span>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {filteredUnifiedQueue.length} target
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[760px]">
                <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Kontak & Nomor</th>
                    <th className="py-2.5 px-4">Sesi Pengirim</th>
                    <th className="py-2.5 px-4">Kampanye / Pesan</th>
                    <th className="py-2.5 px-4">Variabel Khusus</th>
                    <th className="py-2.5 px-4">Status & Jeda</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {pagedQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                        {loadingQueue
                          ? 'Memuat antrean...'
                          : 'Belum ada nomor target pada filter ini. Klik "Tambah Nomor Antrean" atau "Muat Kontak Segmen".'}
                      </td>
                    </tr>
                  ) : (
                    pagedQueue.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="py-2.5 px-4 text-center text-[11px] text-slate-400">
                          {(safeQueuePage - 1) * QUEUE_PAGE_SIZE + idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-zinc-100">{item.name}</div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">+{item.phone}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                            <Smartphone className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[120px]" title={item.sessionDisplay}>{item.sessionDisplay}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                            {item.campaignName || selectedCampaign?.name || '-'}
                          </div>
                          {item.liveData?.text ? (
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={item.liveData.text}>
                              {item.liveData.text}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-4">
                          {item.custom && Object.keys(item.custom).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(item.custom).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300 font-mono"
                                >
                                  {k}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{String(v)}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {item.status === 'draft' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Siap Dikirim</span>
                            </span>
                          ) : ['sent', 'delivered', 'read'].includes(item.status) ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{item.status === 'read' ? 'Dibaca' : item.status === 'delivered' ? 'Sampai' : 'Terkirim'}</span>
                              </span>
                              {item.liveData?.timestamp && (
                                <div className="text-[10px] text-slate-400">
                                  {new Date(item.liveData.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          ) : item.status === 'pacing' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Jeda anti-ban</span>
                              </span>
                              {Number(item.liveData?.jitterDelayMs) > 0 && (
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                                  {(Number(item.liveData.jitterDelayMs) / 1000).toFixed(1)}s jeda
                                </div>
                              )}
                            </div>
                          ) : ['failed', 'invalid_number', 'not_registered'].includes(item.status) ? (
                            <div>
                              <span
                                className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium"
                                title={item.liveData?.errorDetail || item.error || 'Pengiriman gagal'}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{item.status === 'invalid_number' ? 'Nomor Invalid' : item.status === 'not_registered' ? 'Tidak Terdaftar' : 'Gagal'}</span>
                              </span>
                              {item.liveData?.errorDetail && (
                                <div className="text-[10px] text-rose-500/80 truncate max-w-[160px]" title={item.liveData.errorDetail}>
                                  {item.liveData.errorDetail}
                                </div>
                              )}
                            </div>
                          ) : item.status === 'sending' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-medium animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Sedang dikirim</span>
                              </span>
                            </div>
                          ) : item.status === 'pending' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Antrean Gateway</span>
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{QUEUE_STATUS_LABEL[item.status] || item.status}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {item.canRetry && (
                              <button
                                type="button"
                                disabled={retryingPhones.has(item.phone)}
                                onClick={() => handleRetryRecipient(item)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
                                title="Kirim ulang pesan ini"
                              >
                                <RotateCcw className={`w-3 h-3 ${retryingPhones.has(item.phone) ? 'animate-spin' : ''}`} />
                                <span>Retry</span>
                              </button>
                            )}

                            {item.canDelete ? (
                              <button
                                type="button"
                                onClick={() => setDeletingRecipient({ id: item.id, phone: item.phone, name: item.name })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                title="Hapus nomor dari antrean lokal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : !item.canRetry ? (
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 italic">Terkunci</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredUnifiedQueue.length > QUEUE_PAGE_SIZE && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400">
                <span>
                  Menampilkan {(safeQueuePage - 1) * QUEUE_PAGE_SIZE + 1}
                  {' sampai '}
                  {Math.min(safeQueuePage * QUEUE_PAGE_SIZE, filteredUnifiedQueue.length)}
                  {' dari '}
                  {filteredUnifiedQueue.length} target
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={safeQueuePage <= 1}
                    onClick={() => setQueuePage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Sebelumnya</span>
                  </Button>
                  <span className="px-2 font-medium text-slate-700 dark:text-zinc-300">
                    {safeQueuePage} / {totalQueuePages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={safeQueuePage >= totalQueuePages}
                    onClick={() => setQueuePage((p) => Math.min(totalQueuePages, p + 1))}
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Buat / Edit Kampanye */}
      <Dialog open={isWizardOpen} onOpenChange={(open) => {
        setIsWizardOpen(open);
        if (!open) setEditingCampaign(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Informasi Kampanye' : 'Buat Kampanye Blast Baru'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCampaign} className="space-y-3.5 text-xs py-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Nama Kampanye *
              </label>
              <input
                type="text"
                required
                placeholder="Misal: Info Pelanggan Loyal September"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Target Segmen Audiens *
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                disabled={Boolean(editingCampaign)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="">Pilih segmen audiens...</option>
                {groups?.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name} ({g.count} kontak)
                  </option>
                ))}
              </select>
              {groups?.length === 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  Belum ada segmen. Buat segmen dan tambahkan kontak terlebih dahulu di halaman Kontak.
                </p>
              )}
              {editingCampaign && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Segmen awal tidak dapat diubah pada mode edit. Tambah atau kurangi nomor langsung di daftar antrean.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Pilih Template Pesan *
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Pilih template pesan...</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.messageType || 'text'})
                  </option>
                ))}
              </select>
              {templates?.length === 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  Belum ada template. Buat template pesan terlebih dahulu di halaman Template.
                </p>
              )}

              {/* Info Variabel Template yang Terdeteksi */}
              {selectedTemplate && (() => {
                const tpl = templates?.find((t) => t.id === selectedTemplate);
                if (!tpl?.content) return null;
                const detectedVars = Array.from(tpl.content.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)).map((m) => m[1]);
                if (detectedVars.length === 0) return null;
                const uniqueVars = Array.from(new Set(detectedVars));
                return (
                  <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px]">
                    <span className="text-slate-500 dark:text-zinc-400">Variabel dalam template: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {uniqueVars.map((v) => (
                        <span key={v} className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Pilihan Sesi WhatsApp Pengirim (Auto-Rotate vs Pilih Nomor Spesifik) */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Sesi WhatsApp Pengirim
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="auto_rotate">Auto Rotate (Rotasi Otomatis Semua Nomor Online)</option>
                {sessions?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (+{s.phone}) - {s.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>Kampanye baru langsung membuka antrean pesan. Nomor dari segmen yang dipilih sudah dimuat otomatis bila segmennya punya kontak.</span>
            </div>

            {formError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{formError}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsWizardOpen(false)} disabled={creating}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={creating}>
                {creating ? 'Menyimpan...' : editingCampaign ? 'Simpan Perubahan' : 'Buat & Buka Antrean'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Nomor Langsung ke Antrean */}
      <Dialog open={isAddRecipientModalOpen} onOpenChange={setIsAddRecipientModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Nomor ke Antrean</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRecipient} className="space-y-3 text-xs py-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Target Kampanye *
              </label>
              <select
                value={targetCampaignId || selectedCampaign?.id || (campaigns.length > 0 ? campaigns[0].id : '')}
                onChange={(e) => setTargetCampaignId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status === 'idle' ? 'Belum Mulai' : c.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Nomor WhatsApp *
              </label>
              <ContactSearchInput
                contacts={contacts}
                value={newRecipientPhone}
                onChange={(val) => {
                  setNewRecipientPhone(val);
                }}
                onSelectContact={(c) => {
                  setNewRecipientPhone(c.phone);
                  setNewRecipientName(c.name || '');
                  setNewRecipientCustom(c.custom || {});
                }}
                placeholder="Ketik 628xxx atau cari nama kontak..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Nama Penerima
              </label>
              <input
                type="text"
                placeholder="Misal: Hendra Pratama"
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Preview Variabel Custom yang Melekat pada Penerima Ini */}
            {newRecipientCustom && Object.keys(newRecipientCustom).length > 0 && (
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px]">
                <span className="text-slate-500 dark:text-zinc-400 font-medium">Variabel kontak terhubung:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(newRecipientCustom).map(([k, v]) => (
                    <span key={k} className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                      {`{{${k}}}`}: <strong className="font-semibold">{String(v)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{formError}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddRecipientModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Tambahkan ke Antrean
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Nomor dari Antrean */}
      <Dialog open={Boolean(deletingRecipient)} onOpenChange={(open) => !open && setDeletingRecipient(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Hapus Nomor dari Antrean?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-600 dark:text-zinc-400">
            Apakah Anda yakin ingin menghapus{' '}
            <strong className="text-slate-900 dark:text-zinc-100">{deletingRecipient?.name || 'nomor ini'}</strong>{' '}
            (<span className="font-mono text-emerald-600 dark:text-emerald-400">+{deletingRecipient?.phone}</span>) dari antrean kampanye ini?
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingRecipient(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deletingRecipient && handleRemoveRecipient(deletingRecipient)}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              Hapus Nomor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
