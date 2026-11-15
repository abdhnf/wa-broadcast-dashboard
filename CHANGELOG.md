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

## [Unreleased] — branch `feat/campaign-recipient-whitelist`

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
