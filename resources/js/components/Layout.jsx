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
  Sparkles,
  Key,
  LogOut,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function Layout({ currentTab, onTabChange, user, metrics, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Home Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'sessions', label: 'WhatsApp Sessions', icon: Smartphone, badge: `${metrics?.activeSessionsCount || 3} Aktif` },
    { id: 'contacts', label: 'Contacts', icon: Users, badge: `${metrics?.totalContacts || 1248}` },
    { id: 'groups', label: 'Contact Groups', icon: FolderKanban, badge: '4 Grup' },
    { id: 'templates', label: 'Message Templates', icon: FileText, badge: '3' },
    { id: 'broadcast', label: 'Blast / Broadcast', icon: Send, badge: metrics?.ongoingCampaignsCount ? '1 Live' : null, highlight: true },
    { id: 'playground', label: 'Playground Tester', icon: Terminal, badge: null },
    { id: 'settings', label: 'Configuration & Auth', icon: Settings, badge: null },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/20">
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">WA Broadcast</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">CRM Suite</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Laravel 13 &bull; Radix UI &bull; Fastify Gateway</p>
            </div>
          </div>
        </div>

        {/* Status Server & User Badges */}
        <div className="flex items-center gap-3">
          {/* WA API Gateway Status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">WA API Server:</span>
            <span className="text-emerald-400 font-mono font-semibold">Online (v5.3)</span>
          </div>

          {/* Quota Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quota Hari Ini:</span>
            <span className="font-mono font-bold text-amber-200">
              {user?.usedToday || 0}/{user?.quotaPerDay || 10000}
            </span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <img
              src={user?.avatarUrl}
              alt="User Avatar"
              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
            />
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200 leading-tight">{user?.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{user?.role} Plan</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex w-64 flex-col border-r border-slate-800/80 bg-slate-950 p-4 space-y-6 shrink-0">
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Modul Broadcast
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        item.highlight
                          ? 'bg-emerald-500 text-slate-950 font-bold animate-pulse'
                          : isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick WA Info Card */}
          <div className="mt-auto p-3.5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Pacing Jitter</span>
              <span className="text-emerald-400 font-mono text-[11px]">3s - 12s Adaptif</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Anti-Spam Engine</span>
              <span className="text-emerald-400 font-mono text-[11px]">Active</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Fastify API Queue</span>
              <span className="text-slate-200 font-mono">0.02s ACK</span>
            </div>
          </div>
        </aside>

        {/* Mobile Slide Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm flex">
            <div className="w-72 bg-slate-950 border-r border-slate-800 p-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-sm text-white">Menu Navigasi</span>
                <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1 flex-1 overflow-y-auto">
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
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-medium ${
                        isActive
                          ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
