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
