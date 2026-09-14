import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FolderKanban,
  Plus,
  Users,
  Send,
  Trash2,
  CheckCircle2,
  Eye,
  X,
  Search,
  Tag,
  Phone,
  Layers,
  ArrowRight,
  Sparkles,
  Info
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
import { createGroup, deleteGroup, fetchGroupContacts, fetchGroups, updateContact } from '../lib/api';

export function GroupsPage({ contacts = [], onNavigate, onGroupsChange, onContactsChange, onStartBroadcast }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [membersModalGroup, setMembersModalGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // 1. Search Kontak di Modal Tambah Segmen (Minimal 3 karakter)
  const trimmedSearch = contactSearchQuery.trim().toLowerCase();
  const isSearchActive = trimmedSearch.length >= 3;

  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];
    return contacts.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(trimmedSearch);
      const phoneMatch = c.phone?.includes(trimmedSearch);
      const tagMatch = c.tag?.toLowerCase().includes(trimmedSearch);
      const groupMatch = (c.group || c.group_name || '')?.toLowerCase().includes(trimmedSearch);
      return nameMatch || phoneMatch || tagMatch || groupMatch;
    });
  }, [contacts, trimmedSearch, isSearchActive]);

  // Kontak yang sudah dipilih tetap perlu diakses datanya untuk chip / status
  const selectedContactsMap = useMemo(() => {
    const map = new Map();
    contacts.forEach((c) => {
      if (selectedContactIds.includes(c.id)) {
        map.set(c.id, c);
      }
    });
    return map;
  }, [contacts, selectedContactIds]);

  const loadGroups = useCallback(async (signal) => {
    setLoading(true);
    setErrorMsg('');
    try {
      setGroups(await fetchGroups({ signal }));
    } catch (err) {
      if (err?.status === 0 && signal?.aborted) return;
      setErrorMsg(err?.message || 'Gagal memuat daftar segmen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadGroups(controller.signal);
    return () => controller.abort();
  }, [loadGroups]);

  const openMembers = async (group) => {
    setMembersModalGroup(group);
    setMembers([]);
    setMemberSearchQuery('');
    setLoadingMembers(true);
    setErrorMsg('');
    try {
      setMembers(await fetchGroupContacts(group.id));
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal memuat anggota segmen.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddGroup = async (event) => {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) {
      setErrorMsg('Nama segmen wajib diisi.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const saved = await createGroup({
        name,
        description: newGroupDesc.trim() || 'Segmentasi kontak pelanggan',
      });
      // Pindahkan kontak terpilih ke segmen baru
      await Promise.all(selectedContactIds.map((id) => updateContact(id, { group: name })));
      setGroups((prev) => [...prev, { ...saved, count: selectedContactIds.length }]);
      await Promise.all([onGroupsChange?.(), onContactsChange?.()]);
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedContactIds([]);
      setContactSearchQuery('');
      setAddModalOpen(false);
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal menyimpan segmen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id) => {
    setErrorMsg('');
    try {
      await deleteGroup(id);
      setGroups((prev) => prev.filter((group) => group.id !== id));
      await onGroupsChange?.();
      await onContactsChange?.();
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal menghapus segmen.');
    }
  };

  const toggleContact = (id) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const removeSelectedContact = (id) => {
    setSelectedContactIds((prev) => prev.filter((item) => item !== id));
  };

  const startBroadcast = (group) => {
    onStartBroadcast?.(group.name);
    onNavigate?.('broadcast');
  };

  // Filter anggota di modal Lihat Kontak
  const filteredMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      m.name?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.tag?.toLowerCase().includes(q) ||
      Object.values(m.custom || {}).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [members, memberSearchQuery]);

  return (
    <div className="space-y-4">
      {/* Header & Controls Sesuai Standar Konsisten Halaman Kontak */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-ink dark:text-white">Grup & Segmentasi Audiens</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{groups.length} Segmen</Badge>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Kelola segmentasi penerima blast, filter anggota audiens, dan picu broadcast instan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setNewGroupName('');
              setNewGroupDesc('');
              setSelectedContactIds([]);
              setContactSearchQuery('');
              setAddModalOpen(true);
            }}
            variant="default"
            size="sm"
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Buat Segmen Baru</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 text-xs text-clay-deep">
          <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabel Grup / Segmentasi (Konsisten Ukuran & Padding dengan Tabel Kontak) */}
      <div className="bg-surface rounded-lg border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-soft min-w-[720px]">
            <thead className="bg-shell text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line">
              <tr>
                <th className="py-2.5 px-4">Nama Segmen</th>
                <th className="py-2.5 px-4">Deskripsi / Kriteria</th>
                <th className="py-2.5 px-4">Total Anggota</th>
                <th className="py-2.5 px-4">Status Audiens</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-normal">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-faint">
                    Memuat segmen dari database…
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-faint">
                    Belum ada segmen audiens. Buat segmen pertama Anda.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-ink dark:text-white">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-brand-deep shrink-0" />
                        <span className="font-semibold">{group.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-ink-muted max-w-xs truncate text-[11px]">
                      {group.description || <span className="italic text-ink-faint">Tanpa deskripsi</span>}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-ink dark:text-white">
                      <span className="px-2 py-0.5 rounded bg-surface-sunken border border-line text-[11px]">
                        {group.count} Kontak
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-brand-deep font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Siap Blast
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          onClick={() => void openMembers(group)}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-ink-soft hover:text-ink"
                        >
                          <Eye className="w-3 h-3 mr-1 text-ink-muted" />
                          <span>Lihat Kontak</span>
                        </Button>
                        <Button
                          onClick={() => startBroadcast(group)}
                          variant="default"
                          size="sm"
                          className="h-7 px-2.5 text-[11px]"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          <span>Kirim Broadcast</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Hapus segmen ${group.name}`}
                          onClick={() => void handleDeleteGroup(group.id)}
                          className="h-7 w-7 text-ink-faint hover:text-clay dark:hover:text-rose-400"
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

      {/* Modal Buat Segmen Baru dengan Pencarian Kontak Cerdas (Min 3 Karakter) */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-ink">Buat Segmen Kontak Baru</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Tentukan nama segmen dan pilih kontak yang langsung ditambahkan sebagai anggota.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddGroup} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-ink block mb-1">Nama Segmen / Grup *</label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Misal: Pelanggan Retensi Q3"
                className="w-full h-8 px-3 rounded-lg bg-shell border border-line text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink block mb-1">Deskripsi / Kriteria Target</label>
              <textarea
                rows={2}
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Kriteria target pengiriman atau catatan segmen..."
                className="w-full p-2.5 rounded-lg bg-shell border border-line text-xs text-ink focus:outline-none focus:border-brand resize-none"
              />
            </div>

            {/* Area Pencarian & Pemilihan Kontak Anggota */}
            <div className="space-y-2 pt-1 border-t border-line">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink">
                  Tambahkan Kontak Anggota
                </label>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {selectedContactIds.length} Kontak Dipilih
                </Badge>
              </div>

              {/* Selected Contacts Chips (Bisa Dihapus) */}
              {selectedContactIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-surface-sunken border border-line max-h-24 overflow-y-auto">
                  {selectedContactIds.map((id) => {
                    const c = selectedContactsMap.get(id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-[11px] text-ink font-medium shadow-xs"
                      >
                        <span>{c?.name || id}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedContact(id)}
                          className="text-ink-faint hover:text-clay ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Input Pencarian Kontak (Min 3 Karakter) */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Ketik minimal 3 karakter untuk mencari nama, nomor, tag, atau segmen..."
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-shell border border-line text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              {/* Kotak Hasil Pencarian */}
              <div className="rounded-lg border border-line bg-surface overflow-hidden min-h-[120px] max-h-[220px] overflow-y-auto">
                {!isSearchActive ? (
                  <div className="p-4 text-center text-xs text-ink-muted flex flex-col items-center justify-center space-y-1">
                    <Info className="w-4 h-4 text-brand-deep" />
                    <span>Masukkan minimal 3 karakter untuk mencari kontak.</span>
                    <span className="text-[10px] text-ink-faint">
                      Membantu memfilter kontak secara cepat tanpa membebani daftar.
                    </span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-ink-muted">
                    Tidak ada kontak yang cocok dengan kata kunci "{contactSearchQuery}".
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {searchResults.map((contact) => {
                      const isSelected = selectedContactIds.includes(contact.id);
                      return (
                        <div
                          key={contact.id}
                          onClick={() => toggleContact(contact.id)}
                          className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-brand-wash/60' : 'hover:bg-shell'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-ink truncate">{contact.name}</span>
                              {contact.tag && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-sunken border border-line text-ink-muted">
                                  <Tag className="w-2.5 h-2.5" />
                                  {contact.tag}
                                </span>
                              )}
                              {contact.group ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-brand-wash text-brand-deep border border-brand-line">
                                  <Layers className="w-2.5 h-2.5" />
                                  {contact.group}
                                </span>
                              ) : (
                                <span className="text-[10px] text-ink-faint italic">Tanpa Segmen</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-muted mt-0.5">
                              <Phone className="w-3 h-3 text-ink-faint" />
                              <span>+{contact.phone}</span>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // dikontrol oleh onClick wrapper
                            className="h-4 w-4 accent-brand shrink-0 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-line">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="text-xs"
                disabled={saving}
              >
                {saving ? 'Menyimpan…' : 'Simpan Segmen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Daftar Kontak Anggota Segmen (Tampilan Rapi, Searchable, & Responsive) */}
      <Dialog open={Boolean(membersModalGroup)} onOpenChange={(open) => !open && setMembersModalGroup(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col">
          <DialogHeader className="pb-2 border-b border-line">
            <div className="flex items-center justify-between pr-4">
              <div>
                <DialogTitle className="text-base font-bold text-ink flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-brand-deep" />
                  <span>Anggota Segmen: {membersModalGroup?.name || ''}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-ink-muted mt-0.5">
                  {membersModalGroup?.description || 'Daftar audiens yang terdaftar dalam segmen ini.'}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {members.length} Kontak
              </Badge>
            </div>
          </DialogHeader>

          {/* Toolbar Pencarian Anggota di dalam Modal */}
          <div className="py-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Cari nama, nomor WhatsApp, atau variabel di segmen ini..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-shell border border-line text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* List / Tabel Anggota Kontak */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-line min-h-[240px] max-h-[380px]">
            {loadingMembers ? (
              <div className="py-12 text-center text-xs text-ink-muted">
                Memuat data anggota segmen…
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-muted">
                {members.length === 0
                  ? 'Belum ada kontak yang terdaftar di segmen ini.'
                  : `Tidak ada kontak yang cocok dengan "${memberSearchQuery}".`}
              </div>
            ) : (
              <table className="w-full text-left text-xs text-ink-soft">
                <thead className="bg-shell text-ink-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3 w-8 text-center">#</th>
                    <th className="py-2 px-3">Nama Kontak</th>
                    <th className="py-2 px-3">Nomor WhatsApp</th>
                    <th className="py-2 px-3">Tag</th>
                    <th className="py-2 px-3">Variabel Kustom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredMembers.map((contact, idx) => (
                    <tr key={contact.id} className="hover:bg-surface-alt/60 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-ink-faint">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-ink dark:text-white">
                        {contact.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-brand-deep font-medium">
                        +{contact.phone}
                      </td>
                      <td className="py-2.5 px-3">
                        {contact.tag ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken border border-line text-ink-muted">
                            {contact.tag}
                          </span>
                        ) : (
                          <span className="text-ink-faint text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1 max-w-xs">
                          {Object.entries(contact.custom || {}).length === 0 ? (
                            <span className="text-[10px] text-ink-faint italic">-</span>
                          ) : (
                            Object.entries(contact.custom || {}).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-[10px] font-mono px-1 py-0.2 rounded bg-surface-sunken border border-line text-ink-soft"
                              >
                                <strong className="text-brand-deep">{k}:</strong> {String(v)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-line flex items-center justify-between sm:justify-between">
            <div className="text-[11px] text-ink-muted">
              Menampilkan {filteredMembers.length} dari {members.length} anggota
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setMembersModalGroup(null)}
              >
                Tutup
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const g = membersModalGroup;
                  setMembersModalGroup(null);
                  if (g) startBroadcast(g);
                }}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Kirim Blast ke Segmen Ini</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
