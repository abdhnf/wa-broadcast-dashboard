import React, { useCallback, useEffect, useState } from 'react';
import {
  Send,
  Users,
  FolderKanban,
  FileText,
  Terminal,
  Settings,
  X,
  Radio,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  LayoutDashboard,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const STORAGE_COLLAPSED = 'blast_sidebar_collapsed';

const navItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, desc: 'Ringkasan performa' },
  { id: 'broadcast', label: 'Blast Engine', icon: Send, badgeKey: 'activeCampaigns', desc: 'Kirim massal' },
  { id: 'contacts', label: 'Contacts', icon: Users, badgeKey: 'contactsTotal', desc: 'Database nomor' },
  { id: 'groups', label: 'Segments', icon: FolderKanban, badgeKey: 'groupsTotal', desc: 'Grup audiens' },
  { id: 'templates', label: 'Templates', icon: FileText, badgeKey: 'templatesTotal', desc: 'Pustaka pesan' },
  { id: 'playground', label: 'Playground', icon: Terminal, desc: 'Simulator endpoint' },
  { id: 'settings', label: 'API & Auth', icon: Settings, desc: 'Kredensial gateway' },
];

const coreBottomNav = navItems.slice(0, 4);

export function Layout({ currentTab, onTabChange, user, onLogout, metrics, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_COLLAPSED, String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const handlePick = (id) => {
    onTabChange?.(id);
    setDrawerOpen(false);
  };

  const navButton = (item, isCompact) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    const count = metrics?.[item.badgeKey];

    if (isCompact) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handlePick(item.id)}
          className={`blast-nav-item blast-nav-item-compact ${isActive ? 'active' : ''}`}
          title={`${item.label}${typeof count === 'number' ? ` (${count})` : ''}`}
          aria-current={isActive ? 'page' : undefined}
        >
          <Icon className="w-5 h-5 shrink-0" />
        </button>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handlePick(item.id)}
        className={`blast-nav-item ${isActive ? 'active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {typeof count === 'number' && (
          <span className="blast-badge blast-badge-slate font-mono ml-auto text-[10px]">
            {count}
          </span>
        )}
      </button>
    );
  };

  const gatewayStatus = metrics?.gatewayStatus || 'online';

  return (
    <div className="min-h-screen bg-shell text-ink flex flex-col font-sans">
      {/* Sticky Topbar: h-14, bersih tanpa user info/logout (dipindah ke sidebar bawah) */}
      <header className="sticky top-0 z-30 h-14 bg-surface/95 backdrop-blur-sm border-b border-line">
        <div className="flex items-center justify-between h-full px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Toggle collapse sidebar desktop */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="blast-control blast-control-secondary !hidden lg:!inline-flex w-9 !px-0 justify-center"
              title={sidebarCollapsed ? 'Buka lebar sidebar' : 'Ciutkan sidebar ke ikon'}
              aria-label={sidebarCollapsed ? 'Buka sidebar' : 'Ciutkan sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-4 h-4 text-ink-soft" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-ink-soft" />
              )}
            </button>

            {/* Brand identity */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand text-white shrink-0 shadow-sm">
                <Send className="w-4 h-4" />
              </span>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-bold text-sm sm:text-base tracking-tight text-ink truncate">
                  WA Broadcast
                </span>
                <span className="blast-badge blast-badge-brand font-mono hidden sm:inline-flex">
                  Suite CRM
                </span>
              </div>
            </div>
          </div>

          {/* Right actions: gateway status & 1-click theme toggle (bersih tanpa profil/logout) */}
          <div className="flex items-center gap-2">
            <span
              className={`blast-badge font-mono text-[11px] hidden sm:inline-flex items-center gap-1.5 ${
                gatewayStatus === 'online'
                  ? 'blast-badge-leaf'
                  : gatewayStatus === 'offline'
                    ? 'blast-badge-clay'
                    : 'blast-badge-honey'
              }`}
              title="Status koneksi gateway wa-api"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  gatewayStatus === 'online'
                    ? 'bg-leaf animate-pulse'
                    : gatewayStatus === 'offline'
                      ? 'bg-clay'
                      : 'bg-honey animate-pulse'
                }`}
              />
              Gateway {gatewayStatus === 'online' ? 'Online' : gatewayStatus === 'offline' ? 'Terputus' : 'Memeriksa'}
            </span>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Sidebar desktop: collapsible, sticky, user info + logout di dasar */}
        <aside
          className={`hidden md:flex md:flex-col shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] py-3 bg-surface border-r border-line transition-all duration-200 ${
            sidebarCollapsed ? 'w-14 px-1' : 'w-56 px-2'
          }`}
        >
          <nav className="flex flex-col gap-0.5 w-full" aria-label="Navigasi utama">
            {!sidebarCollapsed && <div className="blast-nav-group-label pb-1 px-1">Menu</div>}
            {navItems.map((item) => navButton(item, sidebarCollapsed))}
          </nav>

          {/* User info + Logout action di sidebar paling bawah */}
          <div className="mt-auto w-full pt-3 border-t border-line">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-md bg-brand-wash text-brand-deep font-bold text-xs flex items-center justify-center border border-brand-line cursor-default"
                  title={`Akun: ${user?.name || 'Admin'} (${user?.role || 'admin'})`}
                >
                  {(user?.name || 'A').charAt(0).toUpperCase()}
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-10 h-10 rounded-md flex items-center justify-center text-clay hover:bg-clay-wash hover:text-clay-deep border border-transparent hover:border-clay-line transition-colors cursor-pointer"
                    title="Keluar / Kunci Dashboard"
                    aria-label="Keluar dari dashboard"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-surface-sunken border border-line flex items-center gap-2">
                <div className="grid place-items-center w-8 h-8 rounded-md bg-brand-wash text-brand-deep font-bold text-xs shrink-0 border border-brand-line">
                  {(user?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-ink truncate leading-tight">
                    {user?.name || 'Admin'}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="blast-badge blast-badge-slate capitalize text-[10px] !py-0 !px-1.5">
                      {user?.role || 'admin'}
                    </span>
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 rounded-md text-clay hover:bg-clay-wash hover:text-clay-deep transition-colors shrink-0 cursor-pointer"
                    title="Keluar / Kunci Dashboard"
                    aria-label="Keluar dari dashboard"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Konten halaman: transisi fade saat pindah tab */}
        <main key={currentTab} className="flex-1 min-w-0 px-3 sm:px-5 lg:px-6 py-4 lg:py-6 pb-24 md:pb-6 blast-page-transition">
          {children}
        </main>
      </div>

      {/* Bottom navigation mobile: 4 tujuan utama + Menu */}
      <nav className="blast-bottomnav md:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom" aria-label="Navigasi mobile">
        <div className="flex items-stretch justify-around max-w-lg mx-auto px-1">
          {coreBottomNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls="blast-mobile-drawer"
            className={['templates', 'playground', 'settings'].includes(currentTab) ? '!text-brand-deep !bg-brand-wash' : undefined}
          >
            <Menu className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer: slide dari bawah (bottom sheet) */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div
            id="blast-mobile-drawer"
            className="relative z-10 w-full max-h-[85vh] bg-surface border-t border-line rounded-t-2xl shadow-2xl overflow-y-auto blast-sheet-transition"
            tabIndex={-1}
            aria-label="Menu navigasi mobile"
          >
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-line-strong/80" />
            </div>

            <div className="px-4 py-2 border-b border-line flex items-center justify-between">
              <span className="font-bold text-sm text-ink">Menu Navigasi</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="blast-control blast-control-secondary w-8 !px-0 justify-center"
                aria-label="Tutup menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-line bg-surface-sunken flex items-center gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-wash text-brand-deep font-bold text-sm shrink-0 border border-brand-line">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-ink truncate">{user?.name || 'Admin'}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="blast-badge blast-badge-slate capitalize text-[10px]">{user?.role || 'admin'}</span>
                  <span className="text-[10px] text-ink-muted">• Sesi Aktif</span>
                </div>
              </div>
            </div>

            <nav className="p-2 space-y-1">
              <div className="blast-nav-group-label pb-1 px-1">Semua Menu</div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const count = metrics?.[item.badgeKey];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePick(item.id)}
                    className={`blast-nav-item !justify-start w-full ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {typeof count === 'number' && (
                      <span className="blast-badge blast-badge-slate font-mono ml-auto text-[10px]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {onLogout && (
              <div className="p-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onLogout();
                  }}
                  className="blast-control blast-control-secondary w-full justify-center text-clay gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Dashboard</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
