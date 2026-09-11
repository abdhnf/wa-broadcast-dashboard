/**
 * Normalisasi nomor WhatsApp untuk seluruh dashboard.
 *
 * Aturan di sini wajib sama dengan yang dipakai `wa-api` (skema `to` hanya
 * menerima digit, format 628xxx) dan `CrmController` di sisi server. Kalau
 * berbeda, nomor yang sudah diketik pengguna bisa tertolak backend hanya karena
 * beda format penulisan.
 *
 * Yang dirapikan:
 * - `+`, spasi, tanda hubung, dan titik dibuang.
 * - `0` di depan jadi `62`  (0851... -> 62851...).
 * - `8` di depan jadi `628` (851...  -> 62851...).
 * - `62` yang sudah benar dibiarkan apa adanya.
 */

const WA_COUNTRY_CODE = '62';

/** Panjang nomor (digit) yang diterima: 62 + 8..13 digit. */
export const MIN_PHONE_LENGTH = 10;
export const MAX_PHONE_LENGTH = 15;

/** Buang semua karakter yang bukan angka. */
export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Rapikan nomor ke format `62...`.
 *
 * Aman dipanggil sambil mengetik: digit tunggal `6` sengaja tidak diubah, kalau
 * tidak, pengetikan `628...` akan berubah jadi `62628...` di tengah jalan.
 * Mengembalikan string kosong bila belum ada angka, supaya kolom input bisa
 * dikosongkan tanpa dipaksa berisi.
 */
export function normalizePhone(value) {
  const raw = digitsOnly(value);
  if (!raw) return '';

  // Nol di depan hilang; sisanya dianggap nomor nasional.
  const digits = raw.replace(/^0+/, '');
  if (!digits) return '';

  // Sudah berformat internasional.
  if (digits.startsWith(WA_COUNTRY_CODE)) return digits;

  // Awal pengetikan "62" -- jangan dipaksa jadi "626".
  if (digits === '6') return digits;

  // Nomor nasional (851.../8123.../211...) dilengkapi kode negara.
  return WA_COUNTRY_CODE + digits;
}

/**
 * Validasi bentuk akhir nomor.
 *
 * Dipakai untuk menolak lebih awal di UI, bukan menggantikan validasi server:
 * backend tetap memvalidasi ulang karena API bisa dipanggil langsung.
 */
export function isValidPhone(value) {
  const digits = normalizePhone(value);
  return /^62\d{8,13}$/.test(digits);
}

/** Pesan galat yang seragam untuk semua form. */
export const PHONE_ERROR_MESSAGE =
  'Nomor WhatsApp tidak valid. Gunakan format 628xxxxxxxxx (10-15 angka).';

/**
 * Rapikan nilai dari kolom input agar siap dikirim.
 * Dipakai pada onChange dan sebelum submit.
 */
export function toPhoneInput(value) {
  return normalizePhone(value).slice(0, MAX_PHONE_LENGTH);
}
