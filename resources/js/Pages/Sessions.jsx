import React, { useState } from 'react';
import {
  Smartphone,
  Plus,
  QrCode,
  KeyRound,
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
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState('ABCD-1234');
  const [targetPhone, setTargetPhone] = useState('');

  const openQr = (s) => {
    setSelectedSession(s);
    setQrModalOpen(true);
  };

  const openPairing = (s) => {
    setSelectedSession(s);
    setTargetPhone(s.phone || '628899001122');
    setPairingCode('ABCD-1234');
    setPairingModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            WhatsApp Sessions
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Manajemen multi-device Baileys, monitoring auto-rotate pengiriman, dan telemetry anti-ban.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openPairing({ name: 'Sesi Baru' })} variant="outline" size="sm">
            <KeyRound className="w-3.5 h-3.5 mr-1" />
            <span>Pairing 8-Digit</span>
          </Button>
          <Button onClick={() => openQr({ name: 'Sesi Baru' })} variant="default" size="sm">
            <QrCode className="w-3.5 h-3.5 mr-1" />
            <span>Scan QR Baru</span>
          </Button>
        </div>
      </div>

      {/* Tabel Sesi WhatsApp (Full Responsive Table, Menggantikan Card) */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">NAMA SESI / LABEL</th>
                <th className="py-2.5 px-4 font-medium">NOMOR WA</th>
                <th className="py-2.5 px-4 font-medium">STATUS KONEKSI</th>
                <th className="py-2.5 px-4 font-medium">TOTAL TERKIRIM</th>
                <th className="py-2.5 px-4 font-medium">WARMUP STAGE</th>
                <th className="py-2.5 px-4 font-medium">ANTI-BAN RISK</th>
                <th className="py-2.5 px-4 font-medium text-right">AKSI KONEKSI</th>
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
                    <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-zinc-200">
                      {s.phone}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={isConn ? 'success' : 'warning'} className="text-[10px]">
                        {isConn ? 'Connected' : 'Connecting'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 dark:text-zinc-200">
                      {s.sentCount} pesan
                    </td>
                    <td className="py-3 px-4 capitalize font-mono text-[11px] text-slate-600 dark:text-zinc-400">
                      {s.warmupStatus || 'Mature (Safe)'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.riskScore < 20
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      }`}>
                        {s.riskScore} / 100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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

      {/* QR Code Radix Dialog */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle>Scan QR WhatsApp</DialogTitle>
            <DialogDescription>
              Buka WhatsApp di ponsel &bull; Ketuk Menu/Pengaturan &bull; Perangkat Tertaut &bull; Tautkan Perangkat.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center">
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

      {/* Pairing Code Radix Dialog */}
      <Dialog open={pairingModalOpen} onOpenChange={setPairingModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tautkan dengan Pairing Code</DialogTitle>
            <DialogDescription>
              Masukkan kode 8 digit ke notifikasi WhatsApp pada ponsel Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Nomor WhatsApp Pengirim</label>
              <input
                type="text"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="628123456789"
                className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 text-center space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase">Kode Tautan (Pairing Code)</span>
              <div className="text-xl font-bold font-mono tracking-widest text-emerald-600 dark:text-emerald-400">
                {pairingCode}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPairingModalOpen(false)}>
              Batal
            </Button>
            <Button variant="default" size="sm" onClick={() => setPairingModalOpen(false)}>
              Selesai Ditautkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
