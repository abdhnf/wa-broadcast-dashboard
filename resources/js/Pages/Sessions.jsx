import React, { useState } from 'react';
import {
  Smartphone,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Radio,
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/Dialog';

export function SessionsPage({ sessions, onAddSession }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const openQr = (s) => {
    setSelectedSession(s);
    setQrModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              WhatsApp Sessions
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">
              {sessions?.length || 0} Sesi
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Manajemen multi-device Baileys, monitoring status koneksi, dan rotasi nomor blast.
          </p>
        </div>

        <Button onClick={() => openQr({ name: 'Sesi Baru' })} variant="default" size="sm" className="text-xs">
          <QrCode className="w-3.5 h-3.5 mr-1" />
          <span>Scan QR Sesi Baru</span>
        </Button>
      </div>

      {/* Tabel Sesi WhatsApp (Full Responsive Table) */}
      <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Nama Sesi / Label</th>
                <th className="py-2.5 px-4">Nomor WhatsApp</th>
                <th className="py-2.5 px-4">Status Koneksi</th>
                <th className="py-2.5 px-4">Total Terkirim</th>
                <th className="py-2.5 px-4">Warmup Stage</th>
                <th className="py-2.5 px-4">Anti-Ban Risk</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {sessions?.map((s) => {
                const isConn = s.status === 'connected';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-700 dark:text-emerald-400">
                      +{s.phone}
                    </td>
                    <td className="py-3 px-4">
                      {isConn ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Disconnected</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 dark:text-zinc-200">
                      {s.sentToday || 0} pesan
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-zinc-400">
                      Hari ke-{s.warmupDay || 1}
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
                      <div className="flex items-center justify-end gap-1">
                        {!isConn ? (
                          <Button onClick={() => openQr(s)} variant="default" size="sm" className="h-7 text-[11px]">
                            <QrCode className="w-3 h-3 mr-1" />
                            Hubungkan
                          </Button>
                        ) : (
                          <>
                            <Button onClick={() => openQr(s)} variant="outline" size="sm" className="h-7 text-[11px]">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Relink
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Radix Dialog (Scan QR WhatsApp Baileys) */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle>Scan QR Code WhatsApp</DialogTitle>
            <DialogDescription>
              Buka WhatsApp di ponsel &bull; Ketuk Menu/Pengaturan &bull; Perangkat Tertaut &bull; Tautkan Perangkat.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex flex-col items-center justify-center">
            <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=WAPI_SAMPLE_AUTH_STRING_DEMO_TEST"
                alt="QR Code Mockup"
                className="w-44 h-44 object-contain"
              />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
              <span>Auto-refresh setiap 20 detik</span>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button variant="outline" size="sm" onClick={() => setQrModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
