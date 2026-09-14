import React from 'react';
import { CheckCheck, MapPin, FileText, Video, MoreVertical, Search } from 'lucide-react';
import doodleBg from '../assets/wa-chat-doodle.png';

/**
 * Format markdown khas WhatsApp secara aman:
 * *tebal* -> <strong>tebal</strong>
 * _miring_ -> <em>miring</em>
 * ~coret~ -> <del>coret</del>
 * ```mono``` -> <code>mono</code>
 */
function formatWhatsAppMarkdown(raw) {
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
    '<code class="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>'
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

/**
 * Pratinjau Gelembung Chat WhatsApp Realistis
 *
 * Menampilkan:
 * - Wallpaper chat WhatsApp dengan corak doodle halus.
 * - Header chat lengkap (Avatar kontak, nama/nomor, status online).
 * - Gelembung keluar warna hijau WhatsApp (#d9fdd3 / dark #005c4b) dengan ekor balon.
 * - Resolusi variabel sesungguhnya ({{name}}, {{kota}}, dsb).
 * - Pratinjau media biner & kartu lokasi interaktif.
 * - Formatting teks WhatsApp (*bold*, _italic_, ~strike~, ```mono```).
 * - Timestamp aktual & ikon centang ganda biru (read/delivered).
 */
export function WhatsAppBubblePreview({
  senderName = 'Fastify WA Bot',
  content = '',
  mediaUrl = null,
  mediaType = 'image',
  location = null, // { latitude, longitude, name, address }
  contact = null, // { name, phone, custom }
  sampleData = {},
}) {
  // Gabungkan data kontak nyata dengan sample fallback: kontak aktif selalu menang
  const contactCustom = contact?.custom && typeof contact.custom === 'object' ? contact.custom : {};
  const mergedData = {
    name: 'Penerima',
    nama: 'Penerima',
    phone: '',
    nomor: '',
    ...(sampleData || {}),
    ...contactCustom,
    ...(contact?.name ? { name: contact.name, nama: contact.name } : {}),
    ...(contact?.phone ? { phone: contact.phone, nomor: contact.phone } : {}),
  };

  // Interpolasi variabel {{key}}
  let processedText = content || '';
  if (processedText) {
    Object.keys(mergedData).forEach((k) => {
      const val = mergedData[k];
      if (val !== undefined && val !== null && val !== '') {
        const reg = new RegExp(`{{\\s*${k}\\s*}}`, 'gi');
        processedText = processedText.replace(reg, String(val));
      }
    });

    // Resolusi Spintax {A|B|C} deterministik untuk pratinjau (hanya yang memiliki opsi berpembatas pipa '|')
    processedText = processedText.replace(/\{([^{}|]+(?:\|[^{}|]+)+)\}/g, (_, choices) => {
      const parts = choices.split('|');
      return parts[0] || '';
    });
  }

  const displayName = contact?.name || mergedData.name || 'Pratinjau Penerima';
  const displayPhone = contact?.phone || mergedData.phone || '';
  const initial = displayName ? displayName.trim().charAt(0).toUpperCase() : 'W';

  // Waktu pesan untuk jam digital realistis
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="w-full max-w-[360px] mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-[#efeae2] dark:bg-[#0b141a] shadow-md text-[13px] flex flex-col font-sans select-none transition-colors">
      {/* WhatsApp Chat Header */}
      <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-3.5 py-2.5 flex items-center justify-between text-slate-800 dark:text-zinc-100 border-b border-slate-200 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs">
            {initial}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-xs font-semibold truncate text-slate-900 dark:text-zinc-100">
              {displayName}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
              {displayPhone ? `+${displayPhone}` : 'online'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-slate-500 dark:text-zinc-400 shrink-0">
          <Search className="w-3.5 h-3.5 cursor-pointer opacity-75 hover:opacity-100" />
          <MoreVertical className="w-3.5 h-3.5 cursor-pointer opacity-75 hover:opacity-100" />
        </div>
      </div>

      {/* WhatsApp Chat Wallpaper Background dengan Doodle Asli WA */}
      <div
        className="relative p-3.5 min-h-[230px] flex flex-col justify-end bg-[#efeae2] dark:bg-[#0b141a]"
        style={{
          backgroundImage: `url(${doodleBg})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '360px auto',
        }}
      >
        {/* Outgoing WhatsApp Bubble (Pesan Keluar) */}
        <div className="relative self-end max-w-[90%] bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-lg rounded-tr-none p-2.5 shadow-sm border border-emerald-300/30 dark:border-transparent">
          {/* Gelembung Ekor (Bubble Tail WhatsApp) */}
          <div
            className="absolute top-0 -right-2 w-0 h-0 border-t-[9px] border-t-[#d9fdd3] dark:border-t-[#005c4b] border-r-[9px] border-r-transparent"
            aria-hidden="true"
          />

          {/* Media: Image / Video / Document */}
          {mediaUrl && (
            <div className="rounded-md overflow-hidden mb-1.5 bg-black/5 dark:bg-black/20 border border-black/10">
              {mediaType === 'video' ? (
                <div className="w-full h-32 bg-black/80 flex items-center justify-center text-white text-xs gap-1.5">
                  <Video className="w-5 h-5 text-emerald-400" />
                  <span>Video WhatsApp</span>
                </div>
              ) : mediaType === 'document' ? (
                <div className="p-2.5 flex items-center gap-2.5 bg-white/60 dark:bg-zinc-900/50">
                  <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate text-slate-800 dark:text-zinc-200">
                      Berkas Dokumen
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">PDF / Dokumen</div>
                  </div>
                </div>
              ) : (
                <img
                  src={mediaUrl}
                  alt="Pratinjau Media"
                  className="w-full max-h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
          )}

          {/* Location Card */}
          {location && (location.latitude || location.lat) && (
            <div className="rounded-md overflow-hidden mb-1.5 bg-white/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs p-2 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                <MapPin className="w-3.5 h-3.5" />
                <span>Lokasi Terbagikan</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-zinc-400 font-mono">
                {location.latitude || location.lat}, {location.longitude || location.lng}
              </div>
              {location.name && (
                <div className="text-[11px] font-medium text-slate-800 dark:text-zinc-200 truncate">
                  {location.name}
                </div>
              )}
            </div>
          )}

          {/* Teks Pesan Terformat */}
          {processedText ? (
            <div
              className="text-[12.5px] leading-relaxed break-words whitespace-pre-wrap select-text pr-2 font-sans"
              dangerouslySetInnerHTML={{ __html: formatWhatsAppMarkdown(processedText) }}
            />
          ) : (
            <div className="text-[11px] italic text-slate-500 dark:text-zinc-400 pr-2">
              (Belum ada isi teks pesan)
            </div>
          )}

          {/* Timestamp & Centang Ganda Khas WhatsApp */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781] dark:text-[#8696a0] select-none">
            <span>{timeString}</span>
            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" title="Terkirim & Terbaca" />
          </div>
        </div>
      </div>
    </div>
  );
}
