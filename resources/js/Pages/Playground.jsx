import React, { useState } from 'react';
import { Terminal, Send, CheckCircle2, Phone, AlertCircle, Sparkles, Code2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function PlaygroundPage({ sessions, templates }) {
  const [recipientPhone, setRecipientPhone] = useState('6281234567891');
  const [selectedSession, setSelectedSession] = useState(sessions[0]?.id || '');
  const [messageText, setMessageText] = useState('Halo kak *Budi Santoso*,\n\nIni adalah pesan uji coba dari *WA Broadcast Sandbox*.\nSistem siap mengirimkan pesan ke antrean server.');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [responseLog, setResponseLog] = useState(null);

  const handleSendTest = (e) => {
    e.preventDefault();
    setIsSending(true);

    setTimeout(() => {
      const mockRes = {
        success: true,
        messageId: `msg_${Date.now().toString(36)}`,
        status: 'queued',
        sessionId: selectedSession,
        to: recipientPhone,
        pacingStrategy: 'gaussian_jitter',
        delayEstimate: '3.4s',
        timestamp: new Date().toISOString()
      };
      setResponseLog(mockRes);
      setIsSending(false);
    }, 600);
  };

  const handleApplyTemplate = (tplId) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setMessageText(tpl.content);
      setMediaUrl(tpl.mediaUrl || '');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Playground Message Tester</h1>
          <p className="text-xs text-slate-400">
            Kirim pesan uji coba ke 1 nomor tujuan untuk memvalidasi format teks dan lampiran media sebelum blast massal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Pengiriman (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <form onSubmit={handleSendTest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Nomor Pengirim (Sesi)</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {sessions.filter(s => s.status === 'connected').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (+{s.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Nomor Penerima Uji Coba</label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="6281234567890"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Quick Template Picker */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400">Gunakan Template:</span>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleApplyTemplate(t.id)}
                    className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition cursor-pointer"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">URL Gambar (Opsional)</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/... atau kosongkan"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Isi Pesan Teks</label>
              <textarea
                rows={6}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pesan dikirim langsung via API</span>
              </div>
              <Button type="submit" variant="primary" disabled={isSending}>
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Mengirim...' : 'Kirim Pesan Uji Coba'}</span>
              </Button>
            </div>
          </form>

          {/* Response JSON Inspector */}
          {responseLog && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  HTTP 202 Accepted &bull; In Queue
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{responseLog.timestamp}</span>
              </div>
              <pre className="p-3 rounded-xl bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800/80">
                {JSON.stringify(responseLog, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Live WA Bubble Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block self-start px-1">
            Pratinjau Layar Penerima
          </span>
          <WhatsAppBubblePreview
            content={messageText}
            mediaUrl={mediaUrl}
            sampleName="Nomor Tujuan"
          />
        </div>
      </div>
    </div>
  );
}
