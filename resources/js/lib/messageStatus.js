/**
 * Satu-satunya sumber kebenaran untuk tampilan status pesan di dashboard.
 *
 * Sebelumnya label status didefinisikan di TIGA tempat dengan isi berbeda:
 *   1. Broadcast.jsx  QUEUE_STATUS_OPTIONS   (dropdown filter)
 *   2. Broadcast.jsx  render badge inline     (ternary berantai)
 *   3. Dashboard.jsx  statusLabel()           (tabel overview)
 *
 * Akibatnya: `pending` dan `queued` tampil dengan label IDENTIK
 * ("Antrean Gateway") sehingga dua status berbeda tak bisa dibedakan, dan
 * `queued`/`cancelled`/`draft` tampil mentah huruf kecil di Overview karena
 * tidak ada di map.
 *
 * Label memakai istilah Inggris yang sama dengan `MessageStatus` di
 * backend wa-api (`backend/src/types.ts`). `draft` adalah status lokal
 * dashboard (target belum masuk antrean gateway) dan tidak ada di backend.
 */

/** Label per status — istilah Inggris mengikuti status asli backend. */
export const MESSAGE_STATUS_LABEL = {
  draft: 'Draft',
  queued: 'Queued',
  pending: 'Pending',
  pacing: 'Pacing',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  invalid_number: 'Invalid Number',
  not_registered: 'Not Registered',
  cancelled: 'Cancelled',
};

/** Status yang dianggap berhasil terkirim. */
export const SUCCESS_STATUSES = ['sent', 'delivered', 'read'];

/** Status yang dianggap gagal permanen. */
export const FAILURE_STATUSES = ['failed', 'invalid_number', 'not_registered'];

/** Status yang masih menunggu / sedang berjalan. */
export const QUEUED_STATUSES = ['draft', 'queued', 'pending', 'pacing', 'sending'];

/** Status yang dihentikan pengguna. */
export const CANCELLED_STATUSES = ['cancelled'];

/** Label status; status tak dikenal dikembalikan apa adanya (bukan "Failed"). */
export function statusLabel(status) {
  return MESSAGE_STATUS_LABEL[status] || status;
}

/** Kelas warna teks untuk status; dipakai kolom status di tabel Overview. */
export function statusClass(status) {
  if (SUCCESS_STATUSES.includes(status)) return 'text-brand-deep';
  if (FAILURE_STATUSES.includes(status)) return 'text-rose-500';
  if (status === 'pacing' || status === 'pending') return 'text-amber-500';
  if (status === 'sending') return 'text-cyan-600 dark:text-cyan-400';
  return 'text-ink-muted';
}

/** Opsi dropdown filter antrean. */
export const QUEUE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'queued', label: 'Queued' },
  { value: 'pending', label: 'Pending' },
  { value: 'pacing', label: 'Pacing' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'failed', label: 'Failed' },
  { value: 'invalid_number', label: 'Invalid Number' },
  { value: 'not_registered', label: 'Not Registered' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Peta nilai -> label untuk lookup cepat. */
export const QUEUE_STATUS_LABEL = Object.fromEntries(
  QUEUE_STATUS_OPTIONS.map((s) => [s.value, s.label]),
);

/* ==========================================================================
 * Waktu per transisi status
 *
 * Gateway wa-api mencatat waktu kejadian tiap status di `payload.statusTimes`
 * (epoch milidetik) dan mengirimkannya apa adanya lewat `GET /messages/:sessionId`.
 * Sebelum ini dashboard hanya punya `timestamp`, yang isinya `created_at` —
 * waktu pesan MASUK ANTREAN, bukan waktu terkirim. Menampilkannya di bawah
 * badge "Sent" menyesatkan: jeda anti-ban bisa membuat selisihnya mencapai
 * puluhan detik sampai menit.
 *
 * Catatan cakupan: `draft` dan `pending` TIDAK akan punya waktu per tahap.
 * Keduanya status lokal dashboard (target belum diserahkan ke gateway),
 * sedangkan pencatatan di gateway dimulai dari `queued`.
 * ========================================================================== */

/**
 * Urutan tahap mengikuti alur hidup pesan, bukan urutan kode.
 *
 * `failed` sengaja tidak di sini: kegagalan bisa terjadi di titik mana pun,
 * jadi menaruhnya di urutan tetap akan menyesatkan. Waktunya ditampilkan
 * terpisah di akhir.
 */
export const STATUS_TIME_ORDER = ['queued', 'pacing', 'sending', 'sent', 'delivered', 'read'];

/** Nama tahap bahasa Indonesia — disamakan dengan wa-panel agar konsisten. */
export const STATUS_STAGE_LABEL = {
  queued: 'Masuk antrean',
  pacing: 'Jeda anti-ban',
  sending: 'Mulai dikirim',
  sent: 'Sampai server WhatsApp',
  delivered: 'Sampai perangkat penerima',
  read: 'Dibaca penerima',
  failed: 'Gagal dikirim',
  invalid_number: 'Nomor tidak valid',
  not_registered: 'Nomor tidak terdaftar',
  cancelled: 'Dibatalkan',
};

/**
 * Status terminal — peristiwa yang MENGhentikan alur, bukan melanjutkannya.
 *
 * Sejalan dengan `FORCED_STATUSES` di backend wa-api (`src/db/pesan.ts`).
 * Kalau daftar di sana berubah, daftar ini ikut berubah.
 */
export const STATUS_TIME_TERMINAL = ['failed', 'invalid_number', 'not_registered', 'cancelled'];

/**
 * Jam:menit:detik waktu lokal perangkat operator.
 *
 * Detik ikut ditampilkan karena jarak antar tahap awal (queued -> pacing ->
 * sending) sering di bawah satu menit; tanpa detik, ketiganya tampak sama.
 */
export function formatStatusClock(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '-';
  return new Date(ms).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Selisih dari waktu antrean, mis. `+3,2 dtk` atau `+1 mnt 12 dtk`.
 *
 * Pelengkap, bukan pengganti jam absolut: jam menjawab "kapan", selisih
 * menjawab "lama prosesnya berapa".
 */
export function formatStatusDelta(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '0 dtk';
  const detik = ms / 1000;
  if (detik < 60) return `+${detik.toFixed(1).replace('.', ',')} dtk`;
  const menit = Math.floor(detik / 60);
  const sisa = Math.round(detik % 60);
  return `+${menit} mnt ${sisa} dtk`;
}

/**
 * Susun baris waktu per tahap dari `statusTimes`.
 * Balasan array kosong berarti belum ada catatan waktu (pesan lama).
 */
export function buildStatusTimeRows(statusTimes) {
  if (!statusTimes || typeof statusTimes !== 'object') return [];

  // `Number.isFinite`, bukan `typeof === 'number'`: NaN dan Infinity lolos
  // pemeriksaan typeof, lalu tampil sebagai baris berjam "-" — terlihat seperti
  // ada catatan padahal tidak. Lebih baik barisnya tidak muncul sama sekali.
  const basis = statusTimes.queued;
  const adaBasis = Number.isFinite(basis);
  const baris = [];

  for (const status of STATUS_TIME_ORDER) {
    const ms = statusTimes[status];
    if (!Number.isFinite(ms)) continue;
    baris.push({
      status,
      stage: STATUS_STAGE_LABEL[status] || statusLabel(status),
      time: formatStatusClock(ms),
      delta: adaBasis && status !== 'queued'
        ? formatStatusDelta(ms - basis)
        : null,
    });
  }

  // Status terminal ditampilkan paling akhir: peristiwa yang menjelaskan kenapa
  // alur di atas berhenti. Sebelumnya hanya `failed` yang ditangani, sehingga
  // pesan `not_registered` / `invalid_number` / `cancelled` tampil seolah masih
  // di antrean.
  for (const status of STATUS_TIME_TERMINAL) {
    const ms = statusTimes[status];
    if (!Number.isFinite(ms)) continue;
    baris.push({
      status,
      stage: STATUS_STAGE_LABEL[status] || statusLabel(status),
      time: formatStatusClock(ms),
      delta: adaBasis ? formatStatusDelta(ms - basis) : null,
    });
  }

  return baris;
}

/**
 * Ringkasan waktu per tahap sebagai teks banyak baris untuk atribut `title`.
 * Balasan undefined berarti tidak ada yang perlu ditampilkan.
 */
export function statusTimeSummary(statusTimes) {
  const baris = buildStatusTimeRows(statusTimes);
  if (baris.length === 0) return undefined;
  return baris
    .map((b) => `${b.stage}: ${b.time}${b.delta ? ` (${b.delta})` : ''}`)
    .join('\n');
}

/**
 * Jam kejadian untuk SATU status tertentu.
 *
 * Dipakai di bawah badge agar angka yang tampil adalah waktu status itu
 * benar-benar terjadi. Balasan null berarti tidak ada catatan — pemanggil
 * wajib menampilkan kosong, bukan menebak dari `timestamp`.
 */
export function statusTimeOf(statusTimes, status) {
  if (!statusTimes || typeof statusTimes !== 'object') return null;
  const ms = statusTimes[status];
  return Number.isFinite(ms) ? ms : null;
}
