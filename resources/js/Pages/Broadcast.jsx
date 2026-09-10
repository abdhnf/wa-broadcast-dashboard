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
  Eye,
  Plus
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/Dialog';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function BroadcastPage({ groups, templates, sessions, campaigns: initialCampaigns }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns || []);
  
  // Wizard Modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [senderMode, setSenderMode] = useState('auto_rotate');
  const [jitterPacing, setJitterPacing] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveSuccessMessage, setLiveSuccessMessage] = useState(null);

  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleStartBroadcast = () => {
    setIsSubmitting(true);
    
    setTimeout(() => {
      const newCampaign = {
        id: `camp_${Date.now()}`,
        title: `Blast - ${currentGroup.name}`,
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
      setWizardOpen(false);
      setStep(1);
      setLiveSuccessMessage(`Batch ${newCampaign.id} diterima Fastify API Gateway (HTTP 202 Accepted) dengan Gaussian Pacing.`);

      setTimeout(() => setLiveSuccessMessage(null), 8000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Broadcast Campaign Engine
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">Direct Fastify Gateway</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Kirim ribuan pesan massal langsung lewat internal queue WA API server dengan pacing Gaussian Jitter anti-blokir.
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} variant="default" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Buat Pengiriman Baru</span>
        </Button>
      </div>

      {liveSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{liveSuccessMessage}</span>
        </div>
      )}

      {/* Tabel Kampanye Pengiriman Massal (Responsive Table) */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">KAMPANYE / BATCH ID</th>
                <th className="py-2.5 px-4 font-medium">TARGET SEGMEN</th>
                <th className="py-2.5 px-4 font-medium">TEMPLATE KONTEN</th>
                <th className="py-2.5 px-4 font-medium">STATUS</th>
                <th className="py-2.5 px-4 font-medium">PROGRESS DELIVERY</th>
                <th className="py-2.5 px-4 font-medium">SUKSES / GAGAL</th>
                <th className="py-2.5 px-4 font-medium text-right">KONTROL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
              {campaigns.map((c) => {
                const pct = Math.round((c.sent / c.total) * 100);
                const isFinished = c.status === 'finished';
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      <div>{c.title}</div>
                      <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 font-normal">
                        {c.id} &bull; {c.sentAt}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px]">
                        {c.groupName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 dark:text-zinc-400">
                      {c.templateTitle || 'Promo Reguler'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={isFinished ? 'outline' : 'success'} className="text-[10px] uppercase">
                        {isFinished ? 'Selesai' : 'Sedang Kirim'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 w-48">
                      <div className="space-y-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span>{c.sent} / {c.total}</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} indicatorClassName={isFinished ? 'bg-slate-400 dark:bg-zinc-600' : 'bg-emerald-500'} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{c.success}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-rose-600 dark:text-rose-400">{c.failed}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isFinished ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-[11px] px-2">
                            <Pause className="w-3 h-3 mr-1" /> Jeda
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-rose-600 dark:text-rose-400">
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">Arsip Selesai</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Wizard Buat Broadcast 3 Langkah (Radix Dialog) */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Buat Pengiriman Broadcast</DialogTitle>
              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                <span>Langkah {step} dari 3</span>
              </div>
            </div>
            <DialogDescription>
              Konfigurasi audiens, konten template pesan, dan opsi perataan anti-blokir
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            {/* Step 1: Target Audience */}
            {step === 1 && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Pilih Segmen / Grup Target:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {groups.map((g) => {
                    const isSel = selectedGroupId === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSel
                            ? 'bg-slate-100 dark:bg-zinc-900 border-emerald-500 shadow-2xs'
                            : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">{g.name}</span>
                          {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-1">
                          {g.contactCount} Penerima Terdaftar
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Content Template */}
            {step === 2 && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Pilih Template Pesan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {templates.map((tpl) => {
                    const isSel = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSel
                            ? 'bg-slate-100 dark:bg-zinc-900 border-emerald-500'
                            : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">{tpl.title}</span>
                          <Badge variant={tpl.type === 'media' ? 'warning' : 'outline'} className="text-[9px] font-mono">
                            {tpl.type}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2">{tpl.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Sender and Anti-Ban Engine */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-900 dark:text-white block mb-1">
                    Metode Perangkat Pengirim
                  </label>
                  <div
                    onClick={() => setSenderMode('auto_rotate')}
                    className="p-3 rounded-xl border border-emerald-500 bg-slate-50 dark:bg-zinc-900 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
                      <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Smart Multi-Session Auto-Rotate (Disarankan)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                      Beban pesan didistribusikan merata ke 3 nomor aktif untuk mencegah batasan spam WhatsApp.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-900 dark:text-white block mb-1">
                    Jeda Pengiriman (Gaussian Jitter Pacing)
                  </label>
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
                        className={`p-2.5 rounded-xl border text-center cursor-pointer transition-colors ${
                          jitterPacing === mode.id
                            ? 'bg-slate-100 dark:bg-zinc-900 border-emerald-500 font-semibold text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="text-xs">{mode.label}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{mode.delay}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center">
            {step > 1 ? (
              <Button onClick={() => setStep(step - 1)} variant="outline" size="sm">
                Kembali
              </Button>
            ) : <div />}

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} variant="default" size="sm">
                <span>Lanjut</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleStartBroadcast}
                disabled={isSubmitting}
                variant="default"
                size="sm"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>{isSubmitting ? 'Memproses...' : 'Mulai Broadcast Massal'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
