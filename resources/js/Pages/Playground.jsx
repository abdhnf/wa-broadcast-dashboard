import React, { useState } from 'react';
import { Terminal, Send, CheckCircle2, Phone, AlertCircle, Sparkles, Code2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function PlaygroundPage({ sessions, templates }) {
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id || '');
  const [recipientPhone, setRecipientPhone] = useState('628123456789');
  const [messageText, setMessageText] = useState('Halo kak, ini adalah pesan uji coba langsung dari WA API Gateway! 🔥');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

  const handleSendTest = (e) => {
    e.preventDefault();
    setIsSending(true);

    setTimeout(() => {
      setApiResponse({
        status: 202,
        statusText: 'Accepted',
        payload: {
          success: true,
          messageId: `wamsg_${Date.now()}`,
          queuePosition: 1,
          estimatedDispatch: '0.04s',
          pacingJitter: '3.42s',
          sender: sessions.find((s) => s.id === selectedSessionId)?.phone || '628120000001',
          recipient: recipientPhone,
          timestamp: new Date().toISOString(),
        },
      });
      setIsSending(false);
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Playground & Live API Tester
            </h1>
            <Badge variant="outline" className="font-mono text-[10px]">Direct Fastify Endpoint</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Uji kirim pesan instan ke nomor WhatsApp Anda tanpa antrean massal untuk memeriksa layout dan latensi.
          </p>
        </div>
      </div>

      {/* Grid 2 Kolom: Form Input & WhatsApp Bubble + API Response */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Tester (7 cols) */}
        <div className="lg:col-span-7 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-950 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Form Pengujian Pesan</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Parameter pesan tunggal dikirim ke endpoint /api/v1/messages/send</p>
          </div>

          <form onSubmit={handleSendTest} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Pilih Sesi Pengirim</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone}) - Risk Score: {s.riskScore}/100
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Nomor WhatsApp Tujuan</label>
              <input
                type="text"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="628123456789"
                className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">Isi Pesan Uji Coba</label>
              <textarea
                rows={4}
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none font-sans"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">URL Media Gambar (Opsional)</label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/banner.png"
                className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <Button type="submit" disabled={isSending} variant="default" size="sm" className="w-full">
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>{isSending ? 'Mengirim...' : 'Kirim Pesan Uji Coba'}</span>
            </Button>
          </form>
        </div>

        {/* Live Preview and Response (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-950 flex items-center justify-center min-h-[220px]">
            <WhatsAppBubblePreview
              content={messageText}
              mediaUrl={mediaUrl}
              sampleData={{ name: 'Tester', phone: recipientPhone }}
            />
          </div>

          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-semibold flex items-center gap-1.5 text-slate-900 dark:text-white">
                <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>API Gateway Response</span>
              </div>
              {apiResponse && (
                <Badge variant="success" className="text-[9px] font-mono">
                  HTTP {apiResponse.status} {apiResponse.statusText}
                </Badge>
              )}
            </div>

            {apiResponse ? (
              <pre className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 overflow-x-auto leading-relaxed">
                {JSON.stringify(apiResponse.payload, null, 2)}
              </pre>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs font-mono border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
                Klik tombol kirim di samping untuk melihat respon JSON gateway
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
