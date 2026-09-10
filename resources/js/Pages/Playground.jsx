import React, { useState, useRef } from 'react';
import {
  Terminal,
  Send,
  CheckCircle2,
  Phone,
  AlertCircle,
  FileText,
  Image,
  MapPin,
  Code2,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { WhatsAppFormattingToolbar } from '../components/WhatsAppFormattingToolbar';
import { MediaUploadField } from '../components/MediaUploadField';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function PlaygroundPage({ templates }) {
  const [sessionId, setSessionId] = useState('wa_default');
  const [messageType, setMessageType] = useState('text'); // 'text' | 'media' | 'location'
  const [recipient, setRecipient] = useState('6281234567890');
  const [text, setText] = useState('Halo kak *Budi*! 👋\nIni pesan uji coba dari API server *WA Broadcast*. Silakan balas jika pesan ini sudah masuk.');
  
  // Media State
  const [mediaType, setMediaType] = useState('image');
  const [mediaUrl, setMediaUrl] = useState('');
  
  // Location State
  const [locName, setLocName] = useState('Kantor Pusat Operasional');
  const [locAddress, setLocAddress] = useState('Jl. Jenderal Sudirman Kav. 52, Jakarta');
  const [locLat, setLocLat] = useState(-6.225588);
  const [locLng, setLocLng] = useState(106.808591);

  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

  const textareaRef = useRef(null);

  const handleApplyTemplate = (tplId) => {
    const found = templates?.find((t) => t.id === tplId);
    if (!found) return;
    setText(found.content);
    if (found.messageType) setMessageType(found.messageType);
    if (found.mediaUrl) {
      setMediaUrl(found.mediaUrl);
      if (found.mediaType) setMediaType(found.mediaType);
    }
    if (found.location) {
      setLocName(found.location.name || '');
      setLocAddress(found.location.address || '');
      setLocLat(found.location.latitude || -6.225588);
      setLocLng(found.location.longitude || 106.808591);
    }
  };

  const handleSendTest = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      let requestPayload = {};
      let endpoint = '';

      if (messageType === 'text') {
        endpoint = 'POST /api/v1/messages/send-text';
        requestPayload = {
          sessionId: sessionId || 'wa_default',
          to: recipient.replace(/\D/g, ''),
          text: text,
          priority: 'high'
        };
      } else if (messageType === 'media') {
        endpoint = 'POST /api/v1/messages/send-media';
        requestPayload = {
          sessionId: sessionId || 'wa_default',
          to: recipient.replace(/\D/g, ''),
          mediaType: mediaType,
          mediaUrl: mediaUrl.startsWith('data:') ? undefined : mediaUrl,
          mediaBase64: mediaUrl.startsWith('data:') ? mediaUrl.split(',')[1] : undefined,
          caption: text,
          priority: 'high'
        };
      } else {
        endpoint = 'POST /api/v1/messages/send-location';
        requestPayload = {
          sessionId: sessionId || 'wa_default',
          to: recipient.replace(/\D/g, ''),
          latitude: parseFloat(locLat) || -6.225588,
          longitude: parseFloat(locLng) || 106.808591,
          name: locName,
          address: locAddress
        };
      }

      setApiResponse({
        endpoint,
        status: 200,
        data: {
          success: true,
          messageId: `wamid_${Date.now()}_simulated`,
          status: 'QUEUED_ENQUEUED',
          recipient: recipient.replace(/\D/g, ''),
          pacingDelay: 'Handled automatically by WA API Gateway',
          payloadEcho: requestPayload,
        },
        timestamp: new Date().toISOString()
      });
      setLoading(false);
    }, 450);
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h1 className="text-base font-bold text-slate-900 dark:text-white">API Playground & Simulator</h1>
          <Badge variant="outline" className="font-mono text-[10px]">Fastify Engine 3100</Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Uji coba langsung payload pesan sesuai skema Fastify WA API: Teks berformat WhatsApp, Media Gambar/Dokumen (Upload/URL), dan Titik Lokasi GPS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Form Simulator */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <form onSubmit={handleSendTest} className="space-y-3.5 text-xs">
            {/* Quick Template Selector */}
            {templates && templates.length > 0 && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">Muat dari template:</span>
                <select
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="h-7 px-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="">Pilih template pesan...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Session ID & Nomor Tujuan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Session ID WA API
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Misal: wa_cs_primary / default"
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nomor Tujuan WhatsApp (628xxx) *
                </label>
                <input
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Tipe Pesan WA API Selector */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Jenis Pesan (Sesuai Skema WA API)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'text', label: 'Teks Format', icon: FileText },
                  { id: 'media', label: 'Media File', icon: Image },
                  { id: 'location', label: 'Titik Lokasi', icon: MapPin },
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

            {/* Field Khusus Media */}
            {messageType === 'media' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                    Unggah Berkas Media ke Storage atau Isi URL
                  </span>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="h-7 px-2 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] text-slate-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="image">Gambar (image)</option>
                    <option value="document">Dokumen PDF (document)</option>
                    <option value="video">Video MP4 (video)</option>
                    <option value="audio">Audio / VN (audio)</option>
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

            {/* Field Khusus Lokasi */}
            {messageType === 'location' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>Parameter Koordinat Lokasi WhatsApp</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Tempat / Gedung"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Alamat Detail"
                    value={locAddress}
                    onChange={(e) => setLocAddress(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (-6.225)"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-zinc-200 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (106.808)"
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
                {messageType === 'media' ? 'Caption Pesan Media' : messageType === 'location' ? 'Catatan Tambahan Lokasi' : 'Isi Teks Pesan WhatsApp *'}
              </label>

              <WhatsAppFormattingToolbar
                value={text}
                onChange={setText}
                textareaRef={textareaRef}
                availableVariables={['name', 'kota', 'voucher']}
              />

              <textarea
                ref={textareaRef}
                rows={5}
                required={messageType === 'text'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full p-2.5 rounded-b-lg bg-slate-50 dark:bg-zinc-900 border border-t-0 border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-sans focus:outline-none focus:border-emerald-500 leading-relaxed"
                placeholder="Tulis pesan dengan format WhatsApp (*tebal*, _miring_, emoji 👋)..."
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="default"
              size="sm"
              className="w-full h-9 text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>{loading ? 'Mengirim ke Antrean WA API...' : 'Kirim Pesan Uji Coba'}</span>
            </Button>
          </form>
        </div>

        {/* Right Column: Live Chat Bubble & Response Echo */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-2 flex items-center justify-between">
              <span>Pratinjau Tampilan di WhatsApp</span>
              <Badge variant="secondary" className="text-[10px] font-mono">Live Render</Badge>
            </div>
            <WhatsAppBubblePreview
              senderName="Fastify Bot"
              text={text}
              mediaUrl={messageType === 'media' ? mediaUrl : null}
              time="Sekarang"
            />
          </div>

          <div className="bg-white dark:bg-[#0f1117] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800">
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Respon JSON Server Gateway</span>
              </span>
              {apiResponse && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  HTTP 200 OK
                </span>
              )}
            </div>

            <pre className="p-2.5 rounded-lg bg-slate-900 dark:bg-black text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56 leading-relaxed">
              {apiResponse
                ? JSON.stringify(apiResponse, null, 2)
                : '// Klik tombol "Kirim Pesan Uji Coba" untuk melihat respon nyata dari Fastify Gateway...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
