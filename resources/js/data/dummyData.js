export const dummyUser = {
  id: 'usr_1',
  name: 'Hanif Developer',
  email: 'dev@abdhnf.com',
  role: 'admin',
  quotaPerDay: 10000,
  usedToday: 342,
  apiKey: 'wapi_...2d',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
};

export const dummyMetrics = {
  totalContacts: 1248,
  sentToday: 856,
  successRate: 98.4,
  readRate: 84.2,
  activeSessionsCount: 3,
  totalSessionsCount: 4,
  ongoingCampaignsCount: 1,
  chartData: [
    { time: '08:00', sent: 120, delivered: 118, failed: 2 },
    { time: '10:00', sent: 240, delivered: 236, failed: 4 },
    { time: '12:00', sent: 180, delivered: 178, failed: 2 },
    { time: '14:00', sent: 310, delivered: 304, failed: 6 },
    { time: '16:00', sent: 210, delivered: 208, failed: 2 },
    { time: '18:00', sent: 90, delivered: 89, failed: 1 },
  ]
};

export const dummySessions = [
  {
    id: 'wa_cs_primary',
    name: 'Customer Support 1',
    phone: '6281234567890',
    status: 'connected',
    pushName: 'Admin Support WA',
    platform: 'WhatsApp Business',
    riskScore: 12,
    warmupDay: 14,
    queueCount: 0,
    sentToday: 420,
  },
  {
    id: 'wa_blast_alpha',
    name: 'Broadcast Pool A',
    phone: '6289876543210',
    status: 'connected',
    pushName: 'Promo Store Info',
    platform: 'WhatsApp Multi-Device',
    riskScore: 28,
    warmupDay: 30,
    queueCount: 15,
    sentToday: 310,
  },
  {
    id: 'wa_billing_bot',
    name: 'CS Notifikasi',
    phone: '6285512345678',
    status: 'connected',
    pushName: 'Official Notification Bot',
    platform: 'WhatsApp Web',
    riskScore: 5,
    warmupDay: 45,
    queueCount: 0,
    sentToday: 126,
  },
  {
    id: 'wa_promo_beta',
    name: 'Marketing Backup',
    phone: '6287700112233',
    status: 'disconnected',
    pushName: 'Marketing Store',
    platform: 'WhatsApp Web',
    riskScore: 70,
    warmupDay: 3,
    queueCount: 0,
    sentToday: 0,
  }
];

export const dummyGroups = [
  { id: 'grp_vip', name: 'Pelanggan VIP', count: 185, description: 'Customer loyal tier Gold & Platinum' },
  { id: 'grp_leads', name: 'Leads Seminar AI', count: 420, description: 'Peserta webinar, training, & demo produk' },
  { id: 'grp_mitra', name: 'Mitra Agen Regional', count: 64, description: 'Reseller & agen resmi Jabodetabek' },
  { id: 'grp_member', name: 'Member Komunitas', count: 579, description: 'Semua subscriber newsletter & komunitas' },
];

export const dummyContacts = [
  {
    id: 'c_1',
    name: 'Budi Santoso',
    phone: '6281234567891',
    group: 'Pelanggan VIP',
    tag: 'VIP',
    custom: { kota: 'Jakarta Selatan', tier: 'Gold', voucher: 'VIP-50K' }
  },
  {
    id: 'c_2',
    name: 'Siti Rahmawati',
    phone: '6281398765432',
    group: 'Mitra Agen Regional',
    tag: 'Mitra',
    custom: { kota: 'Bandung', wilayah: 'Jawa Barat', kuota_agen: '500' }
  },
  {
    id: 'c_3',
    name: 'Ahmad Fauzi',
    phone: '6285211223344',
    group: 'Leads Seminar AI',
    tag: 'Leads',
    custom: { kota: 'Surabaya', profesi: 'Software Engineer', track: 'Backend' }
  },
  {
    id: 'c_4',
    name: 'Dewi Lestari',
    phone: '6285644332211',
    group: 'Member Komunitas',
    tag: 'Member',
    custom: { kota: 'Yogyakarta', status_member: 'Aktif', poin: '1450' }
  },
  {
    id: 'c_5',
    name: 'Rizky Pratama',
    phone: '6287766554433',
    group: 'Pelanggan VIP',
    tag: 'VIP',
    custom: { kota: 'Medan', tier: 'Platinum', voucher: 'VIP-100K' }
  },
  {
    id: 'c_6',
    name: 'Nurul Hidayah',
    phone: '6289511223344',
    group: 'Leads Seminar AI',
    tag: 'Leads',
    custom: { kota: 'Semarang', profesi: 'Product Manager', track: 'Product' }
  },
  {
    id: 'c_7',
    name: 'Hendro Wijaya',
    phone: '6281122334455',
    group: 'Member Komunitas',
    tag: 'Member',
    custom: { kota: 'Malang', status_member: 'Aktif', poin: '820' }
  },
  {
    id: 'c_8',
    name: 'Maya Anggraini',
    phone: '6281988776655',
    group: 'Mitra Agen Regional',
    tag: 'Mitra',
    custom: { kota: 'Tangerang', wilayah: 'Banten', kuota_agen: '250' }
  },
];

export const dummyTemplates = [
  {
    id: 'tpl_promo_flash',
    title: 'Promo Flash Sale 9.9 (Media)',
    messageType: 'media',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
    content: '{Halo|Hai|Selamat siang} {{name}} 👋,\n\nKabar gembira khusus untukmu di *{{kota}}*! Nikmati penawaran eksklusif *Promo Flash Sale* dengan voucher spesialmu: *{{voucher}}*.\n\nKunjungi link berikut: https://toko.example.com\n_Balas STOP jika tidak ingin menerima penawaran ini._',
    location: null,
  },
  {
    id: 'tpl_welcome_leads',
    title: 'Sambutan Leads Workshop (Teks)',
    messageType: 'text',
    mediaType: null,
    mediaUrl: null,
    content: '{Halo|Salam hangat} {{name}} ✨,\n\nTerima kasih telah mendaftar di *Workshop AI & Automation 2026* track *{{track}}*.\nJadwal sesi live via Zoom akan dimulai besok malam pukul *19.30 WIB*.\n\nSampai jumpa di kelas online!',
    location: null,
  },
  {
    id: 'tpl_lokasi_kantor',
    title: 'Undangan Workshop & Alamat Kantor (Lokasi)',
    messageType: 'location',
    mediaType: null,
    mediaUrl: null,
    content: '{Halo|Hai} {{name}},\nBerikut lokasi kantor dan tempat penyelenggaraan offline workshop kita ya! Tim kami siap menyambutmu di lokasi.',
    location: {
      name: 'Kantor Operasional & Workshop Space',
      address: 'Jl. Jenderal Sudirman Kav. 52-53, Senayan, Jakarta Selatan',
      latitude: -6.225588,
      longitude: 106.808591
    }
  }
];

export const dummyCampaigns = [
  {
    id: 'cmp_101',
    name: 'Blast Flash Sale 9.9 Member VIP',
    batchId: 'batch_m1029a8f',
    groupName: 'Pelanggan VIP',
    templateTitle: 'Promo Flash Sale 9.9 (Media)',
    totalRecipients: 185,
    sentCount: 185,
    deliveredCount: 182,
    readCount: 154,
    failedCount: 3,
    status: 'completed',
    createdAt: '2026-09-10 10:15 WIB',
    sessionUsed: 'Broadcast Pool A',
  },
  {
    id: 'cmp_102',
    name: 'Undangan Offline Workshop Jakarta',
    batchId: 'batch_m1029b9c',
    groupName: 'Mitra Agen Regional',
    templateTitle: 'Undangan Workshop & Alamat Kantor (Lokasi)',
    totalRecipients: 64,
    sentCount: 42,
    deliveredCount: 40,
    readCount: 31,
    failedCount: 0,
    status: 'in_progress',
    createdAt: '2026-09-10 14:00 WIB',
    sessionUsed: 'Customer Support 1',
  }
];

export const dummySettings = {
  serverUrl: 'https://wa-api.domain.com/api/v1',
  apiKey: 'wapi_...2d',
  connectedStatus: true,
  publicRegistration: false,
  googleAuthEnabled: true,
  googleClientId: '637615677400-hu1t5ojgmldkci7ssvmgemp85iv7d1sd.apps.googleusercontent.com',
  googleClientSecret: 'GOCSPX-sample_secret_redacted_xyz123',
  googleAllowedDomains: '@kantor.id, @fapet.id, @abdhnf.com',
};
