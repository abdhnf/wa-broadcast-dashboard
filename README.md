# WhatsApp Blast Dashboard & CRM Suite

Modern, responsive WhatsApp Broadcast & Campaign Management Dashboard built with **Laravel 11 / 12**, **Inertia.js v3**, **React 19**, and **Tailwind CSS v4**.

Aplikasi ini didesain khusus sebagai UI/UX layer untuk mengelola kampanye blast WhatsApp terintegrasi langsung dengan gateway [wa-api](https://github.com/abdhnf/wa-api). Dilengkapi sistem CRM kontak & segmen, manajemen template pesan, visualisasi antrean terpadu, penyesuaian parameter anti-ban dinamis, dan fitur **Retry Antrean Gagal**.

---

## 📑 Daftar Isi

- [0. System Requirements](#0-system-requirements)
- [1. Pilihan Metode Instalasi](#1-pilihan-metode-instalasi)
  - [Metode A: Standalone VPS / VM (PHP & Nginx)](#metode-a-standalone-vps--vm-php--nginx)
  - [Metode B: aaPanel Web Manager (GUI Control Panel)](#metode-b-aapanel-web-manager-gui-control-panel)
  - [Metode C: Docker Compose (All-in-One Container)](#metode-c-docker-compose-all-in-one-container)
- [2. Environment & Integrasi wa-api](#2-environment--integrasi-wa-api)
- [3. Fitur Utama](#3-fitur-utama)
- [4. Struktur Direktori](#4-struktur-direktori)
- [5. Troubleshooting & FAQ](#5-troubleshooting--faq)
- [6. Lisensi](#6-lisensi)

---

## 0. System Requirements

Pastikan infrastruktur server Anda telah memenuhi spesifikasi berikut:

### 1. Hardware & OS
- **Sistem Operasi:** Linux x86_64 atau ARM64 (Ubuntu 22.04/24.04 LTS, Debian 12, Rocky Linux 9, atau Proxmox VE VM).
- **Spesifikasi Minimal:** 1 vCPU, 1 GB RAM, 10 GB SSD.
- **Spesifikasi Rekomendasi:** 2 vCPU, 2 GB RAM (nyaman untuk multi-tenant & ribuan antrean pesan).

### 2. Software & Runtime
- **PHP:** Versi `>= 8.2` atau `8.3` (ekstensi wajib: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `curl`).
- **Composer:** Versi `>= 2.6`.
- **Node.js & Package Manager:** Node.js `>= 20.x LTS` dan `npm` / `pnpm`.
- **Database:** MySQL `>= 8.0` atau MariaDB `>= 10.6` (menggunakan database `wa_blast`).
- **Web Server:** Nginx (rekomendasi reverse proxy / PHP-FPM) atau Apache.

### 3. Jaringan & Dependensi Gateway
- **WhatsApp API Gateway:** Instance [wa-api](https://github.com/abdhnf/wa-api) yang sudah running (default port `3100`).
- **Port Dashboard:** Port default `8085` (atau port `80` / `443` via Nginx reverse proxy).

---

## 1. Pilihan Metode Instalasi

Pilih salah satu metode instalasi yang paling sesuai dengan kebutuhan server Anda:

---

### Metode A: Standalone VPS / VM (PHP & Nginx) 🚀
> **Cocok untuk VPS Ubuntu/Debian native atau VM Proxmox.**

#### 1. Clone Repository
```bash
git clone https://github.com/abdhnf/wa-blast-dashboard.git
cd wa-blast-dashboard
```

#### 2. Install Dependensi Backend & Frontend
```bash
# Install package PHP
composer install --no-dev --optimize-autoloader

# Install package Node.js & compile asset React/Vite
npm install
npm run build
```

#### 3. Konfigurasi Environment & Key
```bash
cp .env.production.example .env
php artisan key:generate
```
Sesuaikan konfigurasi database MariaDB/MySQL dan URL gateway di `.env`:
```env
APP_NAME="WA Broadcast Suite"
APP_ENV=production
APP_URL=http://IP_SERVER:8085

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=wa_blast
DB_USERNAME=wa_blast
DB_PASSWORD=secret_password

WA_API_BASE=http://127.0.0.1:3100/api/v1
VITE_WA_API_BASE="http://IP_SERVER:3100/api/v1"
```

#### 4. Jalankan Migrasi Database
```bash
php artisan migrate --force
```

#### 5. Jalankan Web Server
Anda dapat menjalankan via systemd service atau PHP-FPM + Nginx.

**Contoh systemd service (`/etc/systemd/system/wa-blast.service`):**
```ini
[Unit]
Description=WA Broadcast Dashboard (Laravel)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/wa-blast-dashboard
ExecStart=/usr/bin/php artisan serve --host=0.0.0.0 --port=8085
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Aktifkan dan jalankan:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wa-blast.service
```

---

### Metode B: aaPanel Web Manager (GUI Control Panel) 🌐
> **Cocok untuk VPS yang dikelola via aaPanel.**

#### 1. Persiapan Environment di aaPanel
- Buka **App Store** ➔ Install **PHP 8.2/8.3**, **MySQL/MariaDB**, dan **Nginx**.
- Pastikan ekstensi PHP aktif: `fileinfo`, `redis` (opsional), `curl`, `pdo_mysql`.
- Buat database baru di menu **Databases**:
  - Nama DB: `wa_blast`
  - User: `wa_blast`
  - Simpan username & password untuk konfigurasi `.env`.

#### 2. Deploy Repository
- Masuk ke folder `/www/wwwroot/` via File Manager aaPanel atau Terminal.
- Clone repository:
  ```bash
  cd /www/wwwroot
  git clone https://github.com/abdhnf/wa-blast-dashboard.git
  cd wa-blast-dashboard
  ```
- Jalankan setup via Terminal:
  ```bash
  composer install --no-dev --optimize-autoloader
  npm install && npm run build
  cp .env.production.example .env
  php artisan key:generate
  ```

#### 3. Tambahkan Website di aaPanel
- Buka menu **Website** ➔ Klik **Add site**:
  - **Domain name:** `blast.domainanda.com` (atau IP server).
  - **Root directory:** `/www/wwwroot/wa-blast-dashboard/public` (arahkan ke folder `public`).
  - **PHP Version:** Pilih PHP 8.2 atau 8.3.
- Buka pengaturan website yang baru dibuat:
  - Tab **URL rewrite**: Pilih template `Laravel 5` (untuk mendukung routing Inertia SPA).
  - Tab **SSL**: Pasang sertifikat Let's Encrypt jika menggunakan domain publik.
- Atur permission direktori storage:
  ```bash
  chown -R www:www /www/wwwroot/wa-blast-dashboard/storage /www/wwwroot/wa-blast-dashboard/bootstrap/cache
  chmod -R 775 /www/wwwroot/wa-blast-dashboard/storage /www/wwwroot/wa-blast-dashboard/bootstrap/cache
  ```
- Eksekusi migrasi database:
  ```bash
  php artisan migrate --force
  ```

---

### Metode C: Docker Compose (All-in-One Container) 🐳
> **Instalasi otomatis berbasis kontainer tanpa setup PHP manual di OS.**

Buat file `docker-compose.yml` di root proyek:
```yaml
services:
  app:
    image: dunglas/frankenphp:latest-php8.3
    restart: unless-stopped
    ports:
      - "8085:80"
    volumes:
      - ./:/app
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
    entrypoint: >
      sh -c "php artisan migrate --force && frankenphp run --config /etc/caddy/Caddyfile"
```
Jalankan dengan perintah:
```bash
docker compose up -d
```

---

## 2. Environment & Integrasi wa-api

Dashboard ini memerlukan sinkronisasi langsung dengan endpoint API gateway [wa-api](https://github.com/abdhnf/wa-api).

| Parameter `.env` | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- |
| `WA_API_BASE` | URL internal gateway yang dihubungi oleh backend Laravel | `http://127.0.0.1:3100/api/v1` |
| `VITE_WA_API_BASE` | URL publik gateway yang dihubungi langsung dari browser pengguna | `http://192.168.1.50:3100/api/v1` |
| `APP_URL` | Domain atau URL akses aplikasi dashboard blast | `http://192.168.1.50:8085` |

> ⚠️ **Catatan Penting Vite:** Nilai `VITE_WA_API_BASE` ditanam ke dalam file Javascript statis pada saat proses kompilasi (`npm run build`). Jika URL gateway berubah, selalu jalankan ulang `npm run build`.

### Alur Autentikasi Magic Launch Token & PIN
Dashboard menggunakan sistem autentikasi aman tanpa pendaftaran publik terbuka:
1. Admin membuka panel wa-api (port `5174`).
2. Klik tombol **Blast App** ➔ Gateway akan men-generate Launch Token sekali pakai (`blst_xxx`).
3. Browser diarahkan ke dashboard blast (`/auth/launch?token=blst_xxx`).
4. Masukkan **6-Digit PIN Keamanan** admin untuk masuk ke dashboard CRM.

---

## 3. Fitur Utama

- 🔄 **Monitoring Antrean Terpadu (Unified Queue)**:
  - Menyatukan data antrean lokal kampanye (MariaDB) dan status live pesan dari gateway (Fastify) ke dalam 1 tabel progres real-time.
  - Bebas dari glitch visual, isolasi antrean per kampanye yang dipilih.

- 🔁 **Fitur Retry Antrean Gagal (Selective Retry)**:
  - **Retry Per Kontak**: Mengulang pengiriman nomor gagal langsung dari tabel antrean cukup dengan 1 klik.
  - **Retry Semua Gagal**: Tombol batch pada toolbar antrean untuk memproses ulang semua pesan gagal secara otomatis dengan jeda pacing human-like.
  - **Penjelasan Error Transparan**: Menampilkan alasan pasti kegagalan nomor (misal: *Reply ratio cooldown 24h*, *Nomor tidak terdaftar*, atau *Koneksi socket terputus*).

- 🎛️ **Kompatibel Penuh dengan Preset Anti-Ban Engine**:
  - Bekerja harmonis dengan proteksi 8 layer gateway `wa-api`:
    - **Strict Mode** (Delay 3–8s, max 5/min, Reply Ratio 10%).
    - **Balanced Mode** (Delay 1.5–5s, max 8/min, Reply Ratio 10%).
    - **Broadcast Mode** (Delay 2–5s, max 10/min, Reply Ratio nonaktif khusus pesan pengumuman).
  - Tombol Reset Cooldown untuk membuka isolasi kontak yang tertahan.

- 👥 **CRM & Manajemen Audiens**:
  - Manajemen Kontak dengan dukungan variabel dinamis JSON (`nama`, `kota`, `tier`, `url`, dsb.).
  - Pengelompokan kontak ke dalam Segmen Audiens untuk target broadcast cepat.
  - Pencarian kontak berbasis nomor/nama dan modal tambah nomor cepat.

- 📝 **Template Pesan Dinamis & WhatsApp Formatting**:
  - Live preview tampilan balon chat WhatsApp (*WhatsApp Bubble Preview*).
  - Toolbar pemformatan teks (*bold*, *italic*, *strikethrough*, *monospace*).
  - Dukungan pengiriman media (Gambar, Dokumen PDF, Audio, Video) dan Lokasi GPS.

---

## 4. Struktur Direktori

```text
wa-broadcast-dashboard/
├── app/
│   ├── Http/Controllers/      # Controller Laravel (Campaign, Contact, Auth)
│   └── Models/                # Eloquent Models (Campaign, Contact, Template, Group)
├── database/
│   └── migrations/            # Skema tabel MySQL/MariaDB
├── resources/
│   ├── css/                   # Tailwind CSS v4 styling
│   ├── js/
│   │   ├── components/        # Reusable UI components (Dialog, Toolbar, Layout)
│   │   ├── lib/
│   │   │   ├── api.js         # API Client gateway wa-api & endpoint retry
│   │   │   └── phone.js       # Normalisasi nomor telepon (62xxx)
│   │   └── Pages/
│   │       ├── Dashboard.jsx  # Ringkasan statistik & sesi aktif
│   │       ├── Broadcast.jsx  # Blast engine, antrean pesan, dan aksi retry
│   │       ├── Contacts.jsx   # Manajemen buku telepon & data kustom
│   │       ├── Groups.jsx     # Segmen audiens
│   │       └── Templates.jsx  # Editor template pesan
│   └── views/
│       └── app.blade.php      # Root template Inertia HTML
├── public/                    # Compiled assets (Vite production build)
├── routes/
│   └── web.php                # Rute aplikasi & proteksi session
└── .env.production.example    # Template konfigurasi environment produksi
```

---

## 5. Troubleshooting & FAQ

#### 1. Pesan gagal dengan error `Reply ratio too low (0.0% < 10.0%). Cooldown 24h`
- **Penyebab**: Akun mengirim minimal 5 pesan satu arah ke nomor yang belum pernah membalas chat. Layer keamanan `ReplyRatioGuard` membekukan nomor kontak tersebut selama 24 jam untuk menghindari report spam.
- **Solusi**:
  1. Buka web panel `wa-api` (:5174) ➔ Menu **Monitor & Queue**.
  2. Ubah preset menjadi **`Broadcast`** (layer reply ratio otomatis dinonaktifkan) atau klik tombol **`Reset Cooldown`**.
  3. Kembali ke Blast Dashboard, klik tombol **`Retry`** pada baris kontak yang gagal.

#### 2. Tampilan blank saat pertama kali deploy
- Pastikan database sudah dimigrasi: `php artisan migrate --force`.
- Periksa permission folder storage: `chmod -R 775 storage bootstrap/cache`.
- Pastikan build asset sudah dijalankan: `npm run build`.

#### 3. Error saat klik Retry: `UNIQUE constraint failed: messages.id`
- Pastikan backend `wa-api` Anda sudah menggunakan versi terbaru yang mendukung handler `updateMessageStatus` pada endpoint `/api/v1/messages/:id/retry`.

---

## 6. Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE). Bebas digunakan, dimodifikasi, dan didistribusikan untuk kebutuhan komersial maupun pribadi.
