# Changelog

Semua perubahan penting pada `wa-broadcast-dashboard` didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/).

Dashboard ini adalah antarmuka operator untuk gateway `wa-api`. Perubahan yang
menyentuh perilaku pengiriman (status antrean, jeda, whitelist penerima) harus
dicatat di sini karena berdampak langsung ke kampanye yang sedang berjalan.

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
