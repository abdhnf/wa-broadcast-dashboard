/**
 * Pemformatan teks khas WhatsApp, dipakai bersama oleh pratinjau gelembung
 * (Playground) dan riwayat percakapan (Inbox).
 *
 * Sebelumnya fungsi ini hanya hidup di dalam `WhatsAppBubblePreview`. Inbox
 * butuh aturan yang persis sama — kalau disalin, cepat atau lambat keduanya
 * berbeda dan pesan yang sama tampil beda di dua halaman.
 *
 * Semua entitas HTML disanitasi lebih dulu, jadi hasilnya aman dipakai dengan
 * `dangerouslySetInnerHTML`.
 */
export function formatWhatsAppMarkdown(raw) {
  if (!raw) return '';

  // 1. Sanitasi entitas HTML agar aman dari injeksi
  let out = String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 2. Monospace kode ```kode```
  out = out.replace(
    /```([^`]+)```/g,
    '<code class="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>',
  );

  // 3. Bold *teks*
  out = out.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<strong>$1</strong>');

  // 4. Italic _teks_
  out = out.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<em>$1</em>');

  // 5. Strikethrough ~teks~
  out = out.replace(/(?<!\w)~([^~\n]+)~(?![\w~])/g, '<del class="opacity-80">$1</del>');

  // 6. Baris baru
  return out.replace(/\n/g, '<br/>');
}
