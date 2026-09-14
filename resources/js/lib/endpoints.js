/**
 * Resolvers URL terpusat berbasis Vite env variable dengan fallback cerdas.
 * Menghindari hardcoded hostname/port di komponen Auth, Settings, dan Layout.
 */

export function resolveWaApiBase() {
  // 1. Prioritas utama: env VITE_WA_API_BASE saat build
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_WA_API_BASE) {
    return import.meta.env.VITE_WA_API_BASE;
  }
  // 2. Fallback browser: ikuti host halaman saat ini di port 3100
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || '127.0.0.1';
    return `${protocol}//${hostname}:3100/api/v1`;
  }
  // 3. Fallback SSR / non-browser
  return 'http://127.0.0.1:3100/api/v1';
}

export function resolveWaPanelUrl() {
  // 1. Prioritas utama: env VITE_WA_PANEL_URL saat build
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_WA_PANEL_URL) {
    return import.meta.env.VITE_WA_PANEL_URL;
  }
  // 2. Fallback browser: ikuti host halaman saat ini di port 5174 (wa-panel Vite dev)
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || '127.0.0.1';
    return `${protocol}//${hostname}:5174`;
  }
  return 'http://127.0.0.1:5174';
}
