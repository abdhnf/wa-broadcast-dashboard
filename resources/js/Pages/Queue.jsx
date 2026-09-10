import React, { useState } from 'react';
import {
  ListOrdered,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Filter,
  Search,
  Smartphone,
  Check,
  X
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

export function QueuePage({ campaigns, sessions, onNavigate }) {
  // Campaign aktif yang sedang dilihat antreannya
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    campaigns?.[0]?.id || null
  );

  // Status antrean per campaign
  const [recipientQueue, setRecipientQueue] = useState([
    { id: 'q_1', campaignId: 'cmp_101', phone: '6281234567891', name: 'Budi Santoso', status: 'sent', sentAt: '10:15 WIB', session: 'Broadcast Pool A' },
    { id: 'q_2', campaignId: 'cmp_101', phone: '6281398765432', name: 'Siti Rahmawati', status: 'sent', sentAt: '10:16 WIB', session: 'Broadcast Pool A' },
    { id: 'q_3', campaignId: 'cmp_101', phone: '6285211223344', name: 'Ahmad Fauzi', status: 'pending', sentAt: '-', session: 'Broadcast Pool A' },
    { id: 'q_4', campaignId: 'cmp_101', phone: '6285644332211', name: 'Dewi Lestari', status: 'pending', sentAt: '-', session: 'Broadcast Pool A' },
    { id: 'q_5', campaignId: 'cmp_101', phone: '6287766554433', name: 'Rizky Pratama', status: 'pending', sentAt: '-', session: 'Broadcast Pool A' },
    { id: 'q_6', campaignId: 'cmp_102', phone: '6281122334455', name: 'Hendro Wijaya', status: 'pending', sentAt: '-', session: 'Customer Support 1' },
    { id: 'q_7', campaignId: 'cmp_102', phone: '6281988776655', name: 'Maya Anggraini', status: 'pending', sentAt: '-', session: 'Customer Support 1' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const activeCampaign = campaigns?.find((c) => c.id === selectedCampaignId) || campaigns?.[0];

  // Filter antrean berdasarkan campaign yang dipilih, status, dan search text
  const currentQueue = recipientQueue.filter((item) => {
    const matchCampaign = selectedCampaignId === 'all' || item.campaignId === selectedCampaignId;
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery);
    return matchCampaign && matchStatus && matchSearch;
  });

  const pendingCount = currentQueue.filter((i) => i.status === 'pending').length;
  const sentCount = currentQueue.filter((i) => i.status === 'sent').length;

  const handleRemoveRecipient = (id) => {
    setRecipientQueue(recipientQueue.filter((item) => item.id !== id));
  };

  const handleAddRecipient = (e) => {
    e.preventDefault();
    if (!newPhone) return;

    const newItem = {
      id: `q_${Date.now()}`,
      campaignId: activeCampaign?.id || 'cmp_101',
      phone: newPhone.replace(/\D/g, ''),
      name: newName || 'Kontak Tambahan',
      status: 'pending',
      sentAt: '-',
      session: activeCampaign?.sessionUsed || 'Auto Pool'
    };

    setRecipientQueue([...recipientQueue, newItem]);
    setNewPhone('');
    setNewName('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Antrean Pesan WhatsApp</h1>
            <Badge variant="outline" className="font-mono text-[10px]">
              {pendingCount} Pending / {currentQueue.length} Total
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Halaman khusus monitoring antrean blast, pacing Gaussian Jitter Fastify WA API, tambah nomor, dan pembatalan nomor antrean sebelum terkirim.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="text-xs"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 mr-1" /> : <Pause className="w-3.5 h-3.5 mr-1" />}
            <span>{isPaused ? 'Lanjutkan Pacing' : 'Jeda Pacing'}</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Tambah Nomor ke Antrean</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar: Pilih Kampanye & Pencarian */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0f1117] p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-zinc-400 font-medium">Filter Kampanye:</span>
            <select
              value={selectedCampaignId || ''}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Kampanye</option>
              {campaigns?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.batchId})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Antrean (Pending)</option>
              <option value="sent">Sudah Terkirim (Sent)</option>
            </select>
          </div>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor atau nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Tabel Data Antrean Universal Responsif */}
      <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Nama Kontak</th>
                <th className="py-2.5 px-4">Nomor WhatsApp</th>
                <th className="py-2.5 px-4">Kampanye / Batch ID</th>
                <th className="py-2.5 px-4">Status Pengiriman</th>
                <th className="py-2.5 px-4">Waktu Dispatch</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 font-normal">
              {currentQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                    Tidak ada nomor dalam antrean saat ini.
                  </td>
                </tr>
              ) : (
                currentQueue.map((item, idx) => (
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
                          <span>Menunggu Antrean (Pacing)</span>
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

      {/* Modal Tambah Nomor ke Antrean */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
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
                value={selectedCampaignId || ''}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {campaigns?.map((c) => (
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
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
