import React, { useState } from 'react';
import { FolderKanban, Plus, Users, Send, Trash2, Edit3, CheckCircle2 } from 'lucide-react';
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

export function GroupsPage({ groups: initialGroups, onNavigate }) {
  const [groups, setGroups] = useState(initialGroups || []);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleAddGroup = (e) => {
    e.preventDefault();
    if (!newGroupName) return;

    const newG = {
      id: `g_${Date.now()}`,
      name: newGroupName,
      description: newGroupDesc || 'Segmentasi kontak pelanggan',
      contactCount: 0,
      createdAt: 'Baru saja',
    };

    setGroups([...groups, newG]);
    setNewGroupName('');
    setNewGroupDesc('');
    setAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Grup & Segmentasi Audiens
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">{groups.length} Segmen</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Daftar kelompok kontak pelanggan untuk target blast campaign yang tepat sasaran.
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} variant="default" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Buat Segmen Baru</span>
        </Button>
      </div>

      {/* Tabel Grup / Segmentasi (Full Responsive Table, Menggantikan Card) */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">NAMA SEGMEN</th>
                <th className="py-2.5 px-4 font-medium">DESKRIPSI / KRITERIA</th>
                <th className="py-2.5 px-4 font-medium">TOTAL ANGGOTA</th>
                <th className="py-2.5 px-4 font-medium">STATUS AUDIENS</th>
                <th className="py-2.5 px-4 font-medium text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{group.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 max-w-xs truncate">
                    {group.description}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                    {group.contactCount} Penerima
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Siap Blast
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        onClick={() => onNavigate('broadcast')}
                        variant="default"
                        size="sm"
                        className="h-7 text-[11px]"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Kirim Broadcast
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setGroups(groups.filter((g) => g.id !== group.id))}
                        className="h-7 w-7 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Grup */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Segmen Kontak Baru</DialogTitle>
            <DialogDescription>
              Tentukan nama segmen dan kriteria kontak pelanggan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddGroup} className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Nama Segmen / Grup</label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Pelanggan Retensi Q3"
                className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Deskripsi / Kriteria</label>
              <textarea
                rows={3}
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Daftar pelanggan yang belum repeat order dalam 30 hari..."
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Simpan Segmen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
