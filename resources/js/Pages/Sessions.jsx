import React, { useState } from 'react';
import {
  Smartphone,
  QrCode,
  KeyRound,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose
} from '../components/ui/Dialog';

export function SessionsPage({ sessions: initialSessions }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [pairPhone, setPairPhone] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [activeSessionTarget, setActiveSessionTarget] = useState(null);

  const handleOpenQr = (session) => {
    setActiveSessionTarget(session);
    setQrModalOpen(true);
  };

  const handleOpenPair = (session) => {
    setActiveSessionTarget(session);
    setPairPhone(session ? session.phone : '');
    setGeneratedCode(null);
    setPairModalOpen(true);
  };

  const generatePairingCode = () => {
    // Simulasi kode pairing 8 karakter
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    setGeneratedCode(formatted);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Sesi WhatsApp &amp; Pool Telemetri</h1>
          <p className="text-xs text-slate-400">
            Hubungkan nomor WhatsApp via QR Code atau 8-Digit Pairing Code untuk distribusi pesan massal.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => handleOpenPair(null)} variant="secondary" size="md">
            <KeyRound className="w-4 h-4" />
            <span>Pairing Code</span>
          </Button>
          <Button onClick={() => handleOpenQr(null)} variant="primary" size="md">
            <QrCode className="w-4 h-4" />
            <span>Scan QR Baru</span>
          </Button>
        </div>
      </div>

      {/* Grid Sesi WhatsApp */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((s) => {
          const isConnected = s.status === 'connected';
          return (
            <div
              key={s.id}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                    isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{s.name}</h3>
                      <Badge variant={isConnected ? 'success' : 'danger'}>
                        {isConnected ? 'Connected' : 'Offline'}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">+{s.phone}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Risk Score</span>
                  <span className={`text-xs font-mono font-bold ${s.riskScore < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {s.riskScore} / 100
                  </span>
                </div>
              </div>

              {/* Status Bar info */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Platform</span>
                  <span className="text-slate-200 font-medium">{s.platform}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Terkirim Hari Ini</span>
                  <span className="text-emerald-400 font-mono font-semibold">{s.sentToday}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Fase Warmup</span>
                  <span className="text-slate-200 font-medium">Hari ke-{s.warmupDay}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Antrean: <strong className="text-slate-200 font-mono">{s.queueCount} pesan</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  {!isConnected ? (
                    <Button onClick={() => handleOpenQr(s)} variant="primary" size="sm">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Sambungkan</span>
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sync</span>
                      </Button>
                      <Button variant="danger" size="sm">
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Putus</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Scan QR Code (Radix UI Dialog) */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Scan QR Code WhatsApp</DialogTitle>
            <DialogDescription>
              Buka WhatsApp di HP Anda ➔ Perangkat Tertaut (Linked Devices) ➔ Tautkan Perangkat.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-white text-slate-900 shadow-inner">
            {/* Mockup QR Code */}
            <div className="w-48 h-48 bg-slate-100 rounded-xl flex flex-col items-center justify-center border-4 border-slate-900 p-2 relative">
              <QrCode className="w-36 h-36 text-slate-950" />
              <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[0.5px]">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shadow">WA</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-3 font-medium flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>QR Code diperbarui otomatis setiap 60 detik</span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setQrModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: 8-Digit Pairing Code (Radix UI Dialog) */}
      <Dialog open={pairModalOpen} onOpenChange={setPairModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hubungkan via 8-Digit Pairing Code</DialogTitle>
            <DialogDescription>
              Masukkan nomor WhatsApp Anda. Kode 8 digit akan digenerate untuk dimasukkan ke WhatsApp di HP Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nomor WhatsApp Pengirim</label>
              <input
                type="text"
                placeholder="6281234567890"
                value={pairPhone}
                onChange={(e) => setPairPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">Gunakan format internasional tanpa tanda tambah (contoh: 628xxx)</span>
            </div>

            {generatedCode ? (
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 text-center space-y-2">
                <span className="text-xs text-emerald-300 font-medium">Masukkan kode ini di WhatsApp HP Anda:</span>
                <div className="text-2xl font-bold font-mono tracking-widest text-emerald-400 py-1">
                  {generatedCode}
                </div>
                <p className="text-[11px] text-slate-400">
                  Notifikasi pairing akan muncul di bilah notifikasi HP Anda dalam 5 detik.
                </p>
              </div>
            ) : (
              <Button onClick={generatePairingCode} variant="primary" className="w-full">
                <KeyRound className="w-4 h-4" />
                <span>Minta Kode Pairing 8-Digit</span>
              </Button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setPairModalOpen(false)}>
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
