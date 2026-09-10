import React, { useState } from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Users,
  FolderKanban,
  FileText,
  Send,
  Terminal,
  Settings,
  Menu,
  X,
  Radio,
  Zap,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { TooltipProvider } from './ui/Tooltip';

export function Layout({ currentTab, onTabChange, user, metrics, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'sessions', label: 'WA Sessions', icon: Smartphone, count: metrics?.activeSessionsCount || 3 },
    { id: 'contacts', label: 'Contacts', icon: Users, count: metrics?.totalContacts || 1248 },
    { id: 'groups', label: 'Segments', icon: FolderKanban, count: 4 },
    { id: 'templates', label: 'Templates', icon: FileText, count: 3 },
    { id: 'broadcast', label: 'Broadcast Engine', icon: Send, badge: 'Live', highlight: true },
    { id: 'playground', label: 'Playground', icon: Terminal },
    { id: 'settings', label: 'API & Auth', icon: Settings },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 active:scale-95"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold tracking-tight text-zinc-100">WA CRM</span>
                <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">v2.4 &bull; Fastify + Laravel 13</span>
              </div>
            </div>
          </div>

          {/* Right Status Bar */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Gateway Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-400 hidden sm:inline">Gateway:</span>
              <span className="text-zinc-200 font-mono font-medium">3100 Online</span>
            </div>

            {/* Quota */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-[11px]">
              <span className="text-zinc-400">Quota:</span>
              <span className="font-mono text-zinc-200 font-medium">
                {user?.usedToday || 856} / {user?.quotaPerDay || 10000}
              </span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <img
                src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                alt="Avatar"
                className="w-7 h-7 rounded-full border border-zinc-700 object-cover"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-medium text-zinc-200 leading-none">{user?.name || "Admin Developer"}</div>
                <span className="text-[10px] text-zinc-500 font-mono capitalize">{user?.role || "admin"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Desktop */}
          <aside className="hidden md:flex w-56 flex-col border-r border-zinc-800/80 bg-zinc-950 p-3 shrink-0 justify-between">
            <nav className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                Workspace
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/60 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                        {item.badge}
                      </span>
                    ) : item.count ? (
                      <span className="text-[10px] font-mono text-zinc-500">
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {/* Micro Specs Card */}
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/70 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-400" /> Pacing Jitter</span>
                <span className="font-mono text-zinc-300">3-12s</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> Anti-Ban</span>
                <span className="font-mono text-emerald-400 text-[10px]">8-Layers</span>
              </div>
            </div>
          </aside>

          {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-around px-1 py-1.5 safe-area-bottom">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex flex-col items-center justify-center p-1.5 rounded-md min-w-[56px] text-[10px] transition-colors ${
                    isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="truncate max-w-[60px]">{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center p-1.5 rounded-md min-w-[56px] text-[10px] text-zinc-400"
            >
              <Menu className="w-4 h-4 mb-0.5" />
              <span>More</span>
            </button>
          </nav>

          {/* Mobile Drawer (Radix-like overlay) */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-xs flex">
              <div className="w-64 bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="font-semibold text-xs text-zinc-200 uppercase tracking-wider font-mono">All Modules</span>
                    <button
                      type="button"
                      aria-label="Close navigation drawer"
                      onClick={() => setMobileOpen(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onTabChange(item.id);
                            setMobileOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium ${
                            isActive
                              ? 'bg-zinc-800 text-zinc-100 font-semibold'
                              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.count && (
                            <span className="text-[10px] font-mono text-zinc-500">{item.count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono">
                  WA Broadcast CRM &bull; Laravel 13
                </div>
              </div>
              <div className="flex-1" onClick={() => setMobileOpen(false)} />
            </div>
          )}

          {/* Content Canvas */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 bg-zinc-950">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
