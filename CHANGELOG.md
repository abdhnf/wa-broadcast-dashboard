# Changelog

Semua perubahan penting pada `wa-broadcast-dashboard` didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/).

Dashboard ini adalah antarmuka operator untuk gateway `wa-api`. Perubahan yang
menyentuh perilaku pengiriman (status antrean, jeda, whitelist penerima) harus
dicatat di sini karena berdampak langsung ke kampanye yang sedang berjalan.

---

## [Unreleased] — Inbox: sesi aktif, balasan, satu alur

Penyempurnaan Inbox setelah dipakai: menyembunyikan sesi yang sudah dihapus,
menamai pilihan sesi, menambah editor balasan, dan menghapus pemisahan
Masuk/Terkirim supaya percakapan mengalir seperti aplikasi chat.

### Added

- **Balasan langsung dari Inbox.** Editor teks dengan toolbar pemformatan
  WhatsApp (tebal/miring/coret/monospace, emoji, spintax, variabel) yang sama
  dengan Playground. Enter mengirim, Shift+Enter menambah baris. Pengiriman
  memakai jalur yang sudah ada (`POST /messages/send`), lalu riwayat dimuat
  ulang supaya status yang tampil adalah status asli gateway — bukan tebakan
  lokal.
- **Status sesi di header percakapan.** Titik warna dan label
  (`Terhubung`/`Menghubungkan`/`Terputus`) memberi tahu apakah balasan bisa
  dikirim. Tombol kirim dinonaktifkan saat sesi tidak terhubung.

### Changed

- **Tombol kirim mengapung di dalam kotak teks** (kanan bawah), bukan di kolom
  terpisah. Kotak teks memakai padding kanan 56px supaya teks tidak tertutup.
- **Kotak balasan tumbuh mengikuti isi** (`field-sizing: content`, 52–132px),
  lalu menggulir sendiri setelah melewati batas.
- **Enter mengirim lewat jalur form native.** Editor dibungkus `<form>` dengan
  tombol `type="submit"`; Enter hanya pintasan (`requestSubmit()`). Ditambah
  penjaga IME (`isComposing` + `keyCode 229`) supaya Enter yang sedang
  mengonfirmasi kandidat huruf Jepang/China/Korea tidak mengirim pesan
  setengah jadi, dan `enterkeyhint="send"` agar keyboard ponsel menampilkan
  tombol Kirim.
- **Pilihan sesi memakai nama dan status**, bukan `sess-xxxx`. Datanya diambil
  dari `GET /sessions` wa-api dan di-cache 30 detik; bila gateway tidak
  terjangkau, pilihan jatuh kembali ke daftar sesi yang punya pesan di database
  sendiri tanpa nama.
- **Daftar percakapan tidak lagi dipisah Masuk/Terkirim.** Semua percakapan
  tampil dalam satu urutan aktivitas terbaru; pencarian tetap ada.

### Fixed

- **Balasan tidak muncul di daftar percakapan.** Setelah mengirim, hanya utas
  yang dimuat ulang; daftar di kiri tetap menampilkan pesan lama dan
  percakapannya tidak naik ke atas. Sekarang keduanya diperbarui (daftar secara
  senyap, tanpa kedipan indikator), dan gelembung pesan ditambahkan langsung
  memakai id asli dari gateway sehingga tidak berkedip saat riwayat dimuat.
- **Pesan bisa terkirim lewat sesi lain tanpa penjelasan.** Bila sesi yang
  dipakai sedang tidak sehat, gateway memindahkan pengiriman ke sesi lain
  (auto-rotate) sehingga pesan tidak muncul di utas yang sedang dibuka.
  Kondisi itu sekarang dideteksi dari `messageId` dan diberi keterangan,
  bukan dibiarkan seolah pesan hilang.
- **Sesi yang sudah dihapus tidak muncul lagi.** Riwayat pesan tidak ikut
  terhapus saat sesi dihapus di wa-api, sehingga nomor-nomor lama terus tampil
  (sebelumnya 43 percakapan, 23 setelah disaring). Daftar kini hanya memuat
  sesi yang masih terdaftar, dan membuka percakapan dari sesi lama dijawab 404
  "Sesi ini sudah tidak aktif" — termasuk pesannya, tidak hanya namanya.

---

## [Unreleased] — Inbox Dua Arah (riwayat masuk + terkirim)

Inbox sebelumnya hanya membaca `wa_inbound_messages`, sehingga pesan yang
dikirim operator tidak pernah terlihat — padahal pesan itu tidak pernah
melewati dashboard (browser memanggil wa-api langsung). Sekarang percakapan
menampilkan kedua arah, dengan tampilan gelembung seperti WhatsApp. Rancangan
lengkap: `docs/inbox-history.md`.

### Added

- **Riwayat pesan terkirim di Inbox.** `CrmController::conversation()` membaca
  pesan keluar dari wa-api (`GET /messages/{sessionId}?phones=…`) lalu
  menggabungkannya dengan pesan masuk lokal lewat `InboxHistory::gabung()`.
  Tidak ada tabel baru: wa-api sudah menyimpan riwayat itu lengkap dan tidak
  pernah menghapusnya, jadi menyalinnya ke dashboard hanya menciptakan sumber
  kebenaran kedua yang harus disinkronkan statusnya.
- **Daftar percakapan dua arah.** `CrmController::inbox()` menambahkan
  percakapan yang hanya punya pesan keluar (nomor hasil blast yang belum pernah
  membalas) dan menandai arah pesan terakhir (`lastDirection`, `lastStatus`,
  `batchId`). Ringkasan pesan keluar diambil dalam SATU panggilan untuk semua
  sesi, bukan satu panggilan per baris.
- **`WaApiClient`** (`app/Services/WaApiClient.php`). Klien baca-saja ke wa-api
  dengan timeout pendek; kegagalan mengembalikan `null`, bukan exception, supaya
  gateway yang mati tidak menjatuhkan halaman.
- **`InboxHistory`** (`app/Services/InboxHistory.php`). Fungsi murni untuk
  memetakan dan menggabungkan dua sumber: daftar putih field (payload wa-api
  memuat `mediaBase64` yang bisa beberapa megabyte), normalisasi waktu UTC →
  zona aplikasi, urutan, dan pemotongan.
- **`php artisan inbox:backfill`** (`app/Console/Commands/InboxBackfill.php`).
  Menarik riwayat pesan masuk lama dari wa-api. Idempoten (kunci
  `session_id` + `wa_message_id`), menyamarkan token OTP sebelum menyimpan, dan
  punya `--dry-run`.
- **UI Inbox bergaya WhatsApp** (`resources/js/Pages/Inbox.jsx`): gelembung
  keluar hijau di kanan dengan centang status, gelembung masuk terang di kiri,
  wallpaper doodle, pemisah hari, saringan Semua/Masuk/Terkirim, pencarian isi
  pesan, dan tata letak master-detail di layar kecil.
- **`resources/js/lib/whatsappText.js`**: pemformatan teks WhatsApp dipindahkan
  dari `WhatsAppBubblePreview` supaya pratinjau dan riwayat memakai aturan yang
  sama.
- **Index `wa_inbound_conv_idx`** pada `(user_id, session_id, from_phone,
  received_at)` untuk query riwayat percakapan.

### Changed

- **Verifikasi API key di-cache 60 detik** (`CrmController::resolveUser()`).
  wa-api membatasi `/auth/*` 30 permintaan per menit **per IP**, dan seluruh
  pengunjung dashboard berbagi satu IP. Tanpa cache, membuka 30 percakapan
  dalam semenit membuat semua request berikutnya ditolak 429 — dan Inbox
  memang membuka satu percakapan per klik. Hanya verifikasi yang berhasil yang
  disimpan; kunci salah tetap ditolak seketika. Kompromi: kunci yang dicabut
  masih berlaku paling lama satu menit.
- **429 dari gateway dibedakan dari 401.** Sebelumnya batas laju dilaporkan
  sebagai "API key tidak valid", yang menyesatkan operator.

### Fixed

- **Klaim README "inbox tetap bisa dibaca walau gateway mati" tidak benar.**
  `resolveUser()` memanggil wa-api pada setiap request CRM, jadi gateway mati
  berarti semua endpoint CRM menjawab 401. README diperbaiki; perilakunya
  sendiri tidak diubah (kecuali cache di atas).

### Catatan operasional

- Jalankan `php artisan inbox:backfill --api-key=…` sekali setelah deploy untuk
  mengisi riwayat masuk yang datang sebelum webhook terpasang.
- `WA_API_HISTORY_ENABLED=false` mengembalikan Inbox ke perilaku lama tanpa
  deploy ulang.

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
