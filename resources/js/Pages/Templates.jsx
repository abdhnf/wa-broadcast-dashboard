import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Image,
  Shuffle,
  Eye,
  Trash2,
  Edit2,
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
  DialogDescription,
  DialogFooter
} from '../components/ui/Dialog';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function TemplatesPage({ templates: initialTemplates }) {
  const [templates, setTemplates] = useState(initialTemplates || []);
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplates[0] || null);

  // Modal editor states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [content, setContent] = useState('');

  const openEditor = (tpl) => {
    if (tpl) {
      setSelectedTemplate(tpl);
      setTitle(tpl.title);
      setType(tpl.type);
      setMediaUrl(tpl.mediaUrl || '');
      setContent(tpl.content);
    } else {
      setSelectedTemplate(null);
      setTitle('Template Baru');
      setType('text');
      setMediaUrl('');
      setContent('Halo {{name}}, terima kasih telah menjadi pelanggan setia kami.');
    }
    setEditModalOpen(true);
  };

  const openPreview = (tpl) => {
    setSelectedTemplate(tpl);
    setPreviewModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (selectedTemplate) {
      setTemplates(
        templates.map((t) =>
          t.id === selectedTemplate.id
            ? { ...t, title, type, mediaUrl, content }
            : t
        )
      );
    } else {
      const newTpl = {
        id: `tpl_${Date.now()}`,
        title,
        type,
        mediaUrl,
        content,
      };
      setTemplates([...templates, newTpl]);
    }
    setEditModalOpen(false);
  };

  const insertTag = (tag) => {
    setContent((prev) => prev + ` {{${tag}}}`);
  };

  const insertSpintax = () => {
    setContent((prev) => prev + ` {Halo|Hai|Selamat pagi}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Message Templates
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">{templates.length} Tersimpan</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Kelola template pesan dinamis dengan variabel personalisasi dan Spintax anti-spam.
          </p>
        </div>
        <Button onClick={() => openEditor(null)} variant="default" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Buat Template Baru</span>
        </Button>
      </div>

      {/* Tabel Template Pesan (Full Responsive Table) */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">JUDUL TEMPLATE</th>
                <th className="py-2.5 px-4 font-medium">TIPE PESAN</th>
                <th className="py-2.5 px-4 font-medium">KONTEN PESAN WHATSAPP</th>
                <th className="py-2.5 px-4 font-medium">MEDIA LAMPIRAN</th>
                <th className="py-2.5 px-4 font-medium text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
              {templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{tpl.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={tpl.type === 'media' ? 'warning' : 'outline'} className="text-[10px] uppercase font-mono">
                      {tpl.type}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="line-clamp-2 text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
                      {tpl.content}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                    {tpl.mediaUrl ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate block max-w-[120px]">
                        Ada Gambar
                      </span>
                    ) : (
                      'Teks Saja'
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        onClick={() => openPreview(tpl)}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        onClick={() => openEditor(tpl)}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTemplates(templates.filter((t) => t.id !== tpl.id))}
                        className="h-7 w-7 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Live WhatsApp Bubble Preview */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-sm p-4 text-center">
          <DialogHeader className="text-center sm:text-center pb-2">
            <DialogTitle>{selectedTemplate?.title || 'Preview WhatsApp'}</DialogTitle>
            <DialogDescription>
              Tampilan pesan sebagaimana dilihat di aplikasi WhatsApp penerima
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 flex justify-center">
            {selectedTemplate && (
              <WhatsAppBubblePreview
                content={selectedTemplate.content}
                mediaUrl={selectedTemplate.mediaUrl}
                sampleData={{
                  name: 'Budi Santoso',
                  phone: '628123456789',
                  tagihan: 'Rp 250.000',
                  tempo: '25 Sep 2026',
                }}
              />
            )}
          </div>

          <DialogFooter className="sm:justify-center pt-3">
            <Button variant="outline" size="sm" onClick={() => setPreviewModalOpen(false)}>
              Tutup Pratinjau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editor Template Pesan */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editor Template Pesan</DialogTitle>
            <DialogDescription>
              Sesuaikan konten pesan dan sisipkan token dinamis untuk personalisasi
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 py-1">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Judul Template</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Tipe Pesan</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === 'text' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setType('text')}
                >
                  Teks Saja
                </Button>
                <Button
                  type="button"
                  variant={type === 'media' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setType('media')}
                >
                  Teks + Gambar
                </Button>
              </div>
            </div>

            {type === 'media' && (
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">URL Media / Gambar</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/promo.jpg"
                  className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Quick Variable Inserts */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-slate-600 dark:text-zinc-400 font-medium">Sisipkan Variabel:</span>
                <button
                  type="button"
                  onClick={insertSpintax}
                  className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Shuffle className="w-3 h-3" /> + Spintax
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['name', 'phone', 'tagihan', 'tempo'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertTag(v)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-mono border border-slate-200 dark:border-zinc-700 cursor-pointer"
                  >
                    +{v}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Isi Pesan WhatsApp</label>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none font-sans leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
