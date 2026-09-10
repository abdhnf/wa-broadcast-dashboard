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
  Sparkles,
  Info,
  Globe
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';

export function SettingsPage({ settings: initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connResult, setConnResult] = useState(null);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://broadcast.domain.com';
  const callbackUrl = `${originUrl}/auth/google/callback`;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setConnResult(null);
    setTimeout(() => {
      setTestingConnection(false);
      setConnResult({ success: true, version: '5.3.0', latency: '6ms', queueReady: true });
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">Konfigurasi &amp; Autentikasi</h1>
        <p className="text-xs text-slate-400">
          Koneksi ke WA API Gateway, pengaturan toggle registrasi, dan integrasi Google OAuth Single Sign-On.
        </p>
      </div>

      {/* Card 1: Koneksi WhatsApp API Gateway */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Koneksi WhatsApp API Server</h2>
              <p className="text-xs text-slate-400">Fastify backend gateway URL dan credential x-api-key</p>
            </div>
          </div>
          <Badge variant="success">Connected</Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">WA API Server Endpoint URL</label>
            <input
              type="text"
              value={settings.serverUrl}
              onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-400">
              Contoh: <code>https://wa-api.domain.com/api/v1</code> atau internal IP <code>http://127.0.0.1:3100/api/v1</code>
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">WA API Key (x-api-key)</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.apiKey, 'apiKey')}
                  className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {copiedField === 'apiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs">
              {connResult && (
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Koneksi Sukses! Gateway v{connResult.version} &bull; Latensi {connResult.latency}
                </span>
              )}
            </div>
            <Button onClick={handleTestConnection} variant="secondary" size="sm" disabled={testingConnection}>
              <span>{testingConnection ? 'Memeriksa...' : 'Test Connection'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Card 2: Pengaturan Autentikasi Pengguna */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Pengaturan Autentikasi &amp; Pendaftaran</h2>
              <p className="text-xs text-slate-400">Kebijakan registrasi form manual dan Google Sign-In</p>
            </div>
          </div>
        </div>

        {/* Toggle Pendaftaran Publik */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">Izinkan Pendaftaran Akun Baru (Form Manual)</div>
            <p className="text-[11px] text-slate-400 max-w-lg">
              Jika dimatikan, pendaftaran mandiri via email/password ditutup. Pengguna hanya dapat dibuatkan oleh Admin atau login via Google OAuth.
            </p>
          </div>
          <Switch
            checked={settings.publicRegistration}
            onCheckedChange={(val) => setSettings({ ...settings, publicRegistration: val })}
          />
        </div>

        {/* Google OAuth SSO */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">Google OAuth 2.0 Single Sign-On</span>
              <Badge variant={settings.googleAuthEnabled ? 'success' : 'default'}>
                {settings.googleAuthEnabled ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>
            <Switch
              checked={settings.googleAuthEnabled}
              onCheckedChange={(val) => setSettings({ ...settings, googleAuthEnabled: val })}
            />
          </div>

          {settings.googleAuthEnabled && (
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Google Client ID</label>
                  <input
                    type="text"
                    value={settings.googleClientId}
                    onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Google Client Secret</label>
                  <input
                    type="password"
                    value={settings.googleClientSecret}
                    onChange={(e) => setSettings({ ...settings, googleClientSecret: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Allowed Email / Domain Whitelist</label>
                <input
                  type="text"
                  placeholder="@kantor.id, @fapet.id, @abdhnf.com"
                  value={settings.googleAllowedDomains}
                  onChange={(e) => setSettings({ ...settings, googleAllowedDomains: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400">
                  Kosongkan jika ingin mengizinkan semua akun Google publik login.
                </span>
              </div>

              {/* Panduan Google Cloud Console */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Daftarkan URL ini di Google Cloud Console (OAuth 2.0 Web Client):</span>
                </div>

                {/* JavaScript Origin */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">Authorized JavaScript origins:</span>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
                    <span>{originUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(originUrl, 'origin')}
                      className="p-1 hover:text-white text-slate-400 cursor-pointer"
                    >
                      {copiedField === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Redirect URIs */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">Authorized redirect URIs:</span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
                      <span>{originUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(originUrl, 'red1')}
                        className="p-1 hover:text-white text-slate-400 cursor-pointer"
                      >
                        {copiedField === 'red1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
                      <span>{callbackUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(callbackUrl, 'red2')}
                        className="p-1 hover:text-white text-slate-400 cursor-pointer"
                      >
                        {copiedField === 'red2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <Button variant="primary">
            Simpan Semua Pengaturan
          </Button>
        </div>
      </div>
    </div>
  );
}
