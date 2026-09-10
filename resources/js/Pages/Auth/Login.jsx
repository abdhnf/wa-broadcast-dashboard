import React, { useState } from 'react';
import { Send, Lock, Mail, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function LoginPage({ onLogin, registrationEnabled = false, googleAuthEnabled = true }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({
      id: 'usr_admin',
      name: 'Admin Developer',
      email: email || 'admin@example.com',
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="w-full max-w-sm space-y-4">
        {/* Logo and Brand */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 mb-2">
            <Send className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">WhatsApp Broadcast CRM</h1>
          <p className="text-xs text-zinc-400">Masuk untuk mengelola blast dan gateway WhatsApp</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Masuk Akun</CardTitle>
            <CardDescription>Gunakan email terdaftar atau akun Google Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tombol Google OAuth Modern Glassmorphism */}
            {googleAuthEnabled && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    onLogin({
                      id: 'usr_google_user',
                      name: 'Google User',
                      email: 'user@company.com',
                      role: 'admin',
                      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                    });
                  }}
                  className="w-full h-9 px-3 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 transition-colors flex items-center justify-center gap-2.5 text-xs text-zinc-200 font-medium cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Lanjut dengan Google</span>
                </button>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono">
                    <span className="bg-zinc-950 px-2 text-zinc-500">atau dengan email</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <Button type="submit" variant="default" size="sm" className="w-full">
                <span className="text-zinc-950 font-semibold">Masuk ke Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 text-zinc-950" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-center text-[10px] text-zinc-500 font-mono">
          Fastify WA API &bull; Laravel 13 &bull; Radix UI Primitives
        </div>
      </div>
    </div>
  );
}
