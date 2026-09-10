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
  Filter,
  Search,
  ChevronLeft
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
  const [subView, setSubView] = useState('campaigns'); // 'campaigns' | 'queue'
  const [selectedCampaign, setSelectedCampaign] = useState(initialCampaigns?.[0] || null);

  // Form State Setup Campaign
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(groups?.[0]?.name || 'Pelanggan VIP');
  const [selectedTemplate, setSelectedTemplate] = useState(templates?.[0]?.id || '');
  const [selectedSession, setSelectedSession] = useState(sessions?.[0]?.id || 'wa_blast_alpha');

  // Master Antrean Pesan (Queue)
  const [recipientQueue, setRecipientQueue] = useState([
    { id: 'q_1', campaignId: 'cmp_101', phone: '6281234567891', name: 'Budi Santoso', status: 'sent', sentAt: '10:15 WIB', session: 'Broadcast Pool A' },
    { id: 'q_2', campaignId: 'cmp_101', phone: '6281398765432', name: 'Siti Rahmawati', status: 'sent', sentAt: '10:16 WIB', session: 'Broadcast Pool A' },
    { id: 'q_3', campaignId: 'cmp_101', phone: '6285211223344', name: 'Ahmad Fauzi', status: 'pending', sentAt: '-', session: 'Broadcast Pool A' },
    { id: 'q_4', campaignId: 'cmp_101', phone: '6285644332211', name: 'Dewi Lestari', status: 'pending', sentAt: '-', session: 'Broadcast Pool A' },
    { id: 'q_5', campaignId: 'cmp_101', phone: '6287766554433', name: 'Rizky Pratama', status: 'pending', sentAt: '-', session: 'Broadcast Pool A' },
    { id: 'q_6', campaignId: 'cmp_102', phone: '6281122334455', name: 'Hendro Wijaya', status: 'pending', sentAt: '-', session: 'Customer Support 1' },
    { id: 'q_7', campaignId: 'cmp_102', phone: '6281988776655', name: 'Maya Anggraini', status: 'pending', sentAt: '-', session: 'Customer Support 1' },
  ]);

  // Antrean Filter & Modal State
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState('all');
  const [isPaused, setIsPaused] = useState(false);
  const [isAddRecipientModalOpen, setIsAddRecipientModalOpen] = useState(false);
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');

  // Handler Buka Antrean Kampanye Tertentu
  const handleOpenQueueView = (camp) => {
    setSelectedCampaign(camp);
    setSubView('queue');
  };

  // Handler Buat Kampanye Baru: otomatis buka halaman antrean kampanye tersebut
  const handleCreateCampaign = (e) => {
    e.preventDefault();
    const tpl = templates?.find((t) => t.id === selectedTemplate);
    const sess = sessions?.find((s) => s.id === selectedSession);

    const newCampId = `cmp_${Date.now()}`;
    const newCamp = {
      id: newCampId,
      name: campaignName || `Blast - ${selectedGroup}`,
      batchId: `batch_${Math.random().toString(36).substring(2, 9)}`,
      groupName: selectedGroup,
      templateTitle: tpl ? tpl.title : 'Custom Blast',
      totalRecipients: 3,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      status: 'idle', // Siap / Menunggu Eksekusi
      createdAt: 'Baru Saja',
      sessionUsed: sess ? sess.name : 'Auto Pool',
    };

    // Tambah nomor dummy awal ke antrean
    const initialQueueItems = [
      { id: `q_${Date.now()}_1`, campaignId: newCampId, phone: '6281234567891', name: 'Budi Santoso', status: 'pending', sentAt: '-', session: newCamp.sessionUsed },
      { id: `q_${Date.now()}_2`, campaignId: newCampId, phone: '6281398765432', name: 'Siti Rahmawati', status: 'pending', sentAt: '-', session: newCamp.sessionUsed },
      { id: `q_${Date.now()}_3`, campaignId: newCampId, phone: '6285211223344', name: 'Ahmad Fauzi', status: 'pending', sentAt: '-', session: newCamp.sessionUsed },
    ];

    setCampaigns([newCamp, ...campaigns]);
    setRecipientQueue([...initialQueueItems, ...recipientQueue]);
    setSelectedCampaign(newCamp);
    setIsWizardOpen(false);
    setSubView('queue'); // Langsung buka sub-halaman antrean pesan kampanye ini!
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
      campaignId: selectedCampaign?.id || 'cmp_101',
      phone: newRecipientPhone.replace(/\D/g, ''),
      name: newRecipientName || 'Kontak Tambahan',
      status: 'pending',
      sentAt: '-',
      session: selectedCampaign?.sessionUsed || 'Auto Pool'
    };

    setRecipientQueue([newItem, ...recipientQueue]);
    setNewRecipientPhone('');
    setNewRecipientName('');
    setIsAddRecipientModalOpen(false);
  };

  // Handler Mulai Blast
  const handleStartBlast = () => {
    if (!selectedCampaign) return;
    const updated = { ...selectedCampaign, status: 'in_progress' };
    setSelectedCampaign(updated);
    setCampaigns(campaigns.map((c) => (c.id === selectedCampaign.id ? updated : c)));
  };

  // Filter antrean untuk sub-view
  const currentFilteredQueue = recipientQueue.filter((item) => {
    const matchCampaign = !selectedCampaign || item.campaignId === selectedCampaign.id;
    const matchStatus = queueStatusFilter === 'all' || item.status === queueStatusFilter;
    const matchSearch =
      item.name.toLowerCase().includes(queueSearch.toLowerCase()) ||
      item.phone.includes(queueSearch);
    return matchCampaign && matchStatus && matchSearch;
  });

  const pendingCount = currentFilteredQueue.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Sub-view Tab Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              {subView === 'campaigns' ? 'Blast Engine & Kampanye' : `Antrean Pesan: ${selectedCampaign?.name || 'Semua Kampanye'}`}
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">
              {subView === 'campaigns' ? `${campaigns.length} Kampanye` : `${pendingCount} Pending`}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {subView === 'campaigns'
              ? 'Kelola kampanye broadcast, status kirim, dan pacing Gaussian Jitter Fastify WA API.'
              : 'Pantau antrean nomor pesan, tambah nomor penerima, atau hapus nomor sebelum terkirim.'}
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2">
          {subView === 'queue' ? (
            <>
              <Button
                onClick={() => setSubView('campaigns')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                <span>Daftar Kampanye</span>
              </Button>
              <Button
                onClick={() => setIsAddRecipientModalOpen(true)}
                variant="default"
                size="sm"
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Tambah Nomor Antrean</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setSubView('queue')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <ListOrdered className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                <span>Lihat Semua Antrean</span>
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
            </>
          )}
        </div>
      </div>

      {/* TAMPILAN 1: DAFTAR KAMPANYE (SUBVIEW = 'campaigns') */}
      {subView === 'campaigns' && (
        <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[760px]">
              <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">Nama Kampanye</th>
                  <th className="py-2.5 px-4">Segmen & Template</th>
                  <th className="py-2.5 px-4">Sesi Pengirim</th>
                  <th className="py-2.5 px-4">Status & Progres</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
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
                        onClick={() => handleOpenQueueView(camp)}
                        className="text-xs h-7"
                      >
                        <ListOrdered className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                        <span>Buka Antrean</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAMPILAN 2: SUB-HALAMAN ANTREAN PESAN (SUBVIEW = 'queue') */}
      {subView === 'queue' && (
        <div className="space-y-3">
          {/* Detail Kampanye & Kontrol Pacing */}
          {selectedCampaign && (
            <div className="bg-white dark:bg-[#0f1117] p-3 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCampaign.name}</span>
                <span className="font-mono text-slate-400 text-[11px]">({selectedCampaign.batchId})</span>
                <Badge variant={selectedCampaign.status === 'in_progress' ? 'default' : 'secondary'} className="text-[10px]">
                  {selectedCampaign.status === 'in_progress' ? 'Berjalan' : 'Idle (Siap)'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {selectedCampaign.status === 'idle' ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleStartBlast}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    <span>Mulai Blast</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                    className="h-7 text-xs"
                  >
                    {isPaused ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                    <span>{isPaused ? 'Lanjutkan Pacing' : 'Jeda Pacing'}</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Filter Toolbar Antrean */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0f1117] p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 dark:text-zinc-400">Pilih Kampanye:</span>
              <select
                value={selectedCampaign?.id || 'all'}
                onChange={(e) => {
                  const found = campaigns.find((c) => c.id === e.target.value);
                  setSelectedCampaign(found || null);
                }}
                className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Semua Kampanye</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={queueStatusFilter}
                onChange={(e) => setQueueStatusFilter(e.target.value)}
                className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu Antrean (Pending)</option>
                <option value="sent">Sudah Terkirim (Sent)</option>
              </select>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau nomor..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Tabel Antrean Pesan Responsif */}
          <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[760px]">
                <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Nama Kontak</th>
                    <th className="py-2.5 px-4">Nomor WhatsApp</th>
                    <th className="py-2.5 px-4">Batch Kampanye</th>
                    <th className="py-2.5 px-4">Status Pengiriman</th>
                    <th className="py-2.5 px-4">Waktu Dispatch</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 font-normal">
                  {currentFilteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                        Tidak ada pesan dalam antrean.
                      </td>
                    </tr>
                  ) : (
                    currentFilteredQueue.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          +{item.phone}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            {item.campaignId}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {item.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Terkirim (Sent)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Menunggu Antrean (Pending)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                          {item.sentAt}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {item.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipient(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Hapus dari antrean"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
              ⚡ Kampanye baru akan langsung membuka antrean pesan untuk verifikasi nomor sebelum broadcast dimulai.
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

      {/* Modal Tambah Nomor Langsung ke Antrean */}
      <Dialog open={isAddRecipientModalOpen} onOpenChange={setIsAddRecipientModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Nomor ke Antrean</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRecipient} className="space-y-3 text-xs py-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Target Kampanye
              </label>
              <select
                value={selectedCampaign?.id || ''}
                onChange={(e) => {
                  const found = campaigns.find((c) => c.id === e.target.value);
                  setSelectedCampaign(found || null);
                }}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
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
