import React, { useState } from 'react';
import {
  Users,
  Send,
  Radio,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Smartphone,
  Server,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Switch } from '../components/ui/Switch';

export function DashboardPage({ metrics, sessions: initialSessions, campaigns, onNavigate }) {
  const [sessions, setSessions] = useState(initialSessions || []);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);

  const connectedCount = sessions.filter((s) => s.status === 'connected').length;

  return (
    <div className="space-y-5">
      {/* Welcome & Quick Action Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            Dashboard Broadcast & CRM
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Sistem pengiriman blast multi-kontak dengan auto-pacing Gaussian Jitter via Fastify WA API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => onNavigate('contacts')} variant="outline" size="sm" className="text-xs">
            <Users className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-zinc-400" />
            <span>Audiens</span>
          </Button>

          <Button onClick={() => onNavigate('broadcast')} variant="default" size="sm" className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Buat Blast Baru</span>
          </Button>
        </div>
      </div>

      {/* Modern Compact Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f1117] p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Total Database Kontak</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {metrics?.totalContacts?.toLocaleString() || '1,248'}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            +32 kontak minggu ini
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f1117] p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Terkirim Hari Ini</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {metrics?.sentToday?.toLocaleString() || '856'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Target harian aman (&lt; 2.500)
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f1117] p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Tingkat Pengiriman</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics?.successRate || 98.4}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Delivered ke WhatsApp
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f1117] p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Sesi WhatsApp Terhubung</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 flex items-center justify-between">
            <span>
              {connectedCount} <span className="text-xs font-normal text-slate-400 font-sans">/ {sessions.length} Sesi</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {autoRotateEnabled ? 'Auto-rotate Aktif' : 'Pilihan Nomor Manual'}
          </div>
        </div>
      </div>

      {/* Tabel 1: List Sesi WhatsApp & Kontrol Auto-Rotate */}
      <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Daftar Sesi WhatsApp (WA API Gateway)
              </h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {connectedCount} Online
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Daftar sesi multi-device aktif yang dikelola oleh Fastify WA API
            </p>
          </div>

          {/* Toggle Auto-Rotate */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${autoRotateEnabled ? 'text-emerald-500 animate-spin' : 'text-slate-400'}`} style={{ animationDuration: '6s' }} />
              <div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 block leading-tight">
                  Auto-Rotate Sesi
                </span>
                <span className="text-[9px] text-slate-400 block">
                  {autoRotateEnabled ? 'Rotasi nomor otomatis saat blast' : 'Gunakan nomor spesifik yang dipilih'}
                </span>
              </div>
            </div>
            <Switch
              checked={autoRotateEnabled}
              onCheckedChange={setAutoRotateEnabled}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Nama Sesi / Label</th>
                <th className="py-2.5 px-4">Nomor WhatsApp</th>
                <th className="py-2.5 px-4">Status Koneksi</th>
                <th className="py-2.5 px-4">Terkirim Hari Ini</th>
                <th className="py-2.5 px-4">Anti-Ban Risk</th>
                <th className="py-2.5 px-4 text-right">Peran Pengiriman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {sessions.map((s) => {
                const isConn = s.status === 'connected';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.id}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-700 dark:text-emerald-400">
                      +{s.phone}
                    </td>
                    <td className="py-3 px-4">
                      {isConn ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Disconnected</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 dark:text-zinc-200">
                      {s.sentToday || 0} pesan
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (s.riskScore || 0) < 30
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      }`}>
                        {s.riskScore || 0} / 100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {autoRotateEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Auto-Pool</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">
                          Manual Pick
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel 2: Riwayat Kampanye Broadcast Terbaru */}
      <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Riwayat Kampanye Broadcast Terbaru
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Pantau status antrean pesan dan progres pengiriman blast
            </p>
          </div>
          <Button onClick={() => onNavigate('broadcast')} variant="outline" size="sm" className="text-xs h-7">
            <span>Buka Blast Engine</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Nama Kampanye</th>
                <th className="py-2.5 px-4">Target Segmen</th>
                <th className="py-2.5 px-4">Template Pesan</th>
                <th className="py-2.5 px-4">Status & Progres</th>
                <th className="py-2.5 px-4 text-right">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {campaigns?.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                    <div>{camp.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{camp.batchId}</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="text-[10px]">
                      {camp.groupName}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-800 dark:text-zinc-300">
                    {camp.templateTitle}
                  </td>
                  <td className="py-3 px-4 w-44">
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="capitalize text-emerald-600 dark:text-emerald-400 font-semibold">
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
                  <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                    {camp.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
