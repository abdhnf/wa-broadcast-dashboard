import React, { useState, useEffect } from 'react';
import { Send, Lock, ShieldCheck, AlertCircle, RefreshCw, KeyRound, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { saveApiConfig } from '../../lib/api';

export function LoginPage({ onLogin }) {
  // Host wa-api default mengikuti hostname dashboard saat ini (hostname yang sama,
  // port backend 3100), sehingga tidak ada alamat IP yang di-hardcode.
  const apiUrl = React.useMemo(() => {
    if (import.meta?.env?.VITE_WA_API_BASE) return import.meta.env.VITE_WA_API_BASE;
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:3100/api/v1`;
    }
    return 'http://127.0.0.1:3100/api/v1';
  }, []);
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

      // Bersihkan URL query parameter agar rapi
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      }

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0e12] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-sm space-y-4">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto text-white shadow-xs mb-2">
            <Send className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">WA Broadcast Suite</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Verifikasi Magic Launch Token & 6-Digit PIN</p>
        </div>

        <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
          
          {tokenDetected ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Token peluncuran terdeteksi. Silakan masukkan PIN 6-digit Anda.</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <span>Tidak ada token otomatis di URL. Anda dapat memasukkan token secara manual atau klik <strong>Blast App</strong> dari panel WA API.</span>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            {!tokenDetected && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Launch Token Unik</span>
                </label>
                <input
                  type="text"
                  placeholder="blst_xxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>6-Digit PIN Keamanan</span>
                </span>
                <span className="text-[10px] text-slate-400">Angka numerik</span>
              </label>
              <input
                type="password"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 px-3 text-center text-lg tracking-[0.4em] font-mono rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || pin.length !== 6 || !token}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
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

          <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 text-center">
            <a
              href={
                typeof window !== 'undefined'
                  ? `${window.location.protocol}//${window.location.hostname}:5174`
                  : 'http://127.0.0.1:5174'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-500 transition"
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
