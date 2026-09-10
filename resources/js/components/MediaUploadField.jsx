import React, { useRef, useState } from 'react';
import { UploadCloud, File, Image, CheckCircle2, X } from 'lucide-react';
import { Button } from './ui/Button';

export function MediaUploadField({ mediaUrl, onMediaChange, mediaType = 'image', onMediaTypeChange }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    // Deteksi tipe media
    if (file.type.startsWith('image/')) {
      if (onMediaTypeChange) onMediaTypeChange('image');
    } else if (file.type.startsWith('video/')) {
      if (onMediaTypeChange) onMediaTypeChange('video');
    } else if (file.type.startsWith('audio/')) {
      if (onMediaTypeChange) onMediaTypeChange('audio');
    } else {
      if (onMediaTypeChange) onMediaTypeChange('document');
    }

    // Convert file ke Data URL (Base64) agar bisa disimpan di storage/state & dipratinjau langsung
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      onMediaChange(dataUrl);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    onMediaChange('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xlsx"
      />

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={mediaUrl || ''}
          onChange={(e) => onMediaChange(e.target.value)}
          placeholder="Upload file lokal atau tempel URL https://..."
          className="flex-1 h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
        />

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs"
        >
          <UploadCloud className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
          <span>{isUploading ? 'Menyimpan...' : 'Pilih File'}</span>
        </Button>

        {mediaUrl && (
          <Button
            type="button"
            onClick={handleClear}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-rose-500"
            title="Hapus media"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {fileName && mediaUrl && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>File tersimpan: {fileName}</span>
        </div>
      )}
    </div>
  );
}
