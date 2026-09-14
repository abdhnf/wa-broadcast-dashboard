import React, { useState, useEffect } from 'react';
import { Send, Lock, ShieldCheck, AlertCircle, RefreshCw, KeyRound, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { saveApiConfig } from '../../lib/api';
import { resolveWaApiBase, resolveWaPanelUrl } from '../../lib/endpoints';

export function LoginPage({ onLogin }) {
  const apiUrl = React.useMemo(() => resolveWaApiBase(), []);
  const panelUrl = React.useMemo(() => resolveWaPanelUrl(), []);
  const [token, setToken] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenDetected, setTokenDetected] = useState(false);

  // Baca token dari URL query string ?token=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        setToken(urlToken);
        setTokenDetected(true);
      }
    }
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Token peluncuran unik wajib disertakan. Buka dashboard melalui panel WhatsApp API.');
      return;
    }

    if (!/^\d{6}$/.test(pin.trim())) {
      setError('PIN keamanan wajib berupa 6 digit angka.');
      return;
    }

    setLoading(true);
    try {
      // Panggil endpoint verifikasi handshake di backend wa-api
      const response = await fetch(`${apiUrl}/auth/verify-blast-launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Autentikasi gagal. Pastikan token belum kedaluwarsa dan PIN sesuai.');
        return;
      }

      // Pertahankan URL di address bar (termasuk ?token=...) agar user bisa langsung bookmark
      // Tidak menghapus query parameter token saat login sukses

      // Login berhasil, berikan data profil & API Key ke state global app
      saveApiConfig({ url: apiUrl, apiKey: data.user.apiKey });
      onLogin({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        apiKey: data.user.apiKey,
        quotaPerWeek: data.user.quotaPerWeek,
        quotaLimit: data.user.quotaLimit,
        usedInPeriod: data.user.usedInPeriod,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.name)}&background=059669&color=fff`,
      });

    } catch {
      setError('Gagal menghubungi server WA API gateway. Pastikan backend di port 3100 aktif.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-shell  text-ink flex items-center justify-center p-4 font-sans selection:bg-brand selection:text-white">
      <div className="w-full max-w-sm space-y-4">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center mx-auto text-white  mb-2">
            <Send className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-ink dark:text-white">WA Broadcast Suite</h1>
          <p className="text-xs text-ink-muted text-ink-muted">Verifikasi Magic Launch Token & 6-Digit PIN</p>
        </div>

        <div className="border border-line border-line rounded-lg p-6 bg-surface bg-surface  space-y-4">
          
          {tokenDetected ? (
            <div className="p-3 rounded-lg bg-brand-wash  border border-brand-line flex items-center gap-2 text-xs text-brand-deep">
              <ShieldCheck className="w-4 h-4 shrink-0 text-brand-deep" />
              <span>Token peluncuran terdeteksi. Silakan masukkan PIN 6-digit Anda.</span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-honey-wash  border border-honey-line flex items-start gap-2 text-xs text-amber-800 text-honey">
              <AlertCircle className="w-4 h-4 shrink-0 text-honey text-honey mt-0.5" />
              <div>
                <span>Tidak ada token otomatis di URL. Anda dapat memasukkan token secara manual atau klik <strong>Blast App</strong> dari panel WA API.</span>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            {!tokenDetected && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft text-ink-soft flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-ink-faint" />
                  <span>Launch Token Unik</span>
                </label>
                <input
                  type="text"
                  placeholder="Masukkan token akses blast (misal: 32 karakter hex)"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-xs font-mono text-ink placeholder:text-ink-faint focus:outline-hidden focus:border-brand"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-soft text-ink-soft flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-ink-faint" />
                  <span>6-Digit PIN Keamanan</span>
                </span>
                <span className="text-[10px] text-ink-faint">Angka numerik</span>
              </label>
              <input
                type="password"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 px-3 text-center text-lg tracking-[0.4em] font-mono rounded-lg border border-line border-line bg-surface bg-surface text-ink dark:text-white focus:outline-hidden focus:border-brand"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-clay-wash dark:bg-rose-950/50 border border-clay-line text-xs text-clay text-clay flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || pin.length !== 6 || !token}
              className="w-full h-10 bg-brand hover:bg-brand-strong text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer "
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi PIN...</span>
                </div>
              ) : (
                <span>Buka Blast Dashboard</span>
              )}
            </Button>
          </form>

          <div className="pt-2 border-t border-line text-center">
            <a
              href={panelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-ink-faint hover:text-brand transition"
            >
              <span>Buka Panel Manajemen WA API</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
