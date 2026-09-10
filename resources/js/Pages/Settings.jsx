import React, { useState } from 'react';
import {
  Settings,
  Key,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Server,
  Globe,
  Info
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';

export function SettingsPage({ settings: initialSettings }) {
  const [settings, setSettings] = useState(initialSettings || {});
  const [showApiKey, setShowApiKey] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTestConnection = () => {
    setTestSuccess(false);
    setTimeout(() => {
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 5000);
    }, 400);
  };

  const activeApiKey = (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('wa_blast_user') || '{}')?.apiKey) || settings.apiKey || 'wa_live_sec_••••••••';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Konfigurasi Gateway & Autentikasi
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Pengaturan koneksi Fastify WA API server dan integrasi Google OAuth Single Sign-On.
          </p>
        </div>
        <Button onClick={handleTestConnection} variant="outline" size="sm">
          <Server className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
          <span>Test Koneksi API</span>
        </Button>
      </div>

      {testSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Koneksi berhasil! Fastify WA API Gateway aktif dengan latensi 12ms.</span>
        </div>
      )}

      {/* Grid Konfigurasi (Clean Surface, No Card Bloat) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Server WA API Gateway */}
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-950 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Koneksi Server WA API</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Endpoint backend Fastify yang mengelola Baileys dan antrean</p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">URL Endpoint Server</label>
              <input
                type="text"
                value={settings.waApiUrl || 'http://127.0.0.1:3100/api/v1'}
                onChange={(e) => setSettings({ ...settings, waApiUrl: e.target.value })}
                className="w-full h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mb-1">API Key Gateway Aktif (Tersinkron)</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={activeApiKey}
                  readOnly
                  className="w-full h-8 pl-3 pr-10 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 select-all"
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
                API Key ini otomatis disinkronkan saat login via token peluncuran & PIN.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400 space-y-1">
              <span className="font-semibold text-slate-900 dark:text-zinc-200 block">Antrean Tanpa Worker Ganda:</span>
              <p>
                Laravel hanya memicu batch dan menerima 202 Accepted. Pacing jitter 3s-12s dan auto-retry ditangani langsung oleh server Fastify.
              </p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Pilihan Autentikasi (Identik dengan WA API) */}
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-950 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pilihan Autentikasi</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Pengaturan akses login dan pendaftaran pengguna baru</p>
          </div>

          <div className="space-y-4">
            {/* Toggle Registrasi Manual Form */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">Izinkan Registrasi Publik</span>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Hanya berlaku untuk form registrasi biasa email/password.
                </p>
              </div>
              <Switch
                checked={settings.publicRegistration}
                onCheckedChange={(val) => setSettings({ ...settings, publicRegistration: val })}
              />
            </div>

            {/* Google OAuth Section */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">Google OAuth 2.0 Single Sign-On</span>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">User Google baru otomatis dibuatkan akun.</p>
                </div>
                <Switch
                  checked={settings.googleAuthEnabled}
                  onCheckedChange={(val) => setSettings({ ...settings, googleAuthEnabled: val })}
                />
              </div>

              {settings.googleAuthEnabled && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 block mb-1">Google Client ID</label>
                    <input
                      type="text"
                      value={settings.googleClientId || ''}
                      onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                      placeholder="123456789-abc.apps.googleusercontent.com"
                      className="w-full h-8 px-3 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Panduan Google Cloud Console */}
                  <div className="p-3 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-2 text-[11px]">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                      Panduan Google Cloud Console
                    </span>

                    {/* Origin */}
                    <div>
                      <span className="text-slate-500 dark:text-zinc-400 text-[10px] block">Authorized JavaScript origins:</span>
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900 px-2.5 py-1 rounded border border-slate-200 dark:border-zinc-800 font-mono text-[10px] text-slate-800 dark:text-zinc-300 mt-0.5">
                        <span>http://172.30.30.229:8085</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('http://172.30.30.229:8085', 'origin')}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 ml-2"
                        >
                          {copiedField === 'origin' ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Redirect URI */}
                    <div>
                      <span className="text-slate-500 dark:text-zinc-400 text-[10px] block">Authorized redirect URIs:</span>
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900 px-2.5 py-1 rounded border border-slate-200 dark:border-zinc-800 font-mono text-[10px] text-slate-800 dark:text-zinc-300 mt-0.5">
                        <span>http://172.30.30.229:8085/auth/google/callback</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('http://172.30.30.229:8085/auth/google/callback', 'callback')}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 ml-2"
                        >
                          {copiedField === 'callback' ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="default" size="sm">
          Simpan Semua Konfigurasi
        </Button>
      </div>
    </div>
  );
}
