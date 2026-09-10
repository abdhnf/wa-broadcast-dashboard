import React, { useState } from 'react';
import {
  Send,
  Sparkles,
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
  ArrowRight
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function BroadcastPage({ campaigns: initialCampaigns, groups, templates, sessions }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [selectedSessionId, setSelectedSessionId] = useState('auto_rotate');
  const [jitterDelay, setJitterDelay] = useState('adaptif');
  const [isLaunching, setIsLaunching] = useState(false);

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleStartBroadcast = () => {
    setIsLaunching(true);

    setTimeout(() => {
      const newCampaign = {
        id: `cmp_${Date.now()}`,
        name: `Blast: ${activeGroup.name} (${activeTemplate.title})`,
        batchId: `batch_${Date.now().toString(36)}`,
        groupName: activeGroup.name,
        templateTitle: activeTemplate.title,
        totalRecipients: activeGroup.count,
        sentCount: 1,
        deliveredCount: 1,
        readCount: 0,
        failedCount: 0,
        status: 'in_progress',
        createdAt: 'Baru saja',
        sessionUsed: selectedSessionId === 'auto_rotate' ? 'Auto-Rotate Multi-Session' : 'Nomor Pilihan',
      };

      setCampaigns([newCampaign, ...campaigns]);
      setIsLaunching(false);
      setStep(1); // reset wizard
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Broadcast &amp; Blast Campaign</h1>
          <p className="text-xs text-slate-400">
            Kirim pesan massal terpersonalisasi langsung ke antrean WA API Server tanpa membebani antrian Laravel.
          </p>
        </div>
      </div>

      {/* Wizard 3 Langkah */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
              {step}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {step === 1 && 'Langkah 1: Tentukan Target Segmentasi Kontak'}
                {step === 2 && 'Langkah 2: Pilih Template & Isi Pesan WhatsApp'}
                {step === 3 && 'Langkah 3: Rute Pengirim & Anti-Spam Pacing'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 1 && 'Pilih salah satu grup kontak yang sudah terisi nomor WhatsApp penerima.'}
                {step === 2 && 'Pilih template yang memuat teks dan media yang akan dibroadcast.'}
                {step === 3 && 'Tentukan nomor pengirim WhatsApp dan jeda Gaussian Jitter adaptif.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">Langkah {step} dari 3</span>
          </div>
        </div>

        {/* Step 1: Pilih Grup */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Pilih Grup Kontak Tujuan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {groups.map((g) => {
                const isSelected = g.id === selectedGroupId;
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{g.name}</span>
                      <Badge variant={isSelected ? 'success' : 'default'}>{g.count} Nomor</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{g.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} variant="primary">
                <span>Lanjut: Pilih Template</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Pilih Template */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Pilih Template Pesan
                </label>
                <div className="space-y-2">
                  {templates.map((t) => {
                    const isSelected = t.id === selectedTemplateId;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`p-4 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{t.title}</span>
                          <Badge variant="default">{t.mediaUrl ? 'Teks + Media' : 'Teks Saja'}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {t.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview bubble */}
              <div className="space-y-2 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-medium text-slate-400 mb-2">Simulasi Pesan ke Pelanggan</span>
                <WhatsAppBubblePreview
                  content={activeTemplate.content}
                  mediaUrl={activeTemplate.mediaUrl}
                  sampleName="Budi Santoso"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button onClick={() => setStep(1)} variant="secondary">
                Kembali
              </Button>
              <Button onClick={() => setStep(3)} variant="primary">
                <span>Lanjut: Pengaturan Rute &amp; Pacing</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Rute & Pacing */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Nomor Pengirim WhatsApp</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="auto_rotate">✨ Auto-Rotate Multi-Session (Direkomendasikan)</option>
                  {sessions.filter(s => s.status === 'connected').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (+{s.phone})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Auto-Rotate akan membagi antrean rata ke semua nomor yang aktif agar terhindar dari spam rate-limit.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Pacing Jitter Delay (Anti-Ban)</label>
                <select
                  value={jitterDelay}
                  onChange={(e) => setJitterDelay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                >
                  <option value="adaptif">Gaussian Jitter Adaptif (3s - 12s, Optimal)</option>
                  <option value="santai">Santai &amp; Aman (8s - 20s per pesan)</option>
                  <option value="cepat">Cepat (1s - 4s, Khusus nomor lama)</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Waktu jeda acak antar pesan dihitung langsung oleh Fastify Baileys Queue di server.
                </p>
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-emerald-300">Ringkasan Eksekusi Kampanye:</span>
                <div className="text-slate-300 text-[11px]">
                  Target: <strong className="text-white">{activeGroup.name}</strong> ({activeGroup.count} kontak) &bull; Template: <strong className="text-white">{activeTemplate.title}</strong>
                </div>
              </div>
              <div className="text-emerald-400 font-mono text-xs font-bold">
                Status: Siap Diluncurkan
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button onClick={() => setStep(2)} variant="secondary">
                Kembali
              </Button>
              <Button onClick={handleStartBroadcast} variant="primary" disabled={isLaunching}>
                <Send className="w-4 h-4" />
                <span>{isLaunching ? 'Mengirim ke Server WA...' : 'Luncurkan Broadcast Sekarang'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Monitoring Kampanye Aktif & Riwayat */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider px-1">
          Daftar Kampanye &amp; Batch Monitor
        </h2>

        <div className="space-y-3">
          {campaigns.map((cmp) => {
            const percent = Math.round((cmp.sentCount / cmp.totalRecipients) * 100);
            const isDone = cmp.status === 'completed';

            return (
              <div key={cmp.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{cmp.name}</h3>
                      <Badge variant={isDone ? 'success' : 'info'}>
                        {isDone ? 'Selesai' : 'Sedang Berjalan (Queue)'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Batch ID: <span className="text-slate-300">{cmp.batchId}</span> &bull; Pengirim: {cmp.sessionUsed}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-sm font-bold font-mono text-slate-200">
                      {cmp.sentCount} / {cmp.totalRecipients} ({percent}%)
                    </span>
                    <span className="text-[11px] text-slate-400 block">{cmp.createdAt}</span>
                  </div>
                </div>

                <Progress value={percent} />

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="text-emerald-400">✓ {cmp.deliveredCount} Sukses</span>
                    <span className="text-cyan-400">✓✓ {cmp.readCount} Dibaca</span>
                    {cmp.failedCount > 0 && (
                      <span className="text-rose-400">✕ {cmp.failedCount} Gagal</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isDone ? (
                      <>
                        <Button variant="ghost" size="sm">
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Kirim Ulang Gagal (0)</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
