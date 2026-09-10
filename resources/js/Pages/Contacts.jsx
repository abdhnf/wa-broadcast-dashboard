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
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Tag,
  X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/Dialog';

export function ContactsPage({ contacts: initialContacts, groups }) {
  const [contacts, setContacts] = useState(initialContacts || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form State Tambah Kontak
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState(groups?.[0]?.name || 'Pelanggan VIP');
  const [tag, setTag] = useState('Member');
  // Variabel dinamis kustom (key-value array)
  const [customFields, setCustomFields] = useState([
    { key: 'kota', value: '' },
    { key: 'tier', value: '' }
  ]);

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      Object.values(c.custom || {}).some((v) =>
        String(v).toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesGroup = selectedGroup === 'all' || c.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const handleSaveContact = (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    // Convert customFields array ke object key-value
    const customObj = {};
    customFields.forEach((item) => {
      if (item.key.trim()) {
        customObj[item.key.trim()] = item.value;
      }
    });

    const newEntry = {
      id: `c_${Date.now()}`,
      name,
      phone: phone.replace(/\D/g, ''),
      group,
      tag,
      custom: customObj,
    };

    setContacts([newEntry, ...contacts]);
    setName('');
    setPhone('');
    setCustomFields([
      { key: 'kota', value: '' },
      { key: 'tier', value: '' }
    ]);
    setIsAddModalOpen(false);
  };

  // Kumpulkan semua keys variabel dinamis unik untuk header tabel
  const allDynamicKeys = Array.from(
    new Set(contacts.flatMap((c) => Object.keys(c.custom || {})))
  );

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Daftar Kontak Audiens</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{contacts.length} Total</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Kelola database nomor tujuan, segmentasi grup, dan parameter variabel dinamis kustom.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            <span>Import CSV</span>
          </Button>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            variant="default"
            size="sm"
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Tambah Kontak</span>
          </Button>
        </div>
      </div>

      {/* Filter & Live Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0f1117] p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor WhatsApp (628xxx), atau variabel kustom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Segmen ({contacts.length})</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.name}>{g.name} ({g.count})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modern High-Density Table with Responsive Horizontal Scroll */}
      <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[750px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Nama Penerima</th>
                <th className="py-2.5 px-4">Nomor WhatsApp</th>
                <th className="py-2.5 px-4">Segmen Grup</th>
                <th className="py-2.5 px-4">Variabel Dinamis Kustom</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 font-normal">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                    Tidak ada kontak yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.tag && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50">
                            {c.tag}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>+{c.phone}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {c.group}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {Object.entries(c.custom || {}).length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">-</span>
                        ) : (
                          Object.entries(c.custom || {}).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60"
                            >
                              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{k}:</strong> {String(v)}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setContacts(contacts.filter((item) => item.id !== c.id))}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Hapus kontak"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Kontak dengan Dukungan Multi Variabel Dinamis Kustom */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Kontak Baru</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveContact} className="space-y-3.5 text-xs py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nama Lengkap Penerima *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nomor WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="628123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Segmen Grup
                </label>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {groups?.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Tag / Label Ringkas
                </label>
                <input
                  type="text"
                  placeholder="Misal: VIP, Member, Prioritas"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Variabel Dinamis Dinamis (Key-Value Builder) */}
            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Variabel Dinamis Pesan</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                    Bisa dipanggil di pesan via template: <code className="text-emerald-600 dark:text-emerald-400">{'{{nama_key}}'}</code>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                  className="h-7 text-[10px]"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span>Tambah Variabel</span>
                </Button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nama variabel (misal: kota, voucher)"
                      value={field.key}
                      onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
                      className="w-1/2 h-7 px-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Nilai untuk kontak ini"
                      value={field.value}
                      onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                      className="w-1/2 h-7 px-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                    {customFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCustomField(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Simpan Kontak
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Import CSV */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data Kontak CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs py-2">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <p className="font-medium text-slate-800 dark:text-zinc-200 mb-1">Format Header Kolom CSV:</p>
              <code className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono block">
                name,phone,group,kota,voucher,status
              </code>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                Semua kolom di luar <code className="font-mono">name</code>, <code className="font-mono">phone</code>, & <code className="font-mono">group</code> otomatis dijadikan variabel dinamis kustom!
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Pilih atau seret berkas CSV kontak ke sini
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Maksimal 5.000 baris per unggahan</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Tutup
            </Button>
            <Button variant="default" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Mulai Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
