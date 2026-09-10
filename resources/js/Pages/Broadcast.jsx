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
  RotateCcw,
  Zap,
  ArrowRight,
  Eye,
  Plus,
  Trash2,
  ListOrdered
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/Dialog';

export function BroadcastPage({ groups, templates, sessions, campaigns: initialCampaigns, onNavigate }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns || []);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Form State Setup Campaign
  const [campaignName, setCampaignName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(groups?.[0]?.name || 'Pelanggan VIP');
  const [selectedTemplate, setSelectedTemplate] = useState(templates?.[0]?.id || '');
  const [selectedSession, setSelectedSession] = useState(sessions?.[0]?.id || 'wa_blast_alpha');

  // Handler Buat Campaign Baru: Masuk ke Daftar Kampanye lalu user bisa langsung cek antreannya
  const handleCreateCampaign = (e) => {
    e.preventDefault();
    const tpl = templates?.find((t) => t.id === selectedTemplate);
    const sess = sessions?.find((s) => s.id === selectedSession);

    const newCamp = {
      id: `cmp_${Date.now()}`,
      name: campaignName || `Blast - ${selectedGroup}`,
      batchId: `batch_${Math.random().toString(36).substring(2, 9)}`,
      groupName: selectedGroup,
      templateTitle: tpl ? tpl.title : 'Custom Blast',
      totalRecipients: 5,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      status: 'idle', // Siap / Menunggu Eksekusi
      createdAt: 'Baru Saja',
      sessionUsed: sess ? sess.name : 'Auto Pool',
    };

    setCampaigns([newCamp, ...campaigns]);
    setIsWizardOpen(false);

    // Langsung arahkan ke halaman Antrean Pesan jika onNavigate tersedia
    if (onNavigate) {
      onNavigate('queue');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Daftar Kampanye Broadcast</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{campaigns.length} Kampanye</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Kelola batch blast WhatsApp. Untuk memantau, menambah, atau membatalkan nomor antrean silakan buka menu <strong>Antrean Pesan</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => onNavigate && onNavigate('queue')}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <ListOrdered className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            <span>Buka Halaman Antrean</span>
          </Button>

          <Button
            onClick={() => {
              setCampaignName('');
              setIsWizardOpen(true);
            }}
            variant="default"
            size="sm"
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Buat Kampanye Baru</span>
          </Button>
        </div>
      </div>

      {/* Modern High-Density Table of Campaigns */}
      <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Nama Kampanye</th>
                <th className="py-2.5 px-4">Segmen & Template</th>
                <th className="py-2.5 px-4">Sesi Pengirim</th>
                <th className="py-2.5 px-4">Status & Progres</th>
                <th className="py-2.5 px-4 text-right">Aksi Antrean</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                    <div>{camp.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{camp.createdAt}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-800 dark:text-zinc-200 font-medium">{camp.groupName}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">{camp.templateTitle}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-zinc-300">
                    {camp.sessionUsed}
                  </td>
                  <td className="py-3 px-4 w-48">
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="capitalize text-emerald-600 dark:text-emerald-400 font-bold">
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
                  <td className="py-3 px-4 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate && onNavigate('queue')}
                      className="text-xs h-7"
                    >
                      <ListOrdered className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                      <span>Lihat Antrean</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat Kampanye */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Kampanye Blast Baru</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCampaign} className="space-y-3.5 text-xs py-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Nama Kampanye *
              </label>
              <input
                type="text"
                required
                placeholder="Misal: Info Pelanggan Loyal September"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Target Segmen Audiens
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {groups?.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name} ({g.count} kontak)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Pilih Template Pesan
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.messageType || 'text'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Sesi WhatsApp Pengirim
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {sessions?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              ⚡ Setelah kampanye dibuat, kamu akan dialihkan ke halaman <strong>Antrean Pesan</strong> untuk memverifikasi nomor penerima sebelum broadcast berjalan.
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsWizardOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Buat & Buka Antrean
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
