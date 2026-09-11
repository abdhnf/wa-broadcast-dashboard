import React, { useEffect, useRef, useState } from 'react';
import { Search, User, Phone, Check, X } from 'lucide-react';
import { isValidPhone, normalizePhone, toPhoneInput } from '../lib/phone';

/**
 * Komponen Input Nomor WhatsApp dengan Pencarian Kontak Otomatis
 * 
 * Fitur:
 * - Bisa input nomor manual secara langsung (otomatis difilter digit dan 08 -> 628).
 * - Ketika input mencapai minimal 3 karakter, dropdown rekomendasi kontak muncul
 *   (mencocokkan nama atau nomor telepon kontak yang tersimpan).
 * - Menekan salah satu rekomendasi akan memilih kontak tersebut dan mengisi nomor.
 * - Callback `onContactSelected(contact)` mengirim objek kontak lengkap
 *   agar variabel `custom` dan namanya bisa dipakai untuk pratinjau pesan dinamis.
 */
export function ContactSearchInput({
  contacts = [],
  value = '',
  onChange,
  onSelectContact,
  onContactSelected,
  placeholder = 'Ketik nomor atau cari nama kontak...',
  className = '',
  required = false,
  autoFocus = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter kontak saat input >= 3 karakter
  const query = (value || '').trim().toLowerCase();
  const showRecommendations = query.length >= 3;

  const filteredContacts = showRecommendations
    ? contacts
        .filter((c) => {
          const matchName = (c.name || '').toLowerCase().includes(query);
          const matchPhone = (c.phone || '').includes(query);
          return matchName || matchPhone;
        })
        .slice(0, 6)
    : [];

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    // Boleh input angka atau nama pencarian. Jika diawali digit, format sebagai nomor.
    const isDigitsOnly = /^[0-9+]+$/.test(rawVal.trim());
    const nextVal = isDigitsOnly ? toPhoneInput(rawVal) : rawVal;

    onChange(nextVal);
    setIsOpen(true);

    // Jika nomor diubah manual dan tidak cocok dengan selectedContact, lepaskan binding kontak
    if (selectedContact && selectedContact.phone !== normalizePhone(nextVal)) {
      setSelectedContact(null);
      onContactSelected?.(null);
    }
  };

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    onSelectContact?.(contact);
    onContactSelected?.(contact);
    onChange(contact.phone);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleClearSelection = () => {
    setSelectedContact(null);
    onSelectContact?.(null);
    onContactSelected?.(null);
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (showRecommendations) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 pl-9 pr-9 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

        {value && (
          <button
            type="button"
            onClick={handleClearSelection}
            title="Bersihkan input"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-0.5 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Indikator kontak terpilih */}
      {selectedContact && (
        <div className="mt-1 flex items-center justify-between px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-md text-[11px] text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="font-semibold truncate">{selectedContact.name}</span>
            <span className="font-mono text-[10px] opacity-80">({selectedContact.phone})</span>
          </div>
          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-sans shrink-0">
            Terpilih
          </span>
        </div>
      )}

      {/* Dropdown Rekomendasi Kontak */}
      {isOpen && showRecommendations && filteredContacts.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-900 text-[10px] uppercase font-semibold text-slate-500 dark:text-zinc-400 tracking-wider">
            Rekomendasi Kontak ({filteredContacts.length})
          </div>
          <div className="p-1 space-y-0.5">
            {filteredContacts.map((c) => {
              const isChosen = selectedContact?.id === c.id;
              return (
                <button
                  key={c.id || c.phone}
                  type="button"
                  onClick={() => handleSelectContact(c)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs transition-colors ${
                    isChosen
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-medium'
                      : 'hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-zinc-300 shrink-0">
                      {(c.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[11px] font-medium">{c.name}</div>
                      <div className="truncate text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                        {c.phone} {c.group ? `• ${c.group}` : ''}
                      </div>
                    </div>
                  </div>
                  {isChosen && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
