import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Sparkles,
  Image,
  Variable,
  Shuffle,
  CheckCheck,
  Copy,
  Trash2,
  Eye
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function TemplatesPage({ templates: initialTemplates }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplates[0] || null);

  // Edit / Composer state
  const [title, setTitle] = useState(selectedTemplate?.title || '');
  const [content, setContent] = useState(selectedTemplate?.content || '');
  const [mediaUrl, setMediaUrl] = useState(selectedTemplate?.mediaUrl || '');

  const handleSelect = (tpl) => {
    setSelectedTemplate(tpl);
    setTitle(tpl.title);
    setContent(tpl.content);
    setMediaUrl(tpl.mediaUrl || '');
  };

  const handleNewTemplate = () => {
    const fresh = {
      id: `tpl_${Date.now()}`,
      title: 'Template Pesan Baru',
      type: 'text',
      mediaUrl: null,
      content: 'Halo {{name}},\n\nKetik pesan WhatsApp Anda di sini...'
    };
    setTemplates([fresh, ...templates]);
    handleSelect(fresh);
  };

  const insertVariable = (varName) => {
    setContent((prev) => prev + ` {{${varName}}}`);
  };

  const insertSpintaxSample = () => {
    setContent((prev) => prev + ` {Halo|Hai|Selamat pagi}`);
  };

  const handleSave = () => {
    const updated = templates.map((t) =>
      t.id === selectedTemplate.id
        ? { ...t, title, content, mediaUrl: mediaUrl || null }
        : t
    );
    setTemplates(updated);
    setSelectedTemplate({ ...selectedTemplate, title, content, mediaUrl: mediaUrl || null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Template Pesan WhatsApp</h1>
          <p className="text-xs text-slate-400">
            Smart composer dengan dukungan variabel dinamis, spintax anti-spam, dan live preview chat bubble.
          </p>
        </div>
        <Button onClick={handleNewTemplate} variant="primary" size="md">
          <Plus className="w-4 h-4" />
          <span>Buat Template Baru</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom 1: Daftar Template (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1">
            Daftar Template Tersimpan ({templates.length})
          </span>
          <div className="space-y-2">
            {templates.map((t) => {
              const isSelected = selectedTemplate?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`p-4 rounded-2xl border transition cursor-pointer text-left space-y-2 ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white line-clamp-1">{t.title}</span>
                    <Badge variant={t.mediaUrl ? 'info' : 'default'}>
                      {t.mediaUrl ? 'Media' : 'Teks'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {t.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom 2: Composer Editor (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Smart Message Composer</span>
            </h3>
            <Button onClick={handleSave} variant="primary" size="sm">
              <span>Simpan Perubahan</span>
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Judul Template</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">URL Gambar / Dokumen (Opsional)</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/... atau kosongkan"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Helper Tag Variables & Spintax */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Klik untuk menyisipkan variabel:</span>
                <span className="text-emerald-400 font-mono text-[10px]">Anti-Ban Spintax Ready</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => insertVariable('name')}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 text-xs font-mono transition cursor-pointer"
                >
                  + &#123;&#123;name&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('phone')}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 text-xs font-mono transition cursor-pointer"
                >
                  + &#123;&#123;phone&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('tagihan')}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 text-xs font-mono transition cursor-pointer"
                >
                  + &#123;&#123;tagihan&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={insertSpintaxSample}
                  className="px-2.5 py-1 rounded-lg bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800 text-purple-300 text-xs font-mono transition cursor-pointer"
                >
                  + &#123;Spintax&#125;
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Isi Pesan WhatsApp</label>
              <textarea
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
              <span className="text-[10px] text-slate-400 block">
                Mendukung format WA: *tebal*, _miring_, ~coret~, dan spintax acak &#123;opsi1|opsi2&#125;.
              </span>
            </div>
          </div>
        </div>

        {/* Kolom 3: Live WA Chat Bubble Preview (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulasi Chat WhatsApp</span>
          </span>

          <WhatsAppBubblePreview
            content={content}
            mediaUrl={mediaUrl}
            sampleName="Budi Santoso"
            sampleCustom={{ tagihan: 'Rp 250.000', tempo: '15 Sep' }}
          />

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-200">Catatan Simulasi:</div>
            <div>&bull; Variabel <code className="text-emerald-400">&#123;&#123;name&#125;&#125;</code> diganti dengan nama penerima secara otomatis.</div>
            <div>&bull; Centang dua biru menunjukkan delivery receipt WhatsApp saat pesan dibaca.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
