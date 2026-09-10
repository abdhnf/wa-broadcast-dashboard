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
  Plus,
  Trash2,
  ListOrdered,
  AlertCircle
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

export function BroadcastPage({ groups, templates, sessions, campaigns: initialCampaigns }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns || []);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Form State Setup Campaign
  const [campaignName, setCampaignName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(groups?.[0]?.name || 'Pelanggan VIP');
  const [selectedTemplate, setSelectedTemplate] = useState(templates?.[0]?.id || '');
  const [selectedSession, setSelectedSession] = useState(sessions?.[0]?.id || 'wa_blast_alpha');

  // Active Blast Manager State (Halaman/Panel Pengelolaan Antrean Nyata)
  const [activeBlastCampaign, setActiveBlastCampaign] = useState(initialCampaigns?.[0] || null);

  // Antrean nomor penerima yang bisa ditambah/dihapus sebelum/saat blast berjalan
  const [recipientQueue, setRecipientQueue] = useState([
    { id: 'q_1', phone: '6281234567891', name: 'Budi Santoso', status: 'sent', sentAt: '10:15 WIB' },
    { id: 'q_2', phone: '6281398765432', name: 'Siti Rahmawati', status: 'sent', sentAt: '10:16 WIB' },
    { id: 'q_3', phone: '6285211223344', name: 'Ahmad Fauzi', status: 'pending', sentAt: '-' },
    { id: 'q_4', phone: '6285644332211', name: 'Dewi Lestari', status: 'pending', sentAt: '-' },
    { id: 'q_5', phone: '6287766554433', name: 'Rizky Pratama', status: 'pending', sentAt: '-' },
  ]);

  // Modal Tambah Nomor ke Antrean
  const [isAddRecipientModalOpen, setIsAddRecipientModalOpen] = useState(false);
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');

  const [isPaused, setIsPaused] = useState(false);

  // Handler Buat Campaign Baru: Masuk ke Workspace Blast (TIDAK LANGSUNG BLAST)
  const handleCreateCampaign = (e) => {
    e.preventDefault();
    const tpl = templates?.find((t) => t.id === selectedTemplate);
    const grp = groups?.find((g) => g.name === selectedGroup);
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
      status: 'idle', // Status awal: Siap / Menunggu Review Antrean
      createdAt: 'Baru Saja',
      sessionUsed: sess ? sess.name : 'Auto Pool',
    };

    setCampaigns([newCamp, ...campaigns]);
    setActiveBlastCampaign(newCamp);
    setIsWizardOpen(false);
  };

  // Handler Hapus Nomor dari Antrean
  const handleRemoveRecipient = (id) => {
    setRecipientQueue(recipientQueue.filter((item) => item.id !== id));
  };

  // Handler Tambah Nomor ke Antrean
  const handleAddRecipient = (e) => {
    e.preventDefault();
    if (!newRecipientPhone) return;

    const newItem = {
      id: `q_${Date.now()}`,
      phone: newRecipientPhone.replace(/\D/g, ''),
      name: newRecipientName || 'Kontak Baru',
      status: 'pending',
      sentAt: '-'
    };

    setRecipientQueue([...recipientQueue, newItem]);
    setNewRecipientPhone('');
    setNewRecipientName('');
    setIsAddRecipientModalOpen(false);
  };

  // Handler Mulai Blast (Dipicu saat user sudah siap)
  const handleStartBlast = () => {
    if (!activeBlastCampaign) return;
    setActiveBlastCampaign({
      ...activeBlastCampaign,
      status: 'in_progress'
    });
    setCampaigns(
      campaigns.map((c) =>
        c.id === activeBlastCampaign.id ? { ...c, status: 'in_progress' } : c
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Blast Campaign & Antrean Pesan</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{campaigns.length} Kampanye</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Pacing interval pengiriman dikelola otomatis oleh WA API Gateway (Gaussian Jitter 3–12 detik).
          </p>
        </div>

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

      {/* ACTIVE BLAST WORKSPACE: Menampilkan detail kampanye aktif & pengelolaan antrean */}
      {activeBlastCampaign && (
        <div className="bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeBlastCampaign.name}
                </h2>
                <Badge
                  variant={activeBlastCampaign.status === 'in_progress' ? 'default' : 'secondary'}
                  className="font-mono text-[10px]"
                >
                  {activeBlastCampaign.status === 'in_progress'
                    ? 'Sedang Berjalan'
                    : activeBlastCampaign.status === 'completed'
                    ? 'Selesai'
                    : 'Siap Dikirim (Menunggu Konfirmasi)'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                <span>Batch: <code className="font-mono text-[11px]">{activeBlastCampaign.batchId}</code></span>
                <span>•</span>
                <span>Sesi: <strong className="text-slate-800 dark:text-zinc-200">{activeBlastCampaign.sessionUsed}</strong></span>
                <span>•</span>
                <span>Template: <strong className="text-slate-800 dark:text-zinc-200">{activeBlastCampaign.templateTitle}</strong></span>
              </div>
            </div>

            {/* Tombol Kontrol Blast */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddRecipientModalOpen(true)}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                <span>Tambah Nomor</span>
              </Button>

              {activeBlastCampaign.status === 'idle' ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleStartBlast}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  <span>Mulai Blast Sekarang</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-xs"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 mr-1" /> : <Pause className="w-3.5 h-3.5 mr-1" />}
                  <span>{isPaused ? 'Lanjutkan' : 'Jeda Antrean'}</span>
                </Button>
              )}
            </div>
          </div>

          {/* TABEL ANTREAN PENERIMA (Bisa Hapus / Tambah Nomor dalam antrean) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-emerald-500" />
                <span>Daftar Nomor Antrean Pengiriman ({recipientQueue.length} Nomor)</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Pemberhentian atau penghapusan nomor sebelum dikirim berlaku seketika
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[650px]">
                <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 text-[10px] uppercase font-semibold border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3">Nama Penerima</th>
                    <th className="py-2 px-3">Nomor WhatsApp</th>
                    <th className="py-2 px-3">Status Antrean</th>
                    <th className="py-2 px-3">Waktu Terkirim</th>
                    <th className="py-2 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {recipientQueue.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-zinc-100">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        +{item.phone}
                      </td>
                      <td className="py-2 px-3">
                        {item.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Terkirim</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>Menunggu Antrean</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                        {item.sentAt}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {item.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                            title="Hapus nomor dari antrean"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modern High-Density Table of All Campaigns */}
      <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Nama Kampanye</th>
                <th className="py-2.5 px-4">Segmen & Template</th>
                <th className="py-2.5 px-4">Sesi Pengirim</th>
                <th className="py-2.5 px-4">Status & Progres</th>
                <th className="py-2.5 px-4 text-right">Kelola</th>
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
                      onClick={() => setActiveBlastCampaign(camp)}
                      className="text-xs h-7"
                    >
                      <span>Buka Antrean</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat Kampanye: Menyusun Parameter & Masuk ke Halaman Blast */}
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
              ⚡ Kampanye baru akan masuk ke antrean blast dalam kondisi <strong>siap (idle)</strong>. Kamu dapat menambah atau memilah nomor penerima sebelum memulai blast.
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsWizardOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Susun Antrean Kampanye
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Nomor Langsung ke Antrean */}
      <Dialog open={isAddRecipientModalOpen} onOpenChange={setIsAddRecipientModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Nomor ke Antrean</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRecipient} className="space-y-3 text-xs py-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Nama Penerima
              </label>
              <input
                type="text"
                placeholder="Misal: Hendra Pratama"
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Nomor WhatsApp (628xxx) *
              </label>
              <input
                type="text"
                required
                placeholder="62812345678"
                value={newRecipientPhone}
                onChange={(e) => setNewRecipientPhone(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddRecipientModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Tambahkan ke Antrean
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
