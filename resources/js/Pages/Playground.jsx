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
  Sparkles,
  Smartphone,
  RefreshCw,
  RotateCcw,
  Clock,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { WhatsAppFormattingToolbar } from '../components/WhatsAppFormattingToolbar';
import { MediaUploadField } from '../components/MediaUploadField';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';
import { ContactSearchInput } from '../components/ContactSearchInput';
import { ApiError, sendLocation, sendMedia, sendText } from '../lib/api';
import { renderMessage } from '../lib/utils';
import { PHONE_ERROR_MESSAGE, isValidPhone, normalizePhone } from '../lib/phone';

export function PlaygroundPage({ sessions, templates, contacts = [] }) {
  // Session Selector: mendukung auto-rotate atau pilih sesi nomor spesifik seperti di wa-api
  const [selectedSessionId, setSelectedSessionId] = useState('auto_rotate');
  const [messageType, setMessageType] = useState('text'); // 'text' | 'media' | 'location'
  // Nomor tujuan sengaja dikosongkan: jangan pernah mengirim ke kontak contoh
  // hanya karena user menekan Kirim tanpa mengisi nomor.
  const [recipient, setRecipient] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [text, setText] = useState('Halo kak *{{name}}*! 👋\nIni pesan uji coba dari API server *WA Broadcast*. Silakan balas jika pesan ini sudah masuk.');
  
  // Media State
  const [mediaType, setMediaType] = useState('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [priority, setPriority] = useState('normal'); // 'normal' | 'high'
  
  // Location State
  const [locName, setLocName] = useState('Kantor Pusat Operasional');
  const [locAddress, setLocAddress] = useState('Jl. Jenderal Sudirman Kav. 52, Jakarta');
  const [locLat, setLocLat] = useState(-6.225588);
  const [locLng, setLocLng] = useState(106.808591);

  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

  const textareaRef = useRef(null);

  // Kontak aktif: diambil dari kontak yang dipilih via autocomplete atau yang cocok nomornya
  const activeContact = selectedContact || contacts.find((c) => c.phone === recipient) || null;

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

  const handleResetForm = () => {
    setText('Halo kak *{{name}}*! 👋\nIni pesan uji coba dari API server *WA Broadcast*. Silakan balas jika pesan ini sudah masuk.');
    setRecipient('');
    setSelectedContact(null);
    setMessageType('text');
    setMediaUrl('');
    setMediaType('image');
    setPriority('normal');
    setLocName('');
    setLocAddress('');
    setLocLat(-6.225588);
    setLocLng(106.808591);
    setApiResponse(null);
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    setApiResponse(null);

    // 'auto_rotate' dipetakan ke 'auto' — wa-api yang memilih sesi sehat dari pool user.
    const activeSession = selectedSessionId === 'auto_rotate' ? 'auto' : selectedSessionId;
    const target = normalizePhone(recipient);

    if (!target) {
      setApiResponse({
        endpoint: 'validasi klien',
        status: 400,
        error: 'Nomor tujuan wajib diisi sebelum mengirim pesan uji.',
        data: null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!isValidPhone(target)) {
      setApiResponse({
        endpoint: 'validasi klien',
        status: 400,
        error: PHONE_ERROR_MESSAGE,
        data: null,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    setLoading(true);

    try {
      let result;
      let endpoint;

      // Interpolasi variabel pesan dan spintax sebelum dikirim ke WA API gateway
      const outgoingText = renderMessage(text, {
        name: activeContact?.name || recipient,
        nama: activeContact?.name || recipient,
        phone: target,
        ...(activeContact?.custom || {}),
      });

      if (messageType === 'text') {
        endpoint = 'POST /api/v1/messages/send';
        result = await sendText({ sessionId: activeSession, to: target, text: outgoingText, priority });
      } else if (messageType === 'media') {
        endpoint = 'POST /api/v1/messages/send-media';
        if (!mediaUrl) throw new ApiError('Berkas media belum diunggah atau URL media masih kosong.', 400);
        const isDataUrl = mediaUrl.startsWith('data:');
        result = await sendMedia({
          sessionId: activeSession,
          to: target,
          mediaType,
          mediaUrl: isDataUrl ? undefined : mediaUrl,
          mediaBase64: isDataUrl ? mediaUrl.split(',')[1] : undefined,
          mediaMimeType: isDataUrl ? mediaUrl.slice(5, mediaUrl.indexOf(';')) : undefined,
          caption: outgoingText || undefined,
          priority,
        });
      } else {
        endpoint = 'POST /api/v1/messages/send-location';
        result = await sendLocation({
          sessionId: activeSession,
          to: target,
          latitude: parseFloat(locLat) || -6.225588,
          longitude: parseFloat(locLng) || 106.808591,
          name: locName,
          address: locAddress,
          priority,
        });
      }

      setApiResponse({
        endpoint,
        status: 202,
        data: {
          ...result,
          sessionUsed: result?.sessionUsed || activeSession,
          isAutoRotated: selectedSessionId === 'auto_rotate',
          recipient: target,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setApiResponse({
        endpoint: messageType === 'text'
          ? 'POST /api/v1/messages/send'
          : messageType === 'media'
            ? 'POST /api/v1/messages/send-media'
            : 'POST /api/v1/messages/send-location',
        status: err?.status || 0,
        error: err?.message || 'Permintaan gagal.',
        data: err?.payload || null,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
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
            {/* Quick Template Selector & Reset */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">Template:</span>
                {templates && templates.length > 0 ? (
                  <select
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="h-7 px-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="">Pilih template pesan...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] text-slate-400">Belum ada template</span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetForm}
                className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-zinc-200"
                title="Reset seluruh isian form pesan"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                <span>Reset Form</span>
              </Button>
            </div>

            {/* Pilihan Sesi WhatsApp (Sama dengan Playground WA API: Bisa Auto Rotate atau Pilih Nomor Spesifik) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Pilih Nomor Pengirim (WA API Session)
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="auto_rotate">Auto Rotate (Round-Robin Sesi Online)</option>
                  {sessions?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (+{s.phone}) - {s.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nomor Tujuan WhatsApp (628xxx) *
                </label>
                <ContactSearchInput
                  contacts={contacts}
                  value={recipient}
                  onChange={(val) => {
                    setRecipient(val);
                    if (selectedContact && selectedContact.phone !== val) {
                      setSelectedContact(null);
                    }
                  }}
                  onSelectContact={(c) => {
                    setRecipient(c.phone);
                    setSelectedContact(c);
                  }}
                  placeholder="Ketik nomor atau cari nama kontak..."
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
                contacts={contacts}
                activeContact={activeContact}
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

            {/* Prioritas Pengiriman (Queue Priority) */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Prioritas Antrean (Priority)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-left transition ${
                    priority === 'normal'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/60 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className={`p-1 rounded shrink-0 ${priority === 'normal' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500'}`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold">Normal</div>
                    <div className="text-[9px] text-slate-400 dark:text-zinc-400 leading-tight">Antrean santai anti-ban</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-left transition ${
                    priority === 'high'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/60 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/30'
                      : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className={`p-1 rounded shrink-0 ${priority === 'high' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500'}`}>
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold">Prioritas (High)</div>
                    <div className="text-[9px] text-slate-400 dark:text-zinc-400 leading-tight">Salip antrean utama</div>
                  </div>
                </button>
              </div>
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
              senderName={selectedSessionId === 'auto_rotate' ? 'Auto Rotate Pool' : 'Fastify Bot'}
              content={text}
              mediaUrl={messageType === 'media' ? mediaUrl : null}
              mediaType={mediaType}
              location={messageType === 'location' ? { name: locName, address: locAddress, latitude: locLat, longitude: locLng } : null}
              contact={activeContact || { name: 'Budi Santoso', phone: recipient || '62812345678' }}
              sampleData={activeContact ? { name: activeContact.name, phone: activeContact.phone, ...(activeContact.custom || {}) } : { name: 'Budi Santoso', kota: 'Jakarta', tier: 'Gold' }}
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
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  apiResponse.error
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                }`}>
                  HTTP {apiResponse.status || '-'} {apiResponse.error ? 'ERROR' : 'OK'}
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
