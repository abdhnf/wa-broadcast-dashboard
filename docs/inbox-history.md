# Inbox Dua Arah — Rancangan Perbaikan Riwayat Pesan

Rancangan untuk membuat menu **Inbox** membaca riwayat **semua** pesan pada
sebuah percakapan: yang diterima pelanggan maupun yang dikirim operator,
termasuk pesan yang dikirim sebelum fitur ini ada.

Status dokumen: **sudah diimplementasikan** (2026-11-15). Bagian 1–9 adalah
rancangan yang dijalankan; bagian 16 mencatat penyimpangan dan temuan saat
implementasi.

---

## 0. Ringkasan

Masalahnya bukan satu bug, melainkan tiga celah yang saling menutupi:

1. **Inbox hanya membaca tabel pesan masuk.** `CrmController::conversation()`
   (`app/Http/Controllers/CrmController.php:1039`) hanya menyentuh
   `wa_inbound_messages`. Tidak ada satu pun jalur yang menampilkan pesan
   keluar.
2. **Pesan keluar tidak pernah sampai ke database dashboard.** Browser
   mengirim langsung ke wa-api (`sendText`/`sendMedia`/`sendBulkMessages` di
   `resources/js/lib/api.js`), jadi Laravel tidak pernah melihat isi pesan yang
   dikirim. Satu-satunya jejak di dashboard adalah agregat hitungan kampanye
   (`sent_count`, `delivered_count`, …), bukan pesannya.
3. **Riwayat masuk sebelum webhook dipasang tidak pernah diimpor.** Webhook
   hanya menangkap pesan sejak didaftarkan. Data lama tetap ada di wa-api,
   tetapi dashboard tidak pernah menariknya.

Akibat yang terlihat hari ini di mesin ini:

| Sumber | Pesan masuk | Pesan keluar |
| :--- | ---: | ---: |
| Dashboard (`wa_inbound_messages`) | 2 | — (tidak disimpan) |
| wa-api (`inbound_messages` / `messages`) | 131 | 109 (22 nomor, 8 sesi) |

Jadi inbox menampilkan 2 pesan dari 131 yang sebenarnya ada, dan 0 dari 109
pesan yang pernah dikirim.

**Rekomendasi:** pesan masuk tetap dibaca dari database dashboard (setelah
di-backfill sekali), pesan keluar dibaca langsung dari wa-api saat percakapan
dibuka, lalu digabung dan diurutkan di sisi server. Tidak ada tabel baru untuk
pesan keluar, tidak ada perubahan pada jalur pengiriman.

---

## 1. Kondisi sekarang

### 1.1 Alur data yang ada

```
                    ┌──────────────────────────────┐
   kirim pesan      │  Browser (Inbox/Broadcast)   │
   ────────────────>│  X-API-Key dari localStorage │
                    └───────────┬──────────────────┘
                                │ POST /messages/send*  (langsung, tanpa Laravel)
                                ▼
                    ┌──────────────────────────────┐
                    │           wa-api             │
                    │  messages  (keluar, lengkap) │
                    │  inbound_messages (masuk)    │
                    └───────────┬──────────────────┘
                                │ webhook message.received (HMAC)
                                ▼
                    ┌──────────────────────────────┐
                    │  Laravel dashboard           │
                    │  wa_inbound_messages (masuk) │
                    └───────────┬──────────────────┘
                                │ GET /api/crm/inbox*
                                ▼
                    ┌──────────────────────────────┐
                    │  Inbox.jsx — hanya "masuk"   │
                    └──────────────────────────────┘
```

Pesan keluar tidak pernah melewati Laravel, sehingga tidak ada tempat di
dashboard yang bisa menampilkannya.

### 1.2 Fakta yang mengikat desain

| Fakta | Bukti |
| :--- | :--- |
| wa-api menyimpan pesan keluar lengkap (teks, caption, media, status, waktu) | `backend/src/db/skema.ts:47`, `backend/src/db/pesan.ts:350` |
| wa-api **tidak pernah menghapus** baris `messages`; pembatalan hanya mengubah status | tidak ada `DELETE FROM messages` di `backend/src`; `session-manager.ts:581` memakai `updateMessageStatus` |
| Endpoint riwayat keluar sudah ada dan bisa difilter per nomor | `GET /api/v1/messages/:sessionId?phones=…` — `backend/src/routes/pengaturan.ts:37` |
| Endpoint riwayat masuk juga ada, berpaginasi | `GET /api/v1/inbound?page=…` — `backend/src/routes/inbox.ts:19` |
| Webhook `message.status` **tidak membawa teks pesan** | payload di `backend/src/routes/konteks.ts:272` hanya `messageId`, `status`, `to`, `batchId`, `occurredAt` |
| Nomor pada kedua sisi berformat sama (digit `62…`) | keluar: `backend/src/routes/schemas.ts:10`; masuk: `backend/src/engine` → `phoneFromJid` `backend/src/inbound.ts:82` |
| Pesan grup tidak masuk inbox (nomor pengirim `null`) | `phoneFromJid` menolak `@g.us`; inbox memfilter `from_phone IS NOT NULL` |
| wa-api mengembalikan waktu ISO-8601 UTC (`…Z`) | contoh baris `messages.created_at` = `2026-11-15T04:44:10.599Z` |
| Dashboard menyimpan `received_at` sebagai DATETIME tanpa zona (WIB) | contoh baris = `2026-11-13 16:50:10` |
| Payload keluar bisa memuat `mediaBase64` (bisa beberapa MB) | `backend/src/routes/pesan.ts:68` meneruskan `mediaBase64` ke antrean |
| Teks masuk di wa-api **mentah** (token OTP tidak disamarkan) | penyamaran hanya terjadi di `WaWebhookController::handleMessageReceived()` (`:205`) |

### 1.3 Cacat lain yang ikut ketahuan

`CrmController::resolveUser()` (`:31`) memanggil `GET /auth/me` ke wa-api pada
**setiap** request CRM. Artinya klaim di README ("inbox tetap bisa dibaca walau
gateway sedang mati") tidak benar hari ini: kalau wa-api mati, semua endpoint
CRM menjawab 401. Ini relevan karena memengaruhi keputusan di §4 — menambah
ketergantungan baca ke wa-api tidak menambah risiko yang belum ada.

---

## 2. Ruang lingkup

**Termasuk**

- Riwayat percakapan menampilkan pesan masuk **dan** keluar, urut waktu.
- Daftar percakapan menampilkan percakapan yang punya pesan keluar saja
  (mis. blast ke nomor yang belum pernah membalas).
- Status pesan keluar (queued/sent/delivered/read/failed/cancelled) tampil di
  gelembung pesan.
- Perintah backfill riwayat masuk dari wa-api, idempoten, aman diulang.
- Penanda "degraded" saat wa-api tidak bisa dihubungi.

**Tidak termasuk**

- Mengirim pesan dari dalam Inbox (balas langsung). Itu fitur terpisah; desain
  ini hanya membaca.
- Pesan grup. Struktur `from_phone`/`to` saat ini tidak mendukungnya.
- Notifikasi real-time (websocket/SSE). Tetap muat ulang manual.
- Menghapus atau menyunting riwayat.

---

## 3. Opsi desain

| | **A. Baca langsung + backfill** (rekomendasi) | **B. Mirror lokal** | **C. Proxy penuh ke wa-api** |
| :--- | :--- | :--- | :--- |
| Sumber pesan keluar | wa-api, saat dibuka | tabel baru `wa_outbound_messages` | wa-api |
| Sumber pesan masuk | `wa_inbound_messages` (di-backfill) | `wa_inbound_messages` | wa-api |
| Tabel baru | tidak ada (hanya 1 index) | 1 tabel + kolom status | tidak ada |
| Job sinkronisasi | tidak ada (backfill manual sekali) | wajib, tiap 30–60 detik | tidak ada |
| Riwayat lama langsung terlihat | ya | ya, setelah backfill | ya |
| Pesan dari panel wa-api ikut terlihat | ya, otomatis | hanya setelah sinkron | ya |
| Risiko data basi | tidak ada | sampai 60 detik | tidak ada |
| Risiko dua sumber kebenaran | rendah (hanya status) | tinggi (teks + status) | rendah |
| Redaksi token OTP | terjaga (masuk tetap lokal) | terjaga | **hilang** — wa-api menyimpan mentah |
| Kerja | ~3 hari | ~6–7 hari | ~1 hari |
| Cocok bila | volume kecil–menengah, ingin cepat benar | butuh pencarian/counter lintas riwayat, offline | dashboard mau jadi tipis |

**Kenapa A, bukan B.** Menyalin pesan keluar berarti dashboard memegang salinan
kedua dari data yang sudah dimiliki wa-api, lalu harus menyinkronkan perubahan
status (queued → sent → delivered → read) yang datangnya dari webhook
`message.status` — event yang justru tidak membawa teks. Setiap kegagalan
sinkron menghasilkan gelembung dengan status salah, dan tidak ada cara
mendeteksinya dari dashboard. Untuk 109 pesan, biaya menyalin itu tidak
sebanding manfaatnya.

**Kenapa A, bukan C.** Membaca pesan masuk dari wa-api berarti menampilkan teks
mentah yang di sana **belum disamarkan** — token OTP yang masih berlaku akan
tampil di layar dan ikut terkirim ke browser. Redaksi saat baca bisa ditambah,
tetapi itu memindahkan jaminan keamanan dari "tidak pernah tersimpan" menjadi
"disamarkan saat ditampilkan", dan satu jalur baca yang lupa memanggilnya sudah
cukup untuk membocorkan token.

**B tetap disiapkan sebagai fase 2** bila nanti butuh pencarian lintas riwayat
atau hitungan belum-dibaca. Skemanya sudah diantisipasi di §11.

---

## 4. Desain yang direkomendasikan

### 4.1 Arsitektur

```
   Browser
      │ GET /api/crm/inbox/conversation?sessionId&phone
      ▼
   Laravel ──────────────────────────────────────────────┐
      │ 1. baca wa_inbound_messages (lokal, sudah disamarkan)
      │ 2. GET wa-api /messages/{session}?phones={phone}   │  (server→server,
      │    X-API-Key milik pengguna                        │   timeout 3 dtk)
      ▼                                                    │
   gabung + urutkan + potong ◄─────────────────────────────┘
      │
      ▼
   { messages: [ {direction:"in"|"out", …} ], degraded:false }
```

Prinsipnya: **satu titik penggabungan di server**, bukan di browser. Alasannya
tiga: normalisasi zona waktu hanya ditulis sekali, penyaringan field sensitif
(`mediaBase64`) tidak bisa dilewati klien, dan hasilnya bisa diuji tanpa
menjalankan browser.

### 4.2 Komponen baru

| Berkas | Isi |
| :--- | :--- |
| `app/Services/WaApiClient.php` | Klien HTTP tipis ke wa-api: `riwayatKeluar()`, `riwayatMasuk()`, `halamanMasuk()`. Timeout, header `X-API-Key`, penanganan galat jadi `null` (bukan exception) supaya pemanggil bisa degrade. |
| `app/Services/InboxHistory.php` | Fungsi murni: `gabung(array $masuk, array $keluar): array`, `ringkasPercakapan(...)`, `petakanKeluar(array $baris): array`. Tanpa I/O, supaya bisa diuji unit. |
| `app/Console/Commands/InboxBackfill.php` | `php artisan inbox:backfill` — impor riwayat masuk dari wa-api. |
| `database/migrations/…_add_inbox_history_index.php` | Index `(user_id, session_id, from_phone, received_at)` pada `wa_inbound_messages`. |

Tidak ada tabel baru. Tidak ada perubahan pada `WaWebhookController`.

### 4.3 Perubahan pada yang sudah ada

| Berkas | Perubahan |
| :--- | :--- |
| `app/Http/Controllers/CrmController.php:980` `inbox()` | Tambah ringkasan keluar dari wa-api, gabung dengan ringkasan masuk, kembalikan `lastDirection`, `lastStatus`, `outboundAvailable`. |
| `app/Http/Controllers/CrmController.php:1039` `conversation()` | Ambil pesan keluar dari wa-api, gabung lewat `InboxHistory::gabung()`, kembalikan `direction` + `status`. |
| `config/services.php:50` | Tambah `wa_api.history_timeout` (default 3 detik) dan `wa_api.history_enabled` (default `true`). |
| `resources/js/lib/api.js:582,591` | `fetchInbox`/`fetchConversation` meneruskan field baru (`degraded`, `truncated`, `lastDirection`). |
| `resources/js/Pages/Inbox.jsx` | Gelembung dua arah, centang status, filter Semua/Masuk/Terkirim, banner degraded, tombol "Muat lebih lama". |
| `README.md` §Inbox | Perbaiki klaim "tetap bisa dibaca walau gateway mati" (lihat §1.3). |
| `CHANGELOG.md` | Entri `[Unreleased]`. |

### 4.4 Alur daftar percakapan

1. Query lokal seperti sekarang (satu baris per nomor, pesan masuk terakhir).
2. Satu panggilan `GET /api/v1/messages/all?limit=200` ke wa-api. Hasilnya
   sudah terurut `created_at DESC`, jadi kemunculan **pertama** setiap pasangan
   `(sessionId, recipient)` adalah pesan keluar terakhirnya.
3. Gabung berdasarkan kunci `sessionId|phone`. `lastAt` = yang lebih baru,
   `lastDirection` mengikuti pemenangnya.
4. `sessions` = gabungan sesi dari kedua sisi.
5. Bila panggilan wa-api gagal: kembalikan hasil lokal dengan
   `outboundAvailable: false`. Halaman tetap terbuka.

Biaya: satu request tambahan per muat halaman, bukan per baris. Cache 10 detik
per hash API key supaya tombol "Muat ulang" tidak membanjiri wa-api.

### 4.5 Alur riwayat percakapan

1. Ambil pesan masuk lokal: `user_id`, `session_id`, `from_phone`, urut
   `received_at ASC`, batas 300.
2. Ambil pesan keluar: `GET /api/v1/messages/{sessionId}?phones={phone}&limit=200`,
   ulangi dengan `offset` sampai total atau batas 3 halaman (600 baris).
3. Petakan tiap baris keluar: `at` = `created_at` (UTC) → zona aplikasi,
   `text`/`caption`/`mediaUrl`/`status`/`errorDetail`/`batchId` saja.
4. Gabung, urutkan `at ASC`, tie-break `direction` (`in` dulu) lalu `id`.
5. Potong 300 terakhir, set `truncated` bila terpotong.

### 4.6 Sketsa penggabungan

```php
// app/Services/InboxHistory.php
public static function gabung(array $masuk, array $keluar): array
{
    $semua = array_merge($masuk, $keluar);

    usort($semua, function (array $a, array $b) {
        return [$a['at'], $a['direction'] === 'in' ? 0 : 1, $a['id']]
           <=> [$b['at'], $b['direction'] === 'in' ? 0 : 1, $b['id']];
    });

    return $semua;
}
```

`at` disimpan sebagai string ISO-8601 dengan offset (`2026-11-15T11:44:10+07:00`)
supaya perbandingan leksikografis setara dengan perbandingan waktu, dan browser
tidak perlu menebak zona.

---

## 5. Kontrak API

### 5.1 `GET /api/crm/inbox`

Query: `limit` (1–200, default 50), `sessionId` (opsional), `direction`
(`all|in|out`, default `all`).

```json
{
  "conversations": [
    {
      "sessionId": "sess-mwevxa53",
      "phone": "6282242168002",
      "name": "Budi",
      "lastText": "Verifikasi berhasil. Nomor ini sekarang terhubung…",
      "lastType": "text",
      "lastAt": "2026-11-15T11:44:10+07:00",
      "lastDirection": "out",
      "lastStatus": "read",
      "inboundCount": 3
    }
  ],
  "sessions": ["sess-mwevxa53", "sess-mtts0woz"],
  "outboundAvailable": true
}
```

Field lama (`sessionId`, `phone`, `name`, `lastText`, `lastType`, `lastAt`,
`sessions`) tetap ada dengan arti yang sama, jadi klien lama tidak rusak.

`inboundCount` dihitung dari database sendiri, jadi angkanya pasti. Jumlah pesan
keluar **tidak** disertakan: ringkasannya hanya mencakup jendela 200 baris
terakhir, dan angka yang terpotong lebih menyesatkan daripada tidak ada.

### 5.2 `GET /api/crm/inbox/conversation`

Query: `sessionId` (wajib), `phone` (wajib), `limit` (1–300, default 300).

```json
{
  "messages": [
    {
      "id": "out:msg_59baa003-adb",
      "direction": "out",
      "type": "text",
      "text": "Verifikasi berhasil. Nomor ini sekarang terhubung ke akun Anda.",
      "caption": null,
      "mime": null,
      "at": "2026-11-15T11:44:10+07:00",
      "status": "read",
      "error": null,
      "batchId": null
    },
    {
      "id": "in:12",
      "direction": "in",
      "type": "text",
      "text": "Aku iseh on iki",
      "caption": null,
      "mime": null,
      "at": "2026-11-15T12:20:15+07:00",
      "status": null,
      "error": null,
      "batchId": null
    }
  ],
  "degraded": false,
  "truncated": false
}
```

Kunci `messages` dipertahankan; `degraded`/`truncated` adalah tambahan.

---

## 6. Aturan penggabungan

| Hal | Aturan |
| :--- | :--- |
| Kunci percakapan | `sessionId` + nomor digit (`62…`). Tidak ada normalisasi ulang di server; kedua sisi sudah digit. |
| Zona waktu | wa-api UTC (`…Z`) → `config('app.timezone')` (Asia/Jakarta) sebelum digabung. Jangan membandingkan string mentah dari dua sumber. |
| Urutan | `at ASC`; bila sama, `in` sebelum `out`; lalu `id`. |
| Duplikat | Tidak ada hari ini (`fromMe` difilter di wa-api, `backend/src/inbound.ts:175`). Tetap dijaga: bila `wa_message_id` sama muncul di dua sisi, buang yang `out`. |
| Batas | 300 pesan per percakapan, 200 baris keluar per halaman, maksimal 3 halaman. |
| Pesan tanpa nomor | `from_phone` null (grup/LID) tidak pernah masuk daftar; perilaku lama dipertahankan. |
| Pesan kampanye | Tetap tampil, ditandai `batchId` dan badge "Kampanye" di UI; bisa disembunyikan lewat filter. |

---

## 7. Keamanan

| Risiko | Penanganan |
| :--- | :--- |
| Klien memalsukan kepemilikan | `userId` **tidak pernah** diterima dari klien. Proxy meneruskan `X-API-Key` yang sudah diverifikasi `resolveUser()`; wa-api yang menyaring `user_id` dari kunci itu. |
| Kebocoran `mediaBase64` | `InboxHistory::petakanKeluar()` memakai whitelist field. `mediaBase64`, `raw`, dan `payload` mentah tidak pernah keluar dari server. |
| Token OTP tampil | Pesan masuk tetap dibaca dari tabel lokal yang sudah disamarkan. Backfill memanggil `ReverseOtp::samarkanToken()` sebelum menyimpan. |
| SSRF | Base URL hanya dari `config('services.wa_api.base')`, tidak pernah dari input. |
| Beban berlebih | `limit` dibatasi, maksimal 3 halaman, timeout 3 detik, cache ringkasan 10 detik. |
| Log | Yang dicatat hanya jumlah baris dan status galat, bukan isi pesan. |
| CSRF | Rute baru tetap `GET` di grup `api/crm/*` yang sudah dikecualikan (`bootstrap/app.php:30`). |

Catatan: `mediaBase64` tetap dikirim wa-api ke dashboard sebelum disaring. Bila
volume media besar, tambahkan satu baris di `mapMessageRow()`
(`backend/src/db/pesan.ts:350`) untuk membuang `mediaBase64` dari respons daftar
— perubahan kecil di wa-api, opsional, tidak menghalangi fase 1.

---

## 8. Kasus tepi

| Kasus | Perilaku |
| :--- | :--- |
| wa-api mati saat membuka percakapan | Pesan masuk tetap tampil, `degraded: true`, banner "Riwayat terkirim tidak dapat dimuat". |
| wa-api lambat (>3 dtk) | Sama seperti mati; tidak menahan halaman lebih lama dari timeout. |
| Nomor hanya punya pesan keluar | Muncul di daftar dengan `lastDirection: "out"`, awalan "Anda: " di UI. |
| Pesan keluar `cancelled`/`failed` | Tampil dengan status masing-masing; `errorDetail` jadi tooltip. Ini justru informasi yang dicari operator. |
| Percakapan >300 pesan | 300 terakhir; `truncated: true`; tombol "Muat lebih lama" memakai `before` (fase 2) atau menaikkan batas. |
| Pengirim `@lid` tanpa nomor | Tidak muncul (perilaku lama). Bila perlu, fase 2 memakai `lid_mappings`. |
| Pesan ganda dari retry webhook | Sudah dicegah index unik `(session_id, wa_message_id)` (`2026_11_13_000010:45`). |
| Backfill dijalankan dua kali | Idempoten: `updateOrCreate` pada kunci `(session_id, wa_message_id)`. |
| Zona waktu server berbeda | Semua konversi memakai `config('app.timezone')`, bukan `date_default_timezone_get()`. |

---

## 9. Backfill riwayat masuk

```
php artisan inbox:backfill [--user=usr_xxx] [--session=sess-xxx] [--dry-run]
```

Langkah:

1. `GET /api/v1/inbound?page=1&limit=200` (ulangi sampai `totalPages`).
2. Untuk tiap baris: samarkan token (`ReverseOtp::samarkanToken($text,
   ReverseOtp::tokenDikenal($userId, $text))`), konversi `receivedAt` ke zona
   aplikasi, lalu `updateOrCreate` pada `(session_id, wa_message_id)`.
3. Laporkan: `diperiksa`, `baru`, `diperbarui`, `dilewati`, `disamarkan`.

Sifat: idempoten, tidak menghapus apa pun, aman diulang. Tidak dijadwalkan
otomatis pada fase 1; bila nanti webhook terbukti pernah gagal permanen,
perintah yang sama bisa dipasang di scheduler tiap 15 menit dengan `--since`.

---

## 10. Rencana uji

**Unit** (`tests/Unit/InboxHistoryTest.php`)

- Gabungan dua arah terurut benar, termasuk waktu yang sama.
- Konversi UTC → WIB menghasilkan offset `+07:00`.
- `mediaBase64` dan `raw` tidak lolos dari `petakanKeluar()`.
- Baris keluar tanpa `text` (media) tetap punya `caption`/`type`.

**Feature** (`tests/Feature/InboxHistoryTest.php`, `Http::fake` untuk wa-api)

- `conversation` menggabungkan masuk + keluar; `direction` benar.
- wa-api 500/timeout → `degraded: true`, pesan masuk tetap ada, HTTP 200.
- wa-api 401 → 401 dari dashboard (bukan data kosong yang menyesatkan).
- `inbox` menampilkan percakapan yang hanya punya pesan keluar.
- `inbox` tidak memanggil wa-api lebih dari sekali per request.
- Isolasi tenant: kunci pengguna A tidak pernah melihat nomor pengguna B
  (dijamin wa-api; uji bahwa `userId` klien diabaikan).

**Command** (`tests/Feature/InboxBackfillTest.php`)

- Impor 2 halaman, idempoten saat dijalankan dua kali.
- Token OTP tersamarkan setelah impor.
- `--dry-run` tidak menulis apa pun.

**Manual**

- Buka percakapan dengan 12 pesan keluar + 3 masuk; urutan dan centang benar.
- Matikan wa-api; halaman tetap terbuka dengan banner.
- Nomor yang hanya pernah di-blast muncul di daftar.

---

## 11. Rollout

1. Migrasi index (aman, tidak mengunci lama untuk tabel sekecil ini).
2. Deploy backend + `WA_API_HISTORY_ENABLED=true`.
3. Jalankan `php artisan inbox:backfill` sekali di produksi.
4. Deploy UI.
5. Pantau log: jumlah `degraded`, durasi panggilan wa-api.

**Rollback:** set `WA_API_HISTORY_ENABLED=false` → perilaku lama kembali tanpa
deploy ulang. Index dan data backfill tidak perlu dibatalkan.

**Fase 2 (opsional, bila diperlukan):** tabel `wa_outbound_messages` +
`inbox:sync` terjadwal, untuk pencarian lintas riwayat, hitungan belum dibaca,
dan tampilan saat gateway mati. Skema yang disiapkan:

```
wa_outbound_messages
  id, user_id, session_id, wa_message_id, batch_id,
  to_phone, type, text, caption, media_url, media_mime,
  status, error, sent_at, created_at, updated_at
  unique (session_id, wa_message_id)
  index  (user_id, session_id, to_phone, sent_at)
```

---

## 12. Urutan pekerjaan & estimasi

| # | Pekerjaan | Estimasi |
| :--- | :--- | ---: |
| 1 | `WaApiClient` + `InboxHistory` + unit test | 0,5 hari |
| 2 | `conversation()` digabung + feature test | 0,5 hari |
| 3 | `inbox()` ringkasan dua arah + cache | 0,5 hari |
| 4 | `inbox:backfill` + test | 0,5 hari |
| 5 | UI Inbox (dua arah, status, filter, degraded) | 1 hari |
| 6 | Migrasi index, README, CHANGELOG, uji manual | 0,5 hari |
| | **Total** | **±3,5 hari** |

Urutan 1–2 sudah cukup untuk menjawab keluhan utama (riwayat terkirim tidak
terlihat); 3–5 melengkapinya.

---

## 13. Risiko

| Risiko | Dampak | Mitigasi |
| :--- | :--- | :--- |
| wa-api lambat/mati | Riwayat keluar kosong | Timeout 3 dtk, `degraded`, banner; pesan masuk tetap tampil |
| Salah zona waktu | Urutan pesan kacau | Konversi eksplisit + unit test; jangan bandingkan string mentah |
| Payload media besar | Respons lambat | Whitelist field; opsi patch `mapMessageRow()` |
| Jendela 200 baris | Percakapan lama tanpa pesan masuk tidak muncul di daftar | Dokumentasikan; fase 2 atau endpoint ringkasan di wa-api |
| Dua sumber status | Status di gelembung beda dengan tabel kampanye | Status keluar selalu dari wa-api (sumber asli), bukan dari `wa_campaigns` |
| Backfill mengimpor token mentah | Token hidup tersimpan | Samarkan saat impor; uji khusus |

---

## 14. Alternatif yang ditolak

- **Menyimpan pesan keluar di dashboard saat dikirim.** Tidak mungkin tanpa
  mengubah jalur kirim: browser memanggil wa-api langsung, dan memindahkan
  pengiriman ke Laravel berarti menambah satu titik gagal pada alur yang
  sekarang berjalan (kampanye, jeda, anti-ban, kuota).
- **Membangun riwayat keluar dari webhook `message.status`.** Payload-nya tidak
  memuat teks; yang bisa dibangun hanya "ada pesan ke nomor X dengan status Y",
  bukan isi percakapan.
- **Membaca pesan masuk langsung dari wa-api.** Menampilkan token OTP mentah
  yang di wa-api belum disamarkan.
- **Menggabungkan di browser.** Normalisasi zona waktu dan penyaringan
  `mediaBase64` jadi tersebar di klien, dan tidak bisa diuji tanpa browser.

---

## 15. Lampiran — rujukan kode

**Dashboard**

| Path | Simbol |
| :--- | :--- |
| `app/Http/Controllers/CrmController.php` | `resolveUser()` 31, `inbox()` 980, `conversation()` 1039 |
| `app/Http/Controllers/WaWebhookController.php` | `handleMessageReceived()` 205, `handleMessageStatus()` 324 |
| `app/Services/ReverseOtp.php` | `tokenDikenal()` 350, `samarkanToken()` 388 |
| `routes/web.php` | rute inbox 55–56 |
| `config/services.php` | `wa_api` 50 |
| `database/migrations/2026_11_13_000010_create_wa_inbound_messages_table.php` | unique 45, index 46 |
| `resources/js/Pages/Inbox.jsx` | `muat()` 27, `buka()` 56 |
| `resources/js/lib/api.js` | `fetchInbox()` 582, `fetchConversation()` 591 |
| `resources/js/lib/messageStatus.js` | `statusLabel()`, `SUCCESS_STATUSES` |

**wa-api** (`/home/abdhnf/dev/wa-api`)

| Path | Simbol |
| :--- | :--- |
| `backend/src/routes/pengaturan.ts` | `GET /messages/:sessionId` 37 |
| `backend/src/routes/inbox.ts` | `GET /inbound` 19, `/inbound/conversations` 64, `/inbound/conversation` 73 |
| `backend/src/db/pesan.ts` | `listMessagesPaged()` 277, `queryMessages()` 313, `mapMessageRow()` 350 |
| `backend/src/db/inbox.ts` | `listInboundMessages()` 112, `listConversation()` 146 |
| `backend/src/db/skema.ts` | tabel `messages` 47, `inbound_messages` 277 |
| `backend/src/routes/konteks.ts` | payload `message.status` 272 |
| `backend/src/inbound.ts` | `phoneFromJid()` 82, filter `fromMe` 175 |
| `backend/src/routes/schemas.ts` | `to` digit 10 |

---

## 16. Catatan implementasi

### 16.1 Penyimpangan dari rancangan

| Rancangan | Implementasi | Alasan |
| :--- | :--- | :--- |
| `outboundCount` per percakapan | tidak disertakan | Ringkasan keluar hanya mencakup 200 baris terakhir; angka terpotong menyesatkan |
| `direction` sebagai parameter server | disaring di klien | Daftar sudah dimuat sekaligus; saringan instan tanpa request ulang |
| `before` untuk "muat lebih lama" | belum ada; batas 300 pesan + penanda `truncated` | Volume saat ini belum menuntut paginasi riwayat |

### 16.2 Temuan saat implementasi: batas laju `/auth/me`

`CrmController::resolveUser()` memanggil `GET /auth/me` pada setiap request CRM.
wa-api membatasi seluruh `/api/v1/auth/*` **30 permintaan per menit per IP**
(`backend/src/security.ts:51`), dan semua pengunjung dashboard berbagi satu IP
(mesin dashboard). Inbox membuka satu percakapan per klik, jadi tanpa
perubahan, membuka 30 percakapan dalam semenit membuat semua request
berikutnya ditolak 429 — dan dashboard melaporkannya sebagai 401 "API key tidak
valid", yang menyesatkan.

Perbaikan yang dipakai: hasil verifikasi disimpan 60 detik di cache, dengan
kunci berupa hash API key (bukan kuncinya), dan hanya verifikasi yang berhasil
yang disimpan. 429 dari gateway kini dibedakan dari 401.

Konsekuensi yang perlu diketahui: kunci yang dicabut masih berlaku paling lama
satu menit di dashboard. Bila itu tidak dapat diterima, turunkan
`VERIFY_CACHE_SECONDS` di `CrmController` — dengan konsekuensi anggaran 30
permintaan/menit kembali menjadi batas praktis.

### 16.3 Berkas yang berubah

| Berkas | Peran |
| :--- | :--- |
| `app/Services/WaApiClient.php` | Klien baca-saja ke wa-api |
| `app/Services/InboxHistory.php` | Pemetaan + penggabungan dua arah |
| `app/Console/Commands/InboxBackfill.php` | `inbox:backfill` |
| `app/Http/Controllers/CrmController.php` | `inbox()`, `conversation()`, cache verifikasi |
| `config/services.php` | `history_enabled`, `history_timeout`, `backfill_key` |
| `database/migrations/2026_11_15_000012_add_inbox_conversation_index.php` | Index percakapan |
| `resources/js/Pages/Inbox.jsx` | UI gelembung dua arah |
| `resources/js/lib/whatsappText.js` | Pemformatan teks bersama |
| `resources/js/lib/api.js` | `fetchInbox`, `fetchConversation` |
| `tests/Unit/InboxHistoryTest.php` | 10 tes aturan penggabungan |
| `tests/Feature/InboxHistoryTest.php` | 7 tes endpoint |
| `tests/Feature/InboxBackfillTest.php` | 6 tes perintah |

---

## 17. Penyempurnaan setelah pemakaian (2026-11-15)

Empat keluhan pertama setelah Inbox dipakai, dan penyelesaiannya.

### 17.1 Sesi yang sudah dihapus masih muncul

Riwayat pesan tidak ikut terhapus saat sesi dihapus di wa-api, jadi nomor lama
terus tampil. Sekarang `CrmController::sesiAktif()` mengambil `GET /sessions`
(cache 30 detik) dan:

- daftar percakapan disaring ke sesi yang masih terdaftar (43 → 23 percakapan
  pada data saat itu);
- membuka percakapan dari sesi lama dijawab 404 "Sesi ini sudah tidak aktif",
  jadi pesannya ikut tidak bisa dibaca;
- bila daftar sesi tidak dapat diambil (gateway mati), penyaringan dilewati dan
  `sessionsKnown: false` dikirim — lebih baik menampilkan sesuatu daripada
  menyembunyikan semuanya karena tidak tahu.

### 17.2 Pilihan sesi memakai nama dan status

`GET /sessions` mengembalikan `name`, `phone`, dan `status`
(`connected`/`connecting`/`disconnected`). Respons `/api/crm/inbox` sekarang
mengirim `sessions` sebagai objek, bukan id, dan UI menampilkan
`Nomor Bisnis · Terhubung`. Status yang sama dipakai untuk memutuskan apakah
tombol kirim boleh aktif.

### 17.3 Editor balasan

Editor memakai `WhatsAppFormattingToolbar` yang sama dengan Playground
(tebal/miring/coret/monospace, emoji, spintax, variabel). Pengiriman memakai
`sendText()` yang sudah dipakai Playground dan Broadcast — jalur yang sama,
tanpa endpoint baru di Laravel. Setelah terkirim, riwayat dimuat ulang dari
wa-api supaya status yang tampil (`queued`/`pacing`/`sent`) adalah status asli
gateway.

Catatan: pengiriman manual dari dashboard menandai takeover operator di wa-api
(chatbot berhenti membalas kontak itu selama 24 jam). Itu perilaku yang sudah
ada di jalur `POST /messages/send`, bukan hal baru dari Inbox.

### 17.4 Satu alur, bukan dua daftar

Saringan Semua/Masuk/Terkirim dihapus. Percakapan sekarang satu daftar urut
aktivitas terbaru, dan pesan masuk/keluar tampil berselang-seling dalam satu
utas — seperti aplikasi chat. Pencarian tetap ada.

### 17.5 Tata letak editor balasan

Tombol kirim dipindah ke dalam kotak teks (mengapung kanan bawah) supaya satu
baris aksi tidak memakan lebar tersendiri di layar sempit. Rincian:

- Kotak teks memakai `padding-right: 56px` (44px tombol + 4px tepi + 8px jarak),
  jadi teks tidak pernah tertutup tombol.
- `field-sizing: content` membuat kotak tumbuh 52–132px mengikuti isi, lalu
  menggulir sendiri. Properti ini Baseline baru (2026); browser lama jatuh ke
  tinggi tetap dengan scroll, yang tetap terpakai.
- Editor dibungkus `<form>` dengan tombol `type="submit"`, jadi jalur kirim
  tetap ada tanpa keyboard; Enter hanya pintasan.
- Enter dijaga IME (`isComposing` + `keyCode 229`). Tanpa itu, pengguna yang
  mengetik dengan IME mengirim pesan saat masih memilih kandidat huruf.
- `<label>` tersembunyi dihubungkan lewat `htmlFor`/`id`, dan `enterkeyhint="send"`
  memberi tombol Kirim di keyboard ponsel.

### 17.6 Balasan tidak muncul di daftar percakapan

Dilaporkan setelah dipakai: balasan terkirim, tetapi daftar percakapan di kiri
tidak berubah. Penyebabnya konkret — `kirim()` hanya memuat ulang utas
(`fetchConversation`), tidak pernah memuat ulang daftar (`fetchInbox`), jadi
baris percakapan tetap menampilkan teks lama dan urutannya tidak berubah.

Perbaikan:

- Daftar dimuat ulang **senyap** (tanpa indikator muat) setiap kali kirim
  berhasil, berdampingan dengan pemuatan utas.
- Gelembung pesan ditambahkan seketika memakai `messageId` dari respons
  gateway (`out:<messageId>`). Id yang sama dipakai riwayat, jadi React
  mengenali baris itu dan tidak terjadi gelembung ganda.
- Bila pesan tidak ditemukan di utas setelah dimuat ulang — gejala pengiriman
  dipindahkan ke sesi lain oleh auto-rotate — muncul keterangan di atas
  komposer, bukan pesan yang seolah hilang.

### 17.7 Temuan yang belum diperbaiki

`ReverseOtp::samarkanToken()` hanya menyamarkan token berlabel
`otp|kode|code|token|verify|verifikasi`. Pesan berlabel lain — misalnya
`LOGIN 49ZY3XHQ` yang ditemukan di data — tersimpan mentah. Token itu sudah
kedaluwarsa (masa berlaku 5 menit), tetapi polanya perlu ditambahkan ke daftar
label bila alur login memakai label `LOGIN`.
