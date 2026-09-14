import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderKanban, Plus, Users, Send, Trash2, CheckCircle2, UserPlus, Eye, X } from 'lucide-react';
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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [membersModalGroup, setMembersModalGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const selectableContacts = useMemo(
    () => contacts.filter((contact) => !contact.group || contact.group === newGroupName.trim()),
    [contacts, newGroupName],
  );

  const loadGroups = useCallback(async (signal) => {
    setLoading(true);
    setErrorMsg('');
    try {
      setGroups(await fetchGroups({ signal }));
    } catch (err) {
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
      await Promise.all(selectedContactIds.map((id) => updateContact(id, { group: name })));
      setGroups((prev) => [...prev, { ...saved, count: selectedContactIds.length }]);
      await Promise.all([onGroupsChange?.(), onContactsChange?.()]);
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedContactIds([]);
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
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal menghapus segmen.');
    }
  };

  const toggleContact = (id) => {
    setSelectedContactIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const startBroadcast = (group) => {
    onStartBroadcast?.(group.name);
    onNavigate?.('broadcast');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-ink dark:text-white">Grup & Segmentasi Audiens</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{groups.length} Segmen</Badge>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">Kelola target kontak, cek anggota, lalu mulai blast dari segmen yang dipilih.</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} variant="default" size="sm" className="min-h-11">
          <Plus className="w-4 h-4 mr-1" /> Buat Segmen Baru
        </Button>
      </div>

      {errorMsg && <div className="p-3 rounded-lg bg-clay-wash dark:bg-rose-950/30 border border-clay-line dark:border-rose-900/60 text-xs text-clay-deep">{errorMsg}</div>}

      <div className="border border-line rounded-lg overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-shell border-b border-line text-[11px] font-mono text-ink-muted">
              <tr>
                <th className="py-2.5 px-4 font-medium">NAMA SEGMEN</th>
                <th className="py-2.5 px-4 font-medium">DESKRIPSI / KRITERIA</th>
                <th className="py-2.5 px-4 font-medium">TOTAL ANGGOTA</th>
                <th className="py-2.5 px-4 font-medium">STATUS AUDIENS</th>
                <th className="py-2.5 px-4 font-medium text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-soft">
              {loading ? <tr><td colSpan={5} className="py-8 text-center text-ink-faint">Memuat segmen dari database…</td></tr> : null}
              {!loading && groups.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-ink-faint">Belum ada segmen. Buat segmen pertama dan masukkan kontaknya.</td></tr> : null}
              {!loading && groups.map((group) => (
                <tr key={group.id} className="hover:bg-shell/70 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-ink dark:text-white"><div className="flex items-center gap-2"><FolderKanban className="w-4 h-4 text-brand-deep" />{group.name}</div></td>
                  <td className="py-3.5 px-4 text-ink-muted max-w-xs truncate">{group.description}</td>
                  <td className="py-3.5 px-4 font-mono font-medium text-ink dark:text-white">{group.count} Penerima</td>
                  <td className="py-3.5 px-4"><span className="inline-flex items-center gap-1 text-[11px] text-brand-deep font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Siap Blast</span></td>
                  <td className="py-3.5 px-4"><div className="flex items-center justify-end gap-2">
                    <Button onClick={() => void openMembers(group)} variant="outline" size="sm" className="h-9 text-[11px]"><Eye className="w-3.5 h-3.5 mr-1" />Lihat Kontak</Button>
                    <Button onClick={() => startBroadcast(group)} variant="default" size="sm" className="h-9 text-[11px]"><Send className="w-3.5 h-3.5 mr-1" />Kirim Broadcast</Button>
                    <Button variant="ghost" size="icon" aria-label={`Hapus segmen ${group.name}`} onClick={() => void handleDeleteGroup(group.id)} className="h-9 w-9 text-ink-faint hover:text-clay dark:hover:text-rose-400"><Trash2 className="w-4 h-4" /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Segmen Kontak Baru</DialogTitle><DialogDescription>Nama segmen dan pilih kontak yang langsung menjadi anggotanya.</DialogDescription></DialogHeader>
          <form onSubmit={handleAddGroup} className="space-y-4 py-2">
            <div><label className="text-[11px] font-medium text-ink-muted block mb-1">Nama Segmen / Grup</label><input type="text" required value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Pelanggan Retensi Q3" className="w-full min-h-11 px-3 rounded-lg bg-shell border border-line text-sm text-ink focus:outline-none focus:border-brand" /></div>
            <div><label className="text-[11px] font-medium text-ink-muted block mb-1">Deskripsi / Kriteria</label><textarea rows={3} value={newGroupDesc} onChange={(event) => setNewGroupDesc(event.target.value)} placeholder="Kriteria target untuk segmen ini" className="w-full p-3 rounded-lg bg-shell border border-line text-sm text-ink focus:outline-none focus:border-brand resize-none" /></div>
            <fieldset><div className="flex justify-between items-center mb-2"><label className="text-[11px] font-medium text-ink-muted">Tambahkan Kontak Sekarang</label><span className="text-[11px] text-brand-deep font-medium">{selectedContactIds.length} dipilih</span></div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-line divide-y divide-line">
                {selectableContacts.length === 0 ? <p className="p-3 text-xs text-ink-muted">Tidak ada kontak tanpa segmen yang tersedia.</p> : selectableContacts.map((contact) => <label key={contact.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-shell"><input type="checkbox" checked={selectedContactIds.includes(contact.id)} onChange={() => toggleContact(contact.id)} className="h-4 w-4 accent-brand" /><span className="min-w-0"><span className="block text-xs font-medium text-ink truncate">{contact.name}</span><span className="block text-[11px] text-ink-muted">{contact.phone}</span></span></label>)}
              </div>
            </fieldset>
            <DialogFooter className="pt-2"><Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setAddModalOpen(false)}>Batal</Button><Button type="submit" variant="default" size="sm" className="min-h-11" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Segmen'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(membersModalGroup)} onOpenChange={(open) => !open && setMembersModalGroup(null)}>
        <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader><DialogTitle>Anggota Segmen</DialogTitle><DialogDescription>{membersModalGroup?.name || ''}</DialogDescription></DialogHeader>
          <div className="border border-line rounded-lg divide-y divide-line">
            {loadingMembers ? <p className="p-5 text-center text-xs text-ink-muted">Memuat anggota segmen…</p> : null}
            {!loadingMembers && members.length === 0 ? <p className="p-5 text-center text-xs text-ink-muted">Belum ada kontak dalam segmen ini.</p> : null}
            {!loadingMembers && members.map((contact) => <div key={contact.id} className="flex items-center gap-3 p-3"><Users className="w-4 h-4 text-brand-deep shrink-0" /><div className="min-w-0"><p className="text-xs font-semibold text-ink truncate">{contact.name}</p><p className="text-[11px] text-ink-muted">{contact.phone}</p></div></div>)}
          </div>
          <DialogFooter><Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setMembersModalGroup(null)}><X className="w-4 h-4 mr-1" />Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
