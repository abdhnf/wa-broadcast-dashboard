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
      <div className="bg-surface  p-4 rounded-lg border border-line border-line ">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-deep" />
          <h1 className="text-base font-bold text-ink dark:text-white">API Playground & Simulator</h1>
          <Badge variant="outline" className="font-mono text-[10px]">Fastify Engine 3100</Badge>
        </div>
        <p className="text-xs text-ink-muted text-ink-muted mt-1">
          Uji coba langsung payload pesan sesuai skema Fastify WA API: Teks berformat WhatsApp, Media Gambar/Dokumen (Upload/URL), dan Titik Lokasi GPS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Form Simulator */}
        <div className="lg:col-span-7 bg-surface  p-4 rounded-lg border border-line border-line ">
          <form onSubmit={handleSendTest} className="space-y-3.5 text-xs">
            {/* Quick Template Selector & Reset */}
            <div className="flex items-center justify-between pb-2 border-b border-line border-line">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-muted text-ink-muted">Template:</span>
                {templates && templates.length > 0 ? (
                  <select
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="h-7 px-2 rounded bg-shell bg-surface border border-line border-line text-[11px] text-ink-soft text-ink-soft focus:outline-none"
                  >
                    <option value="">Pilih template pesan...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] text-ink-faint">Belum ada template</span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetForm}
                className="h-7 px-2 text-[11px] text-ink-muted hover:text-ink dark:hover:text-ink-soft"
                title="Reset seluruh isian form pesan"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                <span>Reset Form</span>
              </Button>
            </div>

            {/* Pilihan Sesi WhatsApp (Sama dengan Playground WA API: Bisa Auto Rotate atau Pilih Nomor Spesifik) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
                  Pilih Nomor Pengirim (WA API Session)
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-shell bg-surface border border-line border-line text-xs text-ink text-ink-soft focus:outline-none focus:border-brand"
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
                <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
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
              <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1.5">
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
                          ? 'border-brand bg-brand-wash text-brand-deep font-semibold'
                          : 'border-line border-line bg-shell bg-surface text-ink-soft text-ink-muted hover:bg-surface-sunken hover:bg-surface-alt'
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
              <div className="p-3 rounded-lg bg-shell bg-surface border border-line border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-ink-soft text-ink-soft">
                    Unggah Berkas Media ke Storage atau Isi URL
                  </span>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="h-7 px-2 rounded bg-surface bg-surface-alt border border-line border-line text-[11px] text-ink text-ink-soft focus:outline-none"
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
              <div className="p-3 rounded-lg bg-shell bg-surface border border-line border-line space-y-2">
                <div className="text-[11px] font-medium text-ink-soft text-ink-soft flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>Parameter Koordinat Lokasi WhatsApp</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Tempat / Gedung"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-surface bg-surface-alt border border-line border-line text-xs text-ink text-ink-soft focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Alamat Detail"
                    value={locAddress}
                    onChange={(e) => setLocAddress(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-surface bg-surface-alt border border-line border-line text-xs text-ink text-ink-soft focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (-6.225)"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-surface bg-surface-alt border border-line border-line text-xs font-mono text-ink text-ink-soft focus:outline-none"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (106.808)"
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-surface bg-surface-alt border border-line border-line text-xs font-mono text-ink text-ink-soft focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* WhatsApp Text Editor dengan Formatting & Emoji Toolbar */}
            <div>
              <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1">
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
                className="w-full p-2.5 rounded-b-lg bg-shell bg-surface border border-t-0 border-line border-line text-xs text-ink text-ink-soft font-sans focus:outline-none focus:border-brand leading-relaxed"
                placeholder="Tulis pesan dengan format WhatsApp (*tebal*, _miring_, emoji 👋)..."
              />
            </div>

            {/* Prioritas Pengiriman (Queue Priority) */}
            <div>
              <label className="block text-[11px] font-medium text-ink-soft text-ink-soft mb-1.5">
                Prioritas Antrean (Priority)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-left transition ${
                    priority === 'normal'
                      ? 'bg-brand-wash  border-brand text-brand-deep ring-1 ring-brand/30'
                      : 'bg-shell bg-surface border-line border-line text-ink-soft text-ink-muted hover:border-line-strong hover:border-line-strong'
                  }`}
                >
                  <div className={`p-1 rounded shrink-0 ${priority === 'normal' ? 'bg-brand-wash text-brand-deep' : 'bg-line bg-surface-alt text-ink-muted'}`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold">Normal</div>
                    <div className="text-[9px] text-ink-faint text-ink-muted leading-tight">Antrean santai anti-ban</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-left transition ${
                    priority === 'high'
                      ? 'bg-honey-wash dark:bg-amber-950/30 border-amber-500/60 text-amber-800 text-honey ring-1 ring-amber-500/30'
                      : 'bg-shell bg-surface border-line border-line text-ink-soft text-ink-muted hover:border-line-strong hover:border-line-strong'
                  }`}
                >
                  <div className={`p-1 rounded shrink-0 ${priority === 'high' ? 'bg-amber-500/20 text-honey text-honey' : 'bg-line bg-surface-alt text-ink-muted'}`}>
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold">Prioritas (High)</div>
                    <div className="text-[9px] text-ink-faint text-ink-muted leading-tight">Salip antrean utama</div>
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
          <div className="bg-surface  p-4 rounded-lg border border-line border-line ">
            <div className="text-[11px] font-semibold text-ink-soft text-ink-soft mb-2 flex items-center justify-between">
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

          <div className="bg-surface  p-4 rounded-lg border border-line border-line ">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line border-line">
              <span className="text-[11px] font-mono text-ink-muted text-ink-muted flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-brand" />
                <span>Respon JSON Server Gateway</span>
              </span>
              {apiResponse && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  apiResponse.error
                    ? 'text-clay text-clay bg-clay-wash  border-clay-line border-clay-line'
                    : 'text-brand-deep bg-brand-wash  border-brand-line '
                }`}>
                  HTTP {apiResponse.status || '-'} {apiResponse.error ? 'ERROR' : 'OK'}
                </span>
              )}
            </div>

            <pre className="p-2.5 rounded-lg bg-ink text-[11px] font-mono text-brand-soft overflow-x-auto max-h-56 leading-relaxed">
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
