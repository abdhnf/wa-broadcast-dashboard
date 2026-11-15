# Changelog

Semua perubahan penting pada `wa-broadcast-dashboard` didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/).

Dashboard ini adalah antarmuka operator untuk gateway `wa-api`. Perubahan yang
menyentuh perilaku pengiriman (status antrean, jeda, whitelist penerima) harus
dicatat di sini karena berdampak langsung ke kampanye yang sedang berjalan.

---

## [Unreleased] — Reverse OTP / User-Initiated Magic Link

Alur verifikasi terbalik: pengguna mengirim token dari WhatsApp-nya sendiri,
wa-api meneruskan lewat webhook, aplikasi mencocokkan token + nomor pengirim.
Tidak ada pesan yang dikirim aplikasi, dan nomor terbukti aktif karena ada
pesan keluar darinya. Panduan lengkap: `docs/reverse-otp.md`.

### Added

- **`ReverseOtp`** (`app/Services/ReverseOtp.php`). Normalisasi nomor
  (`08xx`/`+62`/`62` → `628`), ekstraksi token dari teks maupun caption gambar,
  dan verifikasi atomik. Token disimpan sebagai SHA-256; klaim memakai `UPDATE`
  bersyarat `status = 'pending'` sehingga dua pesan identik yang tiba bersamaan
  hanya memverifikasi sekali. Batas 5 percobaan salah, masa berlaku 5 menit,
  satu challenge aktif per nomor.
- **API `api/otp/*`** (`OtpController`): buat challenge, cek status untuk
  polling, batalkan. Otorisasi header `X-API-Key` seperti grup CRM; batas laju
  5 permintaan/menit per user dan per nomor.
- **Tabel `wa_otp_challenges`** dengan index unik `(user_id, token_hash)`.
- **Penyambungan ke webhook**: `WaWebhookController::cobaVerifikasiOtp()`
  dipanggil dari `handleMessageReceived()`. Kegagalan pencocokan tidak pernah
  menggagalkan penyimpanan pesan.
- **Redaksi token sebelum disimpan** (`ReverseOtp::samarkanToken()`). Verifikasi
  dijalankan lebih dulu, lalu teks disamarkan sebelum masuk
  `wa_inbound_messages.text`, kolom `raw`, dan `wa_webhook_events.payload`:
  `OTP GRQQCYTU` → `OTP ****`. Kedua tabel itu tidak pernah dibersihkan, jadi
  tanpa redaksi token hidup di sana selamanya — dan token yang belum terpakai
  masih sah sampai masa berlakunya habis.
- **`ReverseOtp::tokenDikenal()`**, dipakai khusus untuk memutuskan penyamaran.
  Bentuk token tanpa label tidak bisa dibedakan dari kata biasa delapan huruf:
  `sekarang`, `harganya`, dan `sebentar` seluruhnya ada di alfabet token. Pola
  yang menyamarkan semua teks delapan karakter merusak pesan pelanggan; pola
  yang tidak menyamarkan apa pun membiarkan ~6% token (yang kebetulan seluruhnya
  huruf) tersimpan mentah. Karena itu bentuk telanjang ditanyakan ke database —
  apakah hash-nya milik challenge user ini yang belum kedaluwarsa. Pemeriksaan
  bentuk dilakukan lebih dulu supaya pesan biasa tidak menghasilkan query.
- **Tes**: 33 lulus (125 asersi). `ReverseOtpTest` 19 tes, `OtpControllerTest`
  6 tes, `WaWebhookRetryTest` 3 tes.

### Fixed

- **Event webhook yang gagal tidak pernah diproses ulang.** Penerima hanya
  memeriksa `delivery_id` sudah ada atau belum, sehingga kiriman ulang dari
  wa-api setelah galat 500 dijawab "duplicate" — dan event itu hilang
  selamanya. Pada alur OTP akibatnya: pelanggan mengirim token, dashboard gagal
  sesaat, token tidak pernah terverifikasi. Sekarang hanya baris `processed`
  yang dianggap duplikat; baris `failed` diklaim ulang secara atomik.
- **`api/otp/*` dikecualikan dari CSRF** (`bootstrap/app.php`). Rute ini
  diautentikasi API key, bukan cookie sesi; tanpa pengecualian, klien non-browser
  selalu ditolak 419 meski kuncinya sah.
- **Pesan biasa berubah menjadi `****`.** Versi pertama `samarkanToken()`
  menyamarkan setiap teks delapan karakter dari alfabet token, sehingga
  "sekarang" dan "harganya" ikut hilang dari inbox. Ditutup dengan
  `tokenDikenal()` di atas.
- **Token yang dikirim dari nomor yang salah tetap tersimpan mentah.** Versi
  yang membedakan berdasarkan hasil verifikasi melewatkannya, karena
  verifikasinya gagal — padahal justru token seperti itu yang paling berbahaya
  bila bocor. `tokenDikenal()` tidak bergantung pada hasil verifikasi.

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

## [Unreleased] — waktu per transisi status pesan

**Tema:** menampilkan kapan setiap tahap pengiriman benar-benar terjadi, menggantikan satu jam yang menyesatkan.

### Fixed

- **Jam di bawah badge "Sent" tidak lagi memakai waktu antrean.** Sebelumnya sel status memakai `liveData.timestamp`, yang isinya `created_at` — waktu pesan **masuk antrean**, bukan waktu terkirim. Pada kampanye dengan jeda anti-ban, keduanya bisa berbeda menit-menit, sehingga badge "Sent" menampilkan jam yang salah.
- **Status terminal selain `failed` tidak lagi hilang dari daftar waktu.** Sebelumnya hanya `failed` yang ditangani, sehingga pesan `not_registered` / `invalid_number` / `cancelled` hanya menampilkan baris "Masuk antrean" — seolah pesannya masih di antrean, padahal sudah berhenti karena nomornya bermasalah. Daftar terminal kini sejalan dengan `FORCED_STATUSES` di backend wa-api.

### Added

- **`statusTimes` dipakai di dua halaman.** Gateway wa-api mencatat waktu kejadian tiap status (`queued`, `pacing`, `sending`, `sent`, `delivered`, `read`, `failed`) dan sudah mengirimkannya lewat `GET /messages/:sessionId`. Dashboard kini memakainya:
  - **Blast Engine → antrean**, kolom "Status & Jeda": jam di bawah badge = waktu status itu terjadi; tooltip badge memuat seluruh tahap beserta selisihnya.
  - **Overview → Log Pesan Terbaru**, kolom "Status": jam status + tooltip seluruh tahap. Kolom "Waktu" **diganti nama menjadi "Masuk Antrean"** karena isinya `created_at` — dua jam berbeda tanpa label mudah tertukar.
- **Jam status tampil di SEMUA cabang status antrean, bukan hanya yang sukses.** Sebelumnya hanya `sent` / `delivered` / `read` yang dirender dengan jam; `draft`, `pacing`, `sending`, `pending`, `cancelled`, dan ketiga status gagal (`failed`, `invalid_number`, `not_registered`) tidak. Akibatnya pesan `not_registered` — kasus nyata di produksi — tampil tanpa jam sama sekali. Kini seluruh cabang lewat satu komponen `KeteranganStatus`, sehingga tidak ada lagi cabang yang tertinggal saat status baru ditambahkan.
- **Util baru di `lib/messageStatus.js`** sebagai satu sumber kebenaran: `statusTimeOf`, `statusTimeSummary`, `buildStatusTimeRows`, `formatStatusClock`, `formatStatusDelta`, `STATUS_STAGE_LABEL`. Nama tahap disamakan dengan panel wa-api agar istilahnya konsisten.

### Notes for reviewer

- **Pesan lama tidak akan punya waktu per tahap.** Waktunya tidak pernah tersimpan sebelum fitur ini ada, dan tidak bisa direkonstruksi. Sel tampil kosong — bukan diisi `created_at` sebagai tebakan.
- **`draft` dan `pending` juga tidak punya waktu per tahap.** Keduanya status lokal dashboard (target belum diserahkan ke gateway), sedangkan pencatatan gateway dimulai dari `queued`.
- **Tidak ada perubahan backend.** `statusTimes` sudah ikut di respons API apa adanya; ini murni lapisan tampilan.
- **Uji util: 43 kasus lulus** (`buildStatusTimeRows`, `statusTimeSummary`, `statusTimeOf`) — termasuk alur lengkap, pesan gagal, keempat status terminal, nilai rusak (`NaN`/`Infinity`/string), dan objek kosong. Satu bug ditemukan dan diperbaiki saat uji: `typeof NaN === 'number'` membuat nilai rusak lolos dan tampil sebagai baris berjam `-`; kini memakai `Number.isFinite`.
- **Verifikasi browser** dengan data nyata dari gateway (bukan dummy): kasus pembeda sengaja dibuat — waktu antrean 05.21 vs waktu read 05.30, dan sel menampilkan **05.30**. Ketujuh status antrean dicek satu per satu (termasuk `failed` dengan sebab "Nomor tidak terdaftar di WhatsApp"), tooltip memuat seluruh tahap beserta selisihnya, dan mobile 375px memakai scroll horizontal yang sudah ada tanpa jam terpotong.
- **Cara menguji ulang:** harness ada di `~/Documents/uji/wa-broadcast-harness/` (`./jalankan.sh`, `./hentikan.sh`). Uji util: `node ~/Documents/uji/wa-broadcast-harness/uji-util-waktu.mjs`.
- **Bug harness yang ikut diperbaiki** (`server.mjs`): proxy hanya meneruskan header `content-type`, sehingga `X-API-Key` — satu-satunya kredensial dashboard — terbuang dan backend menjawab **401 untuk semua permintaan**. Gejalanya menyesatkan: halaman tampil normal dengan pesan "sesi login tidak valid", bukan galat proxy, sehingga sempat dicurigai sebagai bug fitur. Kini seluruh header diteruskan kecuali `host` dan `content-length`.

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
