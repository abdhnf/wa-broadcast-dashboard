import React from 'react';
import { Bold, Italic, Strikethrough, Code, Smile, Shuffle, Sparkles } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/Popover';
import { Button } from './ui/Button';

const EMOJI_LIST = [
  '👋', '🔥', '✨', '🚀', '✅', '🎉', '💡', '📌', '📢', '🎁',
  '❤️', '🙏', '😊', '👍', '💼', '📦', '⭐', '🔔', '💬', '🏷️',
  '💰', '🛒', '⚡', '🕒', '🎯', '📍', '📱', '📞', '🌐', '🛡️'
];

export function WhatsAppFormattingToolbar({ value, onChange, textareaRef, availableVariables = ['name', 'phone'] }) {
  // Sisipkan tag formatting (*tebal*, _miring_, ~coret~, ```mono```)
  const applyFormatting = (prefix, suffix = prefix) => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const replacement = `${prefix}${selectedText || 'teks'}${suffix}`;
    const newValue = `${beforeText}${replacement}${afterText}`;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + (selectedText ? selectedText.length : 4);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const insertText = (textToInsert) => {
    const textarea = textareaRef?.current;
    if (!textarea) {
      onChange(value + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const newValue = `${beforeText}${textToInsert}${afterText}`;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-t-lg text-xs">
      {/* Formatting buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => applyFormatting('*')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
          title="Tebal (*teks*)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('_')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
          title="Miring (_teks_)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('~')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
          title="Coret (~teks~)"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('```')}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
          title="Monospace (```teks```)"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-zinc-800 mx-0.5" />

        {/* Emoji Picker Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
              title="Pilih Emoji"
            >
              <Smile className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-xl" align="start">
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1.5 px-1">
              Emoji WhatsApp Populer
            </div>
            <div className="grid grid-cols-6 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertText(emoji)}
                  className="h-8 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-base flex items-center justify-center transition-colors cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Spintax Quick Button */}
        <button
          type="button"
          onClick={() => insertText('{Halo|Hai|Selamat pagi}')}
          className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
          title="Sisipkan Spintax Random Variasi"
        >
          <Shuffle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Spintax</span>
        </button>
      </div>

      {/* Dynamic Variable Chips */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-full">
        <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono hidden md:inline">Variabel:</span>
        {availableVariables.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insertText(`{{${v}}}`)}
            className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/60 hover:border-emerald-500 text-slate-700 dark:text-zinc-200 text-[10px] font-mono transition-colors cursor-pointer"
          >
            +{v}
          </button>
        ))}
      </div>
    </div>
  );
}
