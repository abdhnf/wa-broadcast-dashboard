# Changelog

Semua perubahan penting pada `wa-broadcast-dashboard` didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/).

Dashboard ini adalah antarmuka operator untuk gateway `wa-api`. Perubahan yang
menyentuh perilaku pengiriman (status antrean, jeda, whitelist penerima) harus
dicatat di sini karena berdampak langsung ke kampanye yang sedang berjalan.

---

## [Merged] — branch `fix/migration-selaraskan-prod`

**Tema:** menyelaraskan migration inti dengan skema produksi agar `php artisan migrate` aman dijalankan.

### Fixed

- **Migration inti `0001_01_01_000000/1/2` kini idempoten** (`create_users_table`, `create_cache_table`, `create_jobs_table`).
  Setiap `Schema::create` dibungkus `Schema::hasTable()`, sehingga tabel yang sudah ada dilewati alih-alih menggagalkan migration.

### Why

Tabel `migrations` di produksi (`wa_blast`) mencatat nama migration ad-hoc `2026_09_11_104001/2/3`, bukan `0001_01_01_000000/1/2`. Akibatnya ketiga file kanonik itu berstatus **Pending** selamanya, padahal tabel yang ingin dibuatnya (`users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`) sudah ada. Tanpa penjaga, `php artisan migrate` gagal dengan `table already exists` — dan pada varian yang memakai `dropIfExists` di `up()` berisiko menghapus data.

Efek samping yang ikut diperbaiki: tabel `job_batches` dan `failed_jobs` **tidak pernah terbentuk**, karena migration ad-hoc produksi hanya membuat tabel `jobs`. Setelah perbaikan ini keduanya dibuat saat migration dijalankan.

### Notes for reviewer

- File ad-hoc `2026_09_11_10400*` **sengaja tidak** ditambahkan ke repo. Kalau ditambahkan, instalasi baru akan membuat tabel yang sama dua kali (sekali oleh `0001_01_01_*`, sekali oleh `2026_09_11_10400*`). `0001_01_01_*` dipertahankan sebagai satu-satunya set kanonik.
- Diuji di SQLite terisolasi (MySQL produksi tidak disentuh): (A) replika produksi + migration lama → **gagal** `table "users" already exists`; (B) replika produksi + migration baru → tabel lama dilewati, data utuh, `job_batches` + `failed_jobs` terbentuk; (C) database kosong + migration baru → 13 tabel lengkap.
- `QUEUE_CONNECTION=database`, tetapi aplikasi **tidak memakai queue** (`ShouldQueue`/`dispatch()` tidak ada di `app/`, `routes/`; tabel `jobs` 0 baris). Jadi tabel yang hilang itu risiko laten, bukan gangguan aktif.
- Catatan operasional: `migrate --pretend` **tidak menjalankan** `hasTable()`, jadi SQL `create table` tetap tercetak meski penjaga akan melewatinya. Bukti penjaga bekerja hanya dari eksekusi nyata, bukan dari `--pretend`.

---

## [Unreleased] — branch `main`

**Tema:** pemisahan data scope admin (Personal vs Global System) pada Overview Dashboard.

### Added

- **Scope Selector 1-Klik di Header Overview** (`Dashboard.jsx`).
  Menyediakan segmented switch khusus untuk pengguna dengan role `admin`:
  - **Akun Saya (Personal Scope — Default):** Menampilkan metrik murni kepemilikan admin (`s.userId === currentUser.id`, `m.userId === currentUser.id`). Menghilangkan pencampuran data agregat pengguna lain pada kartu Antrean Aktif, Terkirim Hari Ini, Tingkat Pengiriman, Sesi WhatsApp Terhubung, Grafik Distribusi Jam, Daftar Batch Blast, dan Log Pesan Terakhir.
  - **Semua Pengguna (Global System Scope):** Menampilkan data agregat gabungan dari seluruh pengguna sistem di gateway untuk kebutuhan pengawasan infrastruktur dan beban traffic.
- **Indikator Badge Status Scope** (`Dashboard.jsx`).
  Memberikan label penanda jelas di samping judul (`Scope: Akun Saya (Personal)` bernuansa brand emerald dan `Scope: Semua Pengguna (X Sesi Total)` bernuansa indigo).
- **Label Transparansi Kepemilikan Sesi & Pesan** (`Dashboard.jsx`).
  Pada mode *Semua Pengguna*, tabel sesi WhatsApp dan tabel log pesan menyertakan badge identitas pemilik (misal: *Admin (Saya)* atau nama pemilik sesi/pesan) sehingga admin dapat langsung membedakan pemilik data.
- **Persistensi State Scope Lokal** (`Dashboard.jsx`).
  Preferensi scope yang dipilih admin disimpan ke `localStorage` (`wa_blast_admin_scope`) sehingga tidak ter-reset saat memuat ulang halaman.

### Notes for reviewer

- Perubahan bersifat **100% frontend-only**. Tidak ada modifikasi pada kontrak API gateway (`wa-api`) maupun controller backend Laravel (`CrmController.php`).
- Sesi dan log pesan difilter langsung di memori browser dari payload API yang sudah menyediakan `userId` dan metadata `owner`.

---

## [Merged] — branch `feat/campaign-recipient-whitelist`

**Tema:** kendali whitelist penerima kampanye (contactGraph) di dashboard.
**Basis:** `cf4d791` (produksi). **Belum di-merge ke `main`.**

### Added

- **Switch whitelist penerima di header kampanye** (`Broadcast.jsx`).
  Mendaftarkan seluruh penerima kampanye sekaligus agar boleh melewati handshake
  contactGraph, lengkap dengan jumlah nomor yang terdaftar.

  Dikirim sebagai **satu permintaan** berisi seluruh nomor, bukan satu panggilan
  per nomor. Kampanye dapat berisi ratusan penerima; memanggil endpoint per nomor
  akan membanjiri gateway sekaligus membuat UI terasa macet.

- **Kolom `Whitelist` pada tabel antrean** (`Broadcast.jsx`).
  Menampilkan status per nomor — `Terdaftar` (boleh lewat handshake) atau
  `Handshake` (akan tertahan) — sekaligus menjadi override per baris.

  Sumber kebenaran tetap di gateway; kolom ini hanya cermin dari `batchApproval`
  yang dimuat lewat `loadBatchApproval()`. Dashboard tidak menyimpan state
  whitelist sendiri, supaya tidak muncul dua sumber kebenaran seperti pada kasus
  status jeda antrean.

- **Fungsi API whitelist** (`lib/api.js`): `fetchBatchApproval()`,
  `approveBatchRecipients()`, `revokeBatchApproval()` — memetakan endpoint
  `contact-graph/batch` di gateway.

### Changed

- **Nomor tidak valid dilaporkan, tidak dilewati diam-diam.**
  Bila sebagian nomor ditolak gateway, jumlah dan contohnya ditampilkan. Diam-diam
  melewatinya membuat operator mengira seluruh penerima sudah terdaftar padahal
  sebagian tidak — dan blast berikutnya akan macet tanpa penjelasan.

- **`colSpan` baris kosong tabel antrean** disesuaikan (7/8 → 8/9) mengikuti kolom
  baru.

### Notes for reviewer

- Loader whitelist gagal **senyap** (catch tanpa error). Whitelist hanya informasi
  tambahan; kegagalan memuatnya tidak boleh mengganggu tampilan antrean kampanye.
- Sel whitelist menampilkan `—` bila `batchId` atau `sessionId` belum tersedia
  (kampanye baru yang belum pernah di-start).
- Perubahan ini **belum teruji di browser**. Verifikasi yang sudah dilakukan:
  `vite build` exit 0, dan penanda fitur (`contact-graph/batch`, `lolos handshake`,
  `batchWhitelist`) ada di bundle hasil build.

### Dependencies

- Membutuhkan endpoint `contact-graph/batch` di `wa-api` — tersedia pada branch
  `feat/contactgraph-batch-whitelist`. Tanpa endpoint tersebut, switch dan kolom
  whitelist akan gagal senyap dan hanya menampilkan `—`.

---

## Riwayat sebelumnya

Perubahan berikut sudah berjalan di produksi (`cf4d791` dan sebelumnya).

### Fixed

- **Timezone tampilan waktu.** OS `Asia/Jakarta`, Laravel `UTC`, dan
  `CrmController.php:792` menempel `' WIB'` tanpa konversi — jam yang ditampilkan
  meleset 7 jam. Diperbaiki dengan `APP_TIMEZONE=Asia/Jakarta`.

- **Gelombang ganda pada `sess-mu2512ti`.** Tombol Resume memanggil
  `handleStartBlast()` ulang sehingga 52 target terkirim 97 kali. Diperbaiki di
  `0d8c1fc`.

### Changed

- **Status `queued` dipisah dari `pending`.** `queued` = menunggu di gateway,
  `pending` = draft lokal dashboard. Data lama tetap dibaca
  (`status IN ('queued','pending')`) supaya tidak ada pesan yang hilang dari
  tampilan.

- **Sumber kebenaran status jeda adalah per-batch.** `loadQueueStatus()` mencoba
  `fetchBatchStatus(campBatchId)` lebih dulu dan langsung `return`; status per-sesi
  hanya fallback bila `batchId` belum terbentuk. Sebelumnya dua sumber ini bisa
  berbeda dan menghasilkan tampilan jeda yang salah.

- **Status `cancelled` dibedakan dari `failed`.** `QUEUE_CANCELLED_STATUSES` dan
  label "Dibatalkan" ditambahkan, agar pembatalan oleh operator tidak terhitung
  sebagai kegagalan pengiriman.

### Added

- **Selector preset anti-ban** dengan `handleChangeAntibanPreset()` dan
  `fetchAntiBanStatus()`, mendukung penggantian preset untuk semua sesi sekaligus.
