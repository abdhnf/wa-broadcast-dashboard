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
  AlertCircle,
  Sparkles,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  RefreshCw,
  CheckSquare,
  Square,
  MinusSquare,
  SlidersHorizontal,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TagInput } from '../components/ui/TagInput';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/Dialog';
import {
  createContact,
  importContactsBatch,
  deleteContact,
  fetchContacts,
  updateContact,
  bulkUpdateContacts,
  bulkDeleteContacts,
} from '../lib/api';
import { PHONE_ERROR_MESSAGE, isValidPhone, normalizePhone, toPhoneInput } from '../lib/phone';

export function ContactsPage({ groups = [], onGroupsRefresh, onContactsChange, onContactsChanged }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Bulk Selection & Bulk Edit State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkGroupMode, setBulkGroupMode] = useState('keep'); // 'keep' | 'set' | 'clear'
  const [bulkGroup, setBulkGroup] = useState('');
  const [bulkTagMode, setBulkTagMode] = useState('keep'); // 'keep' | 'append' | 'replace' | 'remove' (harus sama dgn validasi backend)
  const [bulkTags, setBulkTags] = useState([]); // array chip tag dari TagInput
  const [bulkCustomMode, setBulkCustomMode] = useState('merge'); // 'merge' | 'replace' | 'clear'
  const [bulkCustomFields, setBulkCustomFields] = useState([{ key: '', value: '' }]);

  // Pagination state (pola wa-panel)
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [importSummary, setImportSummary] = useState('');
  const [importError, setImportError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const fileInputRef = useRef(null);

  // Form State Tambah Kontak
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState('');
  const [tagList, setTagList] = useState(['Member']); // array chip tag dari TagInput
  // Variabel dinamis kustom (key-value array)
  const [customFields, setCustomFields] = useState([]);

  // Form State Edit Kontak
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editTagList, setEditTagList] = useState([]); // array chip tag dari TagInput
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

  // Ekstraksi seluruh tag unik dari data kontak untuk filter dan sugesti
  const allUniqueTags = Array.from(
    new Set(
      contacts
        .flatMap((c) => (c.tag ? c.tag.split(',').map((t) => t.trim()) : []))
        .filter(Boolean)
    )
  ).sort();

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.tag && c.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      Object.values(c.custom || {}).some((v) =>
        String(v).toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesGroup = selectedGroup === 'all' || c.group === selectedGroup;
    const contactTags = c.tag ? c.tag.split(',').map((t) => t.trim()) : [];
    const matchesTag =
      selectedTagFilter === 'all' ||
      (selectedTagFilter === '__untagged__'
        ? contactTags.length === 0
        : contactTags.includes(selectedTagFilter));

    return matchesSearch && matchesGroup && matchesTag;
  });

  // Reset page saat filter/search berubah.
  // Catatan: selectedIds sengaja TIDAK di-reset di sini agar pengguna bisa
  // mencari kontak secara bertahap (search A -> centang -> search B -> centang)
  // tanpa kehilangan kontak yang sudah dipilih sebelumnya.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup, selectedTagFilter]);

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
      const saved = await createContact({
        name,
        phone,
        group,
        tag: tagList.join(','),
        custom: customObj,
      });
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
    setEditTagList(
      contact.tag
        ? contact.tag.split(',').map((t) => t.trim()).filter(Boolean)
        : []
    );
    setEditErrorMsg('');

    // Konversi object custom ke array key-value untuk form editor
    const fields = Object.entries(contact.custom || {}).map(([k, v]) => ({
      key: k,
      value: String(v ?? ''),
    }));
    setEditCustomFields(fields.length > 0 ? fields : [{ key: '', value: '' }]);
    setIsEditModalOpen(true);
  };

  // Bulk Selection Handlers
  const pageContactIds = paginatedContacts.map((c) => c.id);
  const isAllPageSelected =
    pageContactIds.length > 0 &&
    pageContactIds.every((id) => selectedIds.includes(id));
  const isSomePageSelected =
    pageContactIds.some((id) => selectedIds.includes(id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageContactIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageContactIds])));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    // Akumulasi kontak hasil filter ke dalam seleksi yang sudah ada (tanpa duplikasi)
    setSelectedIds((prev) =>
      Array.from(new Set([...prev, ...filteredContacts.map((c) => c.id)]))
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Bulk Edit Custom Fields Handlers
  const addBulkCustomField = () => {
    setBulkCustomFields([...bulkCustomFields, { key: '', value: '' }]);
  };

  const removeBulkCustomField = (index) => {
    setBulkCustomFields(bulkCustomFields.filter((_, i) => i !== index));
  };

  const updateBulkCustomField = (index, field, value) => {
    const updated = [...bulkCustomFields];
    updated[index][field] = value;
    setBulkCustomFields(updated);
  };

  const handleExecuteBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    setErrorMsg('');

    try {
      const customObj = {};
      if (bulkCustomMode !== 'clear') {
        bulkCustomFields.forEach((item) => {
          if (item.key.trim()) {
            customObj[item.key.trim()] = item.value;
          }
        });
      }

      const res = await bulkUpdateContacts({
        contactIds: selectedIds,
        group: bulkGroup,
        groupMode: bulkGroupMode,
        tagMode: bulkTagMode,
        tags: bulkTags,
        custom: customObj,
        customMode: bulkCustomMode,
      });

      if (res && res.success) {
        // Refresh contacts dari server agar data konsisten
        await loadContacts();
        void onGroupsRefresh?.();
        void onContactsChange?.();
        void onContactsChanged?.();
        setIsBulkEditModalOpen(false);
        setSelectedIds([]);
      } else {
        throw new Error(res?.error || 'Gagal menyimpan perubahan massal.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat mengeksekusi edit massal.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Yakin ingin menghapus ${count} kontak terpilih secara permanen?`)) {
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await bulkDeleteContacts(selectedIds);
      if (res && res.success) {
        setContacts((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
        setSelectedIds([]);
        void onGroupsRefresh?.();
        void onContactsChange?.();
        void onContactsChanged?.();
      } else {
        throw new Error(res?.error || 'Gagal menghapus kontak terpilih.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menghapus kontak terpilih.');
    } finally {
      setLoading(false);
    }
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
        tag: editTagList.join(','),
        custom: customObj,
      });

      if (updated) {
        setContacts((prev) =>
          prev.map((item) => (item.id === editingContact.id ? updated : item))
        );
      }

      // Segarkan grup DAN kontak global: tag yang diubah di modal edit harus
      // langsung terlihat di halaman Blast Engine & Segmen (SPA freshness).
      void onGroupsRefresh?.();
      void onContactsChange?.();
      void onContactsChanged?.();
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
   * Parser CSV dan XLSX fleksibel dengan deteksi otomatis header,
   * normalisasi nomor WhatsApp, dan ekstraksi variabel dinamis kustom.
   */
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportSummary('');
    setPreviewData(null);
    setPreviewFileName(file.name);

    try {
      let rows = [];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      } else {
        const text = await file.text();
        rows = parseCsv(text);
      }

      if (!rows || rows.length < 2) {
        throw new Error('Berkas kosong atau tidak memuat baris data yang cukup.');
      }

      // Deteksi baris header (lewati jika baris 1 adalah banner/petunjuk)
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const rowStr = rows[r].map((cell) => String(cell).trim().toLowerCase());
        if (rowStr.includes('name') && rowStr.includes('phone')) {
          headerRowIndex = r;
          break;
        }
      }

      const rawHeaders = rows[headerRowIndex].map((h) => String(h).trim());
      const lowerHeaders = rawHeaders.map((h) => h.toLowerCase());
      const nameIdx = lowerHeaders.indexOf('name');
      const phoneIdx = lowerHeaders.indexOf('phone');
      const groupIdx = lowerHeaders.indexOf('group');
      const tagIdx = lowerHeaders.findIndex((h) => h === 'tag' || h === 'tags');

      if (nameIdx === -1 || phoneIdx === -1) {
        throw new Error('Header berkas wajib memiliki kolom "name" dan "phone". Silakan unduh template resmi.');
      }

      // Identifikasi kolom variabel dinamis kustom (semua di luar name, phone, group, tag/tags)
      const customKeys = rawHeaders.filter((col, idx) => {
        const low = col.toLowerCase();
        return col !== '' && low !== 'name' && low !== 'phone' && low !== 'group' && low !== 'tag' && low !== 'tags';
      });

      const parsedItems = [];
      let validCount = 0;
      let invalidCount = 0;

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row.some((c) => String(c).trim() !== '')) continue;

        const rawName = String(row[nameIdx] ?? '').trim();
        const rawPhone = String(row[phoneIdx] ?? '').trim();
        const rawGroup = groupIdx !== -1 ? String(row[groupIdx] ?? '').trim() : '';
        const rawTag = tagIdx !== -1 ? String(row[tagIdx] ?? '').trim() : '';

        if (!rawName || !isValidPhone(rawPhone)) {
          invalidCount++;
          continue;
        }

        const customObj = {};
        rawHeaders.forEach((colName, colIdx) => {
          const low = colName.toLowerCase();
          if (low === 'name' || low === 'phone' || low === 'group' || low === 'tag' || low === 'tags' || !colName) return;
          const val = String(row[colIdx] ?? '').trim();
          if (val) customObj[colName] = val;
        });

        parsedItems.push({
          name: rawName,
          phone: rawPhone,
          normalizedPhone: normalizePhone(rawPhone),
          group: rawGroup || groups?.[0]?.name || 'Imported',
          tag: rawTag,
          custom: customObj,
        });
        validCount++;
      }

      if (parsedItems.length === 0) {
        throw new Error('Tidak ada baris data kontak yang valid untuk diimpor.');
      }

      setPreviewData({
        fileName: file.name,
        headers: rawHeaders,
        customKeys,
        items: parsedItems,
        validCount,
        invalidCount,
      });

    } catch (err) {
      setImportError(err?.message || 'Gagal membaca atau memproses berkas template.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Eksekusi batch import setelah pengguna meninjau pratinjau data.
   */
  const handleExecuteImport = async () => {
    if (!previewData || !previewData.items || previewData.items.length === 0) return;

    setIsImporting(true);
    setImportError('');
    setImportSummary('');

    try {
      const payloadContacts = previewData.items.map((item) => ({
        name: item.name,
        phone: item.normalizedPhone,
        group: item.group,
        tag: item.tag || null,
        custom: item.custom,
      }));

      const res = await importContactsBatch(payloadContacts);
      if (res && res.success) {
        setImportSummary(
          `Berhasil mengimpor ${res.insertedCount} kontak baru (${res.skippedCount} dilewati karena nomor tidak valid atau duplikat).`
        );
        if (Array.isArray(res.contacts) && res.contacts.length > 0) {
          setContacts((prev) => [...res.contacts, ...prev]);
          void onGroupsRefresh?.();
          void onContactsChange?.();
          void onContactsChanged?.();
        }
        setPreviewData(null);
      } else {
        throw new Error(res?.error || 'Gagal menyimpan kontak batch ke database.');
      }
    } catch (err) {
      setImportError(err?.message || 'Terjadi kesalahan saat memproses data import.');
    } finally {
      setIsImporting(false);
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
            <span>Import Kontak (Excel / CSV)</span>
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
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-surface p-3 rounded-lg border border-line text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Cari nama, nomor WhatsApp (628xxx), tag, atau variabel kustom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-shell bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Segmen Grup */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-ink-faint shrink-0" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg bg-shell bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
            >
              <option value="all">Semua Segmen ({contacts.length})</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.name}>{g.name} ({g.count})</option>
              ))}
            </select>
          </div>

          {/* Filter Berdasarkan Tag */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-ink-faint shrink-0" />
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg bg-shell bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
            >
              <option value="all">Semua Tag ({allUniqueTags.length})</option>
              <option value="__untagged__">Tanpa Tag</option>
              {allUniqueTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-brand-wash border border-brand-line p-2.5 px-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-brand-deep">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold font-mono">{selectedIds.length} kontak dipilih</span>
            {searchQuery && (
              <span className="text-[10px] bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded text-brand-deep">
                Lintas Pencarian
              </span>
            )}
            {filteredContacts.length > 0 && filteredContacts.some((c) => !selectedIds.includes(c.id)) && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="underline hover:opacity-80 text-[11px]"
              >
                + Tambah {filteredContacts.filter((c) => !selectedIds.includes(c.id)).length} kontak hasil pencarian ini
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsBulkEditModalOpen(true)}
              className="h-7 text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
              <span>Edit Massal ({selectedIds.length})</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExecuteBulkDelete}
              className="h-7 text-xs text-clay border-clay-line hover:bg-clay-wash"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Hapus Terpilih</span>
            </Button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 rounded text-ink-muted hover:text-ink transition-colors"
              title="Batalkan seleksi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Pesan galat tingkat halaman: kegagalan muat atau hapus data. */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 text-xs text-clay-deep">
          <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modern High-Density Table with Responsive Horizontal Scroll */}
      <div className="bg-surface rounded-lg border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-soft min-w-[850px]">
            <thead className="bg-shell bg-surface text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllPage}
                    className="p-1 rounded text-ink-muted hover:text-ink transition-colors flex items-center justify-center mx-auto"
                    title={isAllPageSelected ? 'Batal pilih semua di halaman ini' : 'Pilih semua di halaman ini'}
                  >
                    {isAllPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-deep" />
                    ) : isSomePageSelected ? (
                      <MinusSquare className="w-4 h-4 text-brand-deep" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-faint" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3 w-10 text-center font-mono">#</th>
                <th className="py-2.5 px-4">Nama Penerima</th>
                <th className="py-2.5 px-4">Nomor WhatsApp</th>
                <th className="py-2.5 px-4">Tag / Label</th>
                <th className="py-2.5 px-4">Segmen Grup</th>
                <th className="py-2.5 px-4">Variabel Dinamis Kustom</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-normal">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-faint">
                    Memuat kontak dari database…
                  </td>
                </tr>
              ) : paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-faint">
                    {contacts.length === 0
                      ? 'Belum ada kontak. Tambahkan kontak pertama Anda.'
                      : 'Tidak ada kontak yang cocok dengan filter.'}
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((c, idx) => {
                  const isSelected = selectedIds.includes(c.id);
                  const contactTags = c.tag
                    ? c.tag.split(',').map((t) => t.trim()).filter(Boolean)
                    : [];

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-brand-wash/50' : 'hover:bg-surface-alt/60'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(c.id)}
                          className="p-1 rounded text-ink-muted hover:text-ink transition-colors flex items-center justify-center mx-auto"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-deep" />
                          ) : (
                            <Square className="w-4 h-4 text-ink-faint" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-ink-faint">
                        {(currentPage - 1) * perPage + idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-ink">
                        <span>{c.name}</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-brand-soft font-medium">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-ink-faint" />
                          <span>+{c.phone}</span>
                        </div>
                      </td>
                      {/* Kolom Tag Mandiri */}
                      <td className="py-2.5 px-4">
                        {contactTags.length === 0 ? (
                          <span className="text-[10px] text-ink-faint italic">-</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {contactTags.map((t, tIdx) => (
                              <Badge
                                key={tIdx}
                                variant="default"
                                className="font-mono text-[10px]"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
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
                            className="p-1 rounded text-ink-faint hover:text-brand-deep hover:bg-brand-wash transition-colors"
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
                  );
                })
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

      {/* Modal Bulk Edit Kontak Terpilih */}
      <Dialog open={isBulkEditModalOpen} onOpenChange={setIsBulkEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-ink flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-deep" />
              <span>Edit Massal ({selectedIds.length} Kontak Terpilih)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Bagian 1: Segmen Grup */}
            <div className="space-y-1.5 p-3 rounded-lg border border-line bg-surface-alt/40">
              <label className="block text-[11px] font-semibold text-ink">
                1. Ubah Segmen Grup
              </label>
              <div className="space-y-2">
                <select
                  value={bulkGroupMode}
                  onChange={(e) => setBulkGroupMode(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
                >
                  <option value="keep">Jangan Ubah Segmen Grup</option>
                  <option value="set">Pindahkan ke Segmen Grup Baru</option>
                </select>

                {bulkGroupMode === 'set' && (
                  <select
                    value={bulkGroup}
                    onChange={(e) => setBulkGroup(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
                  >
                    {groups?.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Bagian 2: Tag / Label Multi-Tag */}
            <div className="space-y-1.5 p-3 rounded-lg border border-line bg-surface-alt/40">
              <label className="block text-[11px] font-semibold text-ink">
                2. Pengaturan Tag / Label
              </label>
              <div className="space-y-2">
                <select
                  value={bulkTagMode}
                  onChange={(e) => setBulkTagMode(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
                >
                  <option value="keep">Jangan Ubah Tag Kontak</option>
                  <option value="append">Tambahkan Tag Baru (Tanpa Hapus yang Ada)</option>
                  <option value="replace">Ganti Seluruh Tag dengan yang Baru</option>
                  <option value="remove">Hapus Tag Tertentu dari Kontak</option>
                </select>

                {bulkTagMode !== 'keep' && (
                  <div>
                    <TagInput
                      value={bulkTags}
                      onChange={setBulkTags}
                      suggestions={allUniqueTags}
                      inlineSuggestions={true}
                      placeholder="Ketik tag lalu Enter (cth: Prioritas)"
                    />
                    <p className="text-[10px] text-ink-faint mt-1">
                      {bulkTagMode === 'append' && 'Tag ini akan digabungkan ke tag kontak yang sudah ada.'}
                      {bulkTagMode === 'replace' && 'Tag lama di kontak terpilih akan ditimpa seluruhnya.'}
                      {bulkTagMode === 'remove' && 'Tag yang dicocokkan akan dihilangkan dari kontak.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian 3: Variabel Dinamis JSON */}
            <div className="space-y-1.5 p-3 rounded-lg border border-line bg-surface-alt/40">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-ink">
                  3. Update Variabel Dinamis (Key-Value)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBulkCustomField}
                  className="h-6 px-2 text-[10px]"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span>Tambah Variabel</span>
                </Button>
              </div>

              {bulkCustomFields.length === 0 ? (
                <p className="text-[10px] text-ink-faint italic">
                  Tidak ada variabel kustom yang akan diubah massal. Klik Tambah Variabel jika diperlukan.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {bulkCustomFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Key (cth: kota)"
                        value={field.key}
                        onChange={(e) => updateBulkCustomField(idx, 'key', e.target.value)}
                        className="w-1/2 h-7 px-2 rounded bg-surface border border-line text-[11px] font-mono text-ink focus:outline-none focus:border-brand"
                      />
                      <input
                        type="text"
                        placeholder="Nilai (cth: Jakarta)"
                        value={field.value}
                        onChange={(e) => updateBulkCustomField(idx, 'value', e.target.value)}
                        className="w-1/2 h-7 px-2 rounded bg-surface border border-line text-[11px] font-mono text-ink focus:outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        onClick={() => removeBulkCustomField(idx)}
                        className="p-1 text-ink-faint hover:text-clay"
                        title="Hapus baris"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t border-line pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkEditModalOpen(false)}
              disabled={isBulkUpdating}
            >
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExecuteBulkUpdate}
              disabled={isBulkUpdating}
              className="gap-1.5 bg-brand hover:bg-brand-strong text-white"
            >
              {isBulkUpdating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan Perubahan…</span>
                </>
              ) : (
                <span>Terapkan ke {selectedIds.length} Kontak</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Kontak dengan Dukungan Multi Variabel Dinamis Kustom */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Kontak Baru</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveContact} className="space-y-3 text-xs py-1">
            <div>
              <label className="block text-[11px] font-medium text-ink-soft mb-1">
                Nama Lengkap Penerima *
              </label>
              <input
                type="text"
                required
                placeholder="Misal: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-soft mb-1">
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
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-line text-xs text-ink font-mono focus:outline-none focus:border-brand"
              />
              <p className="text-[10px] text-ink-faint mt-1">
                Ketik 0851... otomatis jadi 62851...
              </p>
            </div>

            {/* Galat dari server (nomor duplikat / format tidak sah) tampil di dalam
                modal supaya isian yang sudah diketik tidak hilang. */}
            {errorMsg && (
              <p className="text-[11px] text-clay bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 rounded-lg px-2.5 py-2">
                {errorMsg}
              </p>
            )}

            <div>
              <label className="block text-[11px] font-medium text-ink-soft mb-1">
                Segmen Grup
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
              >
                {groups?.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-soft mb-1">
                Tag / Label (Bisa Multi-Tag)
              </label>
              <TagInput
                value={tagList}
                onChange={setTagList}
                suggestions={allUniqueTags}
                inlineSuggestions={true}
                placeholder="Ketik tag lalu Enter (cth: VIP)"
                className="mb-0"
              />
            </div>

            {/* Variabel Dinamis Dinamis (Key-Value Builder) */}
            <div className="pt-2 border-t border-line">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Kontak</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateContact} className="space-y-3 text-xs py-1">
            <div>
              <label className="block text-[11px] font-medium text-ink-soft mb-1">
                Nama Lengkap Penerima *
              </label>
              <input
                type="text"
                required
                placeholder="Misal: Budi Santoso"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-soft mb-1">
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
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-line text-xs text-ink font-mono focus:outline-none focus:border-brand"
              />
              <p className="text-[10px] text-ink-faint mt-1">
                Ketik 0851... otomatis jadi 62851...
              </p>
            </div>

            {editErrorMsg && (
              <p className="text-[11px] text-clay bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 rounded-lg px-2.5 py-2">
                {editErrorMsg}
              </p>
            )}

            <div>
              <label className="block text-[11px] font-medium text-ink-soft mb-1">
                Segmen Grup
              </label>
              <select
                value={editGroup}
                onChange={(e) => setEditGroup(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface border border-line text-xs text-ink focus:outline-none focus:border-brand"
              >
                {groups?.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-soft mb-1">
                Tag / Label (Bisa Multi-Tag)
              </label>
              <TagInput
                value={editTagList}
                onChange={setEditTagList}
                suggestions={allUniqueTags}
                inlineSuggestions={true}
                placeholder="Ketik tag lalu Enter (cth: VIP)"
                className="mb-0"
              />
            </div>

            {/* Variabel Dinamis Kustom JSON */}
            <div className="pt-2 border-t border-line">
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

      {/* Modal Import Excel / CSV */}
      <Dialog open={isImportModalOpen} onOpenChange={(open) => {
        setIsImportModalOpen(open);
        if (!open) {
          setPreviewData(null);
          setImportError('');
          setImportSummary('');
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brand" />
              <span>Import Data Kontak (Excel / CSV)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            {/* Banner Unduh Template Resmi */}
            <div className="p-3.5 rounded-lg bg-brand-wash border border-brand-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-bold text-brand-deep flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  <span>Template Excel Resmi Kontak WA Blast</span>
                </span>
                <p className="text-[11px] text-brand-deep/80 leading-relaxed">
                  Gunakan template Excel resmi dengan kolom terformat rapi, lembar panduan variabel, dan contoh data siap pakai.
                </p>
              </div>
              <a
                href="/template-kontak-blast.xlsx"
                download="template-kontak-blast.xlsx"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-brand hover:bg-brand-strong text-white font-semibold text-xs transition shadow-xs shrink-0 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh Template .xlsx</span>
              </a>
            </div>

            {/* Input Berkas */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            {!previewData && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full border-2 border-dashed border-line-strong rounded-lg p-7 text-center hover:border-brand hover:bg-surface-sunken/40 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                <UploadCloud className="w-9 h-9 text-brand mx-auto mb-2" />
                <div className="text-xs font-semibold text-ink">
                  {isImporting ? 'Memproses berkas...' : 'Pilih Berkas Excel (.xlsx, .xls) atau CSV'}
                </div>
                <p className="text-[11px] text-ink-faint mt-1">
                  Mendukung hingga 5.000 kontak dan otomatis mendeteksi kolom variabel kustom dinamis
                </p>
              </button>
            )}

            {/* PREVIEW KONTEN SEBELUM IMPORT */}
            {previewData && (
              <div className="space-y-3 border border-line rounded-lg p-3.5 bg-surface-sunken">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-line">
                  <div>
                    <span className="font-bold text-ink flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-brand" />
                      <span>Pratinjau Data: <code className="font-mono text-brand-deep">{previewData.fileName}</code></span>
                    </span>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Ditemukan <strong>{previewData.validCount} baris valid</strong> siap diimpor
                      {previewData.invalidCount > 0 && ` (${previewData.invalidCount} baris dilewati)`}.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs h-7 self-start sm:self-auto"
                  >
                    Ganti File
                  </Button>
                </div>

                {/* Variabel Kustom Terdeteksi */}
                {previewData.customKeys.length > 0 && (
                  <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs">
                    <span className="font-semibold text-amber-700 dark:text-amber-300 block mb-1">
                      ✨ {previewData.customKeys.length} Variabel Kustom Terdeteksi:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewData.customKeys.map((key) => (
                        <span key={key} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 font-mono text-[11px]">
                          {`{{${key}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabel Cuplikan 5 Baris Pertama */}
                <div className="border border-line rounded-md overflow-x-auto bg-surface">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-surface-alt border-b border-line text-ink font-semibold">
                      <tr>
                        <th className="px-2.5 py-1.5">#</th>
                        <th className="px-2.5 py-1.5">Nama</th>
                        <th className="px-2.5 py-1.5">Nomor (Normalisasi)</th>
                        <th className="px-2.5 py-1.5">Tag</th>
                        <th className="px-2.5 py-1.5">Grup</th>
                        {previewData.customKeys.map((k) => (
                          <th key={k} className="px-2.5 py-1.5 text-amber-600 dark:text-amber-400 font-mono">
                            {`{{${k}}}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink">
                      {previewData.items.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-alt/50">
                          <td className="px-2.5 py-1.5 text-ink-faint font-mono">{idx + 1}</td>
                          <td className="px-2.5 py-1.5 font-medium">{item.name}</td>
                          <td className="px-2.5 py-1.5 font-mono text-brand-deep">{item.normalizedPhone}</td>
                          <td className="px-2.5 py-1.5 text-ink-muted font-mono text-[10px]">
                            {item.tag || '-'}
                          </td>
                          <td className="px-2.5 py-1.5 text-ink-muted">{item.group}</td>
                          {previewData.customKeys.map((k) => (
                            <td key={k} className="px-2.5 py-1.5 text-ink-muted">
                              {item.custom[k] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.items.length > 5 && (
                  <p className="text-[10px] text-ink-faint text-center">
                    Menampilkan 5 dari {previewData.items.length} kontak yang akan diimpor.
                  </p>
                )}
              </div>
            )}

            {/* Notifikasi Ringkasan / Galat */}
            {importSummary && (
              <div className="p-3 rounded-lg bg-leaf-wash border border-leaf-line text-leaf-deep flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-leaf shrink-0 mt-0.5" />
                <span className="text-xs">{importSummary}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-lg bg-clay-wash border border-clay-line text-clay-deep flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-clay shrink-0 mt-0.5" />
                <span className="text-xs">{importError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-line pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsImportModalOpen(false);
                setPreviewData(null);
              }}
            >
              Tutup
            </Button>

            {previewData && (
              <Button
                variant="default"
                size="sm"
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="gap-1.5 bg-brand hover:bg-brand-strong text-white cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Konfirmasi &amp; Import {previewData.validCount} Kontak</span>
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
