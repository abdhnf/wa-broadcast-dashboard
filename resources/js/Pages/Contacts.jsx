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
  CheckCircle2
} from 'lucide-react';
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

export function ContactsPage({ contacts: initialContacts, groups }) {
  const [contacts, setContacts] = useState(initialContacts || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGroup, setNewGroup] = useState('VIP Customers');
  const [newTagihan, setNewTagihan] = useState('Rp 0');

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    const matchesGroup =
      selectedGroupFilter === 'ALL' || c.groupName === selectedGroupFilter;
    return matchesSearch && matchesGroup;
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
      groupName: newGroup,
      customAttributes: {
        tagihan: newTagihan || 'Rp 0',
        tempo: '25 Sep 2026',
      },
      createdAt: 'Baru saja',
    };

    setContacts([newEntry, ...contacts]);
    setNewName('');
    setNewPhone('');
    setAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Database Kontak Pelanggan
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">{contacts.length} Total</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Manajemen direktori nomor kontak, segmentasi audiens, dan atribut dinamis custom fields.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportModalOpen(true)} variant="outline" size="sm">
            <UploadCloud className="w-3.5 h-3.5 mr-1" />
            <span>Import CSV</span>
          </Button>
          <Button onClick={() => setAddModalOpen(true)} variant="default" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Tambah Kontak</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau nomor WhatsApp..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={selectedGroupFilter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedGroupFilter('ALL')}
            className="text-xs h-7"
          >
            Semua
          </Button>
          {groups?.map((g) => (
            <Button
              key={g.id}
              variant={selectedGroupFilter === g.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGroupFilter(g.name)}
              className="text-xs h-7 shrink-0"
            >
              {g.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Full Responsive Table */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">NAMA LENGKAP</th>
                <th className="py-2.5 px-4 font-medium">NOMOR WHATSAPP</th>
                <th className="py-2.5 px-4 font-medium">SEGMEN / GRUP</th>
                <th className="py-2.5 px-4 font-medium">VARIABEL CUSTOM</th>
                <th className="py-2.5 px-4 font-medium text-right">TANGGAL DIBUAT</th>
                <th className="py-2.5 px-4 font-medium text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada kontak yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-[10px] text-slate-700 dark:text-zinc-300 font-mono">
                          {c.name.charAt(0)}
                        </div>
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 dark:text-zinc-200">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-500" />
                        {c.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] py-0">
                        {c.groupName}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.customAttributes?.tagihan && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] font-mono text-slate-600 dark:text-zinc-400">
                            tagihan: <strong className="text-slate-900 dark:text-zinc-100 font-normal">{c.customAttributes.tagihan}</strong>
                          </span>
                        )}
                        {c.customAttributes?.tempo && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] font-mono text-slate-500 dark:text-zinc-500">
                            tempo: {c.customAttributes.tempo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                      {c.createdAt || '10 Sep 2026'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setContacts(contacts.filter((item) => item.id !== c.id))}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Kontak */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Kontak Baru</DialogTitle>
            <DialogDescription>
              Nomor akan otomatis dinormalisasi ke format internasional (misal 0812 ➔ 62812).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddContact} className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Budi Santoso"
                className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Nomor WhatsApp</label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Pilih Segmen</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="VIP Customers">VIP Customers</option>
                  <option value="Member Aktif">Member Aktif</option>
                  <option value="Leads Seminar">Leads Seminar</option>
                  <option value="Invoice Tempo">Invoice Tempo</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Tagihan (Custom)</label>
                <input
                  type="text"
                  value={newTagihan}
                  onChange={(e) => setNewTagihan(e.target.value)}
                  placeholder="Rp 250.000"
                  className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
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
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data CSV / Excel</DialogTitle>
            <DialogDescription>
              Upload spreadsheet dengan header kolom: <code className="text-emerald-600 dark:text-emerald-400 font-mono">name</code>, <code className="text-emerald-600 dark:text-emerald-400 font-mono">phone</code>, <code className="text-emerald-600 dark:text-emerald-400 font-mono">tagihan</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50 dark:bg-zinc-900/30 cursor-pointer">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 dark:text-zinc-500 mx-auto mb-2" />
              <div className="text-xs text-slate-800 dark:text-zinc-200 font-medium">Klik untuk upload file spreadsheet</div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Format .csv atau .xlsx (Maks. 50.000 baris)</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400 space-y-1">
              <span className="font-semibold text-slate-900 dark:text-zinc-200 block">Normalisasi Otomatis:</span>
              <p>&bull; Prefix 08... otomatis dikonversi ke 628...</p>
              <p>&bull; Karakter spasi, strip, dan simbol non-numerik otomatis dibersihkan.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>
              Batal
            </Button>
            <Button variant="default" size="sm" onClick={() => setImportModalOpen(false)}>
              Mulai Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
