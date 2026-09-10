import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  UploadCloud,
  Download,
  Filter,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  Phone
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../components/ui/Dialog';

export function ContactsPage({ contacts: initialContacts, groups }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGroup, setNewGroup] = useState(groups[0]?.name || '');
  const [newTag, setNewTag] = useState('');
  const [customKey, setCustomKey] = useState('tagihan');
  const [customVal, setCustomVal] = useState('Rp 250.000');

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.tag && c.tag.toLowerCase().includes(search.toLowerCase()));
    const matchGroup = selectedGroup === 'all' || c.group === selectedGroup;
    return matchSearch && matchGroup;
  });

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    let cleanPhone = newPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('08')) {
      cleanPhone = '628' + cleanPhone.slice(2);
    }

    const newEntry = {
      id: `c_${Date.now()}`,
      name: newName,
      phone: cleanPhone,
      group: newGroup,
      tag: newTag || 'Umum',
      custom: customKey ? { [customKey]: customVal } : {}
    };

    setContacts([newEntry, ...contacts]);
    setNewName('');
    setNewPhone('');
    setAddModalOpen(false);
  };

  const handleDelete = (id) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Manajemen Kontak Pelanggan</h1>
          <p className="text-xs text-slate-400">
            Daftar nomor WhatsApp penerima broadcast dengan atribut dinamis untuk personalisasi pesan.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => setImportModalOpen(true)} variant="secondary" size="md">
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </Button>
          <Button onClick={() => setAddModalOpen(true)} variant="primary" size="md">
            <Plus className="w-4 h-4" />
            <span>Tambah Kontak</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor WhatsApp, atau tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Grup ({contacts.length})</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Kontak Responsive */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto min-w-[650px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Nama Kontak</th>
                <th className="px-4 py-3.5">Nomor WhatsApp</th>
                <th className="px-4 py-3.5">Grup Segmentasi</th>
                <th className="px-4 py-3.5">Tag</th>
                <th className="px-4 py-3.5">Custom Attributes</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-850/50 transition">
                  <td className="px-4 py-3.5 font-medium text-slate-100 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-emerald-400">
                      {c.name.charAt(0)}
                    </div>
                    <span>{c.name}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-300">
                    +{c.phone}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[11px]">
                      {c.group}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={c.tag === 'VIP' ? 'gold' : c.tag === 'Reminder' ? 'warning' : 'default'}>
                      {c.tag}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                    {c.custom && Object.keys(c.custom).length > 0 ? (
                      Object.entries(c.custom).map(([k, v]) => (
                        <span key={k} className="mr-2">
                          {k}: <strong className="text-slate-200">{v}</strong>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Kontak (Radix UI Dialog) */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Kontak Baru</DialogTitle>
            <DialogDescription>
              Nomor WhatsApp akan otomatis dinormalisasi menjadi format standar internasional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddContact} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nomor WhatsApp (08xxx / 628xxx)</label>
              <input
                type="text"
                placeholder="081234567890"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Grup Segmentasi</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Tag / Label</label>
                <input
                  type="text"
                  placeholder="VIP / Regular"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Atribut Dinamis (Contoh untuk template)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama field (tagihan)"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                />
                <input
                  type="text"
                  placeholder="Nilai (Rp 250.000)"
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setAddModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan Kontak
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Import CSV (Radix UI Dialog) */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Kontak dari CSV / Excel</DialogTitle>
            <DialogDescription>
              Upload file spreadsheet untuk menambah ratusan kontak sekaligus ke dalam grup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center space-y-2 bg-slate-950 cursor-pointer transition">
              <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-xs font-medium text-slate-200">
                Klik untuk upload atau drag & drop file .CSV / .XLSX
              </div>
              <p className="text-[11px] text-slate-400">
                Format kolom wajib: <strong className="text-slate-300">name, phone, group, tag</strong>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Auto-Normalisasi:</div>
              <div>&bull; Nomor berawalan `08` akan diubah otomatis menjadi `628`.</div>
              <div>&bull; Duplikasi nomor di dalam grup yang sama akan dilewati secara otomatis.</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => setImportModalOpen(false)}>
              Mulai Import (Simulasi)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
