import React, { useState } from 'react';
import { FolderKanban, Plus, Users, ArrowRight, Trash2, Edit3, Send, CheckCircle2 } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Grup & Segmentasi Kontak</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{groups.length} Segmen</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kelompokkan kontak berdasarkan minat, tagihan, atau status member untuk targeting broadcast yang presisi.
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} variant="default" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1 text-zinc-950" />
          <span className="text-zinc-950 font-semibold">Buat Segmen Baru</span>
        </Button>
      </div>

      {/* Grid Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="flex flex-col justify-between hover:border-zinc-700/80 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold truncate">{group.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {group.description}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                  {group.contactCount} Kontak
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[11px] flex items-center justify-between font-mono text-zinc-400">
                <span>Dibuat: {group.createdAt}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2">
                <Button
                  onClick={() => onNavigate('broadcast')}
                  variant="default"
                  size="sm"
                  className="flex-1"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Kirim Broadcast
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setGroups(groups.filter((g) => g.id !== group.id))}
                  className="h-8 w-8 text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Tambah Grup */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Segmen Kontak Baru</DialogTitle>
            <DialogDescription>
              Tentukan nama segmen dan keterangan kriteria anggota.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddGroup} className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Nama Segmen / Grup</label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Pelanggan Retensi Q3"
                className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Deskripsi / Kriteria</label>
              <textarea
                rows={3}
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Daftar pelanggan yang belum repeat order dalam 30 hari..."
                className="w-full p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none"
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
