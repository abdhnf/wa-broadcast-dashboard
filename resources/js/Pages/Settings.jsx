import React, { useCallback, useEffect, useState } from 'react';
import {
  Key,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Server,
  AlertCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import {
  fetchRemoteSettings,
  fetchSessions,
  getApiConfig,
  updateRemoteSettings,
  STORAGE_USER,
} from '../lib/api';

/**
 * Halaman Konfigurasi.
 *
 * Sumber kebenaran ada di `wa-api` (endpoint `/settings`), karena pengaturan
 * autentikasi berlaku untuk gateway, bukan untuk dashboard ini. Sebelumnya
 * halaman ini hanya mengubah state React dan tombol simpannya tidak melakukan
 * apa pun, sehingga pengguna mengira pengaturan tersimpan padahal hilang saat
 * halaman dimuat ulang.
 *
 * Seluruh endpoint `/settings` di wa-api khusus admin, jadi pengguna non-admin
 * hanya melihat salinan read-only.
 */
export function SettingsPage({ user, sessions = [] }) {
  const [remote, setRemote] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const [form, setForm] = useState({
    registrationEnabled: true,
    googleAuthEnabled: false,
    googleClientId: '',
    googleClientSecret: '',
    googleAllowedDomains: '',
    blastDashboardUrl: '',
  });

  const apiConfig = getApiConfig();
  const activeApiKey = user?.apiKey || apiConfig?.apiKey || '';

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  /**
   * Muat pengaturan dari wa-api.
   *
   * 403 berarti akun ini bukan admin — bukan kegagalan, hanya akses terbatas;
   * itu dibedakan dari galat jaringan supaya pesannya tidak menyesatkan.
   */
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await fetchRemoteSettings();
      setRemote(settings);
      setIsAdmin(true);
      setForm({
        registrationEnabled: Boolean(settings?.registrationEnabled),
        googleAuthEnabled: Boolean(settings?.googleAuthEnabled),
        googleClientId: settings?.googleClientId || '',
        // Secret tidak pernah dikirim balik oleh server; dibiarkan kosong dan
        // hanya ditulis bila pengguna mengetik nilai baru.
        googleClientSecret: '',
        googleAllowedDomains: settings?.googleAllowedDomains || '',
        blastDashboardUrl: settings?.blastDashboardUrl || '',
      });
      setFeedback(null);
    } catch (err) {
      if (err?.status === 403) {
        setIsAdmin(false);
        setFeedback(null);
      } else {
        setFeedback({ tone: 'error', message: err?.message || 'Gagal memuat pengaturan dari wa-api.' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleTestConnection = async () => {
    setFeedback(null);
    try {
      const list = await fetchSessions();
      setFeedback({
        tone: 'success',
        message: `Terhubung ke ${apiConfig?.base || 'wa-api'}. Ditemukan ${list.length} sesi WhatsApp pada akun ini.`,
      });
    } catch (err) {
      setFeedback({ tone: 'error', message: err?.message || 'Tidak bisa menghubungi wa-api.' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      // Hanya field yang benar-benar diubah yang dikirim, supaya secret lama
      // tidak ikut tertimpa nilai kosong.
      const payload = {
        registrationEnabled: form.registrationEnabled,
        googleAuthEnabled: form.googleAuthEnabled,
        googleClientId: form.googleClientId.trim(),
        googleAllowedDomains: form.googleAllowedDomains.trim(),
        blastDashboardUrl: form.blastDashboardUrl.trim(),
      };
      if (form.googleClientSecret.trim()) {
        payload.googleClientSecret = form.googleClientSecret.trim();
      }

      await updateRemoteSettings(payload);
      setFeedback({ tone: 'success', message: 'Pengaturan tersimpan di wa-api dan langsung berlaku untuk semua klien.' });
      await loadSettings();
    } catch (err) {
      setFeedback({ tone: 'error', message: err?.message || 'Gagal menyimpan pengaturan.' });
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    'w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-60';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Konfigurasi Gateway & Autentikasi
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {isAdmin
              ? 'Pengaturan tersimpan di wa-api dan berlaku untuk seluruh klien, termasuk panel dan dashboard ini.'
              : 'Akun ini bukan admin, jadi pengaturan hanya bisa dilihat, bukan diubah.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleTestConnection} variant="outline" size="sm">
            <Server className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            <span>Test Koneksi</span>
          </Button>
          {isAdmin && (
            <Button onClick={handleSave} variant="default" size="sm" disabled={saving || loading}>
              {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
            feedback.tone === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {!isAdmin && !loading && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <Shield className="w-4 h-4 shrink-0 mt-px" />
          <span>Pengaturan autentikasi hanya dapat diubah oleh admin wa-api lewat panel.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Koneksi ke wa-api */}
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-950 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Koneksi Server WA API</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Endpoint backend Fastify yang mengelola Baileys dan antrean
            </p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                URL Endpoint Aktif
              </label>
              <input type="text" value={apiConfig?.base || ''} readOnly className={fieldClass} />
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                URL diatur lewat <code className="font-mono">VITE_WA_API_BASE</code> saat build, atau otomatis mengikuti host
                halaman ini. Diubah lewat pengaturan di bawah, bukan dari kolom ini.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                API Key Gateway Aktif
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={activeApiKey}
                  readOnly
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                Disinkronkan otomatis saat login lewat link peluncuran + PIN.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400 space-y-1">
              <span className="font-semibold text-slate-900 dark:text-zinc-200 block">Sesi WhatsApp Terhubung</span>
              <p>
                {sessions.length > 0
                  ? `${sessions.length} sesi terdaftar di akun ini.`
                  : 'Belum ada sesi WhatsApp pada akun ini. Hubungkan nomor lewat panel wa-api.'}
              </p>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                URL Dashboard Blast
              </label>
              <input
                type="text"
                value={form.blastDashboardUrl}
                onChange={(e) => setForm({ ...form, blastDashboardUrl: e.target.value })}
                disabled={!isAdmin}
                placeholder="http://host:8085"
                className={fieldClass}
              />
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                Dipakai saat wa-api membuat link peluncuran ke dashboard ini.
              </p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Pengaturan autentikasi (tersimpan di wa-api) */}
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-950 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pilihan Autentikasi</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Berlaku di wa-api, bukan hanya di dashboard ini
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void loadSettings()} disabled={loading} className="h-7">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">Izinkan Registrasi Publik</span>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Berlaku untuk form registrasi email/password di panel wa-api.
                </p>
              </div>
              <Switch
                checked={form.registrationEnabled}
                disabled={!isAdmin}
                onCheckedChange={(val) => setForm({ ...form, registrationEnabled: val })}
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                    Google OAuth 2.0 Single Sign-On
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">User Google baru otomatis dibuatkan akun.</p>
                </div>
                <Switch
                  checked={form.googleAuthEnabled}
                  disabled={!isAdmin}
                  onCheckedChange={(val) => setForm({ ...form, googleAuthEnabled: val })}
                />
              </div>

              {form.googleAuthEnabled && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                      Google Client ID
                    </label>
                    <input
                      type="text"
                      value={form.googleClientId}
                      onChange={(e) => setForm({ ...form, googleClientId: e.target.value })}
                      disabled={!isAdmin}
                      placeholder="123456789-abc.apps.googleusercontent.com"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                      Google Client Secret
                    </label>
                    <input
                      type="password"
                      value={form.googleClientSecret}
                      onChange={(e) => setForm({ ...form, googleClientSecret: e.target.value })}
                      disabled={!isAdmin}
                      placeholder={
                        remote?.hasClientSecret
                          ? 'Sudah tersimpan (isi hanya bila ingin mengganti)'
                          : 'Belum diisi'
                      }
                      className={fieldClass}
                    />
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                      Nilai lama tidak pernah dikirim ke browser, jadi kolom ini selalu kosong saat dibuka.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">
                      Domain Google yang Diizinkan
                    </label>
                    <input
                      type="text"
                      value={form.googleAllowedDomains}
                      onChange={(e) => setForm({ ...form, googleAllowedDomains: e.target.value })}
                      disabled={!isAdmin}
                      placeholder="perusahaan.com, tim.co.id"
                      className={fieldClass}
                    />
                  </div>

                  {origin && (
                    <div className="p-3 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-2 text-[11px]">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                        Nilai untuk Google Cloud Console
                      </span>

                      <div>
                        <span className="text-slate-500 dark:text-zinc-400 text-[10px] block">
                          Authorized JavaScript origins:
                        </span>
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900 px-2.5 py-1 rounded border border-slate-200 dark:border-zinc-800 font-mono text-[10px] text-slate-800 dark:text-zinc-300 mt-0.5">
                          <span className="truncate">{origin}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(origin, 'origin')}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 ml-2 shrink-0"
                          >
                            {copiedField === 'origin' ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 dark:text-zinc-400 text-[10px] block">
                          Authorized redirect URIs:
                        </span>
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900 px-2.5 py-1 rounded border border-slate-200 dark:border-zinc-800 font-mono text-[10px] text-slate-800 dark:text-zinc-300 mt-0.5">
                          <span className="truncate">{`${origin}/auth/google/callback`}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`${origin}/auth/google/callback`, 'callback')}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 ml-2 shrink-0"
                          >
                            {copiedField === 'callback' ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>Callback Google pada dashboard ini belum punya rute; alur SSO dijalankan dari panel wa-api.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
            <Key className="w-3.5 h-3.5" />
            <span>Perubahan disimpan ke wa-api dan langsung dipakai panel serta dashboard.</span>
          </div>
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Menyimpan...' : 'Simpan Semua Konfigurasi'}
          </Button>
        </div>
      )}
    </div>
  );
}
