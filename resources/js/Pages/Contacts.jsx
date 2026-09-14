import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  X,
  ChevronLeft,
  ChevronRight
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
import { createContact, deleteContact, fetchContacts, updateContact } from '../lib/api';
import { PHONE_ERROR_MESSAGE, isValidPhone, toPhoneInput } from '../lib/phone';

export function ContactsPage({ groups = [], onGroupsRefresh, onContactsChange, onContactsChanged }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Pagination state (pola wa-panel)
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [importSummary, setImportSummary] = useState('');
  const csvInputRef = useRef(null);

  // Form State Tambah Kontak
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState('');
  const [tag, setTag] = useState('Member');
  // Variabel dinamis kustom (key-value array)
  const [customFields, setCustomFields] = useState([]);

  // Form State Edit Kontak
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editCustomFields, setEditCustomFields] = useState([]);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Grup default mengikuti segmen pertama yang benar-benar ada di database.
  useEffect(() => {
    if (!group && groups.length > 0) setGroup(groups[0].name);
  }, [groups, group]);

  const loadContacts = useCallback(async (signal) => {
    setLoading(true);
    setErrorMsg('');
    try {
      setContacts(await fetchContacts({ signal }));
    } catch (err) {
      if (err?.status === 0 && signal?.aborted) return;
      setErrorMsg(err?.message || 'Gagal memuat daftar kontak.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadContacts(controller.signal);
    return () => controller.abort();
  }, [loadContacts]);

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

  // Reset page saat filter/search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup]);

  const totalFiltered = filteredContacts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    // Validasi bentuk nomor di klien. Backend tetap memvalidasi ulang, ini hanya
    // supaya pengguna tahu lebih cepat tanpa satu putaran request.
    if (!isValidPhone(phone)) {
      setErrorMsg(PHONE_ERROR_MESSAGE);
      return;
    }

    // Convert customFields array ke object key-value
    const customObj = {};
    customFields.forEach((item) => {
      if (item.key.trim()) {
        customObj[item.key.trim()] = item.value;
      }
    });

    setErrorMsg('');
    try {
      const saved = await createContact({ name, phone, group, tag, custom: customObj });
      if (saved) setContacts((prev) => [saved, ...prev]);
      // Jumlah anggota segmen berubah; segarkan daftar grup di akar aplikasi.
      void onGroupsRefresh?.();
      void onContactsChange?.();
      void onContactsChanged?.();
      setName('');
      setPhone('');
      setCustomFields([
        { key: 'kota', value: '' },
        { key: 'tier', value: '' }
      ]);
      setIsAddModalOpen(false);
    } catch (err) {
      // Pesan validasi server (nomor duplikat, format salah) tampil di modal
      // tanpa menutupnya, agar isian pengguna tidak hilang.
      setErrorMsg(err?.message || 'Gagal menyimpan kontak.');
    }
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setEditName(contact.name || '');
    setEditPhone(contact.phone || '');
    setEditGroup(contact.group || (groups[0]?.name || ''));
    setEditTag(contact.tag || '');
    setEditErrorMsg('');

    // Konversi object custom ke array key-value untuk form editor
    const fields = Object.entries(contact.custom || {}).map(([k, v]) => ({
      key: k,
      value: String(v ?? ''),
    }));
    setEditCustomFields(fields.length > 0 ? fields : [{ key: '', value: '' }]);
    setIsEditModalOpen(true);
  };

  const addEditCustomField = () => {
    setEditCustomFields([...editCustomFields, { key: '', value: '' }]);
  };

  const removeEditCustomField = (index) => {
    setEditCustomFields(editCustomFields.filter((_, i) => i !== index));
  };

  const updateEditCustomField = (index, field, value) => {
    const updated = [...editCustomFields];
    updated[index][field] = value;
    setEditCustomFields(updated);
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    if (!editingContact || !editName || !editPhone) return;

    if (!isValidPhone(editPhone)) {
      setEditErrorMsg(PHONE_ERROR_MESSAGE);
      return;
    }

    // Convert editCustomFields array ke object key-value
    const customObj = {};
    editCustomFields.forEach((item) => {
      if (item.key.trim()) {
        customObj[item.key.trim()] = item.value;
      }
    });

    setEditErrorMsg('');
    try {
      const updated = await updateContact(editingContact.id, {
        name: editName,
        phone: editPhone,
        group: editGroup,
        tag: editTag,
        custom: customObj,
      });

      if (updated) {
        setContacts((prev) =>
          prev.map((item) => (item.id === editingContact.id ? updated : item))
        );
      }

      void onGroupsRefresh?.();
      void onContactsChange?.();
      setIsEditModalOpen(false);
      setEditingContact(null);
    } catch (err) {
      setEditErrorMsg(err?.message || 'Gagal memperbarui data kontak.');
    }
  };

  /**
   * Parser CSV sederhana yang menghormati tanda kutip.
   * Dipakai untuk import kontak; dipisah dari modul nomor karena murni soal
   * format berkas, bukan aturan nomor.
   */
  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') inQuotes = true;
      else if (char === ',' || char === ';') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char !== '\r') {
        field += char;
      }
    }

    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
  };

  /**
   * Import kontak dari berkas CSV yang dipilih pengguna.
   *
   * Berkas dibaca di browser lalu tiap baris dikirim ke endpoint kontak yang
   * sama dengan form manual, sehingga normalisasi nomor dan penolakan duplikat
   * tetap satu aturan. Baris yang gagal dilewati dan dihitung, bukan dibuatkan
   * seluruh proses jadi gagal.
   */
  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setImportSummary('');
    setIsImporting(true);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        throw new Error('Berkas CSV kosong atau hanya berisi baris header.');
      }

      const header = rows[0].map((h) => String(h).trim().toLowerCase());
      const idx = (col) => header.indexOf(col);

      if (idx('name') === -1 || idx('phone') === -1) {
        throw new Error('Header CSV wajib memuat kolom name dan phone.');
      }

      const dataRows = rows.slice(1, 5001);
      const known = header.filter((h) => ['name', 'phone', 'group'].includes(h));

      let inserted = 0;
      let skipped = 0;
      const created = [];

      for (const cols of dataRows) {
        const rawName = String(cols[idx('name')] ?? '').trim();
        const rawPhone = String(cols[idx('phone')] ?? '').trim();

        if (!rawName || !isValidPhone(rawPhone)) {
          skipped += 1;
          continue;
        }

        // Semua kolom di luar name/phone/group disimpan sebagai variabel kustom.
        const custom = {};
        header.forEach((col, i) => {
          if (!col || known.includes(col)) return;
          const value = String(cols[i] ?? '').trim();
          if (value) custom[col] = value;
        });

        const groupIdx = idx('group');
        const groupName = groupIdx === -1 ? '' : String(cols[groupIdx] ?? '').trim();

        try {
          const saved = await createContact({
            name: rawName,
            phone: normalizePhone(rawPhone),
            group: groupName || groups?.[0]?.name || '',
            custom,
          });
          if (saved) {
            created.push(saved);
            inserted += 1;
          }
        } catch {
          // Umumnya nomor duplikat: lewati tanpa menghentikan sisa berkas.
          skipped += 1;
        }
      }

      if (created.length > 0) {
        setContacts((prev) => [...created, ...prev]);
        void onGroupsRefresh?.();
        void onContactsChange?.();
        void onContactsChanged?.();
      }
      setImportSummary(`${inserted} kontak ditambahkan, ${skipped} baris dilewati (nomor tidak valid atau sudah ada).`);
      if (inserted > 0) setIsImportModalOpen(false);
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal membaca berkas CSV.');
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleDeleteContact = async (id) => {
    setErrorMsg('');
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((item) => item.id !== id));
      void onGroupsRefresh?.();
      void onContactsChange?.();
      void onContactsChanged?.();
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal menghapus kontak.');
    }
  };

  // Kumpulkan semua keys variabel dinamis unik untuk header tabel
  const allDynamicKeys = Array.from(
    new Set(contacts.flatMap((c) => Object.keys(c.custom || {})))
  );

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface  p-4 rounded-lg border border-line border-line ">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-ink dark:text-white">Daftar Kontak Audiens</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{contacts.length} Total</Badge>
          </div>
          <p className="text-xs text-ink-muted text-ink-muted mt-0.5">
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
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-brand-deep" />
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface  p-3 rounded-lg border border-line border-line text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Cari nama, nomor WhatsApp (628xxx), atau variabel kustom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-ink-faint shrink-0" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="py-1.5 px-3 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
          >
            <option value="all">Semua Segmen ({contacts.length})</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.name}>{g.name} ({g.count})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pesan galat tingkat halaman: kegagalan muat atau hapus data. */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 text-xs text-clay-deep">
          <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modern High-Density Table with Responsive Horizontal Scroll */}
      <div className="bg-surface  rounded-lg border border-line border-line overflow-hidden ">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-soft text-ink-soft min-w-[750px]">
            <thead className="bg-shell bg-surface text-ink-soft text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line border-line">
              <tr>
                <th className="py-2.5 px-4 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Nama Penerima</th>
                <th className="py-2.5 px-4">Nomor WhatsApp</th>
                <th className="py-2.5 px-4">Segmen Grup</th>
                <th className="py-2.5 px-4">Variabel Dinamis Kustom</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-faint text-ink-faint">
                    Memuat kontak dari database…
                  </td>
                </tr>
              ) : paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-faint text-ink-faint">
                    {contacts.length === 0
                      ? 'Belum ada kontak. Tambahkan kontak pertama Anda.'
                      : 'Tidak ada kontak yang cocok dengan filter.'}
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono text-[11px] text-ink-faint">
                      {(currentPage - 1) * perPage + idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-ink text-ink">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.tag && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken bg-surface-alt text-ink-soft text-ink-muted border border-line border-line">
                            {c.tag}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-leaf-deep text-brand-soft font-medium">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-ink-faint" />
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
                          <span className="text-[10px] text-ink-faint italic">-</span>
                        ) : (
                          Object.entries(c.custom || {}).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken text-ink-soft border border-line"
                            >
                              <strong className="text-brand-deep font-semibold">{k}:</strong> {String(v)}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 rounded text-ink-faint hover:text-brand-deep hover:bg-brand-wash  transition-colors"
                          title="Edit kontak & variabel"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteContact(c.id)}
                          className="p-1 rounded text-ink-faint hover:text-clay hover:bg-clay-wash dark:hover:bg-rose-950/30 transition-colors"
                          title="Hapus kontak"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar identik dengan wa-panel */}
        <div className="px-4 py-3 bg-surface-sunken border-t border-line flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-muted">
          <div className="flex items-center gap-3">
            {totalFiltered > 0 ? (
              <span>
                Menampilkan{' '}
                <strong className="text-ink font-mono font-semibold">
                  {(currentPage - 1) * perPage + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-ink font-mono font-semibold">
                  {Math.min(currentPage * perPage, totalFiltered)}
                </strong>{' '}
                dari{' '}
                <strong className="text-ink font-mono font-semibold">
                  {totalFiltered}
                </strong>{' '}
                kontak
              </span>
            ) : (
              <span>Tidak ada data kontak</span>
            )}

            {totalFiltered > 10 && (
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 px-2 text-[11px] font-mono rounded bg-surface border border-line text-ink cursor-pointer focus:outline-none focus:border-brand"
                title="Jumlah baris per halaman"
              >
                <option value={10}>10 / hal</option>
                <option value={20}>20 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 rounded bg-surface border border-line text-ink hover:bg-surface-alt transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 font-medium text-xs cursor-pointer select-none"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 font-mono text-ink-soft text-xs font-semibold">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 rounded bg-surface border border-line text-ink hover:bg-surface-alt transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 font-medium text-xs cursor-pointer select-none"
              title="Halaman berikutnya"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
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
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Nama Lengkap Penerima *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Nomor WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={15}
                  placeholder="628123456789"
                  value={phone}
                  onChange={(e) => setPhone(toPhoneInput(e.target.value))}
                  className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft font-mono focus:outline-none focus:border-brand"
                />
                <p className="text-[10px] text-ink-faint text-ink-faint mt-1">
                  Ketik 0851... otomatis jadi 62851...
                </p>
              </div>
            </div>

            {/* Galat dari server (nomor duplikat / format tidak sah) tampil di dalam
                modal supaya isian yang sudah diketik tidak hilang. */}
            {errorMsg && (
              <p className="text-[11px] text-clay text-clay bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 rounded-lg px-2.5 py-2">
                {errorMsg}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Segmen Grup
                </label>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
                >
                  {groups?.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Tag / Label Ringkas
                </label>
                <input
                  type="text"
                  placeholder="Misal: VIP, Member, Prioritas"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Variabel Dinamis Dinamis (Key-Value Builder) */}
            <div className="pt-2 border-t border-line border-line">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[11px] font-semibold text-ink text-ink-soft flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>Variabel Dinamis Pesan</span>
                  </div>
                  <p className="text-[10px] text-ink-faint text-ink-faint">
                    Bisa dipanggil di pesan via template: <code className="text-brand-deep">{'{{nama_key}}'}</code>
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
                      className="w-1/2 h-7 px-2 rounded bg-shell bg-surface border border-line border-line text-[11px] font-mono text-ink text-ink-soft focus:outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      placeholder="Nilai untuk kontak ini"
                      value={field.value}
                      onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                      className="w-1/2 h-7 px-2 rounded bg-shell bg-surface border border-line border-line text-[11px] text-ink text-ink-soft focus:outline-none focus:border-brand"
                    />
                    {customFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCustomField(idx)}
                        className="p-1 text-ink-faint hover:text-clay transition-colors"
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

      {/* Modal Edit Kontak & Variabel JSON */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Data Kontak</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateContact} className="space-y-3.5 text-xs py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Nama Lengkap Penerima *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Budi Santoso"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Nomor WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={15}
                  placeholder="628123456789"
                  value={editPhone}
                  onChange={(e) => setEditPhone(toPhoneInput(e.target.value))}
                  className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft font-mono focus:outline-none focus:border-brand"
                />
                <p className="text-[10px] text-ink-faint text-ink-faint mt-1">
                  Ketik 0851... otomatis jadi 62851...
                </p>
              </div>
            </div>

            {editErrorMsg && (
              <p className="text-[11px] text-clay text-clay bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 rounded-lg px-2.5 py-2">
                {editErrorMsg}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Segmen Grup
                </label>
                <select
                  value={editGroup}
                  onChange={(e) => setEditGroup(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
                >
                  {groups?.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Tag / Label Ringkas
                </label>
                <input
                  type="text"
                  placeholder="Misal: VIP, Member, Prioritas"
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Variabel Dinamis Kustom JSON */}
            <div className="pt-2 border-t border-line border-line">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[11px] font-semibold text-ink text-ink-soft flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>Variabel Dinamis Pesan (JSON)</span>
                  </div>
                  <p className="text-[10px] text-ink-faint text-ink-faint">
                    Bisa dipanggil di pesan via template: <code className="text-brand-deep">{'{{nama_key}}'}</code>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEditCustomField}
                  className="h-7 text-[10px]"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span>Tambah Variabel</span>
                </Button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {editCustomFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nama key (mis: kota)"
                      value={field.key}
                      onChange={(e) => updateEditCustomField(idx, 'key', e.target.value)}
                      className="w-1/2 h-7 px-2 rounded bg-shell bg-surface border border-line border-line text-[11px] font-mono text-ink text-ink-soft focus:outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      placeholder="Nilai untuk kontak ini"
                      value={field.value}
                      onChange={(e) => updateEditCustomField(idx, 'value', e.target.value)}
                      className="w-1/2 h-7 px-2 rounded bg-shell bg-surface border border-line border-line text-[11px] text-ink text-ink-soft focus:outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => removeEditCustomField(idx)}
                      className="p-1 text-ink-faint hover:text-clay transition-colors"
                      title="Hapus baris variabel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Perbarui Kontak
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
            <div className="p-3 rounded-lg bg-shell bg-surface border border-line border-line">
              <p className="font-medium text-ink text-ink-soft mb-1">Format Header Kolom CSV:</p>
              <code className="text-[11px] text-brand-deep font-mono block">
                name,phone,group,kota,voucher,status
              </code>
              <p className="text-[10px] text-ink-muted text-ink-muted mt-1">
                Semua kolom di luar <code className="font-mono">name</code>, <code className="font-mono">phone</code>, & <code className="font-mono">group</code> otomatis dijadikan variabel dinamis kustom!
              </p>
            </div>

            {/* Berkas CSV dibaca di browser (tanpa unggah ke server) lalu tiap
                barisnya disimpan lewat endpoint kontak yang sama dengan form
                manual, supaya aturan normalisasi & deteksi duplikat tetap satu. */}
            <input
              type="file"
              ref={csvInputRef}
              onChange={handleImportCsv}
              accept=".csv,text/csv"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              disabled={isImporting}
              className="w-full border-2 border-dashed border-line-strong border-line rounded-lg p-6 text-center hover:border-brand transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              <UploadCloud className="w-8 h-8 text-ink-faint mx-auto mb-2" />
              <div className="text-xs font-medium text-ink-soft text-ink-soft">
                {isImporting ? 'Mengimpor kontak...' : 'Pilih berkas CSV kontak'}
              </div>
              <p className="text-[10px] text-ink-faint mt-1">Maksimal 5.000 baris per unggahan</p>
            </button>

            {importSummary && (
              <p className="text-[11px] rounded-lg px-2.5 py-2 bg-shell bg-surface border border-line border-line text-ink-soft text-ink-soft">
                {importSummary}
              </p>
            )}

            {errorMsg && (
              <p className="text-[11px] text-clay text-clay bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 rounded-lg px-2.5 py-2">
                {errorMsg}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
