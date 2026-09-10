import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Image,
  Shuffle,
  Eye,
  Check,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function TemplatesPage({ templates: initialTemplates }) {
  const [templates, setTemplates] = useState(initialTemplates || []);
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplates[0] || null);

  // Form edit
  const [title, setTitle] = useState(selectedTemplate?.title || '');
  const [type, setType] = useState(selectedTemplate?.type || 'text');
  const [mediaUrl, setMediaUrl] = useState(selectedTemplate?.mediaUrl || '');
  const [content, setContent] = useState(selectedTemplate?.content || '');

  const selectTpl = (tpl) => {
    setSelectedTemplate(tpl);
    setTitle(tpl.title);
    setType(tpl.type);
    setMediaUrl(tpl.mediaUrl || '');
    setContent(tpl.content);
  };

  const insertTag = (tag) => {
    setContent((prev) => prev + ` {{${tag}}}`);
  };

  const insertSpintax = () => {
    setContent((prev) => prev + ` {Halo|Hai|Selamat pagi}`);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = templates.map((t) =>
      t.id === selectedTemplate?.id
        ? { ...t, title, type, mediaUrl, content }
        : t
    );
    setTemplates(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Message Templates</h1>
            <Badge variant="outline" className="font-mono text-[10px]">{templates.length} Tersimpan</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Buat template dinamis dengan variabel personalisasi dan Spintax anti-spam.
          </p>
        </div>
        <Button
          onClick={() => {
            const newTpl = {
              id: `tpl_${Date.now()}`,
              title: 'Template Baru',
              type: 'text',
              content: 'Halo {{name}}, terima kasih telah menghubungi kami.',
            };
            setTemplates([...templates, newTpl]);
            selectTpl(newTpl);
          }}
          variant="default"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1 text-zinc-950" />
          <span className="text-zinc-950 font-semibold">Buat Template Baru</span>
        </Button>
      </div>

      {/* Main Grid: Template List + Editor + Live Phone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar List Template (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider px-1">
            Daftar Template
          </div>
          <div className="space-y-2">
            {templates.map((tpl) => {
              const isSel = selectedTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => selectTpl(tpl)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSel
                      ? 'bg-zinc-900 border-zinc-700 shadow-xs'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-200 truncate">{tpl.title}</span>
                    <Badge variant={tpl.type === 'media' ? 'warning' : 'outline'} className="text-[9px] uppercase font-mono">
                      {tpl.type}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {tpl.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor Form (4 cols) */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle>Editor Pesan</CardTitle>
            <CardDescription>Sesuaikan konten pesan WhatsApp dan sisipkan token dinamis</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Judul Template</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Tipe Pesan</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={type === 'text' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setType('text')}
                  >
                    Teks Saja
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'media' ? 'secondary' : 'ghost'}
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
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">URL Media / Gambar</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/promo.jpg"
                    className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Dynamic Variables Pill Toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-[11px]">
                  <span className="text-zinc-400 font-medium">Sisipkan Variabel:</span>
                  <button
                    type="button"
                    onClick={insertSpintax}
                    className="text-emerald-400 hover:text-emerald-300 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
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
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono border border-zinc-700/50 cursor-pointer"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Isi Pesan WhatsApp</label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="default" size="sm" className="w-full">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Live Preview Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Live Chat Preview</span>
            <span className="text-emerald-400 text-[10px] flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> Real-time
            </span>
          </div>

          <Card className="p-4 bg-zinc-950/80 border-zinc-800 flex items-center justify-center min-h-[380px]">
            <WhatsAppBubblePreview
              content={content}
              mediaUrl={type === 'media' ? mediaUrl : null}
              sampleData={{
                name: 'Budi Santoso',
                phone: '628123456789',
                tagihan: 'Rp 250.000',
                tempo: '25 Sep 2026',
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
