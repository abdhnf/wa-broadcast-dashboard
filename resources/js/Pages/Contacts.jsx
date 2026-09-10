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
  FolderKanban
} from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Daftar Kontak & Segmen</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{contacts.length} Total</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Database nomor WhatsApp pelanggan lengkap dengan variabel dinamis untuk personalisasi broadcast.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportModalOpen(true)} variant="outline" size="sm">
            <UploadCloud className="w-3.5 h-3.5 mr-1" />
            <span>Import CSV</span>
          </Button>
          <Button onClick={() => setAddModalOpen(true)} variant="default" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1 text-zinc-950" />
            <span className="text-zinc-950 font-semibold">Tambah Kontak</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau nomor WhatsApp..."
            className="w-full h-8 pl-8 pr-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={selectedGroupFilter === 'ALL' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedGroupFilter('ALL')}
            className="text-xs"
          >
            Semua
          </Button>
          {groups?.map((g) => (
            <Button
              key={g.id}
              variant={selectedGroupFilter === g.name ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedGroupFilter(g.name)}
              className="text-xs"
            >
              {g.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Responsive Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300 min-w-[640px]">
            <thead className="bg-zinc-900/60 border-b border-zinc-800/80 text-[11px] font-mono text-zinc-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">NAMA LENGKAP</th>
                <th className="py-2.5 px-4 font-medium">NOMOR WHATSAPP</th>
                <th className="py-2.5 px-4 font-medium">SEGMEN / GRUP</th>
                <th className="py-2.5 px-4 font-medium">VARIABEL DINAMIS</th>
                <th className="py-2.5 px-4 font-medium text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-zinc-500 text-xs">
                    Tidak ada kontak yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 font-mono">
                          {c.name.charAt(0)}
                        </div>
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        {c.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] py-0">
                        {c.groupName}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {c.customAttributes?.tagihan && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                            tagihan: <strong className="text-zinc-200 font-normal">{c.customAttributes.tagihan}</strong>
                          </span>
                        )}
                        {c.customAttributes?.tempo && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-500">
                            tempo: {c.customAttributes.tempo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-200">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setContacts(contacts.filter((item) => item.id !== c.id))}
                          className="h-7 w-7 text-zinc-500 hover:text-rose-400"
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
      </Card>

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
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Budi Santoso"
                className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Nomor WhatsApp</label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Pilih Segmen</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full h-8 px-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="VIP Customers">VIP Customers</option>
                  <option value="Member Aktif">Member Aktif</option>
                  <option value="Leads Seminar">Leads Seminar</option>
                  <option value="Invoice Tempo">Invoice Tempo</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Tagihan (Custom)</label>
                <input
                  type="text"
                  value={newTagihan}
                  onChange={(e) => setNewTagihan(e.target.value)}
                  placeholder="Rp 250.000"
                  className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
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
              Upload file spreadsheet dengan header kolom: <code className="text-zinc-200">name</code>, <code className="text-zinc-200">phone</code>, <code className="text-zinc-200">tagihan</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-colors bg-zinc-900/30">
              <FileSpreadsheet className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <div className="text-xs text-zinc-300 font-medium">Klik untuk upload atau drag & drop file</div>
              <p className="text-[11px] text-zinc-500 mt-1">Format .csv atau .xlsx (Maks. 50.000 baris)</p>
            </div>

            <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-300 block">Tips Normalisasi:</span>
              <p>&bull; Prefix 08... akan otomatis dikonversi ke 628...</p>
              <p>&bull; Karakter spasi, strip (-), dan tanda kurung otomatis dibersihkan.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setImportModalOpen(false);
              }}
            >
              Mulai Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
