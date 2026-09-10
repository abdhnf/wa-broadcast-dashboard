import React from 'react';
import {
  Users,
  Send,
  Smartphone,
  Radio,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';

export function DashboardPage({ metrics, sessions, campaigns, onNavigate }) {
  return (
    <div className="space-y-6">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Ringkasan antrean broadcast aktif, performa pengiriman, dan kesehatan pool nomor WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => onNavigate('broadcast')} variant="default" size="sm">
            <Send className="w-3.5 h-3.5 mr-1" />
            <span>Kirim Broadcast</span>
          </Button>
          <Button onClick={() => onNavigate('contacts')} variant="outline" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Tambah Kontak</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Row (Minimalist Strip, bukan kartu-kartu tebal) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-zinc-800 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
        <div className="bg-white dark:bg-zinc-950 p-4">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">Total Kontak</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-1">
            {metrics.totalContacts.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
            4 Segmen Pelanggan
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-4">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">Terkirim Hari Ini</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-1">
            {metrics.sentToday}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 block">
            Delivery Rate <strong className="text-emerald-600 dark:text-emerald-400">{metrics.successRate}%</strong>
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-4">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">Nomor WhatsApp</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-1">
            {metrics.activeSessionsCount} <span className="text-xs font-normal text-slate-400 font-sans">/ {metrics.totalSessionsCount} Siap</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            Socket Baileys Terkoneksi
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-4">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">Antrean Berjalan</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-1">
            {metrics.ongoingCampaignsCount}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5 block">
            Pacing Jitter: 3s - 12s
          </span>
        </div>
      </div>

      {/* Tabel 1: Kampanye Pengiriman Massal Aktif & Riwayat (Responsive Table) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Status Kampanye & Batch Antrean</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Monitoring pengiriman pesan langsung dari antrean gateway</p>
          </div>
          <Button onClick={() => onNavigate('broadcast')} variant="ghost" size="sm" className="text-xs">
            Kelola Broadcast
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-4 font-medium">NAMA KAMPANYE</th>
                  <th className="py-2.5 px-4 font-medium">TARGET SEGMEN</th>
                  <th className="py-2.5 px-4 font-medium">STATUS</th>
                  <th className="py-2.5 px-4 font-medium">PROGRESS / TERKIRIM</th>
                  <th className="py-2.5 px-4 font-medium">SUKSES / GAGAL</th>
                  <th className="py-2.5 px-4 font-medium text-right">WAKTU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
                {campaigns.map((camp) => {
                  const pct = Math.round((camp.sent / camp.total) * 100);
                  const isFinished = camp.status === 'finished';
                  return (
                    <tr key={camp.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {camp.title}
                        <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 font-normal">
                          {camp.id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px]">
                          {camp.groupName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isFinished ? 'outline' : 'success'} className="text-[10px] uppercase">
                          {isFinished ? 'Selesai' : 'Sedang Kirim'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span>{camp.sent}/{camp.total}</span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} indicatorClassName={isFinished ? 'bg-slate-400 dark:bg-zinc-600' : 'bg-emerald-500'} />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{camp.success}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-rose-600 dark:text-rose-400">{camp.failed}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                        {camp.sentAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabel 2: Pool Nomor WhatsApp Baileys (Responsive Table) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pool Nomor WhatsApp</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Status koneksi socket Baileys dan skor resiko anti-ban</p>
          </div>
          <Button onClick={() => onNavigate('sessions')} variant="ghost" size="sm" className="text-xs">
            Kelola Sesi
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-4 font-medium">NAMA PERANGKAT</th>
                  <th className="py-2.5 px-4 font-medium">NOMOR WHATSAPP</th>
                  <th className="py-2.5 px-4 font-medium">STATUS KONEKSI</th>
                  <th className="py-2.5 px-4 font-medium">TERKIRIM HARI INI</th>
                  <th className="py-2.5 px-4 font-medium">WARMUP STAGE</th>
                  <th className="py-2.5 px-4 font-medium text-right">ANTI-BAN RISK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
                {sessions.map((s) => {
                  const isConn = s.status === 'connected';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 dark:text-zinc-200">
                        {s.phone}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isConn ? 'success' : 'warning'} className="text-[10px]">
                          {isConn ? 'Connected' : 'Standby'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {s.sentCount} pesan
                      </td>
                      <td className="py-3 px-4 capitalize font-mono text-[11px] text-slate-600 dark:text-zinc-400">
                        {s.warmupStatus || 'Mature (Safe)'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.riskScore < 20
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        }`}>
                          {s.riskScore} / 100
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
