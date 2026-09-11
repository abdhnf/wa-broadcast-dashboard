import React, { useCallback, useEffect, useState } from 'react';
import {
  Send,
  Users,
  FolderKanban,
  FileText,
  Terminal,
  Settings,
  Menu,
  X,
  Radio,
  LogOut
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Badge } from './ui/Badge';
import { fetchSessions } from '../lib/api';

export function Layout({ currentTab, onTabChange, user, onLogout, metrics, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Status gateway diambil dari hasil panggilan nyata ke wa-api. Sebelumnya
  // label ini selalu "Online" sehingga pengguna tidak pernah tahu backend mati
  // atau alamatnya salah.
  const [gatewayStatus, setGatewayStatus] = useState('memeriksa');

  const checkGateway = useCallback(async () => {
    try {
      await fetchSessions();
      setGatewayStatus('online');
    } catch (err) {
      // 401/403/429 tetap berarti gateway terjangkau, hanya kredensialnya
      // bermasalah — bukan koneksi putus.
      setGatewayStatus(err?.status ? 'online' : 'offline');
    }
  }, []);

  useEffect(() => {
    void checkGateway();
    const timer = setInterval(() => void checkGateway(), 30000);
    return () => clearInterval(timer);
  }, [checkGateway]);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Radio },
    { id: 'broadcast', label: 'Blast Engine', icon: Send, badge: 'Live' },
    // Angka lencana diambil dari data yang benar-benar dimuat. Sebelumnya
    // Segments dan Templates di-hardcode (4 dan 3), sehingga angkanya bohong
    // begitu dashboard tersambung ke MySQL.
    { id: 'contacts', label: 'Contacts', icon: Users, count: metrics?.totalContacts },
    { id: 'groups', label: 'Segments', icon: FolderKanban, count: metrics?.totalGroups },
    { id: 'templates', label: 'Templates', icon: FileText, count: metrics?.totalTemplates },
    { id: 'playground', label: 'Playground', icon: Terminal },
    { id: 'settings', label: 'API & Auth', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0e12] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0f1117]/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Brand / Logo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onTabChange('dashboard')}>
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">WA Broadcast</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium hidden sm:inline">Suite CRM</span>
                </div>
              </div>
            </div>

            {/* Right Tools: Server Status, Theme Toggle, Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  gatewayStatus === 'online'
                    ? 'bg-emerald-500 animate-pulse'
                    : gatewayStatus === 'offline'
                      ? 'bg-rose-500'
                      : 'bg-amber-400 animate-pulse'
                }`} />
                <span className="text-slate-500 dark:text-zinc-400 font-mono">Gateway 3100:</span>
                <span className={`font-mono font-semibold ${
                  gatewayStatus === 'online'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : gatewayStatus === 'offline'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {gatewayStatus === 'online' ? 'Online' : gatewayStatus === 'offline' ? 'Terputus' : 'Memeriksa'}
                </span>
              </div>

              {/* Theme Toggle (Dark / Light / System) */}
              <ThemeToggle />

              {/* User Avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-zinc-800">
                <img
                  src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full border border-slate-300 dark:border-zinc-700 object-cover"
                />
                <div className="hidden sm:block text-left leading-none">
                  <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{user?.name || "Admin"}</div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 capitalize">{user?.role || "admin"}</span>
                </div>
              </div>

              {/* Tombol Logout / Kunci Dashboard */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-850 transition cursor-pointer"
                  title="Keluar / Kunci Dashboard"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Nav Tab Bar RATA TENGAH (justify-center) */}
          <nav className="hidden md:flex items-center justify-center space-x-1.5 border-t border-slate-100 dark:border-zinc-800/60 py-1.5 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-mono font-bold">
                      {item.badge}
                    </span>
                  ) : Number.isFinite(item.count) ? (
                    <span className={`text-[10px] font-mono ${isActive ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-400 dark:text-zinc-500'}`}>
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Drawer Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#0f1117] border-b border-slate-200 dark:border-zinc-800 px-4 py-3 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {Number.isFinite(item.count) && (
                  <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">{item.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 flex items-center justify-around px-2 py-2 safe-area-bottom">
        {[
          { id: 'dashboard', label: 'Overview', icon: Radio },
          { id: 'broadcast', label: 'Blast', icon: Send },
          { id: 'contacts', label: 'Contacts', icon: Users },
          { id: 'groups', label: 'Segments', icon: FolderKanban },
          { id: 'templates', label: 'Templates', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center p-1 rounded-md text-[10px] transition-colors ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center p-1 rounded-md text-[10px] text-slate-500 dark:text-zinc-400"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
