import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  RefreshCw,
  Smartphone,
  Info,
  AlertCircle,
  X
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

  const [queueMessages, setQueueMessages] = useState([]);
  const [queuePaused, setQueuePaused] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [sending, setSending] = useState(false);

  // Form State Setup Campaign
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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

  const groupMembers = useCallback(
    (groupName) => (contacts || []).filter((c) => c.group === groupName || c.group_name === groupName),
    [contacts],
  );

  useEffect(() => {
    setRecipientQueue(selectedCampaign?.queue || []);
  }, [selectedCampaign]);

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

    const seed = groupMembers(selectedGroup).map((c, i) => ({
      id: `q_${Date.now()}_${i}`,
      campaignId: '',
      phone: normalizePhone(c.phone),
      name: c.name,
      custom: c.custom || {},
      status: 'pending',
      sentAt: '-',
      session: sessionLabel,
    }));

    setCreating(true);
    try {
      const created = await onCampaignCreate?.({
        name: campaignName.trim(),
        groupName: selectedGroup,
        templateId: tpl.id,
        templateTitle: tpl.title,
        sessionUsed: sessionLabel,
        totalRecipients: seed.length,
        status: 'idle',
        campaignId: `cmp_${Date.now()}`,
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
      status: 'pending',
      sentAt: '-',
      session: targetCampaign.sessionUsed || 'Auto-Rotate Pool',
    };

    const nextQueue = [newItem, ...currentCampQueue];

    // Jika kampanye yang dipilih sama dengan kampanye aktif di subview antrean
    if (!selectedCampaign || selectedCampaign.id === targetCampaign.id) {
      setRecipientQueue(nextQueue);
      setSelectedCampaign({ ...targetCampaign, queue: nextQueue, totalRecipients: nextQueue.length });
    }

    void onCampaignUpdate?.(targetCampaign.id, {
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
        status: 'pending',
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

  // Handler Mulai Blast - benar-benar mengirim ke wa-api sesuai mode template.
  //
  // Setiap penerima dibungkus try/catch sendiri: satu nomor bermasalah tidak
  // boleh menghentikan sisa kampanye. Penerima yang gagal ditandai `failed`
  // supaya bisa dicoba ulang tanpa mengirim ulang ke yang sudah sukses.
  const handleStartBlast = async () => {
    if (!selectedCampaign || sending) return;

    const targets = recipientQueue.filter((item) => item.status === 'pending');
    if (targets.length === 0) {
      setQueueError('Antrean masih kosong. Tambahkan nomor penerima terlebih dahulu.');
      return;
    }

    const tpl = templates?.find((t) => t.id === selectedCampaign.templateId);
    if (!tpl) {
      setQueueError('Template pesan kampanye ini tidak ditemukan. Pilih ulang template sebelum mengirim.');
      return;
    }

    setSending(true);
    setQueueError('');

    const statusByPhone = new Map();
    let batch = '';
    let okCount = 0;
    let failCount = 0;
    let lastError = '';

    for (const item of targets) {
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
              batchId: selectedCampaign.batchId || undefined,
            })
          : tpl.messageType === 'location'
            ? await sendLocation({
                sessionId: activeSessionId,
                to: item.phone,
                latitude: tpl.location?.latitude,
                longitude: tpl.location?.longitude,
                name: tpl.location?.name,
                address: tpl.location?.address,
                batchId: selectedCampaign.batchId || undefined,
              })
            : await sendText({
                sessionId: activeSessionId,
                to: item.phone,
                text: rendered,
                priority: 'normal',
                batchId: selectedCampaign.batchId || undefined,
              });

        batch = batch || res?.batchId || '';
        okCount += 1;
        statusByPhone.set(item.phone, {
          status: 'sent',
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

    // Antrean berikutnya dibangun sebagai objek baru, tidak mengubah objek
    // state yang sedang dipakai React.
    const nextQueue = recipientQueue.map((item) => {
      const result = statusByPhone.get(item.phone);
      return result ? { ...item, ...result } : item;
    });

    const updated = {
      ...selectedCampaign,
      batchId: batch || selectedCampaign.batchId,
      status: failCount > 0 ? 'paused' : 'in_progress',
      sentCount: (selectedCampaign.sentCount || 0) + okCount,
      failedCount: (selectedCampaign.failedCount || 0) + failCount,
      totalRecipients: nextQueue.length,
      queue: nextQueue,
    };

    if (failCount > 0) {
      setQueueError(`${failCount} dari ${targets.length} pesan gagal terkirim. Terakhir: ${lastError}`);
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
  };

  const mergedQueue = useMemo(() => {
    // Live status wa-api mapping
    const liveMap = new Map();
    queueMessages.forEach((m) => {
      if (!liveMap.has(m.to)) {
        liveMap.set(m.to, m);
      }
    });

    const isCampaignStarted = selectedCampaign && (
      selectedCampaign.status === 'in_progress' ||
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

    const rawQueue = selectedCampaign?.queue || [];
    const normalizedQueue = rawQueue.map((item, idx) => ({
      ...item,
      id: item.id || `q_${item.phone || idx}`,
    }));

    return normalizedQueue.map((item) => {
      const live = liveMap.get(item.phone);
      // Status sinkron wa-api HANYA berlaku jika kampanye ini memang sudah mulai/pernah dikirim
      const realStatus = isCampaignStarted
        ? (item.status === 'pending' && (!live || live.status === 'pending') ? 'pending' : (live?.status || item.status || 'pending'))
        : (item.status || 'pending');

      const isPending = realStatus === 'pending';
      const isFailed = ['failed', 'invalid_number', 'not_registered'].includes(realStatus);
      const mergedCustom = (item.custom && Object.keys(item.custom).length > 0)
        ? item.custom
        : (contactMap.get(item.phone) || {});

      return {
        id: item.id,
        name: item.name || live?.recipientName || 'Kontak',
        phone: item.phone,
        custom: mergedCustom,
        status: realStatus,
        error: live?.error || item.error || null,
        messageId: live?.id || item.messageId || null,
        liveData: isCampaignStarted ? (live || null) : null,
        canDelete: isPending,
        canRetry: isFailed,
      };
    });
  }, [selectedCampaign, recipientQueue, queueMessages]);

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
        String(item.liveData?.text || '').toLowerCase().includes(needle);
      return matchStatus && matchSearch;
    });
  }, [mergedQueue, queueStatusFilter, queueSearch]);

  const pendingCount = filteredUnifiedQueue.filter((i) => ['pending', 'waiting'].includes(i.status)).length;
  const sentCount = filteredUnifiedQueue.filter((i) => ['sent', 'delivered', 'read'].includes(i.status)).length;
  const activePacingCount = filteredUnifiedQueue.filter((i) => i.status === 'pacing').length;

  // Rata-rata jeda jitter riil yang dicatat backend saat status `pacing`.
  const avgPacingSec = useMemo(() => {
    const withDelay = queueMessages.filter((m) => Number(m.jitterDelayMs) > 0);
    if (withDelay.length === 0) return 0;
    const total = withDelay.reduce((acc, m) => acc + Number(m.jitterDelayMs), 0);
    return total / withDelay.length / 1000;
  }, [queueMessages]);

  // ---------------- Live queue dari wa-api (batch yang sudah dikirim) ----------------
  const loadLiveQueue = useCallback(async () => {
    setLoadingQueue(true);
    setQueueError('');
    try {
      const messages = await fetchMessages('all');
      setQueueMessages(messages);
    } catch (err) {
      setQueueError(err?.message || 'Gagal mengambil antrean dari wa-api.');
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    if (subView !== 'queue') return;
    void loadLiveQueue();
    const timer = setInterval(() => void loadLiveQueue(), 5000);
    return () => clearInterval(timer);
  }, [subView, loadLiveQueue]);

  // Jeda/Lanjutkan antrean dikirim ke wa-api per sesi pengirim. Backend yang
  // memegang loop antrean, jadi jeda di sisi UI tidak akan berpengaruh apa pun
  // kalau tidak dipropagasikan ke sana.
  const handleTogglePause = async () => {
    const fromQueue = queueMessages.map((m) => m.sessionId).filter(Boolean);
    const fromSessions = (sessions || [])
      .filter((s) => s.status === 'connected' || s.status === 'open')
      .map((s) => s.id);
    const sessionIds = Array.from(new Set(fromQueue.length > 0 ? fromQueue : fromSessions));

    if (sessionIds.length === 0) {
      setQueueError('Tidak ada sesi aktif yang bisa dijeda.');
      return;
    }

    const next = !queuePaused;
    setQueuePaused(next);
    setQueueError('');
    try {
      for (const sid of sessionIds) {
        if (next) await pauseQueue(sid);
        else await resumeQueue(sid);
      }
      await loadLiveQueue();
    } catch (err) {
      setQueuePaused(!next);
      setQueueError(err?.message || 'Gagal mengubah status antrean di wa-api.');
    }
  };

  const liveQueued = filteredUnifiedQueue.filter((m) => ['pending', 'pacing', 'sending'].includes(m.status)).length;

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
              {subView === 'campaigns' ? `${campaigns.length} Kampanye` : `${pendingCount} Lokal · ${liveQueued} Antrean`}
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
                variant="default"
                size="sm"
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Tambah Nomor Antrean</span>
              </Button>
            </>
          ) : (
            <>
              {campaigns.length > 0 && (
                <Button
                  onClick={() => handleOpenQueueView(campaigns[0])}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <ListOrdered className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                  <span>Lihat Antrean</span>
                </Button>
              )}
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
                        <span>{camp.sessionUsed || 'Auto-Rotate'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 w-44">
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="capitalize text-emerald-600 dark:text-emerald-400 font-bold">
                          {camp.status.replace('_', ' ')}
                        </span>
                        <span>
                          {camp.sentCount} / {camp.totalRecipients}
                        </span>
                      </div>
                      <Progress
                        value={(camp.sentCount / (camp.totalRecipients || 1)) * 100}
                        className="h-1.5"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
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
                <span className={`w-2 h-2 rounded-full ${sending ? 'bg-amber-500 animate-pulse' : queuePaused ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCampaign.name}</span>
                {selectedCampaign.batchId ? (
                  <span className="text-slate-400 text-[11px]">({selectedCampaign.batchId})</span>
                ) : (
                  <span className="text-slate-400 text-[11px]">(belum dikirim)</span>
                )}
                <Badge variant={selectedCampaign.status === 'in_progress' ? 'default' : 'secondary'} className="text-[10px]">
                  {sending ? 'Mengirim...' : selectedCampaign.status === 'in_progress' ? 'Berjalan' : selectedCampaign.status === 'paused' ? 'Terhenti' : 'Idle (Siap)'}
                </Badge>
                {avgPacingSec > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    Jeda riil {avgPacingSec.toFixed(1)}s
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sending}
                  onClick={handleLoadSegmentContacts}
                  className="h-7 text-xs"
                >
                  <Users className="w-3 h-3 mr-1" />
                  <span>Muat Kontak Segmen</span>
                </Button>

                {selectedCampaign.status === 'idle' || selectedCampaign.status === 'paused' ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={sending}
                    onClick={handleStartBlast}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    <span>{sending ? 'Mengirim...' : 'Mulai Blast'}</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTogglePause}
                    className="h-7 text-xs"
                  >
                    {queuePaused ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                    <span>{queuePaused ? 'Lanjutkan Antrean' : 'Jeda Antrean'}</span>
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
                <option value="pending">Menunggu (pending)</option>
                <option value="pacing">Pacing (jeda anti-ban)</option>
                <option value="sent">Terkirim (sent)</option>
                <option value="delivered">Delivered</option>
                <option value="read">Dibaca</option>
                <option value="failed">Gagal</option>
                <option value="invalid_number">Nomor tidak valid</option>
                <option value="not_registered">Tidak terdaftar</option>
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
              <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Kontak & Nomor</th>
                    <th className="py-2.5 px-4">Kampanye / Pesan</th>
                    <th className="py-2.5 px-4">Variabel Khusus</th>
                    <th className="py-2.5 px-4">Status & Jeda</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {filteredUnifiedQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                        {loadingQueue
                          ? 'Memuat antrean...'
                          : 'Belum ada nomor target pada filter ini. Klik "Tambah Nomor Antrean" atau "Muat Kontak Segmen".'}
                      </td>
                    </tr>
                  ) : (
                    filteredUnifiedQueue.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="py-2.5 px-4 text-center text-[11px] text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-zinc-100">{item.name}</div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">+{item.phone}</div>
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
                          {['sent', 'delivered', 'read'].includes(item.status) ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{item.status === 'read' ? 'Dibaca' : item.status === 'delivered' ? 'Delivered' : 'Terkirim'}</span>
                              </span>
                              {item.liveData?.timestamp && (
                                <div className="text-[10px] text-slate-400">
                                  {new Date(item.liveData.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          ) : item.status === 'pacing' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pacing anti-ban</span>
                              </span>
                              {Number(item.liveData?.jitterDelayMs) > 0 && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
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
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Menunggu</span>
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
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="Hapus dari antrean"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : !item.canRetry ? (
                              <span className="text-[10px] text-slate-400 italic">Terkunci</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Kampanye */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Kampanye Blast Baru</DialogTitle>
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
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
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
                {creating ? 'Menyimpan...' : 'Buat & Buka Antrean'}
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
