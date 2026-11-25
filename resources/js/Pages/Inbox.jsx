import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Inbox,
  RefreshCw,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  MapPin,
  Loader2,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Ban,
  Film,
  Music,
  Info,
  Send,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { WhatsAppFormattingToolbar } from '../components/WhatsAppFormattingToolbar';
import { fetchInbox, fetchConversation, sendText } from '../lib/api';
import { formatWhatsAppMarkdown } from '../lib/whatsappText';
import { SUCCESS_STATUSES, statusLabel } from '../lib/messageStatus';
import doodleBg from '../assets/wa-chat-doodle.png';

/**
 * Inbox: percakapan dua arah, satu alur seperti aplikasi chat.
 *
 * Pesan masuk dibaca dari database dashboard sendiri (teksnya sudah disamarkan
 * dari token OTP). Pesan keluar dibaca wa-api saat percakapan dibuka, karena
 * saat dikirim browser memanggil wa-api langsung dan dashboard tidak pernah
 * melihat isinya.
 *
 * Balasan dikirim dari sini lewat jalur yang sama dengan Playground
 * (`POST /messages/send`), lalu riwayat dimuat ulang supaya status yang tampil
 * adalah status asli dari gateway — bukan tebakan lokal.
 */

const GAGAL = ['failed', 'invalid_number', 'not_registered'];

const STATUS_SESI = {
  connected: 'Terhubung',
  connecting: 'Menghubungkan',
  disconnected: 'Terputus',
};

const WARNA_SESI = {
  connected: 'bg-leaf',
  connecting: 'bg-honey',
  disconnected: 'bg-clay',
};

function labelStatusSesi(status) {
  return STATUS_SESI[status] || status || 'Tidak diketahui';
}

/** Ikon centang status pesan keluar. */
function TandaStatus({ status }) {
  if (!status) return null;

  const label = statusLabel(status);
  const dasar = 'w-3.5 h-3.5 shrink-0';

  if (status === 'read') {
    return <CheckCheck className={`${dasar} text-[#53bdeb]`} aria-label={label} title={label} />;
  }
  if (status === 'sent') {
    return <Check className={dasar} aria-label={label} title={label} />;
  }
  if (SUCCESS_STATUSES.includes(status)) {
    return <CheckCheck className={dasar} aria-label={label} title={label} />;
  }
  if (GAGAL.includes(status)) {
    return <AlertCircle className={`${dasar} text-rose-500`} aria-label={label} title={label} />;
  }
  if (status === 'cancelled') {
    return <Ban className={dasar} aria-label={label} title={label} />;
  }

  return <Clock className={dasar} aria-label={label} title={label} />;
}

/** Jam pesan (HH:MM) sesuai zona waktu browser. */
function jam(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/** Waktu ringkas untuk daftar: jam untuk hari ini, tanggal untuk sebelumnya. */
function waktuSingkat(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  if (d.toDateString() === now.toDateString()) return jam(iso);

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** "Hari ini", "Kemarin", atau tanggal panjang — pemisah hari di riwayat. */
function labelHari(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const hari = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const selisih = Math.round((hari(new Date()) - hari(d)) / 86_400_000);

  if (selisih === 0) return 'Hari ini';
  if (selisih === 1) return 'Kemarin';

  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function inisial(nama) {
  return String(nama || '?').trim().charAt(0).toUpperCase() || '?';
}

/**
 * Lampiran pesan: gambar, dokumen, audio, video, atau lokasi.
 *
 * Pesan masuk tidak menyimpan berkasnya (webhook hanya mengirim teks dan
 * metadata), jadi yang tampil untuk pesan masuk adalah kartu keterangan.
 */
function Lampiran({ pesan: m }) {
  const [gagalGambar, setGagalGambar] = useState(false);
  const tipe = String(m.type || '').toLowerCase();

  if (m.location) {
    return (
      <div className="mb-1 rounded-md border border-black/10 bg-white/80 p-2 text-[11px] text-slate-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
          <MapPin className="w-3.5 h-3.5" />
          <span>Lokasi</span>
        </div>
        {m.location.name && <p className="mt-0.5 truncate font-medium">{m.location.name}</p>}
        {m.location.address && <p className="truncate opacity-80">{m.location.address}</p>}
        {m.location.latitude && (
          <p className="font-mono opacity-70">
            {m.location.latitude}, {m.location.longitude}
          </p>
        )}
      </div>
    );
  }

  if (m.mediaUrl && (tipe === 'image' || tipe === '') && !gagalGambar) {
    return (
      <img
        src={m.mediaUrl}
        alt="Lampiran gambar"
        loading="lazy"
        className="mb-1 max-h-52 w-full rounded-md border border-black/10 object-cover"
        onError={() => setGagalGambar(true)}
      />
    );
  }

  if (!['image', 'video', 'document', 'audio'].includes(tipe)) return null;

  const Ikon = tipe === 'image' ? ImageIcon : tipe === 'video' ? Film : tipe === 'audio' ? Music : FileText;
  const label = m.fileName || m.mime || `Lampiran ${tipe}`;

  return (
    <div className="mb-1 flex items-center gap-2 rounded-md border border-black/10 bg-white/70 p-2 dark:border-zinc-700 dark:bg-zinc-900/70">
      <Ikon className="w-5 h-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium">{label}</p>
        <p className="text-[10px] opacity-70">{tipe}</p>
      </div>
    </div>
  );
}

/** Satu gelembung pesan, dua arah. */
function Gelembung({ pesan: m }) {
  const keluar = m.direction === 'out';
  const adaTeks = Boolean(m.text);
  const adaCaption = Boolean(m.caption);

  const kelasGelembung = keluar
    ? 'bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] rounded-tr-none'
    : 'bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef] rounded-tl-none';

  const kelasEkor = keluar
    ? '-right-2 border-r-[9px] border-r-transparent border-t-[9px] border-t-[#d9fdd3] dark:border-t-[#005c4b]'
    : '-left-2 border-l-[9px] border-l-transparent border-t-[9px] border-t-white dark:border-t-[#202c33]';

  return (
    <li className={`flex ${keluar ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13px] leading-relaxed shadow-sm sm:max-w-[72%] ${kelasGelembung}`}
      >
        <span aria-hidden="true" className={`absolute top-0 h-0 w-0 ${kelasEkor}`} />

        <Lampiran pesan={m} />

        {adaTeks && (
          <div
            className="whitespace-pre-wrap break-words pr-1"
            dangerouslySetInnerHTML={{ __html: formatWhatsAppMarkdown(m.text) }}
          />
        )}

        {adaCaption && (
          <div
            className="whitespace-pre-wrap break-words pr-1"
            dangerouslySetInnerHTML={{ __html: formatWhatsAppMarkdown(m.caption) }}
          />
        )}

        {!adaTeks && !adaCaption && !m.mediaUrl && !m.location && (
          <span className="italic opacity-70">[{m.type || 'pesan'}]</span>
        )}

        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#667781] dark:text-[#8696a0]">
          {m.batchId && (
            <span className="mr-auto rounded bg-black/5 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide dark:bg-white/10">
              Kampanye
            </span>
          )}
          <span>{jam(m.at)}</span>
          {keluar && <TandaStatus status={m.status} />}
        </div>
      </div>
    </li>
  );
}

export function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [daftarSesi, setDaftarSesi] = useState([]);
  const [sesiTerpilih, setSesiTerpilih] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [outboundTersedia, setOutboundTersedia] = useState(true);
  const [outboundAktif, setOutboundAktif] = useState(true);

  const [aktif, setAktif] = useState(null);
  const [pesan, setPesan] = useState([]);
  const [memuatPesan, setMemuatPesan] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [terpotong, setTerpotong] = useState(false);

  const [balasan, setBalasan] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [errorKirim, setErrorKirim] = useState('');
  const [peringatanKirim, setPeringatanKirim] = useState('');

  const areaPesanRef = useRef(null);
  const textareaRef = useRef(null);

  /**
   * Muat daftar percakapan.
   *
   * `senyap` dipakai setelah mengirim balasan: daftar perlu ikut diperbarui
   * supaya baris percakapan menunjukkan teks terbaru dan naik ke atas, tetapi
   * tanpa mengedipkan indikator muat di seluruh daftar.
   */
  const muat = useCallback(
    async (signal, { senyap = false } = {}) => {
      if (!senyap) setLoading(true);
      setErrorMsg('');
      try {
        const data = await fetchInbox({ signal, limit: 100, sessionId: sesiTerpilih });
        setConversations(data.conversations);
        setDaftarSesi(data.sessions);
        setOutboundTersedia(data.outboundAvailable);
        setOutboundAktif(data.outboundEnabled);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        if (!senyap) setErrorMsg(err?.message || 'Gagal memuat inbox.');
      } finally {
        if (!senyap) setLoading(false);
      }
    },
    [sesiTerpilih],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void muat(ctrl.signal);
    return () => ctrl.abort();
  }, [muat]);

  // Percakapan yang sedang dibuka ditutup saat sesi berganti: nomor yang sama
  // bisa punya riwayat berbeda di sesi yang berbeda.
  useEffect(() => {
    setAktif(null);
    setPesan([]);
    setDegraded(false);
    setTerpotong(false);
    setBalasan('');
    setErrorKirim('');
    setPeringatanKirim('');
  }, [sesiTerpilih]);

  const buka = useCallback(async (percakapan) => {
    setAktif(percakapan);
    setMemuatPesan(true);
    setPesan([]);
    setDegraded(false);
    setTerpotong(false);
    setErrorKirim('');
    setPeringatanKirim('');
    setErrorMsg('');

    try {
      const data = await fetchConversation({
        sessionId: percakapan.sessionId,
        phone: percakapan.phone,
      });
      setPesan(data.messages);
      setDegraded(data.degraded);
      setTerpotong(data.truncated);
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal memuat percakapan.');
    } finally {
      setMemuatPesan(false);
    }
  }, []);

  // Selalu mendarat di pesan terbaru, seperti aplikasi chat.
  useEffect(() => {
    const area = areaPesanRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [pesan, memuatPesan, aktif]);

  // Peta sesi untuk nama, status, dan keputusan boleh-balas.
  const sesiMeta = useMemo(() => {
    const peta = {};
    for (const s of daftarSesi) {
      if (s?.id) peta[s.id] = s;
    }
    return peta;
  }, [daftarSesi]);

  const metaAktif = aktif ? sesiMeta[aktif.sessionId] ?? null : null;
  const sesiTerhubung = !metaAktif?.status || metaAktif.status === 'connected';

  const tersaring = useMemo(() => {
    const kata = search.trim().toLowerCase();
    if (!kata) return conversations;

    return conversations.filter(
      (c) =>
        String(c.phone || '').includes(kata) ||
        String(c.name || '').toLowerCase().includes(kata) ||
        String(c.lastText || '').toLowerCase().includes(kata),
    );
  }, [conversations, search]);

  // Pemisah hari dihitung sekali per daftar pesan, bukan di setiap render.
  const barisPesan = useMemo(() => {
    const hasil = [];
    let hariTerakhir = '';

    for (const m of pesan) {
      const kunciHari = m.at ? new Date(m.at).toDateString() : '';
      if (kunciHari && kunciHari !== hariTerakhir) {
        hasil.push({ jenis: 'hari', kunci: `hari-${kunciHari}`, label: labelHari(m.at) });
        hariTerakhir = kunciHari;
      }
      hasil.push({ jenis: 'pesan', kunci: m.id, pesan: m });
    }

    return hasil;
  }, [pesan]);

  const kirim = useCallback(async () => {
    const teks = balasan.trim();
    if (!teks || !aktif || mengirim) return;

    if (!sesiTerhubung) {
      setErrorKirim('Sesi ini tidak terhubung. Sambungkan nomornya di panel wa-api terlebih dahulu.');
      return;
    }

    setMengirim(true);
    setErrorKirim('');
    setPeringatanKirim('');

    try {
      const terkirim = await sendText({ sessionId: aktif.sessionId, to: aktif.phone, text: teks });
      setBalasan('');

      // Gelembung sementara supaya pesan langsung terlihat, bukan menunggu
      // jaringan. Id-nya memakai id asli dari gateway (`out:<messageId>`),
      // jadi saat riwayat dimuat ulang React mengenali baris yang sama dan
      // tidak berkedip.
      setPesan((sebelumnya) => [
        ...sebelumnya,
        {
          id: `out:${terkirim?.messageId ?? `lokal-${Date.now()}`}`,
          direction: 'out',
          type: 'text',
          text: teks,
          caption: null,
          mime: null,
          mediaUrl: null,
          fileName: null,
          location: null,
          at: new Date().toISOString(),
          status: terkirim?.status ?? 'queued',
          error: null,
          batchId: null,
        },
      ]);

      // Dua hal dimuat ulang: utas (status asli gateway) dan daftar percakapan.
      // Daftar sebelumnya tidak ikut diperbarui, sehingga balasan sudah ada di
      // utas tetapi baris percakapan di kiri masih menampilkan pesan lama —
      // dan percakapannya tidak naik ke atas.
      const [percakapan] = await Promise.allSettled([
        fetchConversation({ sessionId: aktif.sessionId, phone: aktif.phone }),
        muat(undefined, { senyap: true }),
      ]);

      if (percakapan.status === 'fulfilled') {
        const data = percakapan.value;
        setPesan(data.messages);
        setDegraded(data.degraded);
        setTerpotong(data.truncated);

        // Gateway bisa memindahkan pengiriman ke sesi lain (auto-rotate) saat
        // sesi yang diminta sedang tidak sehat. Pesannya tetap terkirim, hanya
        // muncul di percakapan sesi yang benar-benar dipakai. Katakan apa
        // adanya daripada membiarkan pesan seolah hilang.
        const adaDiUtas = data.messages.some((m) => m.id === `out:${terkirim?.messageId}`);
        if (!data.degraded && terkirim?.messageId && !adaDiUtas) {
          setPeringatanKirim(
            'Pesan terkirim, tetapi tidak muncul di utas ini. Gateway kemungkinan mengirimnya lewat sesi lain (auto-rotate) — cek daftar percakapan.',
          );
        }
      }
    } catch (err) {
      setErrorKirim(err?.message || 'Gagal mengirim pesan.');
    } finally {
      setMengirim(false);
    }
  }, [balasan, aktif, mengirim, sesiTerhubung, muat]);

  const jumlahPesan = pesan.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Inbox className="h-5 w-5" /> Inbox
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Percakapan pelanggan: pesan masuk dan balasan terkirim dalam satu alur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pemilih sesi memakai nama dan status dari wa-api, bukan id mentah. */}
          <select
            value={sesiTerpilih}
            onChange={(e) => setSesiTerpilih(e.target.value)}
            className="h-9 max-w-[260px] rounded-md border border-line bg-surface px-2 text-sm"
            aria-label="Pilih sesi"
          >
            <option value="">Semua sesi</option>
            {daftarSesi.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.name || s.id} · ${labelStatusSesi(s.status)}`}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => void muat()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-md border border-clay-line bg-clay-wash px-3 py-2 text-sm text-clay-deep"
        >
          {errorMsg}
        </div>
      )}

      {!outboundTersedia && outboundAktif && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-honey-line bg-honey-wash px-3 py-2 text-sm text-honey-deep"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Riwayat pesan terkirim tidak dapat dimuat dari gateway. Pesan masuk tetap ditampilkan;
            percakapan yang hanya punya pesan terkirim mungkin belum muncul.
          </span>
        </div>
      )}

      <div className="h-[calc(100dvh-15rem)] min-h-[420px] overflow-hidden rounded-lg border border-line bg-surface lg:h-[calc(100dvh-11rem)]">
        <div className="grid h-full lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          {/* ---------------------------------------------------- Daftar percakapan */}
          <div className={`${aktif ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-line lg:border-r`}>
            <div className="shrink-0 border-b border-line p-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nomor, nama, atau isi pesan"
                  aria-label="Cari percakapan"
                  className="h-9 w-full rounded-md border border-line bg-surface pl-8 pr-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-ink-soft">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
                </div>
              ) : tersaring.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-soft">
                  {conversations.length === 0
                    ? 'Belum ada percakapan dari sesi yang aktif.'
                    : 'Tidak ada percakapan yang cocok dengan pencarian.'}
                </div>
              ) : (
                <ul>
                  {tersaring.map((c) => {
                    const dipilih = aktif?.sessionId === c.sessionId && aktif?.phone === c.phone;
                    const judul = c.name || `+${c.phone}`;

                    return (
                      <li key={`${c.sessionId}:${c.phone}`}>
                        <button
                          type="button"
                          onClick={() => void buka(c)}
                          aria-current={dipilih ? 'true' : undefined}
                          className={`flex w-full items-start gap-2.5 border-b border-line px-3 py-2.5 text-left transition-colors last:border-0 ${
                            dipilih ? 'bg-brand-wash' : 'hover:bg-surface-sunken'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#00a884] text-xs font-bold text-white"
                          >
                            {inisial(judul)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-medium">{judul}</span>
                              <span className="shrink-0 text-[10px] text-ink-muted">
                                {waktuSingkat(c.lastAt)}
                              </span>
                            </span>

                            <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                              {c.lastDirection === 'out' && (
                                <CheckCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              )}
                              <span className="truncate">
                                {c.lastDirection === 'out' && (
                                  <span className="text-ink-muted">Anda: </span>
                                )}
                                {c.lastText || `[${c.lastType || 'pesan'}]`}
                              </span>
                            </span>

                            {c.batchId && (
                              <span className="mt-1 inline-block rounded bg-brand-wash px-1.5 py-0.5 text-[10px] font-medium text-brand-deep">
                                Kampanye
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- Panel percakapan */}
          <div className={`${aktif ? 'flex' : 'hidden lg:flex'} min-h-0 flex-col bg-surface`}>
            {!aktif ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <MessageSquare className="h-10 w-10 text-line-strong" />
                <p className="text-sm text-ink-soft">
                  Pilih percakapan di sebelah kiri untuk membaca dan membalas.
                </p>
                <p className="max-w-xs text-[11px] text-ink-muted">
                  Riwayat memuat pesan masuk dan terkirim, selama gateway wa-api dapat dihubungi.
                </p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-[#f0f2f5] px-2.5 py-2 text-slate-800 dark:bg-[#202c33] dark:text-zinc-100">
                  <button
                    type="button"
                    onClick={() => setAktif(null)}
                    aria-label="Kembali ke daftar percakapan"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10 lg:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#00a884] text-xs font-bold text-white"
                  >
                    {inisial(aktif.name || aktif.phone)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{aktif.name || `+${aktif.phone}`}</p>
                    <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500 dark:text-zinc-400">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${WARNA_SESI[metaAktif?.status] || 'bg-slate-400'}`}
                      />
                      <span className="truncate">
                        {metaAktif?.name || aktif.sessionId} · {labelStatusSesi(metaAktif?.status)}
                      </span>
                    </p>
                  </div>

                  <Badge variant="secondary" className="shrink-0">
                    {jumlahPesan} pesan
                  </Badge>

                  <button
                    type="button"
                    onClick={() => void buka(aktif)}
                    disabled={memuatPesan}
                    aria-label="Muat ulang percakapan"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-black/5 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
                  >
                    <RefreshCw className={`h-4 w-4 ${memuatPesan ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {degraded && (
                  <div
                    role="status"
                    className="shrink-0 border-b border-honey-line bg-honey-wash px-3 py-1.5 text-[11px] text-honey-deep"
                  >
                    Riwayat pesan terkirim tidak dapat dimuat dari gateway. Hanya pesan masuk yang
                    ditampilkan.
                  </div>
                )}

                <div
                  ref={areaPesanRef}
                  className="min-h-0 flex-1 overflow-y-auto bg-[#efeae2] px-3 py-4 dark:bg-[#0b141a] sm:px-5"
                  style={{
                    backgroundImage: `url(${doodleBg})`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '360px auto',
                  }}
                >
                  {memuatPesan ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
                    </div>
                  ) : pesan.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="rounded-md bg-white/90 px-3 py-2 text-sm text-slate-600 shadow-sm dark:bg-[#182229] dark:text-zinc-300">
                        Belum ada pesan. Tulis balasan di bawah untuk memulai.
                      </p>
                    </div>
                  ) : (
                    <ol className="space-y-1.5" aria-label="Riwayat pesan">
                      {terpotong && (
                        <li className="flex justify-center pb-1">
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-slate-600 shadow-sm dark:bg-[#182229] dark:text-zinc-300">
                            Menampilkan {pesan.length} pesan terakhir
                          </span>
                        </li>
                      )}

                      {barisPesan.map((baris) =>
                        baris.jenis === 'hari' ? (
                          <li key={baris.kunci} className="flex justify-center py-1">
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-slate-600 shadow-sm dark:bg-[#182229] dark:text-zinc-300">
                              {baris.label}
                            </span>
                          </li>
                        ) : (
                          <Gelembung key={baris.kunci} pesan={baris.pesan} />
                        ),
                      )}
                    </ol>
                  )}
                </div>

                {/* Editor balasan: formatting WhatsApp, Enter kirim, Shift+Enter baris baru. */}
                <div className="shrink-0 border-t border-line bg-surface px-2.5 py-2">
                  {errorKirim && (
                    <p role="alert" className="mb-1.5 text-[11px] text-clay">
                      {errorKirim}
                    </p>
                  )}

                  {peringatanKirim && (
                    <p role="status" className="mb-1.5 text-[11px] text-honey-deep">
                      {peringatanKirim}
                    </p>
                  )}

                  {!sesiTerhubung && (
                    <p role="status" className="mb-1.5 text-[11px] text-honey-deep">
                      Sesi {metaAktif?.name || aktif.sessionId} berstatus{' '}
                      {labelStatusSesi(metaAktif?.status)} — balasan tidak dapat dikirim sampai nomor
                      tersambung kembali.
                    </p>
                  )}

                  <WhatsAppFormattingToolbar
                    value={balasan}
                    onChange={setBalasan}
                    textareaRef={textareaRef}
                  />

                  {/*
                    Tombol kirim mengapung DI DALAM kotak teks (kanan bawah),
                    bukan di kolom sebelahnya. Kotak teks memakai padding kanan
                    selebar tombol supaya teks tidak tertutup.

                    Formulir asli dipakai supaya jalur kirim tetap ada tanpa
                    keyboard: tombol `type="submit"` menjadi jalur native,
                    sedangkan Enter hanya pintasan.
                  */}
                  <form
                    className="relative"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void kirim();
                    }}
                  >
                    <label htmlFor="inbox-balasan" className="sr-only">
                      Balasan untuk percakapan ini
                    </label>

                    <textarea
                      id="inbox-balasan"
                      ref={textareaRef}
                      rows={2}
                      value={balasan}
                      onChange={(e) => setBalasan(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();

                          // IME: Enter dipakai untuk mengonfirmasi kandidat
                          // huruf (Jepang/China/Korea). Mengirim di tengah
                          // komposisi menghasilkan pesan terpotong. `keyCode
                          // 229` menutup bug urutan event di Safari lama.
                          if (e.isComposing || e.keyCode === 229) return;

                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      enterKeyHint="send"
                      placeholder="Tulis balasan… (Enter kirim, Shift+Enter baris baru)"
                      className="block max-h-[132px] min-h-[52px] w-full resize-none rounded-b-lg border border-line bg-surface py-2 pl-2.5 pr-14 text-sm focus:border-brand focus:outline-none [field-sizing:content]"
                    />

                    <Button
                      type="submit"
                      disabled={mengirim || balasan.trim() === '' || !sesiTerhubung}
                      aria-label="Kirim balasan"
                      title="Kirim balasan"
                      className="absolute bottom-1 right-1 h-11 w-11 rounded-full p-0 shadow-sm"
                    >
                      {mengirim ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
