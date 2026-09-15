import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * TagInput — input chip multi-tag gaya shadcn.
 *
 * Komponen UI dasar untuk mengelola kumpulan tag bebas (free-form):
 * - Enter atau koma menambahkan chip; Backspace menghapus chip terakhir.
 * - Tag di-deduplikasi (case-insensitive) dan dibersihkan dari spasi.
 * - `suggestions` menampilkan tag yang sudah ada di database sebagai hint.
 *
 * Nilai dikontrol penuh dari parent (array string), tanpa state internal
 * untuk daftar tag — mengikuti pola controlled component shadcn.
 */
export function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Tambah tag…',
  maxTags = 50,
  disabled = false,
  inlineSuggestions = false,
  className,
}) {
  const [draft, setDraft] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const normalize = (raw) => raw.trim().replace(/\s+/g, ' ').slice(0, 40);

  const hasTag = (candidate) =>
    value.some((t) => t.toLowerCase() === candidate.toLowerCase());

  const addTag = (raw) => {
    const tag = normalize(raw);
    if (!tag || value.length >= maxTags) return;
    if (hasTag(tag)) {
      setDraft('');
      return;
    }
    onChange?.([...value, tag]);
    setDraft('');
  };

  const removeTag = (tag) => {
    onChange?.(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange?.(value.slice(0, -1));
    } else if (e.key === 'Escape') {
      setDraft('');
      setShowSuggestions(false);
    }
  };

  const remainingSuggestions = suggestions
    .filter(
      (s) =>
        !hasTag(s) &&
        (!draft || s.toLowerCase().includes(draft.toLowerCase()))
    )
    .slice(0, 10);

  return (
    <div className={cn('relative', className)}>
      <div
        role="group"
        aria-label="Input tag"
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-8 w-full cursor-text flex-wrap items-center gap-1 rounded-lg border border-line bg-shell bg-surface px-2 py-1 text-xs focus-within:outline-none focus-within:border-brand"
      >
        {value.length === 0 && !draft && (
          <span className="pointer-events-none text-[11px] text-ink-faint">
            {placeholder}
          </span>
        )}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-alt px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="rounded p-0.5 text-ink-faint transition-colors hover:text-clay"
                aria-label={`Hapus tag ${tag}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
          onKeyDown={handleKeyDown}
          className="min-w-16 flex-1 border-0 bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Ketik tag baru"
        />
      </div>

      {/* Sugesti tag yang sudah ada di database */}
      {showSuggestions && remainingSuggestions.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-line bg-surface p-1.5 shadow-lg">
          <p className="px-1.5 pb-1 text-[9px] uppercase tracking-wide text-ink-faint">
            Pilih tag yang sudah ada
          </p>
          <div className="flex flex-wrap gap-1">
            {remainingSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  // onMouseDown agar terpicu sebelum blur input meng-hide panel
                  e.preventDefault();
                  addTag(s);
                }}
                className="rounded-md border border-line bg-surface-alt px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted transition-colors hover:border-brand/40 hover:text-ink"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sugesti inline statis jika diaktifkan (memudahkan klik langsung tanpa fokus) */}
      {inlineSuggestions && remainingSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-ink-faint">Sugesti tag:</span>
          {remainingSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-1 rounded border border-line/70 bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand"
            >
              <span>+</span>
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
