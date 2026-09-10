import React from 'react';
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
  Server
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';

export function DashboardPage({ metrics, campaigns, onNavigate }) {
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
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Gateway WA API Engine</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Port 3100 Fastify Active
          </div>
        </div>
      </div>

      {/* Tabel Utama: Daftar Kampanye Blast Terbaru */}
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
