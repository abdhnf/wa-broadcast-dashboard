import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  FileText,
  Plus,
  Image,
  MapPin,
  Eye,
  Trash2,
  Edit2,
  Sparkles,
  Smartphone,
  Check
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
import { WhatsAppFormattingToolbar } from '../components/WhatsAppFormattingToolbar';
import { MediaUploadField } from '../components/MediaUploadField';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';
import { createTemplate, deleteTemplate, fetchTemplates, updateTemplate } from '../lib/api';

export function TemplatesPage({ onTemplatesChange, contacts = [] }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewContactId, setPreviewContactId] = useState('');

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [messageType, setMessageType] = useState('text'); // 'text' | 'media' | 'location'
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video' | 'audio' | 'document'
  const [mediaUrl, setMediaUrl] = useState('');
  const [content, setContent] = useState('');
  // Location form state
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locLat, setLocLat] = useState(-6.2088);
  const [locLng, setLocLng] = useState(106.8456);

  const textareaRef = useRef(null);

  const loadTemplates = useCallback(async (signal) => {
    setLoading(true);
    setErrorMsg('');
    try {
      setTemplates(await fetchTemplates({ signal }));
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal memuat template.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTemplates(controller.signal);
    return () => controller.abort();
  }, [loadTemplates]);

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setMessageType('text');
    setMediaType('image');
    setMediaUrl('');
    setContent('');
    setLocName('');
    setLocAddress('');
    setLocLat(-6.2088);
    setLocLng(106.8456);
    setIsModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingId(t.id);
    setTitle(t.title);
    setMessageType(t.messageType || (t.mediaUrl ? 'media' : 'text'));
    setMediaType(t.mediaType || 'image');
    setMediaUrl(t.mediaUrl || '');
    setContent(t.content);
    if (t.location) {
      setLocName(t.location.name || '');
      setLocAddress(t.location.address || '');
      setLocLat(t.location.latitude || -6.2088);
      setLocLng(t.location.longitude || 106.8456);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('Judul template wajib diisi.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Isi pesan template wajib diisi.');
      return;
    }
    // Pesan media tanpa URL akan terkirim sebagai teks kosong oleh wa-api.
    if (messageType === 'media' && !String(mediaUrl || '').trim()) {
      setErrorMsg('Template bertipe media wajib punya berkas atau URL media.');
      return;
    }
    if (messageType === 'location') {
      const lat = parseFloat(locLat);
      const lng = parseFloat(locLng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        setErrorMsg('Koordinat lokasi wajib diisi (latitude & longitude).');
        return;
      }
    }

    const locationData =
      messageType === 'location'
        ? {
            name: locName,
            address: locAddress,
            latitude: parseFloat(locLat) || 0,
            longitude: parseFloat(locLng) || 0
          }
        : null;

    const payload = {
      title,
      messageType,
      mediaType: messageType === 'media' ? mediaType : null,
      mediaUrl: messageType === 'media' ? mediaUrl : null,
      content,
      location: locationData
    };

    setErrorMsg('');
    try {
      if (editingId) {
        const updated = await updateTemplate(editingId, payload);
        if (updated) {
          setTemplates((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
          void onTemplatesChange?.();
        }
      } else {
        const created = await createTemplate(payload);
        if (created) {
          setTemplates((prev) => [created, ...prev]);
          void onTemplatesChange?.();
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      // Modal tetap terbuka agar draf template tidak hilang saat server menolak.
      setErrorMsg(err?.message || 'Gagal menyimpan template.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    setErrorMsg('');
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      void onTemplatesChange?.();
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal menghapus template.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Pustaka Template Pesan</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{templates.length} Template</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Mendukung pesan Teks WhatsApp, Media (Gambar/Dokumen/Video/Audio dengan upload storage), dan Lokasi GPS.
          </p>
        </div>

        <Button onClick={openAddModal} variant="default" size="sm" className="text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Buat Template Baru</span>
        </Button>
      </div>

      {/* Galat daftar (bukan galat di dalam modal form). */}
      {errorMsg && !isModalOpen && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Modern High-Density Table */}
      <div className="bg-white dark:bg-[#0f1117] rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300 min-w-[750px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Judul Template</th>
                <th className="py-2.5 px-4">Tipe Pesan WA API</th>
                <th className="py-2.5 px-4">Ringkasan Isi Pesan</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                    Memuat template dari database…
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                    Belum ada template. Buat template pertama Anda.
                  </td>
                </tr>
              ) : templates.map((tpl, idx) => {
                const isMedia = tpl.messageType === 'media' || Boolean(tpl.mediaUrl);
                const isLocation = tpl.messageType === 'location' || Boolean(tpl.location);

                return (
                  <tr key={tpl.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                      {tpl.title}
                    </td>
                    <td className="py-3 px-4">
                      {isLocation ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                          <MapPin className="w-3 h-3 text-blue-500" />
                          <span>Lokasi GPS</span>
                        </span>
                      ) : isMedia ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                          <Image className="w-3 h-3 text-amber-500" />
                          <span className="capitalize">{tpl.mediaType || 'Media'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          <FileText className="w-3 h-3 text-emerald-500" />
                          <span>Teks Formatted</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="line-clamp-2 text-slate-600 dark:text-zinc-400 font-mono text-[11px]">
                        {tpl.content}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-emerald-600"
                          onClick={() => setPreviewTemplate(tpl)}
                          title="Pratinjau Balon Chat WA"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                          onClick={() => openEditModal(tpl)}
                          title="Edit Template"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-rose-500"
                          onClick={() => void handleDeleteTemplate(tpl.id)}
                          title="Hapus Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Tambah / Edit Template */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template Pesan' : 'Buat Template Pesan Baru'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 text-xs py-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Judul Template *
              </label>
              <input
                type="text"
                required
                placeholder="Misal: Promo Flash Sale 9.9"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Selector Tipe Pesan WA API */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Pilih Tipe Pesan WhatsApp API
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'text', label: 'Teks Format', icon: FileText },
                  { id: 'media', label: 'Media + Caption', icon: Image },
                  { id: 'location', label: 'Lokasi GPS', icon: MapPin },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = messageType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMessageType(item.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Media Upload jika tipe media dipilih */}
            {messageType === 'media' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                    File Media (Upload ke Storage Lokal atau URL)
                  </span>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="h-7 px-2 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] text-slate-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="image">Gambar (image)</option>
                    <option value="document">Dokumen / PDF (document)</option>
                    <option value="video">Video (video)</option>
                    <option value="audio">Audio (audio)</option>
                  </select>
                </div>

                <MediaUploadField
                  mediaUrl={mediaUrl}
                  onMediaChange={setMediaUrl}
                  mediaType={mediaType}
                  onMediaTypeChange={setMediaType}
                />
              </div>
            )}

            {/* Input Form Lokasi jika tipe location dipilih */}
            {messageType === 'location' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-2.5">
                <div className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>Detail Koordinat Lokasi WA</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Lokasi / Gedung"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Alamat Lengkap"
                    value={locAddress}
                    onChange={(e) => setLocAddress(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (-6.2088)"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-200 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (106.8456)"
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* WhatsApp Text Editor dengan Formatting & Emoji Toolbar */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                {messageType === 'media' ? 'Caption Pesan Media *' : messageType === 'location' ? 'Catatan Tambahan Lokasi *' : 'Isi Teks Pesan WhatsApp *'}
              </label>

              <WhatsAppFormattingToolbar
                value={content}
                onChange={setContent}
                textareaRef={textareaRef}
                contacts={contacts}
              />

              <textarea
                ref={textareaRef}
                required
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis pesan dengan format WhatsApp (*tebal*, _miring_, emoji 👋)..."
                className="w-full p-2.5 rounded-b-lg bg-slate-50 dark:bg-zinc-900 border border-t-0 border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-sans focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            {/* Galat dari server tampil di dalam modal agar draf tidak hilang. */}
            {errorMsg && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-lg px-2.5 py-2">
                {errorMsg}
              </p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Simpan Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Balon WhatsApp */}
      <Dialog open={Boolean(previewTemplate)} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pratinjau Pesan WhatsApp</DialogTitle>
          </DialogHeader>

          {contacts && contacts.length > 0 && (
            <div className="pt-1 pb-2">
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Uji Coba dengan Data Kontak Riil
              </label>
              <select
                value={previewContactId}
                onChange={(e) => setPreviewContactId(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Contoh Standar (Budi Santoso) --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="py-2">
            {previewTemplate && (() => {
              const matchedContact = contacts?.find((c) => String(c.id) === String(previewContactId));
              const sampleContact = matchedContact || (contacts?.length > 0 ? contacts[0] : { name: 'Budi Santoso', phone: '62812345678' });
              const sampleData = {
                name: sampleContact.name,
                nama: sampleContact.name,
                phone: sampleContact.phone,
                ...(sampleContact.custom || {}),
              };

              return (
                <WhatsAppBubblePreview
                  senderName="WA Broadcast Bot"
                  content={previewTemplate.content}
                  mediaUrl={previewTemplate.mediaUrl}
                  mediaType={previewTemplate.mediaType || 'image'}
                  location={previewTemplate.location}
                  contact={sampleContact}
                  sampleData={sampleData}
                  time="12:00"
                />
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
