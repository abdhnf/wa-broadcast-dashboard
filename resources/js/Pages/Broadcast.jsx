import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  Users,
  FileText,
  Shield,
  ShieldAlert,
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
  CheckSquare,
  MinusSquare,
  Info,
  AlertCircle,
  Check,
  Radio,
  X,
  XCircle,
  Edit2,
  Type,
  FileEdit,
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
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';
import { WhatsAppFormattingToolbar } from '../components/WhatsAppFormattingToolbar';
import {
  clearQueue,
  clearBatch,
  pauseBatch,
  resumeBatch,
  fetchBatchStatus,
  fetchBatchApproval,
  approveBatchRecipients,
  revokeBatchApproval,
  fetchAntiBanStatus,
  updateAntiBanPreset,
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
const QUEUE_RUNNING_STATUSES = ['queued', 'pending', 'pacing', 'sending'];
const QUEUE_SUCCESS_STATUSES = ['sent', 'delivered', 'read'];
const QUEUE_FAILURE_STATUSES = ['failed', 'invalid_number', 'not_registered'];
const QUEUE_CANCELLED_STATUSES = ['cancelled'];
const QUEUE_PAGE_SIZE = 50;

const QUEUE_STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'draft', label: 'Siap Dikirim' },
  { value: 'queued', label: 'Antrean Gateway' },
  { value: 'pending', label: 'Antrean Dashboard (lama)' },
  { value: 'pacing', label: 'Jeda anti-ban' },
  { value: 'sending', label: 'Sedang dikirim' },
  { value: 'sent', label: 'Terkirim' },
  { value: 'delivered', label: 'Sampai' },
  { value: 'read', label: 'Dibaca' },
  { value: 'failed', label: 'Gagal' },
  { value: 'invalid_number', label: 'Nomor tidak valid' },
  { value: 'not_registered', label: 'Tidak terdaftar' },
  { value: 'cancelled', label: 'Dibatalkan' },
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
    let qCancelled = 0;
    let qInFlight = 0;
    let qDraft = 0;

    queue.forEach((item) => {
      const st = item?.status;
      if (['sent', 'delivered', 'read'].includes(st)) {
        qSuccess += 1;
      } else if (['failed', 'invalid_number', 'not_registered'].includes(st)) {
        qFailed += 1;
      } else if (st === 'cancelled') {
        qCancelled += 1;
      } else if (['pacing', 'sending'].includes(st) || (['pending', 'queued'].includes(st) && isCampActive)) {
        qInFlight += 1;
      } else {
        qDraft += 1;
      }
    });

    if (qSuccess > 0 || qFailed > 0 || qInFlight > 0 || qCancelled > 0) {
      successCount = qSuccess;
      failedCount = qFailed;
      inFlightCount = qInFlight;
      draftCount = qDraft;
      total = queue.length;
    } else {
      draftCount = Math.max(0, total - (successCount + failedCount + qCancelled));
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

export function BroadcastPage({ groups, templates, sessions, contacts = [], launchGroup, onLaunchConsumed, onSessionsRefresh, campaigns: initialCampaigns, onCampaignCreate, onCampaignUpdate, onCampaignDelete }) {
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
  // Whitelist penerima kampanye (contactGraph). Sumber kebenaran tetap di gateway;
  // state ini hanya cermin untuk ditampilkan.
  const [batchApproval, setBatchApproval] = useState(null); // { batchId, count, recipients }
  const [whitelistBusy, setWhitelistBusy] = useState(false);
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
  const [wizardStep, setWizardStep] = useState(1); // Step 1: Audiens | Step 2: Pesan & Template | Step 3: Pengirim & Pacing
  const [editingCampaign, setEditingCampaign] = useState(null); // Kampanye yang sedang diedit
  const [campaignName, setCampaignName] = useState('');
  const [targetType, setTargetType] = useState('group'); // 'group' | 'tag'
  const [selectedGroup, setSelectedGroup] = useState('');
  const [tagSelectionType, setTagSelectionType] = useState('single'); // 'single' | 'multiple'
  const [selectedTags, setSelectedTags] = useState([]); // array tag terpilih
  const [tagMatchMode, setTagMatchMode] = useState('or'); // 'or' | 'and'
  const [messageSource, setMessageSource] = useState('template'); // 'template' | 'manual'
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const manualTextareaRef = useRef(null);
  const [selectedSessionId, setSelectedSessionId] = useState('auto_rotate'); // Default: Auto Rotate
  const [campaignPriority, setCampaignPriority] = useState('normal'); // 'normal' | 'high'
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  // Sumber antrean kampanye dibaca dari tabel `wa_campaigns.queue` (kolom JSON)
  // lewat app.jsx. wa-api tidak punya konsep "kampanye", jadi daftar nomor harus
  // disimpan di sisi dashboard -- kalau hanya di memori, nomor hilang begitu
  // halaman di-refresh dan blast berikutnya mengirim ke antrean kosong.
  const [recipientQueue, setRecipientQueue] = useState([]);

  // Antrean Filter & Modal State
  const [isAddRecipientModalOpen, setIsAddRecipientModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isCancellingQueue, setIsCancellingQueue] = useState(false);
  const [targetCampaignId, setTargetCampaignId] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientCustom, setNewRecipientCustom] = useState({});
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [isBulkDeleteQueueOpen, setIsBulkDeleteQueueOpen] = useState(false);

  const activeSessionId = selectedSessionId === 'auto_rotate' ? 'auto' : selectedSessionId;
  const isRunning = Boolean(sending || selectedCampaign?.status === 'in_progress');

  // Anti-Ban Preset State & Controls (Item #4)
  const [activeAntibanPreset, setActiveAntibanPreset] = useState('broadcast');
  const [loadingAntiban, setLoadingAntiban] = useState(false);
  const [updatingAntiban, setUpdatingAntiban] = useState(false);
  const [antibanFeedback, setAntibanFeedback] = useState(null);

  // Sesi target yang diatur preset anti-ban nya
  const targetAntibanSession = useMemo(() => {
    if (activeSessionId !== 'auto') {
      return sessions?.find((s) => s.id === activeSessionId) || null;
    }
    const used = selectedCampaign?.sessionUsed;
    if (used && used !== 'auto_rotate' && used !== 'all' && used !== 'auto' && used !== 'Auto-Rotate') {
      return sessions?.find((s) => s.id === used || s.name === used) || null;
    }
    return null; // Mode Auto-Rotate
  }, [activeSessionId, selectedCampaign?.sessionUsed, sessions]);

  const loadAntibanStatus = useCallback(async () => {
    const sessId = targetAntibanSession?.id || sessions?.find((s) => s.status === 'connected')?.id;
    if (!sessId) return;
    try {
      setLoadingAntiban(true);
      const res = await fetchAntiBanStatus(sessId);
      if (res?.antiBan?.preset) {
        setActiveAntibanPreset(res.antiBan.preset);
      }
    } catch {
      // abaikan bila sesi belum merespons
    } finally {
      setLoadingAntiban(false);
    }
  }, [targetAntibanSession?.id, sessions]);

  useEffect(() => {
    void loadAntibanStatus();
  }, [loadAntibanStatus]);

  const handleChangeAntibanPreset = async (newPreset) => {
    if (!newPreset || newPreset === activeAntibanPreset) return;
    setUpdatingAntiban(true);
    setAntibanFeedback(null);
    try {
      if (targetAntibanSession) {
        await updateAntiBanPreset(targetAntibanSession.id, newPreset);
        setAntibanFeedback({
          type: 'success',
          text: `Preset anti-ban untuk "${targetAntibanSession.name}" berhasil diubah ke ${newPreset.toUpperCase()}.`,
        });
      } else {
        const connectedSessions = (sessions || []).filter((s) => s.status === 'connected');
        if (connectedSessions.length === 0) {
          throw new Error('Tidak ada sesi WhatsApp yang sedang terhubung.');
        }
        await Promise.all(connectedSessions.map((s) => updateAntiBanPreset(s.id, newPreset)));
        setAntibanFeedback({
          type: 'success',
          text: `Preset anti-ban untuk seluruh ${connectedSessions.length} sesi Auto-Rotate Pool berhasil diubah ke ${newPreset.toUpperCase()}.`,
        });
      }
      setActiveAntibanPreset(newPreset);
      setTimeout(() => setAntibanFeedback(null), 5000);
    } catch (err) {
      setAntibanFeedback({
        type: 'error',
        text: `Gagal mengubah preset: ${err?.message || 'Error'}`,
      });
    } finally {
      setUpdatingAntiban(false);
    }
  };

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

  // Kumpulan seluruh tag unik dari kontak untuk pilihan audiens
  const availableTags = useMemo(() => {
    const set = new Set();
    (contacts || []).forEach((c) => {
      if (c.tag) {
        c.tag.split(',').forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [contacts]);

  // Peta variabel kustom per nomor telepon (fallback bila objek antrean belum menyimpan field kustom)
  const contactCustomMap = useMemo(() => {
    const map = new Map();
    (contacts || []).forEach((c) => {
      const p = normalizePhone(c.phone);
      if (p) {
        let customObj = c.custom;
        if (typeof customObj === 'string') {
          try {
            customObj = JSON.parse(customObj);
          } catch {
            customObj = null;
          }
        }
        if (customObj && typeof customObj === 'object' && Object.keys(customObj).length > 0) {
          map.set(p, customObj);
          if (c.phone && c.phone !== p) {
            map.set(c.phone, customObj);
          }
        }
      }
    });
    return map;
  }, [contacts]);

  // Resolusi variabel kustom penerima secara konsisten di seluruh alur blast, retry, dan tabel antrean
  const resolveRecipientCustom = useCallback(
    (item) => {
      let custom = item?.custom;
      if (typeof custom === 'string') {
        try {
          custom = JSON.parse(custom);
        } catch {
          custom = null;
        }
      }
      if (custom && typeof custom === 'object' && Object.keys(custom).length > 0) {
        return custom;
      }
      const pNorm = normalizePhone(item?.phone);
      return contactCustomMap.get(pNorm) || (item?.phone ? contactCustomMap.get(item.phone) : null) || {};
    },
    [contactCustomMap],
  );

  // Anggota target dinamis: berdasarkan group atau tag (or / and)
  const resolvedTargetMembers = useMemo(() => {
    if (targetType === 'group') {
      if (!selectedGroup) return [];
      return groupMembers(selectedGroup);
    }

    if (selectedTags.length === 0) return [];

    return (contacts || []).filter((c) => {
      const cTags = c.tag
        ? c.tag.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];
      if (cTags.length === 0) return false;

      if (tagSelectionType === 'multiple' && tagMatchMode === 'and') {
        return selectedTags.every((st) => cTags.includes(st.toLowerCase()));
      }
      return selectedTags.some((st) => cTags.includes(st.toLowerCase()));
    });
  }, [targetType, selectedGroup, selectedTags, tagSelectionType, tagMatchMode, contacts, groupMembers]);

  useEffect(() => {
    if (!launchGroup) return;
    setEditingCampaign(null);
    setCampaignName(`Blast ${launchGroup}`);
    setSelectedGroup(launchGroup);
    setSelectedTemplate('');
    setCampaignPriority('normal');
    setWizardStep(1);
    setFormError('');
    setIsWizardOpen(true);
    onLaunchConsumed?.();
  }, [launchGroup, onLaunchConsumed]);

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

    const isTagTarget = camp.targetType === 'tag' || Boolean(camp.groupName?.startsWith('Tag: '));
    setTargetType(isTagTarget ? 'tag' : 'group');
    setSelectedGroup(!isTagTarget ? (camp.groupName || '') : '');

    const campTags = Array.isArray(camp.targetTags)
      ? camp.targetTags
      : camp.groupName?.startsWith('Tag: ')
      ? camp.groupName.replace('Tag: ', '').split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    setSelectedTags(campTags);
    setTagSelectionType(campTags.length > 1 ? 'multiple' : 'single');

    const isManual = camp.messageSource === 'manual' || (!camp.templateId && Boolean(camp.messageContent));
    setMessageSource(isManual ? 'manual' : 'template');
    setSelectedTemplate(camp.templateId || '');
    setManualMessage(camp.messageContent || '');

    setCampaignPriority(camp.priority || 'normal');
    setSelectedSessionId(
      camp.sessionUsed === 'Auto-Rotate Pool' || !camp.sessionUsed ? 'auto_rotate' : (
        sessions?.find((s) => s.name === camp.sessionUsed || s.id === camp.sessionUsed)?.id || camp.sessionUsed
      )
    );
    setFormError('');
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!campaignName.trim()) {
      setFormError('Nama broadcast wajib diisi.');
      return;
    }
    if (targetType === 'group' && !selectedGroup) {
      setFormError('Pilih target segmen audiens terlebih dahulu.');
      return;
    }
    if (targetType === 'tag' && selectedTags.length === 0) {
      setFormError('Pilih minimal satu tag target audiens terlebih dahulu.');
      return;
    }

    let tpl = null;
    if (messageSource === 'template') {
      if (!selectedTemplate) {
        setFormError('Pilih template pesan terlebih dahulu.');
        return;
      }
      tpl = templates?.find((t) => t.id === selectedTemplate);
      if (!tpl) {
        setFormError('Template yang dipilih tidak ditemukan. Muat ulang halaman lalu coba lagi.');
        return;
      }
    } else {
      if (!manualMessage.trim()) {
        setFormError('Tulis isi pesan teks broadcast terlebih dahulu.');
        return;
      }
    }

    const isManual = messageSource === 'manual';
    const finalTemplateId = isManual ? null : tpl?.id;
    const finalTemplateTitle = isManual ? 'Teks Manual' : tpl?.title;
    const finalMessageContent = isManual ? manualMessage.trim() : (tpl?.content || null);

    const chosenSession = sessions?.find((s) => s.id === selectedSessionId);
    const sessionLabel = selectedSessionId === 'auto_rotate' ? 'Auto-Rotate Pool' : chosenSession?.name || selectedSessionId;

    setCreating(true);
    try {
      if (editingCampaign) {
        // Mode Update Kampanye
        const updatedFields = {
          name: campaignName.trim(),
          groupName: targetType === 'group' ? selectedGroup : `Tag: ${selectedTags.join(', ')}`,
          targetType,
          targetTags: targetType === 'tag' ? selectedTags : null,
          templateId: finalTemplateId,
          templateTitle: finalTemplateTitle,
          messageSource: isManual ? 'manual' : 'template',
          messageContent: finalMessageContent,
          sessionUsed: sessionLabel,
          priority: campaignPriority,
        };
        await onCampaignUpdate?.(editingCampaign.id, updatedFields);
        if (selectedCampaign?.id === editingCampaign.id) {
          setSelectedCampaign((prev) => (prev ? { ...prev, ...updatedFields } : prev));
        }
        setEditingCampaign(null);
        setCampaignName('');
        setSelectedTemplate('');
        setManualMessage('');
        setMessageSource('template');
        setSelectedGroup('');
        setSelectedTags([]);
        setTagSelectionType('single');
        setCampaignPriority('normal');
        setIsWizardOpen(false);
      } else {
        // Mode Buat Kampanye Baru - gunakan batchId unik agar terisolasi dari kampanye lain
        const newBatchId = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const seed = resolvedTargetMembers.map((c, i) => ({
          id: `q_${Date.now()}_${i}`,
          campaignId: newBatchId,
          phone: normalizePhone(c.phone),
          name: c.name,
          custom: resolveRecipientCustom(c),
          status: 'draft',
          sentAt: '-',
          session: sessionLabel,
        }));

        const displayGroup = targetType === 'group' ? selectedGroup : `Tag: ${selectedTags.join(', ')}`;

        const created = await onCampaignCreate?.({
          name: campaignName.trim(),
          batchId: newBatchId,
          groupName: displayGroup,
          targetType,
          targetTags: targetType === 'tag' ? selectedTags : null,
          templateId: finalTemplateId,
          templateTitle: finalTemplateTitle,
          messageSource: isManual ? 'manual' : 'template',
          messageContent: finalMessageContent,
          sessionUsed: sessionLabel,
          priority: campaignPriority,
          totalRecipients: seed.length,
          status: 'idle',
          campaignId: newBatchId,
          queue: seed,
        });

        if (!created) {
          setFormError('Broadcast gagal disimpan. Coba lagi.');
          return;
        }

        setCampaignName('');
        setSelectedTemplate('');
        setManualMessage('');
        setMessageSource('template');
        setSelectedGroup('');
        setSelectedTags([]);
        setTagSelectionType('single');
        setCampaignPriority('normal');
        setIsWizardOpen(false);
        setSelectedCampaign(created);
        setRecipientQueue(created.queue || []);
        setSubView('queue');
      }
    } catch (err) {
      setFormError(err?.message || 'Broadcast gagal disimpan.');
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
        const isManual = selectedCampaign?.messageSource === 'manual' || (!selectedCampaign?.templateId && Boolean(selectedCampaign?.messageContent));
        const tpl = isManual
          ? {
              messageType: 'text',
              content: selectedCampaign?.messageContent || '',
            }
          : templates.find((t) => t.id === selectedCampaign?.templateId) || {
              messageType: 'text',
              content: selectedCampaign?.messageContent || selectedCampaign?.content || 'Pemberitahuan',
            };
        const recipientCustom = resolveRecipientCustom(item);
        const rendered = renderMessage(tpl.content, {
          name: item.name || 'Pelanggan',
          nama: item.name || 'Pelanggan',
          phone: item.phone,
          ...recipientCustom,
          custom: recipientCustom,
        });

        if (tpl.messageType === 'media') {
          await sendMedia({
            sessionId: activeSessionId,
            to: item.phone,
            mediaType: tpl.mediaType || 'image',
            mediaUrl: tpl.mediaUrl,
            fileName: tpl.fileName || undefined,
            caption: rendered,
            priority: selectedCampaign?.priority || 'normal',
            batchId: selectedCampaign?.batchId || undefined,
          });
        } else {
          await sendText({
            sessionId: activeSessionId,
            to: item.phone,
            text: rendered,
            priority: selectedCampaign?.priority || 'normal',
            batchId: selectedCampaign?.batchId || undefined,
          });
        }
      }

      // Perbarui status kontak di antrean lokal menjadi queued (menunggu di gateway)
      const nextQueue = recipientQueue.map((q) => {
        if (q.phone === item.phone) {
          return { ...q, status: 'queued', error: null };
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
      setFormError('Pilih atau buat broadcast terlebih dahulu sebelum menambah nomor antrean.');
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
      setFormError(`Nomor itu sudah ada di antrean broadcast "${targetCampaign.name}".`);
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

    // Ambil target yang belum selesai (draft lokal / antrean gateway)
    const targets = recipientQueue.filter(
      (item) => !item.status || item.status === 'draft' || item.status === 'queued' || item.status === 'pending'
    );
    if (targets.length === 0) {
      setQueueError('Antrean masih kosong atau semua target sudah terkirim.');
      return;
    }

    const isManual = selectedCampaign.messageSource === 'manual' || (!selectedCampaign.templateId && Boolean(selectedCampaign.messageContent));
    const tpl = isManual
      ? {
          id: 'manual',
          title: 'Teks Manual',
          messageType: 'text',
          content: selectedCampaign.messageContent || '',
        }
      : templates?.find((t) => t.id === selectedCampaign.templateId);

    if (!tpl) {
      setQueueError('Template atau isi pesan broadcast ini tidak ditemukan. Pastikan pesan sudah diisi.');
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
        const recipientCustom = resolveRecipientCustom(item);
        const rendered = renderMessage(tpl.content, {
          name: item.name || '',
          nama: item.name || '',
          phone: item.phone,
          ...recipientCustom,
          custom: recipientCustom,
        });

        const res = tpl.messageType === 'media'
          ? await sendMedia({
              sessionId: activeSessionId,
              to: item.phone,
              mediaType: tpl.mediaType || 'image',
              mediaUrl: tpl.mediaUrl,
              fileName: tpl.fileName || undefined,
              caption: rendered,
              priority: selectedCampaign?.priority || campaignPriority || 'normal',
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
                priority: selectedCampaign?.priority || campaignPriority || 'normal',
                batchId: activeBatchId,
              })
            : await sendText({
                sessionId: activeSessionId,
                to: item.phone,
                text: rendered,
                priority: selectedCampaign?.priority || campaignPriority || 'normal',
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
      Number(selectedCampaign.sentCount) > 0
    );

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
      const isCancelled = QUEUE_CANCELLED_STATUSES.includes(realStatus);
      const canRetry = (isFailed || isCancelled) && !isRunning;
      const mergedCustom = resolveRecipientCustom(item);

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
    const needle = queueSearch.toLowerCase().trim();
    return mergedQueue.filter((item) => {
      const matchStatus = queueStatusFilter === 'all' || item.status === queueStatusFilter;
      const matchCustom = item.custom && typeof item.custom === 'object'
        ? Object.values(item.custom).some((v) => String(v).toLowerCase().includes(needle))
        : false;
      const matchSearch =
        !needle ||
        String(item.name || '').toLowerCase().includes(needle) ||
        String(item.phone || '').includes(needle) ||
        String(item.sessionDisplay || '').toLowerCase().includes(needle) ||
        String(item.liveData?.text || '').toLowerCase().includes(needle) ||
        matchCustom;
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

  // Reset seleksi antrean HANYA jika berganti kampanye (bukan saat search berubah!)
  useEffect(() => {
    setSelectedQueueIds([]);
  }, [selectedCampaign?.id]);

  const isCampaignStarted = Boolean(
    selectedCampaign && (
      selectedCampaign.status === 'in_progress' ||
      selectedCampaign.status === 'paused' ||
      selectedCampaign.status === 'completed' ||
      Number(selectedCampaign.sentCount) > 0
    )
  );
  const canBulkDeleteQueue = !isCampaignStarted && !isRunning;

  const selectablePagedQueue = useMemo(
    () => pagedQueue.filter((i) => i.canDelete),
    [pagedQueue],
  );
  const selectablePagedKeys = useMemo(
    () => selectablePagedQueue.map((i) => i.phone || i.id),
    [selectablePagedQueue],
  );

  const isAllQueuePageSelected =
    selectablePagedKeys.length > 0 &&
    selectablePagedKeys.every((key) => selectedQueueIds.includes(key));

  const isSomeQueuePageSelected =
    selectablePagedKeys.some((key) => selectedQueueIds.includes(key)) && !isAllQueuePageSelected;

  const handleToggleSelectQueueRow = (key) => {
    setSelectedQueueIds((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const handleToggleSelectQueuePage = () => {
    if (isAllQueuePageSelected) {
      setSelectedQueueIds((prev) => prev.filter((key) => !selectablePagedKeys.includes(key)));
    } else {
      setSelectedQueueIds((prev) => Array.from(new Set([...prev, ...selectablePagedKeys])));
    }
  };

  const handleSelectAllFilteredQueue = () => {
    const filterableDeletableKeys = filteredUnifiedQueue
      .filter((i) => i.canDelete)
      .map((i) => i.phone || i.id);
    setSelectedQueueIds((prev) => Array.from(new Set([...prev, ...filterableDeletableKeys])));
  };

  const handleExecuteBulkDeleteQueue = () => {
    if (selectedQueueIds.length === 0) return;

    const nextQueue = recipientQueue.filter((item) => {
      const phone = String(item.phone || '').trim();
      const id = item.id ? String(item.id).trim() : null;
      const prefixedPhone = phone ? `q_${phone}` : null;

      const isMatch = selectedQueueIds.some((sel) => {
        const s = String(sel).trim();
        return s === phone || s === id || s === prefixedPhone || (id && s === `q_${id}`);
      });

      return !isMatch;
    });

    persistQueue(nextQueue);
    setSelectedQueueIds([]);
    setIsBulkDeleteQueueOpen(false);
  };

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
            QUEUE_SUCCESS_STATUSES.includes(i.status) || QUEUE_FAILURE_STATUSES.includes(i.status) || QUEUE_CANCELLED_STATUSES.includes(i.status)
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
    const isCurrentlyPaused = Boolean(queuePaused || selectedCampaign?.status === 'paused');
    const next = !isCurrentlyPaused;
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

      // Jika dilanjutkan (resume), gateway wa-api sudah memegang antrean batch dan worker akan
      // otomatis melanjutkan pengiriman pesan pending yang ada tanpa perlu re-dispatch gelombang baru.
      // Hanya dispatch jika kampanye belum pernah memiliki batch di gateway sama sekali.
      if (!next && selectedCampaign && !selectedCampaign.batchId) {
        const remainingTargets = recipientQueue.filter((item) => !item.status || item.status === 'draft');
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

  const handleConfirmCancelQueue = async () => {
    setIsCancellingQueue(true);
    try {
      await handleStopBlast();
      setIsCancelConfirmOpen(false);
    } finally {
      setIsCancellingQueue(false);
    }
  };

  const liveQueued = filteredUnifiedQueue.filter((m) => QUEUE_RUNNING_STATUSES.includes(m.status)).length;

  // Status jeda antrean: prioritas tunggal pada batchId kampanye yang aktif (Item #3)
  const campBatchId = selectedCampaign?.batchId;
  const monitorSessionId = activeSessionId !== 'auto'
    ? activeSessionId
    : sessions?.find((s) => s.status === 'connected')?.id;

  const loadQueueStatus = useCallback(async () => {
    // 1. Jika kampanye aktif memiliki batchId di gateway, periksa langsung status batch tersebut
    if (campBatchId) {
      try {
        const batchRes = await fetchBatchStatus(campBatchId);
        if (batchRes && typeof batchRes.isPaused === 'boolean') {
          setQueuePaused(batchRes.isPaused);
          // Sinkronkan status kampanye bila berbeda
          if (batchRes.isPaused && selectedCampaign?.status === 'in_progress') {
            setSelectedCampaign((prev) => (prev ? { ...prev, status: 'paused' } : prev));
          } else if (!batchRes.isPaused && selectedCampaign?.status === 'paused' && batchRes.activeCount > 0) {
            setSelectedCampaign((prev) => (prev ? { ...prev, status: 'in_progress' } : prev));
          }
          return;
        }
      } catch {
        // Fallback jika batch belum terdaftar di gateway
      }
    }

    // 2. Fallback per-sesi bila belum ada batchId
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
  }, [campBatchId, selectedCampaign?.status, monitorSessionId]);

  /**
   * Muat status whitelist penerima untuk batch kampanye aktif.
   * Kegagalan tidak boleh mengganggu UI — whitelist hanya informasi tambahan.
   */
  const loadBatchApproval = useCallback(async () => {
    if (!campBatchId || !monitorSessionId) {
      setBatchApproval(null);
      return;
    }
    try {
      const res = await fetchBatchApproval(monitorSessionId, campBatchId);
      setBatchApproval({
        batchId: res.batchId,
        count: res.count || 0,
        recipients: res.recipients || [],
      });
    } catch {
      setBatchApproval(null);
    }
  }, [campBatchId, monitorSessionId]);

  /**
   * Daftarkan / cabut SELURUH penerima kampanye sekaligus.
   *
   * Mengirim seluruh nomor dalam satu permintaan, bukan satu per satu: kampanye
   * bisa berisi ratusan nomor, dan memanggil endpoint per nomor akan membanjiri
   * gateway sekaligus membuat UI terasa macet.
   */
  const handleToggleAllRecipientsWhitelist = async (approve) => {
    if (!campBatchId || !monitorSessionId) return;
    setWhitelistBusy(true);
    try {
      if (approve) {
        // Ambil target dari antrean kampanye (draft lokal + antrean gateway),
        // bukan dari batchApproval yang masih kosong.
        const phones = Array.from(
          new Set(
            (selectedCampaign?.queue || recipientQueue || [])
              .map((q) => normalizePhone(q.phone))
              .filter(Boolean)
          )
        );
        if (phones.length === 0) {
          setQueueError('Tidak ada nomor pada kampanye ini untuk didaftarkan.');
          return;
        }
        const res = await approveBatchRecipients(monitorSessionId, campBatchId, phones);
        await loadBatchApproval();
        // Nomor tidak valid dilaporkan apa adanya: diam-diam melewatinya membuat
        // operator mengira seluruh penerima sudah terdaftar padahal tidak.
        const skipped = Array.isArray(res.invalid) && res.invalid.length > 0
          ? ` ${res.invalid.length} nomor tidak valid dilewati: ${res.invalid.slice(0, 3).join(', ')}${res.invalid.length > 3 ? '…' : ''}`
          : '';
        setQueueError(skipped.trim());
      } else {
        await revokeBatchApproval(monitorSessionId, campBatchId);
        await loadBatchApproval();
        setQueueError('');
      }
    } catch (err) {
      setQueueError(`Gagal ubah whitelist kampanye: ${err.message}`);
    } finally {
      setWhitelistBusy(false);
    }
  };

  const handleToggleRecipientWhitelist = async (phone, approve) => {
    if (!campBatchId || !monitorSessionId) return;
    setWhitelistBusy(true);
    try {
      if (approve) {
        await approveBatchRecipients(monitorSessionId, campBatchId, [phone]);
      } else {
        await revokeBatchApproval(monitorSessionId, campBatchId, phone);
      }
      await loadBatchApproval();
    } catch (err) {
      setQueueError(`Gagal ubah whitelist: ${err.message}`);
    } finally {
      setWhitelistBusy(false);
    }
  };

  useEffect(() => {
    void loadQueueStatus();
    void loadBatchApproval();
  }, [loadQueueStatus]);

  return (
    <div className="space-y-4">
      {/* Sub-view Tab Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface  p-4 rounded-lg border border-line border-line ">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-ink dark:text-white">
              {subView === 'campaigns' ? 'Blast Engine & Broadcast' : `Antrean Broadcast: ${selectedCampaign?.name || 'Semua Broadcast'}`}
            </h1>
            {subView === 'queue' && selectedCampaign?.priority === 'high' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-honey text-honey border border-honey-line">
                <Zap className="w-3 h-3" /> Prioritas High
              </span>
            )}
            <Badge variant="outline" className="text-[10px]">
              {subView === 'campaigns'
                ? `${campaigns.length} Broadcast`
                : `${filteredUnifiedQueue.length} Target · ${
                    selectedCampaign?.status === 'completed'
                      ? 'Selesai'
                      : isRunning
                      ? `${pendingCount + activePacingCount} Berjalan`
                      : selectedCampaign?.status === 'in_progress'
                      ? 'Diproses Gateway'
                      : `${draftCount} Siap Kirim`
                  }`}
            </Badge>
          </div>
          <p className="text-xs text-ink-muted text-ink-muted mt-0.5">
            {subView === 'campaigns'
              ? 'Kelola tugas broadcast WhatsApp dengan opsi nomor spesifik atau auto-rotate pool.'
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
                <span>Daftar Broadcast</span>
              </Button>
              {selectedCampaign && (liveQueued > 0 || isRunning || draftCount > 0) && (
                <Button
                  onClick={() => setIsCancelConfirmOpen(true)}
                  disabled={isCancellingQueue}
                  variant="outline"
                  size="sm"
                  className="text-xs border-clay-line text-clay text-clay hover:bg-clay-wash dark:hover:bg-rose-950/30"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Batalkan Sisa Antrean</span>
                </Button>
              )}
              {failedItems.length > 0 && (
                <Button
                  onClick={handleRetryAllFailed}
                  disabled={isRetryingAllFailed}
                  variant="outline"
                  size="sm"
                  className="text-xs border-honey-line text-honey text-honey hover:bg-honey-wash dark:hover:bg-amber-950/30"
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
                  setEditingCampaign(null);
                  setCampaignName('');
                  setSelectedGroup(groups[0]?.name || '');
                  setSelectedTemplate(templates[0]?.id || '');
                  setSelectedSessionId('auto_rotate');
                  setCampaignPriority('normal');
                  setFormError('');
                  setWizardStep(1);
                  setIsWizardOpen(true);
                }}
                variant="default"
                size="sm"
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Buat Broadcast Baru</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* TAMPILAN 1: DAFTAR BROADCAST (SUBVIEW = 'campaigns') */}
      {subView === 'campaigns' && (
        <div className="bg-surface  rounded-lg border border-line border-line overflow-hidden ">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-soft text-ink-soft min-w-[750px]">
              <thead className="bg-shell bg-surface text-ink-soft text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line border-line">
                <tr>
                  <th className="py-2.5 px-4">Nama Broadcast</th>
                  <th className="py-2.5 px-4">Segmen Audiens</th>
                  <th className="py-2.5 px-4">Template Pesan</th>
                  <th className="py-2.5 px-4">Sesi WhatsApp</th>
                  <th className="py-2.5 px-4">Status & Progres</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink text-ink">
                      <div className="flex items-center gap-1.5">
                        <span>{camp.name}</span>
                        {camp.priority === 'high' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-honey text-honey border border-honey-line">
                            <Zap className="w-2.5 h-2.5" /> High
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-ink-faint font-mono mt-0.5">{camp.createdAt}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[10px]">
                        {camp.groupName}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-ink font-medium">
                      {camp.messageSource === 'manual' || camp.templateTitle === 'Teks Manual' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-brand font-semibold">
                          <Type className="w-3.5 h-3.5" />
                          <span>Teks Manual</span>
                        </span>
                      ) : (
                        <span>{camp.templateTitle || '-'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-leaf-deep text-brand-soft font-medium">
                        <Smartphone className="w-3 h-3 text-ink-faint" />
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
                                <span className="inline-flex items-center gap-1 font-semibold text-brand-deep">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                  <span>Berjalan</span>
                                </span>
                              ) : stats.derivedStatus === 'paused' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-honey text-honey">
                                  <span className="w-1.5 h-1.5 rounded-full bg-honey" />
                                  <span>Dijeda</span>
                                </span>
                              ) : stats.derivedStatus === 'completed' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-brand-deep">
                                  <CheckCircle2 className="w-3 h-3 text-brand" />
                                  <span>Selesai</span>
                                </span>
                              ) : stats.derivedStatus === 'failed' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-clay text-clay">
                                  <AlertCircle className="w-3 h-3 text-rose-500" />
                                  <span>Gagal</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-ink-muted text-ink-muted">
                                  <span className="w-1.5 h-1.5 rounded-full bg-line-strong" />
                                  <span>Siap Mulai</span>
                                </span>
                              )}

                              <span className="font-mono text-ink-muted text-ink-muted">
                                {stats.successCount + stats.failedCount} / {stats.total}
                              </span>
                            </div>

                            {/* Baris Tengah: Multi-Segment Stacked Progress Bar */}
                            <div className="h-2.5 w-full rounded-full bg-surface-sunken border border-line-strong/40 overflow-hidden flex">
                              {stats.successPct > 0 && (
                                <div
                                  style={{ width: `${stats.successPct}%` }}
                                  className="h-full bg-leaf transition-all duration-300"
                                  title={`${stats.successCount} Berhasil`}
                                />
                              )}
                              {stats.failedPct > 0 && (
                                <div
                                  style={{ width: `${stats.failedPct}%` }}
                                  className="h-full bg-clay transition-all duration-300"
                                  title={`${stats.failedCount} Gagal`}
                                />
                              )}
                              {stats.inFlightPct > 0 && (
                                <div
                                  style={{ width: `${stats.inFlightPct}%` }}
                                  className="h-full bg-honey animate-pulse transition-all duration-300"
                                  title={`${stats.inFlightCount} Sedang Diproses`}
                                />
                              )}
                            </div>

                            {/* Baris Bawah: Breakdown Angka Berhasil & Gagal */}
                            <div className="flex items-center gap-2 text-[10px] flex-wrap font-medium">
                              <span className="text-leaf-deep inline-flex items-center gap-1 font-semibold">
                                <Check className="w-3 h-3 text-leaf" />
                                <span>{stats.successCount} berhasil</span>
                              </span>
                              {stats.failedCount > 0 && (
                                <span className="text-clay inline-flex items-center gap-1">
                                  <X className="w-3 h-3 text-clay" />
                                  <span>{stats.failedCount} gagal</span>
                                </span>
                              )}
                              {stats.inFlightCount > 0 && (
                                <span className="text-honey inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-honey animate-spin" />
                                  <span>{stats.inFlightCount} proses</span>
                                </span>
                              )}
                              {stats.draftCount > 0 && stats.derivedStatus === 'idle' && (
                                <span className="text-ink-faint text-ink-faint">
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
                            className="text-xs h-7 text-ink-muted hover:text-ink dark:hover:text-white"
                            title="Edit informasi broadcast"
                          >
                            <Edit2 className="w-3 h-3 mr-1 text-ink-faint" />
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
                          <ListOrdered className="w-3 h-3 mr-1 text-brand-deep" />
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
          {/* Card Kontrol Terpadu Kampanye & Anti-Ban (UI/UX Clean) */}
          {selectedCampaign && (
            <div className="bg-surface rounded-xl border border-line p-3.5 sm:p-4 space-y-3 shadow-xs">
              {/* Baris 1: Header Kampanye, Status & Aksi Utama */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      sending
                        ? 'bg-amber-500 animate-pulse'
                        : queuePaused || selectedCampaign.status === 'paused'
                        ? 'bg-amber-500'
                        : selectedCampaign.status === 'in_progress'
                        ? 'bg-brand animate-pulse'
                        : selectedCampaign.status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-semibold text-sm text-ink">{selectedCampaign.name}</span>
                  {selectedCampaign.batchId ? (
                    <span className="font-mono text-[11px] text-ink-muted bg-surface-alt px-2 py-0.5 rounded border border-line/60">
                      {selectedCampaign.batchId}
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-muted bg-surface-alt px-2 py-0.5 rounded border border-line/60">
                      draft lokal
                    </span>
                  )}
                  <Badge
                    variant={
                      selectedCampaign.status === 'in_progress'
                        ? 'default'
                        : selectedCampaign.status === 'completed'
                        ? 'outline'
                        : 'secondary'
                    }
                    className={`text-[10px] font-medium ${
                      selectedCampaign.status === 'completed'
                        ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                        : ''
                    }`}
                  >
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
                    <Badge variant="outline" className="text-[10px] border-line font-mono text-ink-muted inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 opacity-70" />
                      <span>Jeda {avgPacingSec.toFixed(1)}s</span>
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
                    className="h-8 text-xs border-line hover:bg-surface-alt disabled:opacity-50"
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5 text-ink-muted" />
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
                        className="h-8 text-xs border-line hover:bg-surface-alt"
                      >
                        {queuePaused || selectedCampaign.status === 'paused' ? (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1.5 text-brand-deep" />
                            <span>Lanjutkan Antrean</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                            <span>Jeda Antrean</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleStopBlast}
                        className="h-8 text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                        title="Hentikan dan batalkan sisa antrean blast di gateway"
                      >
                        <Square className="w-3.5 h-3.5 mr-1.5" />
                        <span>Stop</span>
                      </Button>
                    </div>
                  ) : selectedCampaign.status === 'completed' ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium inline-flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        <span>Selesai Terkirim</span>
                      </div>
                      {recipientQueue.some((i) => !i.status || i.status === 'draft' || QUEUE_FAILURE_STATUSES.includes(i.status)) && (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={handleStartBlast}
                          className="h-8 text-xs bg-brand hover:bg-brand text-white"
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" />
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
                      className="h-8 text-xs bg-brand hover:bg-brand text-white font-medium"
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      <span>{sending ? 'Menyerahkan ke Gateway...' : 'Mulai Blast'}</span>
                    </Button>
                  )}

                  {/* Whitelist penerima kampanye (contactGraph).
                      Penerima blast adalah kontak baru, jadi tanpa didaftarkan
                      seluruh kampanye akan tertahan handshake. Kontrol ini
                      berlaku untuk SELURUH penerima kampanye; pengecualian
                      per nomor tersedia di kolom Whitelist pada tabel antrean. */}
                  {campBatchId && (
                    <label
                      className="flex items-center gap-2 px-2.5 h-8 rounded-md border border-line bg-surface-alt cursor-pointer select-none"
                      title="Daftarkan penerima kampanye ini agar melewati handshake contactGraph"
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 accent-[var(--color-brand-deep)] cursor-pointer"
                        disabled={whitelistBusy}
                        checked={Boolean(batchApproval && batchApproval.count > 0)}
                        onChange={(e) => handleToggleAllRecipientsWhitelist(e.target.checked)}
                      />
                      <span className="text-[11px] text-ink-muted font-medium whitespace-nowrap">
                        Penerima lolos handshake
                      </span>
                      {batchApproval && (
                        <span className="text-[10px] font-mono text-ink-faint">
                          {batchApproval.count} nomor
                        </span>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Baris 2: Sub-toolbar Integrasi Sesi Pengirim & Pengaturan Anti-Ban */}
              <div className="pt-2.5 border-t border-line/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
                {/* Kiri: Info Sesi Pengirim */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-1 rounded bg-surface-alt text-ink-muted">
                    {targetAntibanSession ? (
                      <Smartphone className="w-3.5 h-3.5" />
                    ) : (
                      <Radio className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-ink-muted">Sesi Pengirim:</span>
                  <span className="font-semibold text-ink">
                    {targetAntibanSession ? targetAntibanSession.name : 'Auto-Rotate Pool'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Terkoneksi</span>
                  </span>
                </div>

                {/* Kanan: Pengaturan Preset Anti-Ban */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-surface-alt">
                      {activeAntibanPreset === 'broadcast' ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : activeAntibanPreset === 'strict' ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <span className="text-ink-muted">Anti-Ban:</span>
                    <span
                      className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md border ${
                        activeAntibanPreset === 'broadcast'
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                          : activeAntibanPreset === 'strict'
                          ? 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400'
                          : 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {activeAntibanPreset}
                    </span>
                    {activeAntibanPreset === 'broadcast' ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 hidden lg:inline font-medium">
                        (Tanpa distraksi, optimal blast)
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 hidden lg:inline font-medium">
                        (Jeda distraksi aktif 5-20m)
                      </span>
                    )}
                  </div>

                  {activeAntibanPreset !== 'broadcast' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updatingAntiban}
                      onClick={() => handleChangeAntibanPreset('broadcast')}
                      className="h-7 text-[11px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium px-2.5"
                      title="Ganti ke preset Broadcast untuk pengiriman massal tanpa tertahan jeda distraksi"
                    >
                      <Zap className="w-3 h-3 mr-1 text-emerald-500" />
                      <span>Setel ke Broadcast</span>
                    </Button>
                  )}

                  <select
                    disabled={updatingAntiban || loadingAntiban}
                    value={activeAntibanPreset}
                    onChange={(e) => handleChangeAntibanPreset(e.target.value)}
                    className="h-7 px-2 text-xs rounded-md bg-surface-alt border border-line text-ink font-medium focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
                  >
                    <option value="broadcast">Broadcast (Blast & Notifikasi)</option>
                    <option value="balanced">Balanced (Chat Interaktif)</option>
                    <option value="strict">Strict (Keamanan Ekstra)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Alert Notifikasi Perubahan Preset (Berwarna & Elegan, Tanpa Plain Outline Hitam) */}
          {antibanFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between gap-3 transition-all ${
                antibanFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {antibanFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span className="font-medium">{antibanFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setAntibanFeedback(null)}
                className={`p-1 rounded-md transition hover:bg-black/5 dark:hover:bg-white/10 ${
                  antibanFeedback.type === 'success'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {queueError && (
            <div className="p-2.5 rounded-lg bg-clay-wash  border border-clay-line text-[11px] text-clay-deep">
              {queueError}
            </div>
          )}

          {/* Filter Toolbar Antrean */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface  p-3 rounded-lg border border-line border-line text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={queueStatusFilter}
                onChange={(e) => setQueueStatusFilter(e.target.value)}
                className="py-1.5 px-3 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
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
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Cari nama, nomor, pesan, atau custom field..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className={`w-full pl-8 ${queueSearch ? 'pr-8' : 'pr-3'} py-1.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand`}
              />
              {queueSearch && (
                <button
                  type="button"
                  onClick={() => setQueueSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-ink-faint hover:text-ink transition-colors"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Floating / Sticky Bulk Action Bar Antrean */}
          {selectedQueueIds.length > 0 && canBulkDeleteQueue && (
            <div className="bg-brand-wash border border-brand-line p-2.5 px-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-brand-deep shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold font-mono">{selectedQueueIds.length} nomor antrean dipilih</span>
                {queueSearch && (
                  <span className="text-[10px] bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded text-brand-deep font-medium">
                    Lintas Pencarian
                  </span>
                )}
                {filteredUnifiedQueue.filter((i) => i.canDelete).some((i) => !selectedQueueIds.includes(i.id || i.phone)) && (
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredQueue}
                    className="underline hover:opacity-80 text-[11px] font-medium"
                  >
                    + Tambah {filteredUnifiedQueue.filter((i) => i.canDelete && !selectedQueueIds.includes(i.id || i.phone)).length} nomor hasil filter ini
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQueueIds([])}
                  className="h-7 text-xs border-line text-ink-muted hover:text-ink"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span>Batal Seleksi</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkDeleteQueueOpen(true)}
                  className="h-7 text-xs text-clay border-clay-line hover:bg-clay-wash"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Hapus Terpilih ({selectedQueueIds.length})</span>
                </Button>
              </div>
            </div>
          )}

          {/* Tabel Tunggal Terpadu: Target Kampanye & Status Live wa-api */}
          <div className="bg-surface  rounded-lg border border-line border-line overflow-hidden ">
            <div className="p-3.5 border-b border-line border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-ink dark:text-white uppercase tracking-wider">
                  Daftar Antrean & Progres Pengiriman
                </h2>
                <p className="text-[11px] text-ink-muted text-ink-muted">
                  {sentCount} terkirim · {activePacingCount > 0 ? `${activePacingCount} jeda pacing · ` : ''}{pendingCount} menunggu
                  {selectedCampaign?.batchId ? ` · Batch: ${selectedCampaign.batchId}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {loadingQueue && (
                  <span className="text-[10px] text-ink-faint flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Sinkron wa-api
                  </span>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {filteredUnifiedQueue.length} target
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink-soft text-ink-soft min-w-[760px]">
                <thead className="bg-shell bg-surface text-ink-soft text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line border-line">
                  <tr>
                    {canBulkDeleteQueue && (
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectQueuePage}
                          disabled={selectablePagedKeys.length === 0}
                          className="p-1 rounded text-ink-muted hover:text-ink transition-colors flex items-center justify-center mx-auto disabled:opacity-40 cursor-pointer"
                          title={isAllQueuePageSelected ? 'Batal pilih semua di halaman ini' : 'Pilih semua di halaman ini'}
                        >
                          {isAllQueuePageSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-deep" />
                          ) : isSomeQueuePageSelected ? (
                            <MinusSquare className="w-4 h-4 text-brand-deep" />
                          ) : (
                            <Square className="w-4 h-4 text-ink-faint" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Kontak & Nomor</th>
                    <th className="py-2.5 px-4">Sesi Pengirim</th>
                    <th className="py-2.5 px-4">Broadcast / Pesan</th>
                    <th className="py-2.5 px-4">Variabel Khusus</th>
                    <th className="py-2.5 px-4">Status & Jeda</th>
                    <th className="py-2.5 px-4 text-center" title="Penerima kampanye yang didaftarkan agar melewati handshake contactGraph">Whitelist</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pagedQueue.length === 0 ? (
                    <tr>
                      <td colSpan={canBulkDeleteQueue ? 9 : 8} className="py-8 text-center text-ink-faint text-ink-faint">
                        {loadingQueue
                          ? 'Memuat antrean...'
                          : 'Belum ada nomor target pada filter ini. Klik "Tambah Nomor Antrean" atau "Muat Kontak Segmen".'}
                      </td>
                    </tr>
                  ) : (
                    pagedQueue.map((item, idx) => {
                      const itemKey = item.phone || item.id;
                      const isSelected = selectedQueueIds.includes(itemKey) || (item.phone && selectedQueueIds.includes(item.phone)) || (item.id && selectedQueueIds.includes(item.id));
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-brand-wash/50 dark:bg-brand/10' : 'hover:bg-surface-alt/60'
                          }`}
                        >
                          {canBulkDeleteQueue && (
                            <td className="py-2.5 px-3 text-center">
                              {item.canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectQueueRow(itemKey)}
                                  className="p-1 rounded text-ink-muted hover:text-ink transition-colors flex items-center justify-center mx-auto cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-brand-deep" />
                                  ) : (
                                    <Square className="w-4 h-4 text-ink-faint" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-[10px] text-ink-faint italic">-</span>
                              )}
                            </td>
                          )}
                          <td className="py-2.5 px-4 text-center text-[11px] text-ink-faint">
                            {(safeQueuePage - 1) * QUEUE_PAGE_SIZE + idx + 1}
                          </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-ink text-ink">{item.name}</div>
                          <div className="text-[11px] text-leaf-deep text-brand-soft font-medium">+{item.phone}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-sunken border border-line text-[11px] font-medium text-ink-soft">
                            <Smartphone className="w-3 h-3 text-brand shrink-0" />
                            <span className="truncate max-w-[120px]" title={item.sessionDisplay}>{item.sessionDisplay}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-[11px] font-medium text-ink-soft text-ink-soft">
                            {item.campaignName || selectedCampaign?.name || '-'}
                          </div>
                          {item.liveData?.text ? (
                            <div className="text-[10px] text-ink-faint truncate max-w-[200px]" title={item.liveData.text}>
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
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken bg-surface-alt border border-line border-line text-ink-soft text-ink-soft font-mono"
                                >
                                  {k}: <span className="font-semibold text-brand-deep">{String(v)}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-ink-faint">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {item.status === 'draft' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft text-ink-muted font-medium">
                              <Clock className="w-3.5 h-3.5 text-ink-faint" />
                              <span>Siap Dikirim</span>
                            </span>
                          ) : ['sent', 'delivered', 'read'].includes(item.status) ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] text-brand-deep font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{item.status === 'read' ? 'Dibaca' : item.status === 'delivered' ? 'Sampai' : 'Terkirim'}</span>
                              </span>
                              {item.liveData?.timestamp && (
                                <div className="text-[10px] text-ink-faint">
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
                          ) : item.status === 'cancelled' ? (
                            <div>
                              <span
                                className="inline-flex items-center gap-1 text-[11px] text-ink-muted text-ink-muted font-medium"
                                title={item.liveData?.errorDetail || item.error || 'Dibatalkan oleh pengguna'}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Dibatalkan</span>
                              </span>
                              {item.liveData?.errorDetail && (
                                <div className="text-[10px] text-ink-faint truncate max-w-[160px]" title={item.liveData.errorDetail}>
                                  {item.liveData.errorDetail}
                                </div>
                              )}
                            </div>
                          ) : ['failed', 'invalid_number', 'not_registered'].includes(item.status) ? (
                            <div>
                              <span
                                className="inline-flex items-center gap-1 text-[11px] text-clay text-clay font-medium"
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
                              <span className="inline-flex items-center gap-1 text-[11px] text-honey text-honey font-medium animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Antrean Gateway</span>
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted text-ink-muted font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{QUEUE_STATUS_LABEL[item.status] || item.status}</span>
                            </span>
                          )}
                        </td>
                        {/* Whitelist penerima kampanye (contactGraph).
                            Sumber kebenaran ada di gateway; sel ini hanya cermin
                            dari batchApproval yang dimuat lewat loadBatchApproval(). */}
                        <td className="py-2.5 px-4 text-center">
                          {(() => {
                            const jid = `${normalizePhone(item.phone)}@s.whatsapp.net`;
                            const approved = Boolean(
                              batchApproval?.recipients?.includes(jid)
                            );
                            const canManage = Boolean(campBatchId && monitorSessionId);
                            if (!canManage) {
                              return <span className="text-[11px] text-ink-faint">—</span>;
                            }
                            return (
                              <button
                                type="button"
                                disabled={whitelistBusy}
                                onClick={() => handleToggleRecipientWhitelist(item.phone, !approved)}
                                title={
                                  approved
                                    ? 'Terdaftar: nomor ini boleh melewati handshake pada kampanye ini. Klik untuk mencabut.'
                                    : 'Belum terdaftar: nomor ini akan tertahan handshake. Klik untuk mendaftarkan.'
                                }
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition cursor-pointer disabled:opacity-50 ${
                                  approved
                                    ? 'bg-brand-wash/60 dark:bg-brand/15 text-brand-deep dark:text-brand border-brand-line'
                                    : 'bg-surface-alt text-ink-faint border-line hover:text-ink'
                                }`}
                              >
                                {approved ? (
                                  <>
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>Terdaftar</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>Handshake</span>
                                  </>
                                )}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {item.canRetry && (
                              <button
                                type="button"
                                disabled={retryingPhones.has(item.phone)}
                                onClick={() => handleRetryRecipient(item)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-honey-wash hover:bg-amber-500/20 text-honey text-honey border border-honey-line text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
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
                                className="p-1.5 rounded-lg text-ink-faint hover:text-rose-500 hover:bg-clay-wash dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                title="Hapus nomor dari antrean lokal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : !item.canRetry ? (
                              <span className="text-[10px] text-ink-faint text-ink-faint italic">Terkunci</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>

            {filteredUnifiedQueue.length > QUEUE_PAGE_SIZE && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2.5 border-t border-line border-line text-[11px] text-ink-muted text-ink-muted">
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
                  <span className="px-2 font-medium text-ink-soft text-ink-soft">
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

      {/* Modal Buat / Edit Kampanye: Wizard 3 Langkah Interaktif */}
      <Dialog open={isWizardOpen} onOpenChange={(open) => {
        setIsWizardOpen(open);
        if (!open) {
          setEditingCampaign(null);
          setWizardStep(1);
        }
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-bold text-ink">
                {editingCampaign ? 'Edit Informasi Broadcast' : 'Buat Broadcast Baru'}
              </DialogTitle>
              <span className="text-[11px] font-mono font-semibold text-brand">
                Langkah {wizardStep} dari 3
              </span>
            </div>
            {/* Wizard Step Progress Indicator */}
            <div className="grid grid-cols-3 gap-1.5 pt-2">
              <div className={`h-1.5 rounded-full transition-colors ${wizardStep >= 1 ? 'bg-brand' : 'bg-line'}`} />
              <div className={`h-1.5 rounded-full transition-colors ${wizardStep >= 2 ? 'bg-brand' : 'bg-line'}`} />
              <div className={`h-1.5 rounded-full transition-colors ${wizardStep >= 3 ? 'bg-brand' : 'bg-line'}`} />
            </div>
            <div className="grid grid-cols-3 text-[10px] font-medium text-ink-muted pt-0.5">
              <span className={wizardStep === 1 ? 'text-brand-deep font-bold' : ''}>1. Target Audiens</span>
              <span className={`text-center ${wizardStep === 2 ? 'text-brand-deep font-bold' : ''}`}>2. Pesan & Template</span>
              <span className={`text-right ${wizardStep === 3 ? 'text-brand-deep font-bold' : ''}`}>3. Sesi & Pacing</span>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs py-2">
            {/* STEP 1: NAMA BROADCAST & TARGET AUDIENS (GRUP ATAU TAG) */}
            {wizardStep === 1 && (
              <div className="space-y-4 blast-page-transition">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">
                    Nama Broadcast *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Promo Akhir Pekan September"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
                  />
                  <p className="text-[10px] text-ink-faint mt-1">
                    Beri nama yang mudah dikenali dalam riwayat pengiriman.
                  </p>
                </div>

                {/* Target Type Selector: Tab Segmen Grup vs Multi-Tag */}
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1.5">
                    Target Audiens Berdasarkan *
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      disabled={Boolean(editingCampaign)}
                      onClick={() => setTargetType('group')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        targetType === 'group'
                          ? 'border-brand bg-brand-wash text-brand-deep font-semibold'
                          : 'border-line bg-surface-alt text-ink-muted hover:text-ink'
                      }`}
                    >
                      <div className="text-xs font-semibold">Segmen Grup</div>
                      <div className="text-[10px] opacity-80">Kirim ke semua kontak dalam segmen</div>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(editingCampaign)}
                      onClick={() => setTargetType('tag')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        targetType === 'tag'
                          ? 'border-brand bg-brand-wash text-brand-deep font-semibold'
                          : 'border-line bg-surface-alt text-ink-muted hover:text-ink'
                      }`}
                    >
                      <div className="text-xs font-semibold">Tag / Label (Multi-Tag)</div>
                      <div className="text-[10px] opacity-80">Filter fleksibel berdasarkan tag kontak</div>
                    </button>
                  </div>

                  {/* Mode Pilihan Grup */}
                  {targetType === 'group' ? (
                    <div className="space-y-2">
                      <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        disabled={Boolean(editingCampaign)}
                        className="w-full h-9 px-3 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand disabled:opacity-50"
                      >
                        <option value="">Pilih segmen audiens...</option>
                        {groups?.map((g) => (
                          <option key={g.id} value={g.name}>
                            {g.name} ({g.count} kontak)
                          </option>
                        ))}
                      </select>

                      {groups?.length === 0 && (
                        <p className="text-[10px] text-honey mt-1">
                          Belum ada segmen. Buat segmen dan tambahkan kontak terlebih dahulu di halaman Kontak.
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Mode Pilihan Tag Target */
                    <div className="space-y-3 p-3 rounded-lg border border-line bg-surface-alt/40">
                      {/* Pilihan: Tag Tunggal (Salah Satu) vs Kombinasi Tag */}
                      <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-line text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setTagSelectionType('single');
                            if (selectedTags.length > 1) {
                              setSelectedTags([selectedTags[0]]);
                            }
                          }}
                          className={`flex-1 py-1 px-2.5 rounded-md text-center transition-all ${
                            tagSelectionType === 'single'
                              ? 'bg-brand text-white font-semibold shadow-xs'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          Salah Satu Tag (Tunggal)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTagSelectionType('multiple')}
                          className={`flex-1 py-1 px-2.5 rounded-md text-center transition-all ${
                            tagSelectionType === 'multiple'
                              ? 'bg-brand text-white font-semibold shadow-xs'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          Kombinasi Beberapa Tag
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-ink">
                          {tagSelectionType === 'single' ? 'Pilih 1 Tag Target:' : 'Pilih Beberapa Tag:'}
                        </span>

                        {/* Match Mode Switch: Hanya muncul pada mode Kombinasi Beberapa Tag */}
                        {tagSelectionType === 'multiple' && (
                          <div className="flex items-center gap-1 bg-surface p-0.5 rounded border border-line text-[10px]">
                            <button
                              type="button"
                              onClick={() => setTagMatchMode('or')}
                              className={`px-2 py-0.5 rounded font-mono transition-colors ${
                                tagMatchMode === 'or'
                                  ? 'bg-brand text-white font-semibold'
                                  : 'text-ink-muted hover:text-ink'
                              }`}
                              title="Kontak yang memiliki salah satu tag terpilih akan menerima pesan"
                            >
                              Minimal Salah Satu (OR)
                            </button>
                            <button
                              type="button"
                              onClick={() => setTagMatchMode('and')}
                              className={`px-2 py-0.5 rounded font-mono transition-colors ${
                                tagMatchMode === 'and'
                                  ? 'bg-brand text-white font-semibold'
                                  : 'text-ink-muted hover:text-ink'
                              }`}
                              title="Hanya kontak yang memiliki semua tag terpilih yang akan menerima pesan"
                            >
                              Wajib Semua (AND)
                            </button>
                          </div>
                        )}
                      </div>

                      {availableTags.length === 0 ? (
                        <p className="text-[10px] text-honey italic">
                          Belum ada tag yang terdaftar pada kontak. Berikan tag pada kontak di halaman Kontak terlebih dahulu.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                          {availableTags.map((t) => {
                            const isSelected = selectedTags.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  if (tagSelectionType === 'single') {
                                    setSelectedTags(isSelected ? [] : [t]);
                                  } else {
                                    setSelectedTags((prev) =>
                                      isSelected ? prev.filter((item) => item !== t) : [...prev, t]
                                    );
                                  }
                                }}
                                className={`px-2 py-1 rounded text-xs font-mono border transition-all ${
                                  isSelected
                                    ? 'bg-brand text-white border-brand shadow-sm font-semibold'
                                    : 'bg-surface text-ink-muted border-line hover:border-brand/40 hover:text-ink'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-[10px] text-ink-muted leading-relaxed">
                        {tagSelectionType === 'single'
                          ? 'Klik satu tag di atas. Hanya satu tag yang dapat aktif.'
                          : tagMatchMode === 'and'
                          ? 'Mode Wajib Semua: hanya kontak yang memiliki seluruh tag terpilih yang akan menerima pesan.'
                          : 'Mode Salah Satu: kontak yang memiliki minimal salah satu tag terpilih akan menerima pesan.'}
                      </p>
                    </div>
                  )}

                  {/* Ringkasan Estimasi Jumlah Penerima */}
                  {resolvedTargetMembers.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-brand-wash border border-brand-line text-[11px] text-brand-deep flex items-center justify-between">
                      <span>Estimasi target penerima:</span>
                      <span className="font-mono font-bold text-xs">{resolvedTargetMembers.length} kontak</span>
                    </div>
                  )}

                  {editingCampaign && (
                    <p className="text-[10px] text-ink-faint mt-1">
                      Target audiens awal tidak dapat diubah pada mode edit. Tambah atau kurangi nomor langsung di daftar antrean.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: TEMPLATE PESAN ATAU TEKS MANUAL & LIVE PREVIEW BUBBLE WA */}
            {wizardStep === 2 && (
              <div className="space-y-3 blast-page-transition">
                {/* Switcher Mode: Template vs Manual */}
                <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-lg border border-line">
                  <button
                    type="button"
                    onClick={() => setMessageSource('template')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                      messageSource === 'template'
                        ? 'bg-surface text-ink font-semibold shadow-xs border border-line'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Template Tersimpan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageSource('manual')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                      messageSource === 'manual'
                        ? 'bg-surface text-ink font-semibold shadow-xs border border-line'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>Teks Manual Langsung</span>
                  </button>
                </div>

                {messageSource === 'template' ? (
                  /* Mode Template Tersimpan */
                  <div>
                    <label className="block text-[11px] font-medium text-ink mb-1">
                      Pilih Template Pesan *
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
                    >
                      <option value="">Pilih template pesan...</option>
                      {templates?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.messageType || 'text'})
                        </option>
                      ))}
                    </select>
                    {templates?.length === 0 && (
                      <p className="text-[10px] text-honey mt-1">
                        Belum ada template. Buat template pesan terlebih dahulu di halaman Template.
                      </p>
                    )}
                  </div>
                ) : (
                  /* Mode Teks Manual Langsung (Editor Mirip Playground) */
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-medium text-ink">
                        Isi Pesan Teks Broadcast *
                      </label>
                      <span className="text-[10px] font-mono text-ink-muted">
                        {manualMessage.length} karakter
                      </span>
                    </div>

                    {/* Toolbar Format WhatsApp, Emoji, Variabel, dan Spintax */}
                    <WhatsAppFormattingToolbar
                      value={manualMessage}
                      onChange={setManualMessage}
                      textareaRef={manualTextareaRef}
                      contacts={contacts}
                      activeContact={resolvedTargetMembers[0] || contacts[0] || null}
                    />

                    <textarea
                      ref={manualTextareaRef}
                      rows={5}
                      value={manualMessage}
                      onChange={(e) => setManualMessage(e.target.value)}
                      placeholder="Tulis pesan dengan format WhatsApp (*tebal*, _miring_, emoji 👋, spintax {Halo|Hai}, atau variabel {{nama}})..."
                      className="w-full p-2.5 rounded-b-lg bg-surface border border-t-0 border-line text-xs text-ink font-sans focus:outline-none focus:border-brand leading-relaxed resize-y"
                    />

                    <p className="text-[10px] text-ink-muted pt-0.5">
                      Gunakan tombol toolbar di atas untuk format teks cepat, emoji, atau menyisipkan variabel kontak.
                    </p>
                  </div>
                )}

                {/* Pratinjau Pesan Khas WhatsApp dengan Doodle */}
                {(() => {
                  if (messageSource === 'template') {
                    const tpl = templates?.find((t) => String(t.id) === String(selectedTemplate));
                    if (!tpl) {
                      return (
                        <div className="p-4 rounded-xl bg-surface-sunken border border-dashed border-line text-center text-xs text-ink-muted">
                          Pilih template pesan di atas untuk melihat pratinjau bubble WhatsApp.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-medium text-ink-muted">
                          <span>Pratinjau Pesan Keluar:</span>
                          <span className="font-mono text-[10px] text-brand">{tpl.messageType || 'text'}</span>
                        </div>
                        <div className="max-w-[340px] mx-auto">
                          <WhatsAppBubblePreview
                            content={tpl.content || tpl.body || ''}
                            mediaUrl={tpl.mediaUrl || null}
                            mediaType={tpl.mediaType || 'image'}
                            location={tpl.location || null}
                            contact={resolvedTargetMembers[0] || contacts[0] || { name: 'Nama Pelanggan', phone: '628123456789' }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Pratinjau untuk Teks Manual
                  if (!manualMessage.trim()) {
                    return (
                      <div className="p-4 rounded-xl bg-surface-sunken border border-dashed border-line text-center text-xs text-ink-muted">
                        Ketik pesan teks di atas untuk melihat live pratinjau bubble WhatsApp.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-medium text-ink-muted">
                        <span>Live Pratinjau Pesan Manual:</span>
                        <span className="font-mono text-[10px] text-brand">text (manual)</span>
                      </div>
                      <div className="max-w-[340px] mx-auto">
                        <WhatsAppBubblePreview
                          content={manualMessage}
                          contact={resolvedTargetMembers[0] || contacts[0] || { name: 'Nama Pelanggan', phone: '628123456789' }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* STEP 3: SESI PENGIRIM, PACING ANTI-BAN & PRIORITAS */}
            {wizardStep === 3 && (
              <div className="space-y-3 blast-page-transition">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">
                    Sesi WhatsApp Pengirim
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
                  >
                    <option value="auto_rotate">Auto Rotate (Rotasi Otomatis Semua Nomor Online)</option>
                    {sessions?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.numberProfile === 'fresh' ? '[Fresh] ' : ''}
                        {s.name} (+{s.phone}) - {s.status}
                      </option>
                    ))}
                  </select>

                  {/* Indikator Beban & Profil Sesi */}
                  {(() => {
                    if (selectedSessionId === 'auto_rotate') {
                      const connected = (sessions || []).filter((s) => s.status === 'connected' || s.status === 'open');
                      const totalPending = connected.reduce((acc, s) => acc + (s.queue?.pendingCount || 0), 0);
                      const totalWaitSec = Math.round((totalPending * 3.5) / Math.max(connected.length, 1));

                      if (totalPending > 0) {
                        return (
                          <div className="mt-2 p-2 rounded-lg bg-honey-wash border border-honey-line text-[11px] text-honey-deep">
                            <div className="flex items-center gap-1.5 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 text-honey shrink-0" />
                              <span>Pool memiliki {totalPending} antrean aktif (est. {totalWaitSec > 60 ? `~${Math.ceil(totalWaitSec / 60)} menit` : `${totalWaitSec} detik`})</span>
                            </div>
                            <p className="text-[10px] text-honey-deep/90 mt-0.5 ml-5 leading-relaxed">
                              Pesan broadcast baru akan didistribusikan merata ke {connected.length} nomor aktif.
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-leaf-deep font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-leaf shrink-0" />
                          <span>Pool siap: {connected.length} nomor online tanpa antrean menumpuk.</span>
                        </div>
                      );
                    }

                    const sess = sessions?.find((s) => s.id === selectedSessionId);
                    if (!sess) return null;
                    const qPending = sess.queue?.pendingCount || 0;
                    const qSec = sess.queue?.estimatedWaitSeconds || Math.round(qPending * 3.5);
                    const isFresh = sess.numberProfile === 'fresh';

                    return (
                      <div className="space-y-1.5 mt-2">
                        {isFresh && (
                          <div className="p-2 rounded-lg bg-honey-wash/70 border border-honey-line text-[11px] text-honey-deep">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5 text-honey shrink-0" />
                              <span>Profil Fresh Warm-Up (Hari ke-{sess.warmupDay || 1}/7)</span>
                            </div>
                            <p className="text-[10px] text-honey-deep/90 mt-0.5 ml-5 leading-relaxed">
                              Nomor baru dengan batas kuota bertahap. Disarankan blast volume besar menggunakan Auto Rotate atau nomor matang.
                            </p>
                          </div>
                        )}

                        {qPending > 0 ? (
                          <div className="p-2 rounded-lg bg-honey-wash border border-honey-line text-[11px] text-honey-deep">
                            <div className="flex items-center gap-1.5 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 text-honey shrink-0" />
                              <span>Nomor ini sedang memproses {qPending} antrean (est. {qSec > 60 ? `~${Math.ceil(qSec / 60)} menit` : `${qSec} detik`})</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-leaf-deep font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-leaf shrink-0" />
                            <span>Nomor siap ({sess.numberProfile === 'fresh' ? 'Fresh Warmup' : 'Mature Uncapped'}), antrean kosong.</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Selector Preset Anti-Ban Sesi di Wizard (Item #4) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-medium text-ink">
                      Preset Anti-Ban untuk Pengiriman Ini
                    </label>
                    <span className="text-[10px] text-ink-muted">
                      {selectedSessionId === 'auto_rotate' ? 'Diterapkan ke seluruh pool online' : 'Diterapkan ke sesi terpilih'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: 'broadcast',
                        label: 'Broadcast',
                        desc: 'Optimal blast, tanpa jeda distraksi',
                        badge: 'Rekomendasi',
                        icon: ShieldCheck,
                        activeClasses: 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/30',
                        activeBadgeClasses: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
                        activeIconColor: 'text-emerald-600 dark:text-emerald-400',
                        idleIconColor: 'text-emerald-500/70',
                      },
                      {
                        id: 'balanced',
                        label: 'Balanced',
                        desc: 'Standar chat, jeda distraksi 5-20m',
                        badge: 'Chat 2-Arah',
                        icon: Shield,
                        activeClasses: 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/30',
                        activeBadgeClasses: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
                        activeIconColor: 'text-amber-600 dark:text-amber-400',
                        idleIconColor: 'text-amber-500/70',
                      },
                      {
                        id: 'strict',
                        label: 'Strict',
                        desc: 'Delay panjang 3-8s, kuota ketat',
                        badge: 'Nomor Baru',
                        icon: ShieldAlert,
                        activeClasses: 'bg-sky-500/10 border-sky-500 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500/30',
                        activeBadgeClasses: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
                        activeIconColor: 'text-sky-600 dark:text-sky-400',
                        idleIconColor: 'text-sky-500/70',
                      },
                    ].map((p) => {
                      const Icon = p.icon;
                      const isSelected = activeAntibanPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleChangeAntibanPreset(p.id)}
                          className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? p.activeClasses
                              : 'bg-surface border-line text-ink-muted hover:border-line-strong hover:bg-surface-alt/50'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1.5">
                            <Icon className={`w-4 h-4 ${isSelected ? p.activeIconColor : p.idleIconColor}`} />
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${
                                isSelected ? p.activeBadgeClasses : 'bg-surface-alt text-ink-muted'
                              }`}
                            >
                              {p.badge}
                            </span>
                          </div>
                          <div>
                            <div className={`text-[11px] font-bold ${isSelected ? '' : 'text-ink'}`}>{p.label}</div>
                            <div className="text-[9px] opacity-80 leading-tight mt-0.5">{p.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prioritas Antrean */}
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1.5">
                    Prioritas Antrean (Priority)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCampaignPriority('normal')}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-left transition ${
                        campaignPriority === 'normal'
                          ? 'bg-brand-wash border-brand text-brand-deep ring-1 ring-brand/30'
                          : 'bg-surface border-line text-ink-muted hover:border-line-strong'
                      }`}
                    >
                      <div className={`p-1 rounded shrink-0 ${campaignPriority === 'normal' ? 'bg-brand-wash text-brand-deep' : 'bg-surface-alt text-ink-muted'}`}>
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold">Normal</div>
                        <div className="text-[9px] text-ink-faint leading-tight">Antrean santai anti-ban</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCampaignPriority('high')}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-left transition ${
                        campaignPriority === 'high'
                          ? 'bg-honey-wash border-honey text-honey-deep ring-1 ring-honey/30'
                          : 'bg-surface border-line text-ink-muted hover:border-line-strong'
                      }`}
                    >
                      <div className={`p-1 rounded shrink-0 ${campaignPriority === 'high' ? 'bg-honey-wash text-honey' : 'bg-surface-alt text-ink-muted'}`}>
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold">Prioritas (High)</div>
                        <div className="text-[9px] text-ink-faint leading-tight">Salip antrean utama</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Ringkasan Konfirmasi Pre-Flight & Estimasi Selesai */}
                {(() => {
                  const targetCount = resolvedTargetMembers.length;
                  const connected = (sessions || []).filter((s) => s.status === 'connected' || s.status === 'open');
                  const activeSessionsCount = selectedSessionId === 'auto_rotate' 
                    ? Math.max(connected.length, 1) 
                    : 1;
                  // Estimasi jeda rata-rata per pesan: 4 - 8 detik (anti-ban default ~5.5 detik per pesan per nomor)
                  const avgDelaySec = 5.5;
                  const estTotalSeconds = Math.round((targetCount * avgDelaySec) / activeSessionsCount);
                  const estMinutes = Math.ceil(estTotalSeconds / 60);

                  const tpl = templates?.find((t) => t.id === selectedTemplate);
                  const targetLabel = targetType === 'group'
                    ? (selectedGroup || '-')
                    : `Tag: ${selectedTags.join(', ') || '-'}`;

                  return (
                    <div className="rounded-xl bg-surface-sunken border border-line p-3 space-y-2">
                      <div className="text-[11px] font-bold text-ink flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span>Ringkasan & Konfirmasi Pre-Flight:</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-surface border border-line">
                          <span className="text-ink-muted block text-[10px]">Target Audiens</span>
                          <span className="font-semibold text-ink truncate block" title={targetLabel}>
                            {targetLabel}
                          </span>
                          <span className="text-brand font-mono font-bold block text-xs mt-0.5">
                            {targetCount} kontak
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-surface border border-line">
                          <span className="text-ink-muted block text-[10px]">Estimasi Durasi</span>
                          <span className="font-semibold text-ink">
                            {targetCount === 0 ? '0 menit' : estMinutes > 60 ? `~${(estMinutes / 60).toFixed(1)} jam` : `~${estMinutes} menit`}
                          </span>
                          <span className="text-ink-faint text-[10px] block mt-0.5">
                            ({activeSessionsCount} sesi pengirim)
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-ink-muted flex items-start gap-1.5 pt-1">
                        <Info className="w-3.5 h-3.5 text-brand shrink-0 mt-px" />
                        <span>
                          {messageSource === 'manual' ? (
                            <>
                              Pesan <strong>"Teks Manual Langsung"</strong> ({manualMessage.length} karakter) akan dimuat ke antrean dalam status <strong>Draft</strong>.
                            </>
                          ) : (
                            <>
                              Template <strong>"{tpl?.title || '-'}"</strong> akan dimuat ke antrean dalam status <strong>Draft</strong>.
                            </>
                          )}{' '}
                          Pesan baru akan dikirim bertahap setelah tombol Mulai Blast ditekan.
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-clay-wash border border-clay-line text-[11px] text-clay-deep">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{formError}</span>
              </div>
            )}

            {/* Navigasi Wizard Footer */}
            <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2 border-t border-line">
              <div>
                {wizardStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormError('');
                      setWizardStep((s) => Math.max(1, s - 1));
                    }}
                    disabled={creating}
                  >
                    Kembali
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsWizardOpen(false)}
                    disabled={creating}
                  >
                    Batal
                  </Button>
                )}
              </div>

              <div>
                {wizardStep < 3 ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFormError('');
                      if (wizardStep === 1) {
                        if (!campaignName.trim()) {
                          setFormError('Nama broadcast wajib diisi.');
                          return;
                        }
                        if (targetType === 'group' && !selectedGroup) {
                          setFormError('Pilih target segmen audiens terlebih dahulu.');
                          return;
                        }
                        if (targetType === 'tag' && selectedTags.length === 0) {
                          setFormError('Pilih minimal satu tag target audiens.');
                          return;
                        }
                      } else if (wizardStep === 2) {
                        if (messageSource === 'template' && !selectedTemplate) {
                          setFormError('Pilih template pesan terlebih dahulu.');
                          return;
                        }
                        if (messageSource === 'manual' && !manualMessage.trim()) {
                          setFormError('Tulis isi pesan teks broadcast terlebih dahulu.');
                          return;
                        }
                      }
                      setWizardStep((s) => Math.min(3, s + 1));
                    }}
                  >
                    Lanjut ke Langkah {wizardStep + 1}
                  </Button>
                ) : (
                  <Button type="submit" variant="default" size="sm" disabled={creating}>
                    {creating ? 'Menyimpan...' : editingCampaign ? 'Simpan Perubahan' : 'Buat & Buka Antrean'}
                  </Button>
                )}
              </div>
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
              <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                Target Broadcast *
              </label>
              <select
                value={targetCampaignId || selectedCampaign?.id || (campaigns.length > 0 ? campaigns[0].id : '')}
                onChange={(e) => setTargetCampaignId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status === 'idle' ? 'Belum Mulai' : c.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
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
              <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                Nama Penerima
              </label>
              <input
                type="text"
                placeholder="Misal: Hendra Pratama"
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
              />
            </div>

            {/* Preview Variabel Custom yang Melekat pada Penerima Ini */}
            {newRecipientCustom && Object.keys(newRecipientCustom).length > 0 && (
              <div className="p-2 rounded-lg bg-shell bg-surface border border-line border-line text-[11px]">
                <span className="text-ink-muted text-ink-muted font-medium">Variabel kontak terhubung:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(newRecipientCustom).map(([k, v]) => (
                    <span key={k} className="px-1.5 py-0.5 rounded bg-brand-wash  border border-brand-line  text-[10px] font-mono text-leaf-deep">
                      {`{{${k}}}`}: <strong className="font-semibold">{String(v)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 text-[11px] text-clay-deep">
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
          <div className="py-2 text-xs text-ink-soft text-ink-muted">
            Apakah Anda yakin ingin menghapus{' '}
            <strong className="text-ink text-ink">{deletingRecipient?.name || 'nomor ini'}</strong>{' '}
            (<span className="font-mono text-brand-deep">+{deletingRecipient?.phone}</span>) dari antrean broadcast ini?
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
            className="text-xs bg-clay hover:bg-rose-700 text-white"
            >
            Hapus Nomor
            </Button>
            </DialogFooter>
            </DialogContent>
            </Dialog>

            {/* Modal Konfirmasi Hapus Massal (Bulk Delete) Nomor dari Antrean */}
            <Dialog open={isBulkDeleteQueueOpen} onOpenChange={setIsBulkDeleteQueueOpen}>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>Hapus {selectedQueueIds.length} Nomor dari Antrean?</DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-3 text-xs text-ink-soft">
            <p>
            Apakah Anda yakin ingin menghapus <strong>{selectedQueueIds.length} nomor</strong> terpilih dari antrean broadcast ini?
            </p>
            <div className="max-h-36 overflow-y-auto p-2.5 rounded bg-surface-alt border border-line space-y-1">
            {recipientQueue
              .filter((item) => {
                const phone = String(item.phone || '').trim();
                const id = item.id ? String(item.id).trim() : null;
                const prefixedPhone = phone ? `q_${phone}` : null;
                return selectedQueueIds.some((sel) => {
                  const s = String(sel).trim();
                  return s === phone || s === id || s === prefixedPhone;
                });
              })
              .slice(0, 6)
              .map((item) => (
                <div key={item.id || item.phone} className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-ink truncate max-w-[180px]">{item.name || 'Kontak'}</span>
                  <span className="font-mono text-brand-deep">+{item.phone}</span>
                </div>
              ))}
            {selectedQueueIds.length > 6 && (
              <div className="text-[10px] text-ink-faint pt-1 text-center italic">
                ...dan {selectedQueueIds.length - 6} nomor lainnya
              </div>
            )}
            </div>
            <p className="text-[11px] text-ink-muted">
            Nomor yang dihapus tidak akan menerima pesan blast saat broadcast dimulai. Tindakan ini hanya dapat dilakukan sebelum blast dimulai.
            </p>
            </div>
            <DialogFooter className="gap-2">
            <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBulkDeleteQueueOpen(false)}
            className="text-xs"
            >
            Batal
            </Button>
            <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleExecuteBulkDeleteQueue}
            className="text-xs bg-clay hover:bg-rose-700 text-white"
            >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>Hapus {selectedQueueIds.length} Nomor</span>
            </Button>
            </DialogFooter>
            </DialogContent>
            </Dialog>

      {/* Modal Konfirmasi Pembatalan Sisa Antrean */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm text-clay text-clay">
              <AlertCircle className="w-4 h-4" />
              <span>Batalkan Sisa Antrean Broadcast</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-ink-soft text-ink-soft space-y-2">
            <p>
              Apakah Anda yakin ingin membatalkan sisa antrean untuk broadcast{' '}
              <strong className="text-ink text-ink">{selectedCampaign?.name}</strong>?
            </p>
            <p className="text-[11px] text-ink-muted text-ink-muted">
              Pesan yang belum terkirim di wa-api akan dibatalkan, dan kuota nomor pengirim akan langsung dibebaskan untuk broadcast lainnya.
            </p>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(false)}
              disabled={isCancellingQueue}
              className="text-xs"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCancelQueue}
              disabled={isCancellingQueue}
              className="text-xs bg-clay hover:bg-rose-700 text-white"
            >
              {isCancellingQueue ? 'Membatalkan...' : 'Ya, Batalkan Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
