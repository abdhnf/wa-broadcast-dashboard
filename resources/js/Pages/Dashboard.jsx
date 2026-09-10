import React from 'react';
import {
  Users,
  Send,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Radio,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';

export function DashboardPage({ metrics, sessions, campaigns, onNavigate }) {
  return (
    <div className="space-y-6">
      {/* Top Banner / Header Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Broadcast Overview</h1>
            <Badge variant="outline" className="text-zinc-400 font-mono text-[10px]">Fastify Engine 3100</Badge>
          </div>
          <p className="text-xs text-zinc-400">
            Monitoring pengiriman massal WhatsApp, status multi-session, dan pacing anti-ban.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => onNavigate('broadcast')} variant="default" size="sm">
            <Send className="w-3.5 h-3.5 mr-1 text-zinc-950" />
            <span className="text-zinc-950 font-semibold">Mulai Broadcast</span>
          </Button>
          <Button onClick={() => onNavigate('contacts')} variant="outline" size="sm">
            <Users className="w-3.5 h-3.5 mr-1" />
            <span>Import Kontak</span>
          </Button>
        </div>
      </div>

      {/* 4 Micro Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1 */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-zinc-400">Total Kontak</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
              {metrics.totalContacts.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">4 Segmen aktif</span>
              <span className="text-emerald-400 font-medium font-mono">+12% bln ini</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-zinc-400">Pesan Terkirim Hari Ini</span>
            <Send className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
              {metrics.sentToday}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Sukses rate</span>
              <span className="text-emerald-400 font-mono font-medium">{metrics.successRate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-zinc-400">Nomor WhatsApp</span>
            <Smartphone className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
                {metrics.activeSessionsCount}
              </span>
              <span className="text-xs font-mono text-zinc-500">/ {metrics.totalSessionsCount} Siap</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Health status</span>
              <Badge variant="success" className="text-[10px] py-0 px-1.5">3 Connected</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-zinc-400">Kampanye Live</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
              {metrics.ongoingCampaignsCount}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Pacing Delay</span>
              <span className="text-zinc-300 font-mono text-[10px]">3s - 12s Jitter</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Broadcast Logs & Sesi WA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Riwayat Kampanye (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Riwayat Pengiriman Terakhir</CardTitle>
              <CardDescription className="mt-1">Daftar batch kampanye yang diproses oleh antrean Fastify</CardDescription>
            </div>
            <Button onClick={() => onNavigate('broadcast')} variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-zinc-200">
              Lihat Semua
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaigns.map((camp) => {
              const progressPct = Math.round((camp.sent / camp.total) * 100);
              const isFinished = camp.status === 'finished';
              return (
                <div
                  key={camp.id}
                  className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-2.5 transition-colors hover:border-zinc-700/60"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">{camp.title}</span>
                        <Badge
                          variant={isFinished ? 'outline' : 'success'}
                          className="text-[10px] uppercase font-mono"
                        >
                          {isFinished ? 'Selesai' : 'Sedang Berjalan'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                        <span>Target: <strong className="text-zinc-300 font-normal">{camp.groupName}</strong></span>
                        <span>&bull;</span>
                        <span className="font-mono text-[10px]">{camp.sentAt}</span>
                      </div>
                    </div>
                    <div className="text-right sm:text-right font-mono text-xs text-zinc-300">
                      <span>{camp.sent}</span>
                      <span className="text-zinc-500"> / {camp.total} ({progressPct}%)</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <Progress
                    value={progressPct}
                    indicatorClassName={isFinished ? 'bg-zinc-500' : 'bg-emerald-500'}
                  />

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono">Sukses: {camp.success}</span>
                      <span className="text-rose-400 font-mono">Gagal: {camp.failed}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">{camp.estimatedRemaining}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Kolom Kanan: Sesi Nomor WhatsApp Aktif (1 col) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pool Nomor WA</CardTitle>
              <CardDescription className="mt-1">Status koneksi socket Baileys</CardDescription>
            </div>
            <Button onClick={() => onNavigate('sessions')} variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-zinc-200">
              Kelola
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.map((s) => {
              const isConn = s.status === 'connected';
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isConn ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-xs font-semibold text-zinc-200 truncate">{s.name}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono pl-3.5">
                      {s.phone}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono text-zinc-400">
                      Terkirim: <strong className="text-zinc-200">{s.sentCount}</strong>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                      Risk: {s.riskScore}/100
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <Button onClick={() => onNavigate('sessions')} variant="outline" className="w-full text-xs">
                + Tambah / Hubungkan Nomor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
