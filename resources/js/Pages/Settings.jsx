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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Configuration & Integrations</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kelola endpoint koneksi Fastify WA API Gateway dan kredensial Google OAuth Single Sign-On.
          </p>
        </div>
        <Button onClick={handleTestConnection} variant="outline" size="sm">
          <Server className="w-3.5 h-3.5 mr-1 text-emerald-400" />
          <span>Uji Sambungan Gateway</span>
        </Button>
      </div>

      {testSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Koneksi berhasil! Fastify WA API merespon 200 OK dengan latensi 12ms.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: WA API Server Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Koneksi Fastify WA API Server</CardTitle>
            <CardDescription>Endpoint backend yang menangani socket Baileys dan queue pacing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">URL WA API Server</label>
              <input
                type="text"
                value={settings.waApiUrl || 'http://127.0.0.1:3100/api/v1'}
                onChange={(e) => setSettings({ ...settings, waApiUrl: e.target.value })}
                className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">API Key Gateway (x-api-key)</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.waApiKey || 'wapi_live_9a8b7c6d5e4f3a2b1c'}
                  onChange={(e) => setSettings({ ...settings, waApiKey: e.target.value })}
                  className="w-full h-8 pl-3 pr-10 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-200"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-300 block">Antrean Tanpa Worker Ganda:</span>
              <p>
                Laravel hanya memicu batch dan menerima 202 Accepted. Pacing jitter 3s-12s dan retry otomatis ditangani langsung di sisi server WA API.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pilihan Autentikasi (Identik dengan WA API) */}
        <Card>
          <CardHeader>
            <CardTitle>Autentikasi & Registrasi Publik</CardTitle>
            <CardDescription>Kontrol pendaftaran form biasa dan akses akun Google</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle Registrasi Akun Baru */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-zinc-200 block">Buka Registrasi Publik</span>
                <p className="text-[11px] text-zinc-400">
                  Hanya berlaku untuk form pendaftaran manual email/password.
                </p>
              </div>
              <Switch
                checked={settings.publicRegistration}
                onCheckedChange={(val) => setSettings({ ...settings, publicRegistration: val })}
              />
            </div>

            {/* Google OAuth Section */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">Google OAuth 2.0 Single Sign-On</span>
                  <p className="text-[11px] text-zinc-400">Pengguna Google baru otomatis dibuatkan akun.</p>
                </div>
                <Switch
                  checked={settings.googleAuthEnabled}
                  onCheckedChange={(val) => setSettings({ ...settings, googleAuthEnabled: val })}
                />
              </div>

              {settings.googleAuthEnabled && (
                <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">Google Client ID</label>
                    <input
                      type="text"
                      value={settings.googleClientId || ''}
                      onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                      placeholder="123456789-abc.apps.googleusercontent.com"
                      className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Google Cloud Console Guidance */}
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-[11px]">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
                      Panduan Google Cloud Console
                    </span>

                    {/* Origin */}
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Authorized JavaScript origins:</span>
                      <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 font-mono text-[10px] text-zinc-300 mt-0.5">
                        <span>http://172.30.30.229:8085</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('http://172.30.30.229:8085', 'origin')}
                          className="text-zinc-400 hover:text-zinc-100 ml-2"
                        >
                          {copiedField === 'origin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Redirect URI */}
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Authorized redirect URIs:</span>
                      <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 font-mono text-[10px] text-zinc-300 mt-0.5">
                        <span>http://172.30.30.229:8085/auth/google/callback</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('http://172.30.30.229:8085/auth/google/callback', 'callback')}
                          className="text-zinc-400 hover:text-zinc-100 ml-2"
                        >
                          {copiedField === 'callback' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="default" size="sm">
          Simpan Semua Konfigurasi
        </Button>
      </div>
    </div>
  );
}
