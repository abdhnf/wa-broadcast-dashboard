import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gabungkan class Tailwind dengan resolusi konflik terakhir menang. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ---------------- Utilitas parsing template pesan & tunggu-kirim ----------------

/**
 * Ganti variabel `{{nama}}` dengan nilai dari objek contact.
 * Placeholder tanpa nilai dibiarkan apa adanya supaya terlihat di log,
 * bukan diam-diam jadi teks kosong.
 */
export function renderVariables(text, contact = {}) {
  const custom = contact?.custom || {};
  return String(text ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, rawKey) => {
    const key = String(rawKey).trim();
    const value = contact?.[key] ?? custom?.[key];
    return value === undefined || value === null || value === '' ? match : String(value);
  });
}

/**
 * Pilih satu varian dari spintax `{Halo|Hai|Siang}`.
 * Mendukung sarang sederhana dengan memilih opsi terluar lebih dulu.
 */
export function pickSpintax(text, random = Math.random) {
  let out = String(text ?? '');
  const pattern = /\{([^{}]*\|[^{}]*)\}/;
  let guard = 0;
  while (pattern.test(out) && guard < 50) {
    out = out.replace(pattern, (_m, options) => {
      const parts = String(options).split('|');
      return parts[Math.floor(random() * parts.length)] ?? parts[0];
    });
    guard += 1;
  }
  return out;
}

/** Render penuh: variabel kontak lalu pilih varian spintax. */
export function renderMessage(text, contact) {
  return pickSpintax(renderVariables(text, contact));
}

/** Tunggu sejumlah milidetik, sadar-signal AbortSignal. */
export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Dibatalkan', 'AbortError'));
        },
        { once: true },
      );
    }
  });
}
