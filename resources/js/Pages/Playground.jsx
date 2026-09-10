import React, { useState } from 'react';
import { Terminal, Send, CheckCircle2, Phone, AlertCircle, Sparkles, Code2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { WhatsAppBubblePreview } from '../components/WhatsAppBubblePreview';

export function PlaygroundPage({ sessions, templates }) {
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id || '');
  const [recipientPhone, setRecipientPhone] = useState('628123456789');
  const [messageText, setMessageText] = useState('Halo kak, ini adalah pesan uji coba dari Fastify WA API Gateway! 🔥');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Playground Tester</h1>
            <Badge variant="outline" className="font-mono text-[10px]">Direct Fastify Endpoint</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kirim pesan uji coba ke nomor Anda secara instan untuk memeriksa keterbacaan format dan respon API gateway.
          </p>
        </div>
      </div>

      {/* 2-Column Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Tester (7 cols) */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Form Kirim Pesan Uji Coba</CardTitle>
            <CardDescription>Target pesan individual tanpa antrean broadcast massal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Pilih Sesi Pengirim</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) - Risk Score: {s.riskScore}/100
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Nomor Tujuan WhatsApp</label>
                <input
                  type="text"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="628123456789"
                  className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Isi Pesan Uji Coba</label>
                <textarea
                  rows={4}
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none font-sans"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">URL Gambar (Opsional)</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/banner.png"
                  className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <Button type="submit" disabled={isSending} variant="default" size="sm" className="w-full">
                <Send className="w-3.5 h-3.5 mr-1 text-zinc-950" />
                <span className="text-zinc-950 font-semibold">
                  {isSending ? 'Mengirim...' : 'Kirim Pesan Sekarang'}
                </span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview and JSON Response (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 bg-zinc-950 border-zinc-800 flex items-center justify-center min-h-[220px]">
            <WhatsAppBubblePreview
              content={messageText}
              mediaUrl={mediaUrl}
              sampleData={{ name: 'Tester', phone: recipientPhone }}
            />
          </Card>

          {/* Real-time Response Box */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-mono flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>API Response Telemetry</span>
                </CardTitle>
                {apiResponse && (
                  <Badge variant="success" className="text-[9px] font-mono">
                    HTTP {apiResponse.status} {apiResponse.statusText}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {apiResponse ? (
                <pre className="p-3 rounded-md bg-zinc-950 border border-zinc-800/80 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                  {JSON.stringify(apiResponse.payload, null, 2)}
                </pre>
              ) : (
                <div className="p-6 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-md">
                  Tekan tombol &quot;Kirim Pesan Sekarang&quot; untuk melihat telemetri gateway
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
