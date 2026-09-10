import React from 'react';
import { CheckCheck } from 'lucide-react';

export function WhatsAppBubblePreview({ content, mediaUrl, sampleData = {} }) {
  // Ganti variabel dinamis
  let renderedText = content || 'Pratinjau pesan WhatsApp akan muncul di sini...';
  Object.keys(sampleData).forEach((key) => {
    const val = sampleData[key];
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    renderedText = renderedText.replace(regex, val);
  });

  // Ganti spintax sederhana {A|B|C} -> ambil pilihan pertama
  renderedText = renderedText.replace(/\{([^{}]+)\}/g, (match, choices) => {
    const parts = choices.split('|');
    return parts[0] || match;
  });

  return (
    <div className="w-full max-w-[320px] rounded-2xl overflow-hidden border border-zinc-800 bg-[#0b141a] shadow-xl text-[13px] flex flex-col font-sans select-none">
      {/* WhatsApp Header bar */}
      <div className="bg-[#202c33] px-3.5 py-2.5 flex items-center gap-2.5 text-zinc-100 border-b border-zinc-800/60">
        <div className="w-7 h-7 rounded-full bg-emerald-700/80 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {(sampleData.name || 'P').charAt(0)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-xs font-semibold truncate text-zinc-100">{sampleData.name || 'Calon Penerima'}</div>
          <div className="text-[10px] text-zinc-400 font-mono">{sampleData.phone || '+62 812-3456-7890'}</div>
        </div>
      </div>

      {/* Chat Area with WhatsApp Pattern */}
      <div className="p-3 min-h-[190px] flex flex-col justify-end bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:14px_14px]">
        {/* Outgoing Bubble */}
        <div className="self-end max-w-[88%] bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-xs p-2.5 shadow-xs space-y-1.5 border border-[#005c4b]">
          {mediaUrl && (
            <div className="rounded overflow-hidden mb-1 border border-black/20 bg-black/40">
              <img
                src={mediaUrl}
                alt="Media Preview"
                className="w-full h-28 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="whitespace-pre-wrap leading-relaxed break-words text-[12px]">
            {renderedText}
          </div>

          <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/70 font-mono pt-0.5">
            <span>12:45</span>
            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
          </div>
        </div>
      </div>
    </div>
  );
}
