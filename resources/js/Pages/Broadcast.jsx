import React, { useState } from 'react';
import {
  Send,
  Users,
  FileText,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Zap,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function BroadcastPage({ groups, templates, sessions, campaigns: initialCampaigns }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns || []);
  
  // Wizard states
  const [step, setStep] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [senderMode, setSenderMode] = useState('auto_rotate'); // 'auto_rotate' or session id
  const [jitterPacing, setJitterPacing] = useState('medium'); // 'safe' (5-15s), 'medium' (3-8s), 'fast' (2-5s)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveSuccessMessage, setLiveSuccessMessage] = useState(null);

  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleStartBroadcast = () => {
    setIsSubmitting(true);
    
    setTimeout(() => {
      const newCampaign = {
        id: `camp_${Date.now()}`,
        title: `Broadcast - ${currentGroup.name}`,
        groupName: currentGroup.name,
        templateTitle: currentTemplate.title,
        status: 'running',
        total: currentGroup.contactCount || 250,
        sent: 12,
        success: 12,
        failed: 0,
        sentAt: 'Baru Saja',
        estimatedRemaining: '~18 menit',
      };

      setCampaigns([newCampaign, ...campaigns]);
      setIsSubmitting(false);
      setLiveSuccessMessage(`Batch ${newCampaign.id} diterima Fastify API Gateway (HTTP 202 Accepted) dengan Gaussian Pacing.`);
      setStep(1);

      // Otomatis bersihkan notifikasi
      setTimeout(() => setLiveSuccessMessage(null), 8000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Broadcast Campaign Engine</h1>
            <Badge variant="outline" className="font-mono text-[10px]">Zero-Laravel-Worker</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kirim ribuan pesan massal langsung lewat Fastify Internal Queue dengan Gaussian Jitter Pacing anti-blokir.
          </p>
        </div>
      </div>

      {liveSuccessMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{liveSuccessMessage}</span>
        </div>
      )}

      {/* 3-Step Wizard Card */}
      <Card>
        <CardHeader className="border-b border-zinc-800/60 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Buat Pengiriman Baru</CardTitle>
              <CardDescription>Ikuti 3 langkah konfigurasi target, pesan, dan proteksi sesi</CardDescription>
            </div>
            {/* Step Indicators */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono transition-colors ${
                    step === s
                      ? 'bg-emerald-600 text-white font-bold'
                      : step > s
                      ? 'bg-zinc-800 text-emerald-400'
                      : 'bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          {/* Step 1: Target Audience */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-zinc-200">
                Langkah 1: Pilih Segmen / Grup Target
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {groups.map((g) => {
                  const isSel = selectedGroupId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                        isSel
                          ? 'bg-zinc-900 border-emerald-500/50 shadow-xs'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-zinc-200">{g.name}</span>
                        {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        {g.contactCount} Penerima
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-3">
                <Button onClick={() => setStep(2)} variant="default" size="sm">
                  <span>Lanjut: Pilih Template</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 text-zinc-950" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Template */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-zinc-200">
                Langkah 2: Pilih Template Konten WhatsApp
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {templates.map((tpl) => {
                    const isSel = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSel
                            ? 'bg-zinc-900 border-emerald-500/50'
                            : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-zinc-200">{tpl.title}</span>
                          <Badge variant={tpl.type === 'media' ? 'warning' : 'outline'} className="text-[9px] font-mono">
                            {tpl.type}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{tpl.content}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Preview bubble */}
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center min-h-[200px]">
                  <WhatsAppBubblePreview
                    content={currentTemplate.content}
                    mediaUrl={currentTemplate.mediaUrl}
                    sampleData={{
                      name: 'Ahmad Dahlan',
                      phone: '628123456789',
                      tagihan: 'Rp 450.000',
                      tempo: '28 Sep 2026',
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <Button onClick={() => setStep(1)} variant="outline" size="sm">
                  Kembali
                </Button>
                <Button onClick={() => setStep(3)} variant="default" size="sm">
                  <span>Lanjut: Konfigurasi Anti-Ban</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 text-zinc-950" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Sender and Anti-Ban Engine */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-zinc-200">
                Langkah 3: Rute Pengirim & Proteksi Pacing
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rute Nomor */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-400 block">Metode Pengiriman</label>
                  <div
                    onClick={() => setSenderMode('auto_rotate')}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      senderMode === 'auto_rotate'
                        ? 'bg-zinc-900 border-emerald-500/50'
                        : 'bg-zinc-950/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-zinc-200">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Smart Multi-Session Auto-Rotate (Disarankan)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Beban blast otomatis dirotasi bergantian ke 3 nomor aktif untuk mencegah batas spam harian WhatsApp.
                    </p>
                  </div>
                </div>

                {/* Pacing Jitter Delay */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-400 block">Kecepatan & Jeda Pacing (Gaussian Jitter)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'safe', label: 'Aman', delay: '6s - 15s' },
                      { id: 'medium', label: 'Standar', delay: '3s - 8s' },
                      { id: 'fast', label: 'Cepat', delay: '2s - 4s' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setJitterPacing(mode.id)}
                        className={`p-2.5 rounded-lg border text-center cursor-pointer transition-colors ${
                          jitterPacing === mode.id
                            ? 'bg-zinc-900 border-emerald-500/50 text-zinc-100'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900/40'
                        }`}
                      >
                        <div className="text-xs font-semibold">{mode.label}</div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{mode.delay}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary recap */}
              <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-300">
                <div>
                  Target: <strong className="text-zinc-100">{currentGroup.name}</strong> ({currentGroup.contactCount} kontak)
                </div>
                <div>
                  Template: <strong className="text-zinc-100">{currentTemplate.title}</strong>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <Button onClick={() => setStep(2)} variant="outline" size="sm">
                  Kembali
                </Button>
                <Button
                  onClick={handleStartBroadcast}
                  disabled={isSubmitting}
                  variant="default"
                  size="sm"
                >
                  <Send className="w-3.5 h-3.5 mr-1 text-zinc-950" />
                  <span className="text-zinc-950 font-semibold">
                    {isSubmitting ? 'Mengirim ke Antrean...' : 'Mulai Broadcast Massal'}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabel Riwayat Kampanye */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Kampanye Terakhir</CardTitle>
          <CardDescription>Monitoring progress batch pesan massal secara real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.map((c) => {
              const pct = Math.round((c.sent / c.total) * 100);
              const isFinished = c.status === 'finished';
              return (
                <div key={c.id} className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">{c.title}</span>
                        <Badge variant={isFinished ? 'outline' : 'success'} className="text-[10px] uppercase font-mono">
                          {isFinished ? 'Selesai' : 'Sedang Berjalan'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Batch ID: <span className="font-mono text-zinc-400">{c.id}</span> &bull; {c.sentAt}
                      </div>
                    </div>
                    <div className="font-mono text-xs text-zinc-300">
                      {c.sent} / {c.total} ({pct}%)
                    </div>
                  </div>

                  <Progress value={pct} indicatorClassName={isFinished ? 'bg-zinc-500' : 'bg-emerald-500'} />

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono">Sukses: {c.success}</span>
                      <span className="text-rose-400 font-mono">Gagal: {c.failed}</span>
                    </div>
                    {!isFinished && (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">
                          <Pause className="w-3 h-3 mr-1" /> Jeda
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-rose-400">
                          Batalkan
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
