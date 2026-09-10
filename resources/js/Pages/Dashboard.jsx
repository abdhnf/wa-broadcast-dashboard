import React from 'react';
import {
  Users,
  Send,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';

export function DashboardPage({ metrics, sessions, campaigns, onNavigate }) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/40 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Server Ready &bull; Fastify High-Throughput Queue</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            WhatsApp Broadcast Dashboard
          </h1>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Kelola segmentasi pelanggan, kirim pesan massal dengan proteksi anti-banned Gaussian Jitter, dan pantau status delivery secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-3 z-10">
          <Button onClick={() => onNavigate('broadcast')} variant="primary" size="md">
            <Send className="w-4 h-4" />
            <span>Mulai Broadcast Baru</span>
          </Button>
          <Button onClick={() => onNavigate('contacts')} variant="secondary" size="md">
            <Users className="w-4 h-4" />
            <span>Import Kontak</span>
          </Button>
        </div>
      </div>

      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Contacts */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Kontak Aktif</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{metrics.totalContacts.toLocaleString()}</span>
            <span className="text-[11px] text-emerald-400 flex items-center font-medium">+12% bln ini</span>
          </div>
          <div className="text-[11px] text-slate-400">Terbagi dalam 4 grup segmentasi</div>
        </div>

        {/* Card 2: Messages Sent Today */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pesan Terkirim Hari Ini</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{metrics.sentToday}</span>
            <span className="text-[11px] text-slate-400">pesan</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-mono font-semibold">{metrics.successRate}%</span> Delivery Rate
          </div>
        </div>

        {/* Card 3: WhatsApp Sessions */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Nomor WhatsApp Siap</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {metrics.activeSessionsCount} <span className="text-sm font-normal text-slate-400">/ {metrics.totalSessionsCount}</span>
            </span>
            <Badge variant="success">Online</Badge>
          </div>
          <div className="text-[11px] text-slate-400">1 nomor standby / warmup</div>
        </div>

        {/* Card 4: Active Blasts */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Kampanye Berjalan</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{metrics.ongoingCampaignsCount}</span>
            <Badge variant="info">In Queue</Badge>
          </div>
          <div className="text-[11px] text-slate-400">Jitter Pacing 3-12s adaptif</div>
        </div>
      </div>

      {/* Grid: Riwayat Kampanye Terakhir & Sesi WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Riwayat Kampanye Terakhir (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Riwayat Broadcast Terakhir</h2>
              <p className="text-xs text-slate-400">Status kampanye pengiriman pesan massal</p>
            </div>
            <Button onClick={() => onNavigate('broadcast')} variant="ghost" size="sm">
              <span>Lihat Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-4">
            {campaigns.map((cmp) => {
              const percent = Math.round((cmp.sentCount / cmp.totalRecipients) * 100);
              const isDone = cmp.status === 'completed';
              return (
                <div key={cmp.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">{cmp.name}</span>
                        <Badge variant={isDone ? 'success' : 'info'}>
                          {isDone ? 'Selesai' : 'Sedang Berjalan'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Grup: <strong className="text-slate-300">{cmp.groupName}</strong> &bull; Pengirim: {cmp.sessionUsed}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        {cmp.sentCount} / {cmp.totalRecipients}
                      </span>
                      <span className="text-[11px] text-slate-400 block">{percent}% terkirim</span>
                    </div>
                  </div>

                  <Progress value={percent} />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-emerald-400">✓ {cmp.deliveredCount} Terkirim</span>
                      <span className="text-cyan-400">✓✓ {cmp.readCount} Dibaca</span>
                      {cmp.failedCount > 0 && (
                        <span className="text-rose-400">✕ {cmp.failedCount} Gagal</span>
                      )}
                    </div>
                    <span className="text-slate-400">{cmp.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Sesi WhatsApp Aktif (1 col) */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Nomor WhatsApp</h2>
              <p className="text-xs text-slate-400">Pool nomor aktif untuk blast</p>
            </div>
            <Button onClick={() => onNavigate('sessions')} variant="ghost" size="sm">
              <span>Kelola</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            {sessions.map((s) => {
              const isConnected = s.status === 'connected';
              return (
                <div key={s.id} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{s.name}</span>
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">+{s.phone}</div>
                    <div className="text-[10px] text-slate-400">
                      Risk Score: <span className="font-mono text-emerald-400">{s.riskScore}/100</span> &bull; {s.sentToday} pesan/hari
                    </div>
                  </div>
                  <Badge variant={isConnected ? 'success' : 'danger'}>
                    {isConnected ? 'Connected' : 'Offline'}
                  </Badge>
                </div>
              );
            })}
          </div>

          <Button onClick={() => onNavigate('sessions')} variant="outline" size="sm" className="w-full">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Tambah Koneksi WhatsApp</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
