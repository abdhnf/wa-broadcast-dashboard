import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { uploadMediaFile } from '../lib/api';

/**
 * Unggah berkas media ke storage `wa-api`, lalu simpan URL hasilnya.
 *
 * Berkas TIDAK disimpan di storage Laravel. Dashboard hanya menitipkan berkas
 * ke `wa-api` (`POST /api/v1/media/upload`) yang mengembalikan URL publik ber-TTL
 * (`/api/v1/media/<id>`), lalu URL itu yang dikirim balik ke `wa-api` saat
 * `/messages/send-media`. Jadi satu storage saja yang dipakai dan berkas tidak
 * pernah menggantung di sisi dashboard.
 *
 * Jalur cadangan Laravel `/upload-media` sudah dihapus: route-nya tidak pernah
 * didaftarkan di `routes/web.php`, sehingga setiap kali `wa-api` balas 404,
 * pengguna hanya melihat galat "Gagal mengunggah" tanpa sebab yang jelas.
 */

/** Batas ukuran mengikuti body limit `wa-api` (50 MB) dengan margin aman. */
const MAX_FILE_BYTES = 16 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function MediaUploadField({ mediaUrl, onMediaChange, mediaType = 'image', onMediaTypeChange, fileName: externalFileName, onFileNameChange }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localFileName, setLocalFileName] = useState('');
  const [error, setError] = useState('');

  const currentFileName = externalFileName !== undefined ? externalFileName : localFileName;
  const updateFileName = (val) => {
    setLocalFileName(val);
    onFileNameChange?.(val);
  };

  const detectAndApplyType = (file) => {
    if (!onMediaTypeChange) return;
    if (file.type.startsWith('image/')) onMediaTypeChange('image');
    else if (file.type.startsWith('video/')) onMediaTypeChange('video');
    else if (file.type.startsWith('audio/')) onMediaTypeChange('audio');
    else onMediaTypeChange('document');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Tolak terlalu awal dengan pesan yang menyebut ukuran aslinya, daripada
    // membuang waktu unggah lalu ditolak backend tanpa penjelasan.
    if (file.size > MAX_FILE_BYTES) {
      setError(`Berkas terlalu besar (${formatSize(file.size)}). Batas maksimum ${formatSize(MAX_FILE_BYTES)}.`);
      updateFileName('');
      onMediaChange('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    updateFileName(file.name);
    detectAndApplyType(file);

    try {
      const result = await uploadMediaFile(file);
      if (!result?.url) throw new Error('Server tidak mengembalikan URL berkas.');
      onMediaChange(result.url);
      if (result.fileName) {
        updateFileName(result.fileName);
      }
    } catch (err) {
      setError(err?.message || 'Gagal mengunggah berkas ke wa-api.');
      onMediaChange('');
      updateFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    onMediaChange('');
    updateFileName('');
    setError('');
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
          placeholder={isUploading ? 'Mengunggah berkas...' : 'Upload file lokal atau tempel URL https://...'}
          className="flex-1 h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
        />

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs"
        >
          <UploadCloud className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
          <span>{isUploading ? 'Mengunggah...' : 'Pilih File'}</span>
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

      {currentFileName && mediaUrl && !error && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Berkas siap dikirim: {currentFileName}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-[10px] text-slate-400 dark:text-zinc-500">
        Berkas disimpan di storage wa-api dan otomatis dibersihkan setelah 6 jam.
      </p>
    </div>
  );
}
