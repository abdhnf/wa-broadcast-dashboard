import React, { useState } from 'react';
import { FolderKanban, Plus, Users, ArrowRight, Trash2, Edit3 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../components/ui/Dialog';

export function GroupsPage({ groups: initialGroups, onSelectGroupForBroadcast }) {
  const [groups, setGroups] = useState(initialGroups);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupName) return;

    const newG = {
      id: `grp_${Date.now()}`,
      name: groupName,
      count: 0,
      description: groupDesc || 'Grup segmentasi baru'
    };

    setGroups([...groups, newG]);
    setGroupName('');
    setGroupDesc('');
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Grup Kontak &amp; Segmentasi</h1>
          <p className="text-xs text-slate-400">
            Kelompokkan nomor WhatsApp pelanggan untuk target broadcast yang lebih spesifik dan terarah.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} variant="primary" size="md">
          <Plus className="w-4 h-4" />
          <span>Buat Grup Baru</span>
        </Button>
      </div>

      {/* Grid Kartu Grup */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div
            key={g.id}
            className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <Badge variant="info">
                  {g.count} Anggota
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{g.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{g.description}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">ID: {g.id}</span>
              <Button
                onClick={() => onSelectGroupForBroadcast && onSelectGroupForBroadcast(g.id)}
                variant="secondary"
                size="sm"
              >
                <span>Broadcast Grup</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Grup (Radix UI Dialog) */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Grup Segmentasi Baru</DialogTitle>
            <DialogDescription>
              Tentukan nama kategori dan deskripsi untuk segmentasi penerima pesan massal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateGroup} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nama Grup</label>
              <input
                type="text"
                placeholder="Contoh: Promo Akhir Pekan"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Deskripsi / Kriteria Anggota</label>
              <textarea
                rows={3}
                placeholder="Catatan kriteria penerima di grup ini..."
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan Grup
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
