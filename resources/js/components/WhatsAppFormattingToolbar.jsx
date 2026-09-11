import React, { useMemo, useState } from 'react';
import { Bold, Italic, Strikethrough, Code, Smile, Shuffle, Variable, ChevronDown, Check, Sparkles } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/Popover';

const EMOJI_LIST = [
  '👋', '🙏', '🔥', '🎉', '✅', '⭐',
  '💡', '🚀', '📌', '📢', '💬', '❤️',
  '😊', '👍', '💼', '📦', '🎁', '🔔',
];

export function WhatsAppFormattingToolbar({
  value = '',
  onChange,
  textareaRef,
  contacts = [],
  activeContact = null,
  availableVariables = null,
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const insertText = (textToInsert) => {
    const textarea = textareaRef?.current;
    if (!textarea) {
      if (typeof onChange === 'function') {
        onChange(value + textToInsert);
      }
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const updated = `${before}${textToInsert}${after}`;

    if (typeof onChange === 'function') {
      onChange(updated);
    }

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const applyFormatting = (marker) => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = value.substring(start, end);

    if (start === end) {
      insertText(`${marker}teks${marker}`);
      return;
    }

    const before = value.substring(0, start);
    const after = value.substring(end);
    const updated = `${before}${marker}${selected}${marker}${after}`;

    if (typeof onChange === 'function') {
      onChange(updated);
    }

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = end + marker.length * 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Ekstrak seluruh variabel unik yang benar-benar ada di kontak database
  const variableList = useMemo(() => {
    if (availableVariables && Array.isArray(availableVariables)) {
      return availableVariables.map((v) => ({
        key: v,
        label: v,
        activeVal: activeContact?.custom?.[v] || (activeContact?.[v] ?? null),
      }));
    }

    const list = [
      { key: 'name', label: 'Nama Lengkap', category: 'Standar CRM', activeVal: activeContact?.name || null },
      { key: 'phone', label: 'Nomor WhatsApp', category: 'Standar CRM', activeVal: activeContact?.phone || null },
    ];

    const seen = new Set(['name', 'phone']);

    // Ambil variabel custom dari kontak aktif (prioritas)
    if (activeContact?.custom && typeof activeContact.custom === 'object') {
      Object.entries(activeContact.custom).forEach(([k, v]) => {
        const trimmed = k.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          list.push({
            key: trimmed,
            label: trimmed,
            category: 'Kustom (Ada di Kontak Terpilih)',
            activeVal: v,
          });
        }
      });
    }

    // Ambil variabel custom dari seluruh kontak lain di database
    if (Array.isArray(contacts)) {
      contacts.forEach((c) => {
        if (c?.custom && typeof c.custom === 'object') {
          Object.keys(c.custom).forEach((k) => {
            const trimmed = k.trim();
            if (trimmed && !seen.has(trimmed)) {
              seen.add(trimmed);
              list.push({
                key: trimmed,
                label: trimmed,
                category: 'Kustom (Dari Kontak CRM)',
                activeVal: activeContact?.custom?.[trimmed] || null,
              });
            }
          });
        }
      });
    }

    return list;
  }, [contacts, activeContact, availableVariables]);

  // Pisahkan variabel aktif/utama untuk quick chips (maksimal 2 chip: name & phone)
  const quickChips = variableList.slice(0, 2);

  return (
    <div className="flex items-center justify-between gap-1 p-1.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-t-lg text-xs">
      {/* Tombol Formatting & Emoji WhatsApp */}
      <div className="flex items-center gap-0.5">
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

        {/* Emoji Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center transition-colors cursor-pointer"
              title="Pilih Emoji"
            >
              <Smile className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-xl" align="start">
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1.5 px-1">
              Emoji Populer
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
          className="px-1.5 py-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
          title="Sisipkan Spintax Random"
        >
          <Shuffle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline text-[10px]">Spintax</span>
        </button>
      </div>

      {/* Bagian Insert Variabel: Dropdown Menu Anti-Overflow + 2 Quick Chips */}
      <div className="flex items-center gap-1">
        {/* Quick chip standar: hanya 2 agar toolbar selalu rapi */}
        <div className="hidden sm:flex items-center gap-1">
          {quickChips.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertText(`{{${v.key}}}`)}
              className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300 text-[10px] font-mono hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
              title={`Sisipkan {{${v.key}}}`}
            >
              +{v.key}
            </button>
          ))}
        </div>

        {/* Menu Dropdown Variabel Lengkap (Muat ratusan variabel via scrollable list) */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-6 px-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Pilih Variabel Pesan"
            >
              <Variable className="w-3 h-3" />
              <span>Variabel</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-xl text-xs"
            align="end"
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-zinc-800">
              <span className="font-semibold text-[11px] text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                Sisipkan Variabel
              </span>
              <span className="text-[10px] text-slate-400">
                {variableList.length} variabel
              </span>
            </div>

            {/* List Variabel dengan Scrollbar */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {variableList.map((v) => {
                const isSelectedContactHasVal = v.activeVal !== null && v.activeVal !== undefined;
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      insertText(`{{${v.key}}}`);
                      setPopoverOpen(false);
                    }}
                    className="w-full text-left p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-900 border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <code className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                          {`{{${v.key}}}`}
                        </code>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 truncate">
                          {v.label !== v.key ? v.label : ''}
                        </span>
                      </div>
                      {isSelectedContactHasVal ? (
                        <span className="text-[10px] text-slate-600 dark:text-zinc-400 truncate mt-0.5">
                          Nilai: <strong className="text-slate-900 dark:text-zinc-200">{String(v.activeVal)}</strong>
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 dark:text-zinc-600 italic mt-0.5">
                          {v.category}
                        </span>
                      )}
                    </div>
                    {isSelectedContactHasVal && (
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed">
              💡 Nilai variabel akan otomatis diganti sesuai data JSON kontak penerima saat dikirim.
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
