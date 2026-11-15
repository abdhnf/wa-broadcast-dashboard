import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, RefreshCw, MessageSquare, Image as ImageIcon, FileText, MapPin, Loader2, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { fetchInbox, fetchConversation } from '../lib/api';

/**
 * Inbox: pesan masuk dari pelanggan.
 *
 * Datanya datang lewat webhook `message.received` dari wa-api, bukan polling
 * ke gateway. Karena itu halaman ini hanya membaca database dashboard sendiri —
 * wa-api tidak perlu dihubungi saat halaman dibuka, dan inbox tetap bisa
 * dibaca walau gateway sedang mati.
 */
export function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [daftarSesi, setDaftarSesi] = useState([]);
  const [sesiTerpilih, setSesiTerpilih] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  const [aktif, setAktif] = useState(null);
  const [pesan, setPesan] = useState([]);
  const [memuatPesan, setMemuatPesan] = useState(false);

  const muat = useCallback(async (signal) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchInbox({ signal, limit: 100, sessionId: sesiTerpilih });
      setConversations(data.conversations);
      setDaftarSesi(data.sessions);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setErrorMsg(err?.message || 'Gagal memuat inbox.');
    } finally {
      setLoading(false);
    }
  }, [sesiTerpilih]);

  useEffect(() => {
    const ctrl = new AbortController();
    void muat(ctrl.signal);
    return () => ctrl.abort();
  }, [muat]);

  // Percakapan yang sedang dibuka ditutup saat sesi berganti: nomor yang sama
  // bisa punya riwayat berbeda di sesi yang berbeda, jadi melanjutkan tampilan
  // lama akan menampilkan pesan milik nomor lain.
  useEffect(() => {
    setAktif(null);
    setPesan([]);
  }, [sesiTerpilih]);

  const buka = async (conv) => {
    setAktif(conv);
    setMemuatPesan(true);
    setPesan([]);
    try {
      const data = await fetchConversation({ sessionId: conv.sessionId, phone: conv.phone });
      setPesan(data);
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal memuat percakapan.');
    } finally {
      setMemuatPesan(false);
    }
  };

  const ikonTipe = (tipe) => {
    if (tipe === 'image' || tipe === 'video') return <ImageIcon className="w-3.5 h-3.5" />;
    if (tipe === 'document') return <FileText className="w-3.5 h-3.5" />;
    if (tipe === 'location') return <MapPin className="w-3.5 h-3.5" />;
    return <MessageSquare className="w-3.5 h-3.5" />;
  };

  const tersaring = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.phone || '').includes(q) || (c.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Inbox className="w-5 h-5" /> Inbox
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Pesan masuk dari pelanggan, dikirim wa-api lewat webhook.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pemilih sesi: dengan beberapa nomor, percakapan semua nomor
              bercampur dan yang menanganinya bisa orang berbeda. */}
          <select
            value={sesiTerpilih}
            onChange={(e) => setSesiTerpilih(e.target.value)}
            className="h-9 px-2 rounded-md border border-line bg-surface text-sm max-w-[220px]"
            aria-label="Pilih sesi"
          >
            <option value="">Semua sesi</option>
            {daftarSesi.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => void muat()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-md border border-line bg-surface">
          <div className="p-2 border-b border-line">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor atau nama"
                className="w-full pl-8 pr-2 h-9 rounded-md border border-line bg-surface text-sm focus:outline-none focus:border-pine"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 flex items-center gap-2 text-sm text-ink-soft">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat…
              </div>
            ) : tersaring.length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-soft">
                {conversations.length === 0
                  ? 'Belum ada pesan masuk. Pastikan webhook sudah terdaftar di wa-api.'
                  : 'Tidak ada yang cocok dengan pencarian.'}
              </div>
            ) : (
              tersaring.map((c) => (
                <button
                  key={`${c.sessionId}:${c.phone}`}
                  onClick={() => void buka(c)}
                  className={`w-full text-left px-3 py-2.5 border-b border-line last:border-0 hover:bg-surface-sunken transition ${
                    aktif?.sessionId === c.sessionId && aktif?.phone === c.phone ? 'bg-surface-sunken' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{c.name || c.phone}</span>
                    <span className="text-[11px] text-ink-soft shrink-0">
                      {c.lastAt ? new Date(c.lastAt).toLocaleDateString('id-ID') : ''}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft truncate mt-0.5">
                    {c.lastText || `[${c.lastType}]`}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-md border border-line bg-surface min-h-[300px] flex flex-col">
          {!aktif ? (
            <div className="flex-1 flex items-center justify-center text-sm text-ink-soft p-8 text-center">
              Pilih percakapan di sebelah kiri untuk membaca riwayatnya.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{aktif.name || aktif.phone}</p>
                  <p className="text-[11px] text-ink-soft">
                    {aktif.phone} · sesi <code>{aktif.sessionId}</code>
                  </p>
                </div>
                <Badge variant="neutral">{pesan.length} pesan</Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[60vh]">
                {memuatPesan ? (
                  <div className="flex items-center gap-2 text-sm text-ink-soft">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat…
                  </div>
                ) : pesan.length === 0 ? (
                  <p className="text-sm text-ink-soft">Tidak ada pesan pada percakapan ini.</p>
                ) : (
                  pesan.map((m) => (
                    <div key={m.id} className="flex">
                      <div className="max-w-[80%] rounded-lg bg-surface-sunken px-3 py-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-soft mb-0.5">
                          {ikonTipe(m.type)}
                          <span>{m.type}</span>
                          <span>·</span>
                          <span>{m.at ? new Date(m.at).toLocaleString('id-ID') : ''}</span>
                        </div>
                        {m.text && <p className="text-sm whitespace-pre-wrap">{m.text}</p>}
                        {m.caption && <p className="text-sm whitespace-pre-wrap">{m.caption}</p>}
                        {!m.text && !m.caption && (
                          <p className="text-sm text-ink-soft italic">
                            [{m.type}{m.mime ? ` · ${m.mime}` : ''}]
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
