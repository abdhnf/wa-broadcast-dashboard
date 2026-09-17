import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  User,
  Globe,
  Send,
  Plus,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  Radio,
  Timer,
  BarChart3,
  CircleSlash
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Switch } from '../components/ui/Switch';
import {
  ApiError,
  fetchAutoRotateSettings,
  fetchMessages,
  fetchSessions,
  fetchUsage,
  formatNumber,
  updateAutoRotateSettings,
  clearApiConfig,
  STORAGE_USER
} from '../lib/api';

const SUCCESS_STATUSES = ['sent', 'delivered', 'read'];
const FAILURE_STATUSES = ['failed', 'invalid_number', 'not_registered'];
const QUEUED_STATUSES = ['pending', 'pacing', 'sending'];

const POLL_INTERVAL_MS = 15000;

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatClock(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

function statusLabel(status) {
  const map = {
    sent: 'Terkirim',
    delivered: 'Delivered',
    read: 'Dibaca',
    pending: 'Menunggu',
    pacing: 'Pacing',
    sending: 'Mengirim',
    failed: 'Gagal',
    invalid_number: 'Nomor Invalid',
    not_registered: 'Tidak Terdaftar',
  };
  return map[status] || status;
}

function statusClass(status) {
  if (SUCCESS_STATUSES.includes(status)) return 'text-brand-deep';
  if (FAILURE_STATUSES.includes(status)) return 'text-rose-500';
  if (status === 'pacing') return 'text-amber-500';
  return 'text-ink-muted text-ink-muted';
}

export function DashboardPage({ onNavigate }) {
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [usage, setUsage] = useState(null);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const [rotateSaving, setRotateSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);

  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_USER) || 'null');
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  const [adminScope, setAdminScope] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wa_blast_admin_scope') || 'me';
    }
    return 'me';
  });

  const handleScopeChange = (nextScope) => {
    setAdminScope(nextScope);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wa_blast_admin_scope', nextScope);
    }
  };

  const handleAuthFailure = useCallback((err) => {
    if (err instanceof ApiError && err.isUnauthorized) {
      clearApiConfig();
      if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_USER);
      setError('Sesi login tidak valid lagi. Silakan muat ulang halaman dan masuk kembali lewat link dari panel wa-api.');
      return true;
    }
    return false;
  }, []);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [sessionsRes, messagesRes, usageRes, rotateRes] = await Promise.all([
        fetchSessions(),
        fetchMessages('all'),
        fetchUsage(),
        fetchAutoRotateSettings(),
      ]);
      setSessions(sessionsRes);
      setMessages(Array.isArray(messagesRes) ? messagesRes : (messagesRes?.messages || []));
      setUsage(usageRes);
      if (rotateRes) setAutoRotateEnabled(Boolean(rotateRes.enabled));
      setLastSync(new Date());
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err?.message || 'Gagal memuat data dari wa-api gateway.');
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    void loadAll();
    const timer = setInterval(() => void loadAll({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadAll]);

  const handleToggleAutoRotate = async (next) => {
    const previous = autoRotateEnabled;
    setAutoRotateEnabled(next);
    setRotateSaving(true);
    try {
      await updateAutoRotateSettings({ enabled: next });
    } catch (err) {
      setAutoRotateEnabled(previous);
      if (!handleAuthFailure(err)) setError(err?.message || 'Gagal menyimpan pengaturan auto-rotate.');
    } finally {
      setRotateSaving(false);
    }
  };

  // ---------- Filter scope data (Personal vs Global untuk Admin) ----------
  const filteredSessions = useMemo(() => {
    if (!isAdmin || adminScope === 'all') return sessions;
    return sessions.filter((s) => s.userId === currentUser?.id);
  }, [sessions, isAdmin, adminScope, currentUser]);

  const filteredMessages = useMemo(() => {
    if (!isAdmin || adminScope === 'all') return messages;
    const mySessionIds = new Set(filteredSessions.map((s) => s.id));
    return messages.filter(
      (m) => m.userId === currentUser?.id || (m.sessionId && mySessionIds.has(m.sessionId))
    );
  }, [messages, filteredSessions, isAdmin, adminScope, currentUser]);

  // ---------- Metrik turunan dari data riil wa-api ----------
  const derived = useMemo(() => {
    const todayMsgs = filteredMessages.filter((m) => isToday(m.timestamp));
    const sentToday = todayMsgs.filter((m) => SUCCESS_STATUSES.includes(m.status)).length;
    const failedToday = todayMsgs.filter((m) => FAILURE_STATUSES.includes(m.status)).length;
    const queued = filteredMessages.filter((m) => QUEUED_STATUSES.includes(m.status)).length;
    const closed = sentToday + failedToday;
    const successRate = closed > 0 ? (sentToday / closed) * 100 : null;

    const paced = filteredMessages.filter((m) => Number(m.jitterDelayMs) > 0);
    const avgDelayMs = paced.length
      ? paced.reduce((sum, m) => sum + Number(m.jitterDelayMs), 0) / paced.length
      : 0;

    // Distribusi jam kirim (6 bucket terakhir yang punya aktivitas)
    const buckets = new Map();
    for (const m of filteredMessages) {
      if (!m.timestamp) continue;
      const d = new Date(m.timestamp);
      const key = `${String(d.getHours()).padStart(2, '0')}:00`;
      const entry = buckets.get(key) || { label: key, sent: 0, failed: 0 };
      if (SUCCESS_STATUSES.includes(m.status)) entry.sent += 1;
      else if (FAILURE_STATUSES.includes(m.status)) entry.failed += 1;
      buckets.set(key, entry);
    }
    const hourly = [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(-8);
    const maxHourly = Math.max(1, ...hourly.map((h) => h.sent + h.failed));

    // Kampanye/antrean batch dari batchId pesan
    const batchMap = new Map();
    for (const m of filteredMessages) {
      const key = m.batchId || '__single__';
      const entry = batchMap.get(key) || {
        id: key,
        name: m.batchId ? `Batch Blast ${m.batchId.replace(/^batch_/, '')}` : 'Pesan Individual (Playground)',
        total: 0,
        done: 0,
        failed: 0,
        createdAt: m.timestamp,
        sessionId: m.sessionId,
      };
      entry.total += 1;
      if (SUCCESS_STATUSES.includes(m.status)) entry.done += 1;
      if (FAILURE_STATUSES.includes(m.status)) entry.failed += 1;
      if (m.timestamp && (!entry.createdAt || m.timestamp > entry.createdAt)) entry.createdAt = m.timestamp;
      batchMap.set(key, entry);
    }
    const batches = [...batchMap.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6);

    const recent = filteredMessages.slice(0, 8);

    return {
      connectedCount: filteredSessions.filter((s) => s.status === 'connected').length,
      totalSessionsCount: filteredSessions.length,
      sentToday,
      failedToday,
      queued,
      successRate,
      avgDelayMs,
      hourly,
      maxHourly,
      batches,
      recent,
    };
  }, [filteredMessages, filteredSessions]);

  const quotaLimit = usage?.quotaLimit ?? 0;
  const usedInPeriod = usage?.usedInPeriod ?? 0;
  const quotaPercent = quotaLimit > 0 ? Math.min(100, (usedInPeriod / quotaLimit) * 100) : 0;
  const isUnlimited = usage?.remainingInPeriod === null || usage?.remainingInPeriod === undefined;

  return (
    <div className="space-y-5">
      {/* Header + aksi cepat */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-lg border border-line">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-ink dark:text-white">
              Dashboard Broadcast & CRM
            </h1>
            {isAdmin && (
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold tracking-wide ${
                  adminScope === 'me'
                    ? 'text-brand-deep border-brand-line bg-brand-wash'
                    : 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40'
                }`}
              >
                {adminScope === 'me' ? 'Scope: Akun Saya (Personal)' : `Scope: Semua Pengguna (${sessions.length} Sesi Total)`}
              </Badge>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAdmin
              ? (adminScope === 'me'
                  ? 'Menampilkan ringkasan metrik, antrean, dan log pesan milik akun admin'
                  : 'Menampilkan data agregat gabungan dari seluruh pengguna sistem di gateway')
              : 'Data live dari WhatsApp API Gateway'}
            {lastSync ? `, sinkron ${formatClock(lastSync.toISOString())} WIB` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <div className="flex items-center p-0.5 bg-surface-alt rounded-lg border border-line">
              <button
                type="button"
                onClick={() => handleScopeChange('me')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  adminScope === 'me'
                    ? 'bg-surface text-ink font-semibold shadow-xs border border-line/60'
                    : 'text-ink-muted hover:text-ink'
                }`}
                title="Tampilkan hanya data dan sesi kepemilikan admin sendiri"
              >
                <User className="w-3.5 h-3.5 text-brand-deep" />
                <span>Akun Saya</span>
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('all')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  adminScope === 'all'
                    ? 'bg-surface text-ink font-semibold shadow-xs border border-line/60'
                    : 'text-ink-muted hover:text-ink'
                }`}
                title="Tampilkan data agregat seluruh pengguna di gateway"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Semua Pengguna</span>
              </button>
            </div>
          )}

          <Button
            onClick={() => loadAll()}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 text-ink-soft ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </Button>

          <Button onClick={() => onNavigate('broadcast')} variant="default" size="sm" className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Buat Blast Baru</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-clay-wash  border border-clay-line text-xs text-clay-deep">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrik ringkas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface  p-3.5 rounded-lg border border-line border-line ">
          <span className="text-[11px] font-medium text-ink-muted text-ink-muted flex items-center gap-1.5">
            <Radio className="w-3 h-3" /> Antrean Aktif
          </span>
          <div className="text-xl font-bold text-ink dark:text-white mt-1">
            {formatNumber(derived.queued)}
          </div>
          <div className="text-[10px] text-ink-faint mt-0.5">
            Menunggu / pacing / sedang dikirim
          </div>
        </div>

        <div className="bg-surface  p-3.5 rounded-lg border border-line border-line ">
          <span className="text-[11px] font-medium text-ink-muted text-ink-muted flex items-center gap-1.5">
            <Send className="w-3 h-3" /> Terkirim Hari Ini
          </span>
          <div className="text-xl font-bold text-ink dark:text-white mt-1">
            {formatNumber(derived.sentToday)}
          </div>
          <div className="text-[10px] text-ink-faint mt-0.5">
            {derived.failedToday > 0 ? `${formatNumber(derived.failedToday)} gagal/tidak valid` : 'Tidak ada kegagalan'}
          </div>
        </div>

        <div className="bg-surface  p-3.5 rounded-lg border border-line border-line ">
          <span className="text-[11px] font-medium text-ink-muted text-ink-muted flex items-center gap-1.5">
            <CircleSlash className="w-3 h-3" /> Tingkat Pengiriman
          </span>
          <div className="text-xl font-bold text-brand-deep mt-1">
            {derived.successRate === null ? '-' : `${derived.successRate.toFixed(1)}%`}
          </div>
          <div className="text-[10px] text-ink-faint mt-0.5">
            Dari {formatNumber(derived.sentToday + derived.failedToday)} pesan selesai hari ini
          </div>
        </div>

        <div className="bg-surface  p-3.5 rounded-lg border border-line border-line ">
          <span className="text-[11px] font-medium text-ink-muted text-ink-muted flex items-center gap-1.5">
            <Smartphone className="w-3 h-3" /> Sesi WhatsApp Terhubung
          </span>
          <div className="text-xl font-bold text-ink dark:text-white mt-1 flex items-center justify-between">
            <span>
              {derived.connectedCount}{' '}
              <span className="text-xs font-normal text-ink-faint">/ {filteredSessions.length} Sesi</span>
            </span>
            {derived.connectedCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />}
          </div>
          <div className="text-[10px] text-brand-deep mt-0.5">
            {autoRotateEnabled ? 'Auto-rotate Aktif' : 'Pilih Nomor Manual'}
          </div>
        </div>
      </div>

      {/* Kuota & pacing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-surface  p-3.5 rounded-lg border border-line border-line ">
          <div className="flex items-center justify-between text-[11px] font-medium text-ink-muted text-ink-muted">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" /> Kuota Pengiriman {usage?.quotaPeriod ? `(${usage.quotaPeriod})` : ''}
            </span>
            <span>
              {isUnlimited ? 'Tanpa batas (admin)' : `${formatNumber(usedInPeriod)} / ${formatNumber(quotaLimit)}`}
            </span>
          </div>
          <Progress value={isUnlimited ? 6 : quotaPercent} className="h-2.5 mt-2" />
          <div className="text-[10px] text-ink-faint mt-1">
            {usage?.quotaResetAt
              ? `Reset ${new Date(usage.quotaResetAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long' })}`
              : 'Jadwal reset belum tercatat'}
          </div>
        </div>

        <div className="bg-surface  p-3.5 rounded-lg border border-line border-line ">
          <div className="flex items-center justify-between text-[11px] font-medium text-ink-muted text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Timer className="w-3 h-3" /> Rata-rata Jeda Anti-Ban (Gaussian Jitter)
            </span>
            <span>{(derived.avgDelayMs / 1000).toFixed(1)}s</span>
          </div>
          <div className="mt-2 flex items-end gap-1 h-8">
            {derived.hourly.length === 0 && (
              <span className="text-[10px] text-ink-faint">Belum ada aktivitas pengiriman tercatat.</span>
            )}
            {derived.hourly.map((h) => {
              const total = h.sent + h.failed;
              return (
                <div key={h.label} className="flex-1 flex flex-col items-center gap-1" title={`${h.label}: ${h.sent} terkirim, ${h.failed} gagal`}>
                  <div className="w-full flex flex-col justify-end" style={{ height: '26px' }}>
                    <div
                      className="w-full bg-leaf rounded-t transition-all"
                      style={{ height: `${Math.max(2, (h.sent / derived.maxHourly) * 26)}px` }}
                      title={`${h.sent} terkirim`}
                    />
                    {h.failed > 0 && (
                      <div
                        className="w-full bg-clay transition-all"
                        style={{ height: `${Math.max(2, (h.failed / derived.maxHourly) * 26)}px` }}
                        title={`${h.failed} gagal`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-ink-faint mt-1">
            Distribusi pengiriman per jam dari log pesan terbaru
          </div>
        </div>
      </div>

      {/* Tabel sesi WhatsApp */}
      <div className="bg-surface  rounded-lg border border-line border-line overflow-hidden ">
        <div className="p-3.5 border-b border-line border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-deep" />
              <h2 className="text-xs font-bold text-ink dark:text-white uppercase tracking-wider">
                Daftar Sesi WhatsApp (WA API Gateway)
              </h2>
              <Badge variant="outline" className="text-[10px]">
                {derived.connectedCount} Online
              </Badge>
            </div>
            <p className="text-[11px] text-ink-muted text-ink-muted mt-0.5">
              Sesi yang terhubung ke akun Anda beserta status anti-ban terakhir
            </p>
          </div>

          <div className="flex items-center gap-3 bg-shell bg-surface px-3 py-1.5 rounded-lg border border-line border-line">
            <div className="flex items-center gap-2">
              <RefreshCw
                className={`w-3.5 h-3.5 ${autoRotateEnabled ? 'text-brand' : 'text-ink-faint'} ${rotateSaving ? 'animate-spin' : ''}`}
                style={{ animationDuration: '6s' }}
              />
              <div>
                <span className="text-[11px] font-semibold text-ink text-ink-soft block leading-tight">
                  Auto-Rotate Sesi
                </span>
                <span className="text-[9px] text-ink-faint block">
                  {autoRotateEnabled ? 'Rotasi nomor otomatis saat blast' : 'Gunakan nomor spesifik yang dipilih'}
                </span>
              </div>
            </div>
            <Switch checked={autoRotateEnabled} onCheckedChange={handleToggleAutoRotate} disabled={rotateSaving} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-soft text-ink-soft min-w-[760px]">
            <thead className="bg-shell bg-surface text-ink-soft text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line border-line">
              <tr>
                <th className="py-2.5 px-4">Nama Sesi / Label</th>
                <th className="py-2.5 px-4">Nomor WhatsApp</th>
                <th className="py-2.5 px-4">Status Koneksi</th>
                <th className="py-2.5 px-4">Total Terkirim</th>
                <th className="py-2.5 px-4">Delay Pacing</th>
                <th className="py-2.5 px-4">Profil & Warm-Up</th>
                <th className="py-2.5 px-4">Anti-Ban Risk</th>
                <th className="py-2.5 px-4 text-right">Peran Pengiriman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 px-4 text-center text-ink-faint text-[11px]">
                    {loading
                      ? 'Memuat sesi dari wa-api...'
                      : (isAdmin && adminScope === 'me'
                          ? 'Belum ada sesi WhatsApp milik admin sendiri. Buat sesi di panel atau alihkan ke mode "Semua Pengguna" untuk melihat sesi pengguna lain.'
                          : 'Belum ada sesi WhatsApp pada akun ini.')}
                  </td>
                </tr>
              )}
              {filteredSessions.map((s) => {
                const isConn = s.status === 'connected';
                const risk = s.riskScore || 0;
                return (
                  <tr key={s.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink text-ink">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Smartphone className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                        <span>{s.name}</span>
                        {isAdmin && adminScope === 'all' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-normal text-ink-muted bg-surface-alt border border-line">
                            {s.owner?.name || (s.userId === currentUser?.id ? 'Admin (Saya)' : s.userId || 'Sistem')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-ink-faint mt-0.5">{s.id}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-brand-deep">
                      +{s.phone}
                    </td>
                    <td className="py-3 px-4">
                      {isConn ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-deep">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{s.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-ink text-ink-soft">
                      {formatNumber(s.metrics?.totalSent ?? 0)} pesan
                      <div className="text-[10px] text-ink-faint mt-0.5">
                        {formatNumber(s.metrics?.totalDelivered ?? 0)} delivered
                      </div>
                    </td>
                    <td className="py-3 px-4 text-ink text-ink-soft">
                      {(s.metrics?.avgPacingDelaySec ?? 0).toFixed(1)}s
                    </td>
                    <td className="py-3 px-4">
                      {s.numberProfile === 'fresh' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-honey-wash text-honey-deep border border-honey-line/60">
                          <span>🟡 Fresh (H-{s.warmupDay || 1})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep border border-brand-line">
                          <span>🟢 Mature Uncapped</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        risk < 30
                          ? 'bg-brand-wash  text-leaf-deep'
                          : 'bg-honey-wash  text-honey-deep'
                      }`}>
                        {risk} / 100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {autoRotateEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-wash  text-brand-deep border border-brand-line ">
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Auto-Pool</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-ink-faint">Manual Pick</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat batch & log pesan terbaru */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="bg-surface  rounded-lg border border-line border-line overflow-hidden ">
          <div className="p-3.5 border-b border-line border-line flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-ink dark:text-white uppercase tracking-wider">
                Batch Broadcast Terbaru
              </h2>
              <p className="text-[11px] text-ink-muted text-ink-muted">
                Dikelompokkan dari batch_id pesan di wa-api
              </p>
            </div>
            <Button onClick={() => onNavigate('broadcast')} variant="outline" size="sm" className="text-xs h-7">
              <span>Buka Blast Engine</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-soft text-ink-soft min-w-[560px]">
              <thead className="bg-shell bg-surface text-ink-soft text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line border-line">
                <tr>
                  <th className="py-2.5 px-4">Batch</th>
                  <th className="py-2.5 px-4">Progres</th>
                  <th className="py-2.5 px-4 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {derived.batches.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 px-4 text-center text-ink-faint text-[11px]">
                      {isAdmin && adminScope === 'me'
                        ? 'Belum ada batch blast yang dikirim dari akun admin.'
                        : 'Belum ada batch blast tercatat.'}
                    </td>
                  </tr>
                )}
                {derived.batches.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink text-ink">
                      <div>{b.name}</div>
                      <div className="text-[10px] text-ink-faint mt-0.5">{b.sessionId}</div>
                    </td>
                    <td className="py-3 px-4 w-48">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-brand-deep font-semibold">
                          {b.done} / {b.total}
                        </span>
                        {b.failed > 0 && <span className="text-rose-500">{b.failed} gagal</span>}
                      </div>
                      <Progress value={(b.done / (b.total || 1)) * 100} className="h-2" />
                    </td>
                    <td className="py-3 px-4 text-right text-[10px] text-ink-muted text-ink-muted">
                      {formatClock(b.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface  rounded-lg border border-line border-line overflow-hidden ">
          <div className="p-3.5 border-b border-line border-line">
            <h2 className="text-xs font-bold text-ink dark:text-white uppercase tracking-wider">
              Log Pesan Terbaru
            </h2>
            <p className="text-[11px] text-ink-muted text-ink-muted">
              Status riil dari antrean wa-api, termasuk jeda pacing yang diterapkan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-soft text-ink-soft min-w-[560px]">
              <thead className="bg-shell bg-surface text-ink-soft text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line border-line">
                <tr>
                  <th className="py-2.5 px-4">Tujuan</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Jeda</th>
                  <th className="py-2.5 px-4 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {derived.recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 px-4 text-center text-ink-faint text-[11px]">
                      {loading
                        ? 'Memuat log pesan...'
                        : (isAdmin && adminScope === 'me'
                            ? 'Belum ada riwayat pesan yang dikirim dari akun admin.'
                            : 'Belum ada pesan dikirim dari akun ini.')}
                    </td>
                  </tr>
                )}
                {derived.recent.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 text-ink text-ink flex-wrap">
                        <span>+{m.to}</span>
                        {isAdmin && adminScope === 'all' && m.userId && (
                          <span className="text-[9px] px-1 py-0.2 rounded text-ink-faint bg-surface-alt border border-line">
                            {m.userId === currentUser?.id ? 'Admin (Saya)' : m.userId}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-ink-faint truncate max-w-[220px]">
                        {m.text || m.caption || m.mode}
                      </div>
                    </td>
                    <td className={`py-2.5 px-4 text-[11px] font-medium ${statusClass(m.status)}`}>
                      {statusLabel(m.status)}
                    </td>
                    <td className="py-2.5 px-4 text-ink text-ink-soft">
                      {Number(m.jitterDelayMs) > 0 ? `${(Number(m.jitterDelayMs) / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[10px] text-ink-muted text-ink-muted">
                      {formatClock(m.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
