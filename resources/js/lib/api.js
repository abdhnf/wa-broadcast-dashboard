// Klien API terpusat untuk backend Fastify wa-api.
//
// Sumber kredensial & host (berurutan):
//   1. Override VITE_WA_API_BASE bila diset saat build.
//   2. Konfigurasi runtime tersimpan di localStorage (`wa_blast_config`) — diisi
//      otomatis dari handshake launch token saat login.
//   3. Turunan dari hostname halaman (port backend 3100), dipakai bila belum ada
//      konfigurasi atau konfigurasi tersimpan menunjuk ke loopback.
//
// Semua modul halaman WAJIB memakai helper di sini, bukan fetch langsung,
// supaya penanganan header X-API-Key, error kuota (429), dan sesi kedaluwarsa
// konsisten di seluruh aplikasi.

// Catatan: jangan pernah mengambil host/API key dari dummyData. Nilai di file
// statis ikut ter-bundle ke JavaScript publik dan akan bocor ke semua pengunjung.

const STORAGE_USER = 'wa_blast_user';
const STORAGE_CONFIG = 'wa_blast_config';

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.isQuota = status === 429;
    this.isUnauthorized = status === 401 || status === 403;
  }
}

function readJson(storageKey) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeBase(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/** True bila host mengarah ke mesin browser sendiri (loopback). */
function isLoopbackHost(host) {
  const h = String(host || '').trim().toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
}

function isLoopbackBase(url) {
  try {
    return isLoopbackHost(new URL(String(url)).hostname);
  } catch {
    // URL relatif/tidak valid dianggap bukan loopback agar tidak salah buang.
    return false;
  }
}

export function getApiConfig() {
  const envBase = import.meta?.env?.VITE_WA_API_BASE;
  const saved = readJson(STORAGE_CONFIG);
  const savedUrl = saved?.url || saved?.serverUrl;
  const user = readJson(STORAGE_USER);
  const apiKey = user?.apiKey || saved?.apiKey || '';

  // Base default selalu diturunkan dari host yang sedang dipakai browser, jadi
  // dashboard yang dibuka lewat IP LAN otomatis menghubungi IP LAN itu juga.
  const pageHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const runtimeBase = typeof window !== 'undefined'
    ? `${window.location.protocol}//${pageHost}:3100/api/v1`
    : '';

  let base = envBase || savedUrl || runtimeBase;

  // Konfigurasi tersimpan yang menunjuk ke loopback hanya valid bila halaman
  // juga dibuka dari loopback. Kalau dashboard diakses dari host lain
  // (IP LAN / domain), base loopback itu akan memaksa browser menghubungi
  // dirinya sendiri dan berujung "tidak bisa menghubungi backend".
  if (!envBase && savedUrl && isLoopbackBase(savedUrl) && !isLoopbackHost(pageHost)) {
    base = runtimeBase;
    // Tulis ulang konfigurasi agar pemulihan ini tidak perlu diulang tiap request.
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_CONFIG, JSON.stringify({ url: runtimeBase, apiKey }));
    }
  }

  return { base: normalizeBase(base), apiKey };
}

/** Simpan hasil handshake (URL backend + API key) setelah login sukses. */
export function saveApiConfig({ url, apiKey }) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_CONFIG, JSON.stringify({ url: normalizeBase(url), apiKey }));
}

export function clearApiConfig() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_CONFIG);
}

/** Normalisasi nomor ke format numerik 628xxx yang diminta skema wa-api. */
export function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Ambil pesan error yang ramah dari payload Fastify ({ error } / { message }). */
function extractErrorMessage(payload, status) {
  if (payload && typeof payload === 'object') {
    if (typeof payload.error === 'string' && payload.error) return payload.error;
    if (typeof payload.message === 'string' && payload.message) return payload.message;
  }
  if (status === 429) return 'Kuota pengiriman periode ini sudah tercapai.';
  if (status === 401) return 'API key tidak valid. Silakan masuk ulang dari panel wa-api.';
  if (status === 403) return 'Akun Anda tidak punya akses ke sumber daya ini.';
  return `Permintaan gagal (HTTP ${status || 'tanpa respons'}).`;
}

/**
 * Panggil endpoint wa-api dengan header autentikasi otomatis.
 * @param {string} path contoh: '/sessions' atau 'sessions'
 */
export async function apiFetch(path, { method = 'GET', body, signal, raw = false } = {}) {
  const { base, apiKey } = getApiConfig();
  if (!base) {
    throw new ApiError('Alamat backend wa-api belum dikonfigurasi. Masuk ulang melalui link dari panel wa-api.', 0);
  }
  if (!apiKey) {
    throw new ApiError('API key belum tersinkron. Silakan masuk ulang melalui link peluncuran.', 401);
  }

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { 'X-API-Key': apiKey };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    const hint = (isLoopbackBase(base) && !isLoopbackHost(window?.location?.hostname))
      ? ` Alamat backend (${base}) menunjuk ke komputer Anda sendiri, padahal dashboard dibuka dari ${window.location.hostname}. Hubungi backend lewat IP/domain server.`
      : ' Periksa koneksi jaringan ke server wa-api.';
    throw new ApiError(`Tidak bisa menghubungi backend wa-api (${url}).${hint}`, 0);
  }

  if (raw) return response;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
  }
  return payload;
}

// ---------------- Endpoint wrapper ----------------

export function fetchSessions({ signal } = {}) {
  return apiFetch('/sessions', { signal }).then((res) => res?.sessions ?? []);
}

// ---------------- Data CRM (disimpan di MySQL dashboard) ----------------
//
// Endpoint ini dilayani Laravel dashboard sendiri (/api/crm/*), bukan wa-api.
// Nomor telepon tetap disimpan ternormalisasi (628xxx) agar cocok dengan
// skema kirim wa-api. Kepemilikan baris ditentukan dari API key yang dikirim,
// jadi klien tidak pernah mengirim user_id.

export async function crmFetch(path, { method = 'GET', body, signal } = {}) {
  const { apiKey } = getApiConfig();
  if (!apiKey) {
    throw new ApiError('API key belum tersinkron. Silakan masuk ulang melalui link peluncuran.', 401);
  }

  const url = `/api/crm${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { 'X-API-Key': apiKey, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    if (signal?.aborted) throw new ApiError('Permintaan dibatalkan.', 0);
    throw new ApiError('Tidak bisa menghubungi server dashboard. Periksa koneksi jaringan.', 0);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
  }
  return payload;
}

export function fetchContacts({ signal } = {}) {
  return crmFetch('/contacts', { signal }).then((res) => res?.contacts ?? []);
}

export function createContact(contact) {
  return crmFetch('/contacts', { method: 'POST', body: contact }).then((res) => res?.contact);
}

export function updateContact(id, contact) {
  return crmFetch(`/contacts/${encodeURIComponent(id)}`, { method: 'PATCH', body: contact }).then((res) => res?.contact);
}

export function deleteContact(id) {
  return crmFetch(`/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchGroups({ signal } = {}) {
  return crmFetch('/groups', { signal }).then((res) => res?.groups ?? []);
}

export function createGroup(group) {
  return crmFetch('/groups', { method: 'POST', body: group }).then((res) => res?.group);
}

export function deleteGroup(id) {
  return crmFetch(`/groups/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchTemplates({ signal } = {}) {
  return crmFetch('/templates', { signal }).then((res) => res?.templates ?? []);
}

export function createTemplate(template) {
  return crmFetch('/templates', { method: 'POST', body: template }).then((res) => res?.template);
}

export function updateTemplate(id, template) {
  return crmFetch(`/templates/${encodeURIComponent(id)}`, { method: 'PATCH', body: template }).then((res) => res?.template);
}

export function deleteTemplate(id) {
  return crmFetch(`/templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchCampaigns({ signal } = {}) {
  return crmFetch('/campaigns', { signal }).then((res) => res?.campaigns ?? []);
}

export function createCampaign(campaign) {
  return crmFetch('/campaigns', { method: 'POST', body: campaign }).then((res) => res?.campaign);
}

export function updateCampaign(id, patchBody) {
  return crmFetch(`/campaigns/${encodeURIComponent(id)}`, { method: 'PATCH', body: patchBody }).then((res) => res?.campaign);
}

export function deleteCampaign(id) {
  return crmFetch(`/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchUsage({ signal } = {}) {
  return apiFetch('/usage', { signal });
}

/**
 * Pengaturan gateway (khusus admin di wa-api).
 * Non-admin menerima 403 dengan `status` 403 pada ApiError, sehingga pemanggil
 * bisa membedakannya dari kegagalan jaringan.
 */
export function fetchRemoteSettings({ signal } = {}) {
  return apiFetch('/settings', { signal }).then((res) => res?.settings);
}

export function updateRemoteSettings(patchBody) {
  return apiFetch('/settings', { method: 'PATCH', body: patchBody });
}

export function fetchMessages(sessionId = 'all', { signal, batchId, limit, offset, status, phones } = {}) {
  const params = new URLSearchParams();
  if (batchId) params.set('batchId', batchId);
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  if (status) params.set('status', Array.isArray(status) ? status.join(',') : status);
  if (phones && phones.length > 0) params.set('phones', phones.join(','));
  const qs = params.toString();
  return apiFetch(`/messages/${encodeURIComponent(sessionId)}${qs ? `?${qs}` : ''}`, { signal })
    .then((res) => {
      const list = Array.isArray(res?.messages) ? res.messages : [];
      return Object.assign(list, {
        messages: list,
        total: typeof res?.total === 'number' ? res.total : list.length,
      });
    });
}

export function fetchAutoRotateSettings({ signal } = {}) {
  return apiFetch('/autorotate/settings', { signal }).then((res) => res?.settings ?? null);
}

export function updateAutoRotateSettings(settings) {
  return apiFetch('/autorotate/settings', { method: 'PATCH', body: settings });
}

export function sendText({ sessionId, to, text, priority = 'normal', batchId }) {
  const body = { sessionId: sessionId || 'auto', to: normalizePhone(to), text, priority };
  if (batchId) body.batchId = batchId;
  return apiFetch('/messages/send', {
    method: 'POST',
    body,
  });
}

export function sendMedia({ sessionId, to, mediaType, mediaUrl, mediaBase64, mediaMimeType, fileName, caption, priority = 'normal', batchId }) {
  const body = {
    sessionId: sessionId || 'auto',
    to: normalizePhone(to),
    mediaType,
    caption,
    fileName,
    priority,
  };
  if (batchId) body.batchId = batchId;
  if (mediaUrl) body.mediaUrl = mediaUrl;
  if (mediaBase64) {
    body.mediaBase64 = mediaBase64;
    body.mediaMimeType = mediaMimeType;
  }
  return apiFetch('/messages/send-media', { method: 'POST', body });
}

export function retryMessage(messageId) {
  return apiFetch(`/messages/${messageId}/retry`, {
    method: 'POST',
  });
}

export function sendLocation({ sessionId, to, latitude, longitude, name, address, batchId }) {
  const body = {
    sessionId: sessionId || 'auto',
    to: normalizePhone(to),
    latitude: Number(latitude),
    longitude: Number(longitude),
    name,
    address,
  };
  if (batchId) body.batchId = batchId;
  return apiFetch('/messages/send-location', {
    method: 'POST',
    body,
  });
}

export function sendBulk({ sessionId, recipients, text, priority = 'normal' }) {
  return apiFetch('/messages/send-bulk', {
    method: 'POST',
    body: {
      sessionId: sessionId || 'auto',
      recipients: (recipients || []).map(normalizePhone).filter(Boolean),
      text,
      priority,
    },
  });
}

export function fetchQueueStatus(sessionId, { signal } = {}) {
  return apiFetch(`/sessions/${encodeURIComponent(sessionId)}/queue/status`, { signal });
}

export function pauseBatch(batchId, reason) {
  return apiFetch(`/batches/${encodeURIComponent(batchId)}/pause`, {
    method: 'POST',
    body: { reason },
  });
}

export function resumeBatch(batchId) {
  return apiFetch(`/batches/${encodeURIComponent(batchId)}/resume`, { method: 'POST' });
}

export function clearBatch(batchId, reason) {
  return apiFetch(`/batches/${encodeURIComponent(batchId)}/clear`, {
    method: 'POST',
    body: { reason },
  });
}

export function fetchBatchStatus(batchId, { signal } = {}) {
  return apiFetch(`/batches/${encodeURIComponent(batchId)}/status`, { signal });
}

export function pauseQueue(sessionId, reason) {
  return apiFetch(`/sessions/${encodeURIComponent(sessionId)}/queue/pause`, {
    method: 'POST',
    body: { reason },
  });
}

export function resumeQueue(sessionId) {
  return apiFetch(`/sessions/${encodeURIComponent(sessionId)}/queue/resume`, { method: 'POST' });
}

export function clearQueue(sessionId, reason, batchId) {
  return apiFetch(`/sessions/${encodeURIComponent(sessionId)}/queue/clear`, {
    method: 'POST',
    body: { reason, batchId },
  });
}

/**
 * Unggah berkas media ke storage lokal Laravel lalu kirim URL publiknya ke wa-api.
 * Endpoint wa-api hanya menerima `mediaUrl` (tautan) atau `mediaBase64`, jadi
 * berkas harus punya URL yang bisa dijangkau server wa-api lebih dulu.
 */
export async function uploadMediaFile(file) {
  const { base, apiKey } = getApiConfig();
  if (!apiKey) {
    throw new ApiError('API key belum tersinkron. Silakan masuk ulang dari panel wa-api.', 401);
  }

  // Backend wa-api punya dua jalur unggah:
  //   1. body biner mentah dengan Content-Type asli berkas (jalur utama), atau
  //   2. JSON base64 (cadangan bila tipe berkas tidak dikenali parser Fastify).
  const isKnownBinaryType = /^(image|video|audio)\//i.test(file.type)
    || ['application/pdf', 'application/octet-stream'].includes(file.type);

  let response;
  try {
    if (isKnownBinaryType) {
      response = await fetch(`${base}/media/upload`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name || ''),
        },
        body: file,
      });
    } else {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').replace(/^data:[^;]+;base64,/, ''));
        reader.onerror = () => reject(new Error('Berkas tidak bisa dibaca di browser.'));
        reader.readAsDataURL(file);
      });
      response = await fetch(`${base}/media/upload`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64, mimeType: file.type, fileName: file.name }),
      });
    }
  } catch {
    throw new ApiError('Gagal mengunggah berkas: backend wa-api tidak bisa dihubungi.', 0);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || !payload?.url) {
    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
  }
  return payload;
}

/** Format angka dengan pemisah ribuan tanpa memaksa locale tertentu. */
export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('id-ID');
}

export { STORAGE_USER, STORAGE_CONFIG };
