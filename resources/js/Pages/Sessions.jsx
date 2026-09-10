import React, { useState } from 'react';
import {
  Smartphone,
  Plus,
  QrCode,
  KeyRound,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  SignalHigh
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
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
  const [pairingCode, setPairingCode] = useState('');
  const [targetPhone, setTargetPhone] = useState('');

  const openQrModal = (session) => {
    setSelectedSession(session);
    setQrModalOpen(true);
  };

  const openPairingModal = (session) => {
    setSelectedSession(session);
    setTargetPhone(session.phone || '628899001122');
    setPairingCode('ABCD-1234');
    setPairingModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">WhatsApp Sessions</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kelola pool koneksi nomor WhatsApp, pantau anti-ban risk score, dan pairing Baileys.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openPairingModal({ name: 'Sesi Baru' })} variant="outline" size="sm">
            <KeyRound className="w-3.5 h-3.5 mr-1" />
            <span>Pairing Code</span>
          </Button>
          <Button onClick={() => openQrModal({ name: 'Sesi Baru' })} variant="default" size="sm">
            <QrCode className="w-3.5 h-3.5 mr-1 text-zinc-950" />
            <span className="text-zinc-950 font-semibold">Scan QR Baru</span>
          </Button>
        </div>
      </div>

      {/* Grid Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((s) => {
          const isConn = s.status === 'connected';
          return (
            <Card key={s.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{s.name}</CardTitle>
                    <div className="text-xs font-mono text-zinc-400 mt-1">{s.phone}</div>
                  </div>
                  <Badge variant={isConn ? 'success' : 'warning'} className="text-[10px]">
                    {isConn ? 'Connected' : 'Connecting'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80 font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Terkirim Hari Ini</span>
                    <span className="font-semibold text-zinc-200">{s.sentCount} pesan</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Anti-Ban Risk</span>
                    <span className={`font-semibold ${s.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {s.riskScore} / 100
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Status Warmup:</span>
                  <span className="font-mono text-zinc-300 capitalize">{s.warmupStatus || 'Mature (Safe)'}</span>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2">
                  {!isConn ? (
                    <Button onClick={() => openQrModal(s)} variant="default" size="sm" className="flex-1">
                      <QrCode className="w-3.5 h-3.5 mr-1" />
                      Hubungkan Ulang
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => openQrModal(s)} variant="outline" size="sm" className="flex-1">
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Sinkronkan
                      </Button>
                      <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
            <div className="p-4 bg-white rounded-xl shadow-lg border border-zinc-700">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=WAPI_SAMPLE_AUTH_STRING_DEMO_TEST"
                alt="QR Code Mockup"
                className="w-44 h-44 object-contain"
              />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              <span>Auto-refresh dalam 20 detik</span>
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
              Masukkan kode 8 digit ke notifikasi WhatsApp pada ponsel Anda tanpa scan kamera.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Nomor WhatsApp Pengirim</label>
              <input
                type="text"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="628123456789"
                className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Pairing Code</span>
              <div className="text-xl font-bold font-mono tracking-widest text-emerald-400">
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
