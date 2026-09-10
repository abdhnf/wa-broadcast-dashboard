import React from 'react';
import { CheckCheck } from 'lucide-react';

export function WhatsAppBubblePreview({ content, mediaUrl, sampleName = 'Budi Santoso', sampleCustom = { tagihan: 'Rp 250.000', tempo: '15 Sep' } }) {
  // Render dynamic variables
  let parsedText = content || '';
  parsedText = parsedText.replace(/\{\{name\}\}/gi, sampleName);
  parsedText = parsedText.replace(/\{\{phone\}\}/gi, '6281234567891');
  if (sampleCustom) {
    Object.keys(sampleCustom).forEach(key => {
      parsedText = parsedText.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'gi'), sampleCustom[key]);
    });
  }

  // Parse spintax {A|B|C} to first option for preview
  parsedText = parsedText.replace(/\{([^{}]+)\}/g, (match, choices) => {
    const opts = choices.split('|');
    return opts[0] || '';
  });

  // Basic WA formatting: *bold* -> <strong>, _italic_ -> <em>
  const formatWaText = (text) => {
    return text.split('\n').map((line, idx) => {
      let formatted = line;
      // Bold
      formatted = formatted.replace(/\*([^*]+)\*/g, '<strong class="font-bold">$1</strong>');
      // Italic
      formatted = formatted.replace(/_([^_]+)_/g, '<em class="italic text-emerald-200/90">$1</em>');
      // Strike
      formatted = formatted.replace(/~([^~]+)~/g, '<span class="line-through opacity-75">$1</span>');
      return (
        <span key={idx} className="block min-h-[1.2em]" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full max-w-sm rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl p-4 overflow-hidden relative">
      {/* WA Header Mockup */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 mb-3">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shadow-xs">
          WA
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-200">{sampleName}</div>
          <div className="text-[10px] text-emerald-400">online</div>
        </div>
      </div>

      {/* Bubble Chat */}
      <div className="flex justify-end">
        <div className="max-w-[90%] bg-[#005c4b] text-slate-100 rounded-xl rounded-tr-none px-3.5 py-2.5 shadow-md relative">
          {mediaUrl && (
            <div className="mb-2 rounded-lg overflow-hidden border border-emerald-800/60 bg-black/20">
              <img src={mediaUrl} alt="Lampiran Media" className="w-full max-h-40 object-cover" />
            </div>
          )}

          <div className="text-xs leading-relaxed break-words">
            {formatWaText(parsedText)}
          </div>

          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-200/80 font-mono">
            <span>{nowTime}</span>
            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
          </div>
        </div>
      </div>
    </div>
  );
}
