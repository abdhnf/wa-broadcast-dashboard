# Reverse OTP / User-Initiated Magic Link

Referensi implementasi di sisi penerima webhook. Alurnya **terbalik** dari OTP
biasa: aplikasi tidak mengirim kode ke pengguna — pengguna mengirim token dari
WhatsApp-nya sendiri, dan wa-api meneruskannya lewat webhook.

```
┌─────────┐   1. buka form login    ┌──────────────┐
│ Browser │ ──────────────────────> │  Aplikasi    │
│ pengguna│ <────────────────────── │  (Laravel)   │
└─────────┘   2. tampilkan token    └──────┬───────┘
                                            │ 3. POST /api/otp/challenge
                                            │    (buat challenge, dapat token)
┌─────────┐   4. kirim "OTP A1B2C3D4"  ┌───▼────────┐
│ WhatsApp│ ────────────────────────>  │   wa-api   │
│ pengguna│                            └───┬────────┘
└─────────┘                                │ 5. webhook message.received
                                           │    (HMAC, filter token)
                                      ┌────▼─────────┐
                                      │  Aplikasi    │ 6. cocokkan token+nomor
                                      │  (webhook)   │    -> status verified
                                      └────┬─────────┘
┌─────────┐   7. polling status      ┌────▼─────────┐
│ Browser │ <──────────────────────── │  Aplikasi    │
└─────────┘   verified -> magic link └──────────────┘
```

Keunggulan dibanding OTP biasa: **tidak ada biaya kirim pesan**, dan nomor
terbukti aktif karena pengguna sendiri yang mengirim.

---

## 1. Berkas yang terlibat

Ada dua sisi yang harus dibedakan sebelum menyalin apa pun:

| Sisi | Repo | Path absolut | Peran |
| :--- | :--- | :--- | :--- |
| **Penerima** | `wa-broadcast-dashboard` | `/home/abdhnf/dev/wa-broadcast-dashboard` | Membuat token, mencocokkan pesan, menyimpan challenge |
| **Pipa** | `wa-api` | `/home/abdhnf/dev/wa-api` | Meneruskan pesan WhatsApp ke penerima lewat webhook |

Semua path di bawah ditulis **absolut**, karena implementasinya jatuh di project
dan directory yang berbeda dari repo referensi ini. Tidak ada path relatif yang
perlu Anda tebak sendiri.

Tiga awalan yang dipakai:

| Awalan | Arti |
| :--- | :--- |
| `/home/abdhnf/dev/wa-broadcast-dashboard` | Repo referensi — berkas sumber yang dibaca/disalin |
| `/home/abdhnf/dev/wa-api` | Gateway — pipa pengirim webhook, tidak perlu diubah |
| `<PROJECT_ANDA>` | Akar project tujuan. Ganti sendiri; tidak ada nilai bawaannya. |

### 1.1 Penerima — berkas referensi

Semua di bawah `/home/abdhnf/dev/wa-broadcast-dashboard`.

| Path absolut | Simbol penting (baris) | Peran |
| :--- | :--- | :--- |
| `/home/abdhnf/dev/wa-broadcast-dashboard/app/Services/ReverseOtp.php` | `normalisasiNomor()` 55, `buatToken()` 84, `ekstrakToken()` 114, `buat()` 144, `cocokkanPesan()` 196, `challengeAktif()` 293, `rapikanKedaluwarsa()` 316, `tokenDikenal()` 350, `samarkanToken()` 388 | Inti: normalisasi nomor, ekstraksi token, verifikasi atomik, redaksi |
| `/home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/OtpController.php` | `buat()` 41, `status()` 97, `batalkan()` 128, `userDariApiKey()` 158 | API challenge: buat, cek status, batalkan |
| `/home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/WaWebhookController.php` | `payloadUntukLog()` 45, `receive()` 64, `handleMessageReceived()` 205, `cobaVerifikasiOtp()` 285 | Titik sambung: verifikasi HMAC, pemanggilan `cobaVerifikasiOtp()` |
| `/home/abdhnf/dev/wa-broadcast-dashboard/app/Models/WaOtpChallenge.php` | `$fillable` 18, `$casts` 33, `masihBerlaku()` 40 | Model challenge |
| `/home/abdhnf/dev/wa-broadcast-dashboard/database/migrations/2026_11_13_000011_create_wa_otp_challenges_table.php` | `up()` 27, unique index 71 | Skema tabel `wa_otp_challenges` |
| `/home/abdhnf/dev/wa-broadcast-dashboard/routes/web.php` | grup `api/otp` 65–69, webhook 81 | Pendaftaran rute |
| `/home/abdhnf/dev/wa-broadcast-dashboard/bootstrap/app.php` | `validateCsrfTokens(except:)` 30–41, `api/otp/*` 36 | Pengecualian CSRF untuk klien non-browser |
| `/home/abdhnf/dev/wa-broadcast-dashboard/config/services.php` | `wa_api.base` 51, `wa_api.webhook_secret` 61 | Sumber konfigurasi |
| `/home/abdhnf/dev/wa-broadcast-dashboard/tests/Feature/ReverseOtpTest.php` | `webhookKirimPesan()` 36, 19 tes | Tes jalur webhook |
| `/home/abdhnf/dev/wa-broadcast-dashboard/tests/Feature/OtpControllerTest.php` | 6 tes | Tes endpoint API |
| `/home/abdhnf/dev/wa-broadcast-dashboard/tests/Feature/WaWebhookRetryTest.php` | 3 tes | Tes retry/pemrosesan ulang |

### 1.2 Penerima — berkas yang disalin ke aplikasi Anda

Tujuan mengikuti konvensi Laravel di bawah `<PROJECT_ANDA>`. Sumbernya path
absolut supaya tidak ada berkas yang salah ambil.

| Path tujuan di project Anda | Sumber (absolut) | Perlu diubah? |
| :--- | :--- | :--- |
| `<PROJECT_ANDA>/app/Services/ReverseOtp.php` | `/home/abdhnf/dev/wa-broadcast-dashboard/app/Services/ReverseOtp.php` | **Tidak.** Tidak bergantung pada apa pun selain model dan `DB`. |
| `<PROJECT_ANDA>/app/Models/WaOtpChallenge.php` | `/home/abdhnf/dev/wa-broadcast-dashboard/app/Models/WaOtpChallenge.php` | Tidak. |
| `<PROJECT_ANDA>/database/migrations/<tanggal>_create_wa_otp_challenges_table.php` | `/home/abdhnf/dev/wa-broadcast-dashboard/database/migrations/2026_11_13_000011_create_wa_otp_challenges_table.php` | Ganti awalan tanggal agar urutannya sesuai migrasi Anda. |
| `<PROJECT_ANDA>/app/Http/Controllers/OtpController.php` | `/home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/OtpController.php` | **Ya**, lihat catatan di bawah tabel. |
| `<PROJECT_ANDA>/tests/Feature/ReverseOtpTest.php` | `/home/abdhnf/dev/wa-broadcast-dashboard/tests/Feature/ReverseOtpTest.php` | Sesuaikan konstanta `USER`/`PHONE`/`SESI` bila perlu. |

Yang **tidak boleh disalin utuh**:
`/home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/WaWebhookController.php`.
Berkas itu milik alur CRM dashboard ini dan memuat penanganan kampanye serta
status sesi yang tidak relevan bagi Anda. Yang perlu diambil hanya tiga bagian:

| Bagian | Baris | Alasan |
| :--- | :--- | :--- |
| `receive()` | 64–189 | Verifikasi HMAC + idempotensi `deliveryId` |
| `payloadUntukLog()` | 45–62 | Redaksi token sebelum disimpan |
| `cobaVerifikasiOtp()` | 285–315 | Pemanggilan `ReverseOtp::cocokkanPesan()` |

Yang **wajib Anda sesuaikan** di
`<PROJECT_ANDA>/app/Http/Controllers/OtpController.php`:

1. `userDariApiKey()` (baris 158 di berkas sumber) memverifikasi `X-API-Key` ke
   endpoint `auth/me` wa-api. Aplikasi Anda mungkin sudah punya tabel pengguna
   sendiri — ganti method ini dengan autentikasi aplikasi Anda, dan pastikan
   `user_id` yang dipakai adalah id pengguna aplikasi Anda, bukan id pemilik
   wa-api.
2. `redirectTo` diterima apa adanya dari body. Bila nilainya berasal dari input
   pengguna, validasi agar hanya path internal — lihat §5 butir 3.

### 1.3 Penerima — berkas yang diubah, bukan disalin

| Path di project Anda | Contoh di repo referensi | Perubahan |
| :--- | :--- | :--- |
| `<PROJECT_ANDA>/routes/web.php` | `/home/abdhnf/dev/wa-broadcast-dashboard/routes/web.php` | Tambahkan grup `Route::prefix('api/otp')` (baris 65–69) |
| `<PROJECT_ANDA>/bootstrap/app.php` | `/home/abdhnf/dev/wa-broadcast-dashboard/bootstrap/app.php` | Tambahkan `'api/otp/*'` ke `validateCsrfTokens(except:)` |
| `<PROJECT_ANDA>/config/services.php` | `/home/abdhnf/dev/wa-broadcast-dashboard/config/services.php` | Tambahkan kunci `wa_api.base` dan `wa_api.webhook_secret` |
| `<PROJECT_ANDA>/.env` | `/home/abdhnf/dev/wa-broadcast-dashboard/.env` | `WA_API_BASE`, `WA_WEBHOOK_SECRET` — tambahkan manual, belum ada di `/home/abdhnf/dev/wa-broadcast-dashboard/.env.example` |

### 1.4 wa-api — berkas yang dirujuk

Tidak perlu diubah; hanya perlu dipahami saat menelusuri kenapa sebuah pesan
tidak sampai.

| Path absolut | Simbol penting (baris) | Peran |
| :--- | :--- | :--- |
| `/home/abdhnf/dev/wa-api/backend/src/matcher.ts` | `MatchType` 12, `cocokTeks()` 35, `regexValid()` 70 | Pencocokan `exact`/`contains`/`keyword`/`regex`, dipakai bersama chatbot |
| `/home/abdhnf/dev/wa-api/backend/src/db/webhooks.ts` | `listActiveWebhooksForEvent()` 145, `enqueueWebhookDelivery()` 263 | Penyaringan webhook per event dan isi pesan |
| `/home/abdhnf/dev/wa-api/backend/src/inbound-pipeline.ts` | `pancarkanEvent()` 115, penyedia filter 140 | Titik pesan masuk diteruskan ke antrean webhook |
| `/home/abdhnf/dev/wa-api/backend/src/webhook.ts` | `hitungTandaTangan()` 54, `pancarkanEvent()` 96, `mulaiWorkerWebhook()` 268 | Tanda tangan HMAC, backoff, worker pengiriman |
| `/home/abdhnf/dev/wa-api/backend/src/routes/webhook.ts` | `validasiMatch()` 61, `daftarkanRuteWebhook()` 111 | Validasi filter saat webhook didaftarkan |

### 1.5 Urutan pemasangan di aplikasi Anda

Salin dalam urutan ini — setiap langkah hanya bergantung pada langkah sebelumnya.
Ganti `<PROJECT_ANDA>` dengan akar project tujuan sebelum menjalankan.

| # | Perintah | Hasil |
| :-- | :--- | :--- |
| 1 | `cp /home/abdhnf/dev/wa-broadcast-dashboard/app/Services/ReverseOtp.php <PROJECT_ANDA>/app/Services/` | Inti logika, tanpa perubahan |
| 2 | `cp /home/abdhnf/dev/wa-broadcast-dashboard/app/Models/WaOtpChallenge.php <PROJECT_ANDA>/app/Models/` | Model, tanpa perubahan |
| 3 | `php artisan make:migration create_wa_otp_challenges_table` lalu salin isi `up()` dari `/home/abdhnf/dev/wa-broadcast-dashboard/database/migrations/2026_11_13_000011_create_wa_otp_challenges_table.php` | Tabel + unique index |
| 4 | `<PROJECT_ANDA>/artisan migrate` atau `php artisan migrate` dari akar project | Tabel terbentuk sebelum service dipakai |
| 5 | `cp /home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/OtpController.php <PROJECT_ANDA>/app/Http/Controllers/` lalu sesuaikan `userDariApiKey()` | API challenge |
| 6 | Salin baris 65–69 dari `/home/abdhnf/dev/wa-broadcast-dashboard/routes/web.php` ke `<PROJECT_ANDA>/routes/web.php` | `api/otp/*` aktif |
| 7 | Tambahkan `'api/otp/*'` ke `validateCsrfTokens(except:)` di `<PROJECT_ANDA>/bootstrap/app.php` | Klien non-browser tidak kena 419 |
| 8 | Tambahkan `wa_api` di `<PROJECT_ANDA>/config/services.php` (contoh: `/home/abdhnf/dev/wa-broadcast-dashboard/config/services.php` baris 50–62), isi `<PROJECT_ANDA>/.env` | Konfigurasi terbaca |
| 9 | Ambil tiga potong `/home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/WaWebhookController.php` (§1.2) ke penerima webhook project Anda | Jalur verifikasi tersambung |
| 10 | `cp /home/abdhnf/dev/wa-broadcast-dashboard/tests/Feature/ReverseOtpTest.php <PROJECT_ANDA>/tests/Feature/` lalu jalankan | Membuktikan alurnya berjalan |

Langkah 5 dan 9 adalah satu-satunya tempat yang butuh penyesuaian kode, bukan
salin-tempel. Sisanya konfigurasi.

Kalau project Anda bukan Laravel, `ReverseOtp.php` masih bisa dipakai tetapi
tidak apa adanya: ia memakai Eloquent (`WaOtpChallenge`) dan query builder
`DB::table()`, jadi bagian akses datanya harus dipetakan ke lapisan database
Anda. Skema tabelnya berlaku umum; controller, rute, dan pengecualian CSRF harus
ditulis ulang mengikuti framework Anda.

---

## 2. Konfigurasi yang wajib

### 2.1 Secret webhook di aplikasi

Tambahkan dua kunci ini di `<PROJECT_ANDA>/.env`. Belum ada di
`/home/abdhnf/dev/wa-broadcast-dashboard/.env.example`, jadi salin manual:

```dotenv
# <PROJECT_ANDA>/.env
WA_API_BASE=http://127.0.0.1:3100/api/v1
WA_WEBHOOK_SECRET=whsec_<nilai dari wa-api>
```

Keduanya dibaca di `<PROJECT_ANDA>/config/services.php` — contoh lengkapnya di
`/home/abdhnf/dev/wa-broadcast-dashboard/config/services.php` baris 50–62 — dan
wajib ada sebelum endpoint penerima bisa bekerja: tanpa `WA_WEBHOOK_SECRET`,
semua kiriman dijawab **503**.

Daftarkan webhook di wa-api **dan simpan secret-nya saat itu juga** — nilainya
hanya ditampilkan sekali:

```bash
curl -s -X POST http://127.0.0.1:3100/api/v1/webhooks \
  -H "X-API-Key: $WA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://aplikasi-anda.com/api/wa/webhook",
    "events": ["message.received"],
    "chatTypes": ["private"],
    "matchType": "regex",
    "matchValue": "^(?:[A-Z0-9]{8}|(?:(?:kode|code|token|verify|verifikasi)[\\s:.-]*)?(?:otp|kode|code|token|verify|verifikasi)[\\s:.-]*[A-Z0-9]{4,16})$"
  }'
```

Pola itu menerima semua bentuk yang didokumentasikan di §3.2 — termasuk token
telanjang `GRQQCYTU` — dan menolak obrolan biasa:

| Pesan | Diteruskan? |
| :--- | :--- |
| `GRQQCYTU` | ya |
| `OTP GRQQCYTU` | ya |
| `kode: GRQQCYTU` | ya |
| `verifikasi A1B2C3D4` | ya |
| `tolong kirim otp saya` | tidak |
| `halo kak, promo masih ada?` | tidak |
| `sekarang` (kata 8 huruf) | ya — lihat catatan di bawah |

Cabang pertama pola (`[A-Z0-9]{8}`) adalah token tanpa label; panjangnya persis
`PANJANG_TOKEN`, jadi tidak perlu label untuk membedakannya dari kata biasa.
Tanpa cabang itu, pengguna yang mengirim token saja — bentuk yang paling wajar
— tidak akan pernah sampai ke aplikasi Anda, dan pesannya diam-diam hilang di
filter.

**Keterbatasan yang diterima.** Kata Indonesia delapan huruf seperti
`sekarang` dan `harganya` juga lolos filter. Ini disengaja: sekitar 6% token
yang dihasilkan seluruhnya huruf, dan filter yang menuntut angka akan membuang
token-token itu tanpa jejak. Salah ke arah meneruskan hanya menambah sedikit
lalu lintas — aplikasi Anda tetap memverifikasi dan menolaknya. Salah ke arah
memblokir berarti pengguna tidak bisa login dan tidak ada yang tahu kenapa.
Filter ini adalah penyaring kasar, **bukan** pengganti verifikasi di
`ReverseOtp::cocokkanPesan()`.

**Kenapa `matchType` regex, bukan `keyword: otp`.** Kata kunci akan ikut
menangkap obrolan biasa seperti "tolong kirim otp saya" — pesan itu akan
diteruskan, dan aplikasi Anda harus menyaringnya sendiri. Pola ketat
memastikan yang sampai hanya pesan yang bentuknya memang token.

Regex yang tidak valid ditolak **saat webhook didaftarkan** (`validasiMatch()` di
`/home/abdhnf/dev/wa-api/backend/src/routes/webhook.ts` baris 61), bukan saat
mengirim — jadi salah tulis ketahuan langsung, bukan setelah token pertama gagal
sampai.

`chatTypes: ["private"]` penting: pesan dari grup **tidak boleh** bisa
memverifikasi apa pun. Seseorang bisa menambahkan nomor layanan ke grup dan
mengirim token di sana.

### 2.2 Batas laju webhook wa-api

wa-api membatasi **60 kiriman/menit per webhook**. Untuk alur OTP ini penting:
saat 80 pesan masuk serentak, 60 terkirim dan 22 **ditunda** (bukan dibuang) ke
menit berikutnya. Token yang tertunda 1 menit bisa kedaluwarsa sebelum sampai.

Kalau volume OTP Anda tinggi, daftarkan webhook terpisah khusus OTP agar tidak
berbagi jatah dengan notifikasi lain.

---

## 3. Alur pemakaian

### 3.1 Buat challenge

```bash
curl -s -X POST https://aplikasi-anda.com/api/otp/challenge \
  -H "X-API-Key: $WA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone":"08999000111","purpose":"login","redirectTo":"https://aplikasi-anda.com/beranda"}'
```

```json
{
  "challengeId": 12,
  "phone": "628999000111",
  "token": "GRQQCYTU",
  "expiresIn": 300,
  "expiresAt": "2026-11-13T23:55:10+07:00",
  "instruksi": "Kirim pesan berikut ke nomor WhatsApp layanan: OTP GRQQCYTU"
}
```

Tampilkan `instruksi` dan `token` ke pengguna. **Jangan** kirim token lewat
WhatsApp dari sistem — penggunalah yang harus mengirimnya. Itu inti alur ini:
nomor terbukti aktif karena ada pesan keluar dari nomor itu.

### 3.2 Pengguna mengirim token

Pengguna mengirim ke nomor layanan Anda:

```
OTP GRQQCYTU
```

Tiga bentuk ini diterima (baris terakhir contoh yang harus ditolak):

| Yang dikirim pengguna | Terbaca? |
| :--- | :--- |
| `GRQQCYTU` | ya (token berdiri sendiri) |
| `OTP GRQQCYTU` | ya |
| `kode: GRQQCYTU` | ya |
| `halo mau tanya harga` | tidak (bukan token) |

### 3.3 Frontend polling status

```js
const res = await fetch(`/api/otp/challenge/${challengeId}`, {
  headers: { 'X-API-Key': apiKey },
});
const { status, verified, redirectTo } = await res.json();

if (verified) {
  // Terverifikasi. Arahkan ke redirectTo, atau buat sesi sendiri.
}
```

Polling tiap 2–3 detik. Respons saat terverifikasi:

```json
{
  "challengeId": 12,
  "status": "verified",
  "verified": true,
  "expiresAt": "2026-11-13T23:55:10+07:00",
  "verifiedAt": "2026-11-13T23:50:10+07:00",
  "redirectTo": "https://aplikasi-anda.com/beranda"
}
```

---

## 4. Keputusan keamanan dan alasannya

### 4.0 wa-api tidak membawa `challengeId`

Pertanyaan yang sering muncul: *"apakah wa-api mengirim kode challenge saat POST ke aplikasi?"*

**Tidak.** wa-api tidak tahu apa itu challenge. Ia tidak menyimpan token, tidak
membuatnya, dan tidak punya kolom untuk itu. Yang dikirim hanyalah pesan mentah
yang diketik pengguna:

```json
{
  "event": "message.received",
  "deliveryId": "263ddea4-0cd0-4adc-932d-38cef4e7857c",
  "data": {
    "from": "628999000111",
    "text": "OTP 7ED7U99D",
    "chatType": "private",
    "sessionId": "sess-mtts0woz"
  }
}
```

`challengeId` dibuat oleh **aplikasi Anda** (`POST /api/otp/challenge`) dan
tidak pernah dikirim ke wa-api. Pencocokan token ↔ challenge terjadi di
`ReverseOtp::cocokkanPesan()` saat webhook masuk, dengan mencari challenge
`pending` milik nomor pengirim.

Ini memang pembagian yang benar: wa-api adalah pipa pesan, bukan penyimpan
rahasia autentikasi aplikasi Anda. Kalau wa-api membawa `challengeId`, ia harus
tahu token mana milik challenge mana — dan kebocoran di gateway akan menjadi
kebocoran autentikasi di semua aplikasi yang memakainya.

**Konsekuensinya untuk desain Anda:** token harus unik di seluruh sistem Anda,
dan aplikasi harus bisa menemukan challenge yang tepat hanya dari
(nomor, token). Karena itu ada index unik `(user_id, token_hash)`.

### 4.1 Token disimpan sebagai hash

Tabel `wa_otp_challenges` hanya menyimpan `token_hash` (SHA-256). Kalau
database bocor, isinya tidak cukup untuk memverifikasi. Token mentah hanya ada
di nilai kembalian `ReverseOtp::buat()` — tidak di log, tidak di database.

### 4.1b Token disamarkan di riwayat pesan

`wa_inbound_messages.text` dan `wa_webhook_events.payload` menyimpan pesan
masuk dan **tidak pernah dibersihkan**. Tanpa penanganan, token mentah hidup di
sana selamanya — dan token yang belum terpakai masih sah sampai `expires_at`.
Karena itu `ReverseOtp::samarkanToken()` dijalankan **sebelum** penyimpanan:

| Yang dikirim pengguna | Tersimpan sebagai |
| :--- | :--- |
| `OTP GRQQCYTU` | `OTP ****` |
| `GRQQCYTU` (tercatat sebagai token) | `****` |
| `kode: GRQQCYTU` | `kode: ****` |
| `8B2XQ7KM` (mengandung angka) | `****` |
| `halo kak, promo masih ada?` | tidak berubah |

Verifikasi dilakukan **sebelum** penyamaran, jadi tidak ada yang hilang dari
sudut fungsi.

#### Kenapa bentuk telanjang butuh pemeriksaan database

Bentuk berlabel (`OTP XXXXXXXX`) tidak ambigu — pengguna menyatakan maksudnya.
Bentuk telanjang tidak demikian: alfabet token membuang `0/O/1/I/L`, tetapi
huruf lain sama persis dengan huruf biasa. Kata-kata ini **delapan huruf dan
seluruhnya ada di alfabet token**:

```
sekarang   harganya   sebentar
```

Pola yang menyamarkan setiap teks delapan karakter akan mengubah pesan
pelanggan menjadi `****` dan menghapus konteks yang dibutuhkan operator. Pola
yang tidak menyamarkannya sama sekali akan membiarkan ~6% token (yang kebetulan
seluruhnya huruf) tersimpan mentah.

Menebak dari bentuk tidak bisa menyelesaikan ini, jadi
`ReverseOtp::tokenDikenal()` **bertanya ke database**: apakah hash teks ini
milik challenge milik user ini yang belum kedaluwarsa? Jawabannya tepat —
`sekarang` tidak akan cocok dengan token mana pun, sedangkan token sah cocok
bahkan bila dikirim dari nomor yang salah atau sudah terpakai.

Pemeriksaan bentuk dilakukan lebih dulu, sehingga pesan biasa tidak
menghasilkan query tambahan.

**Batasan yang diketahui.** Bila token yang sedang aktif kebetulan sama dengan
kata yang sedang diketik orang lain, kata itu ikut disamarkan. Arah salahnya
aman — yang terjadi hanya teks kehilangan isi, tidak ada rahasia yang bocor —
dan peluangnya 1 dari 31⁸ (sekitar 1 banding 850 miliar).

### 4.2 Verifikasi diklaim secara atomik

```php
$diklaim = DB::table('wa_otp_challenges')
    ->where('id', $challenge->id)
    ->where('status', 'pending')
    ->where('expires_at', '>', now())
    ->update(['status' => 'verified', ...]);
```

Bukan baca-lalu-tulis. Dua pesan identik yang tiba hampir bersamaan hanya
menghasilkan satu verifikasi — `UPDATE` bersyarat memastikan itu.

### 4.3 Nomor pengirim harus cocok

Challenge dibuat untuk satu nomor. Token yang benar tetapi dikirim dari nomor
lain **ditolak**. Ini yang membedakan "memegang token" dari "memiliki nomor".

### 4.4 Pengirim LID tidak diverifikasi

Kalau wa-api mengirim `from: null` (pengirim muncul sebagai LID yang belum
dipetakan), pesan **tidak** dicocokkan. LID adalah id internal WhatsApp, bukan
nomor yang bisa diverifikasi ke data pelanggan. Untuk autentikasi, menolak
adalah satu-satunya jawaban yang benar.

### 4.5 Token sekali pakai

Setelah `verified`, token tidak bisa dipakai lagi. Status `pending` yang
diperiksa pada klaim adalah yang menjaminnya.

### 4.6 Batas percobaan

`MAKS_PERCOBAAN = 5`. Setelah itu challenge ditutup. Tanpa batas ini, token
pendek bisa ditebak berulang kali selama masa berlakunya.

Catatan implementasi: parser token dibuat **permisif** (`A-Z0-9`), bukan hanya
huruf alfabet generator. Parser yang ketat punya cacat yang tidak terlihat —
tebakan seperti `SALAH1` tidak dikenali sebagai token, sehingga tidak dihitung
sebagai percobaan gagal dan batas brute-force tidak pernah tercapai. Yang
menentukan benar/salah adalah perbandingan hash.

### 4.7 Challenge baru membatalkan yang lama

Satu nomor hanya punya satu challenge aktif. Tanpa ini, pengguna yang meminta
ulang tiga kali punya tiga token sah sekaligus, dan yang paling lama (mungkin
sudah terlanjur diteruskan) tetap bisa dipakai.

### 4.8 Masa berlaku 5 menit

Token beredar di chat WhatsApp, yang bisa dibaca siapa pun yang memegang
ponsel itu. `MASA_BERLAKU_DETIK = 300`.

---

## 5. Yang harus Anda tambahkan sendiri

Referensi ini berhenti di **"nomor terverifikasi"**. Sesudah itu terserah
aplikasi Anda. Tiap butir di bawah menyebut berkas tempat perubahan itu
biasanya jatuh.

1. **Buat sesi.** Setelah `verified`, terbitkan token sesi/Laravel auth untuk
   pengguna yang cocok dengan `challenge.phone`. Tabel ini tidak tahu user mana
   yang harus login — `user_id` di sini adalah id pemilik di wa-api.

   Titik perubahan:
   `<PROJECT_ANDA>/app/Http/Controllers/OtpController.php` method `status()`
   (contoh: `/home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/OtpController.php`
   baris 97–125). Saat `$challenge->status === 'verified'`, terbitkan sesi di
   situ sebelum mengembalikan respons — bukan di endpoint terpisah yang bisa
   dipanggil tanpa challenge yang benar-benar terverifikasi.

2. **Petakan nomor ke akun.** Cocokkan `challenge.phone` dengan nomor
   terdaftar di tabel pengguna aplikasi Anda. Kalau tidak ada yang cocok,
   verifikasi berhasil tetapi tidak ada yang bisa login — tangani kasus ini
   secara eksplisit, jangan diam-diam gagal.

   Titik perubahan: method yang sama, `OtpController::status()` di
   `<PROJECT_ANDA>/app/Http/Controllers/OtpController.php`. Tambahkan lookup ke
   tabel pengguna Anda dan kembalikan status berbeda (misalnya
   `verified_unmapped`) alih-alih `verified` bila nomornya tidak dikenal.
   Frontend yang mem-polling lalu bisa menampilkan pesan yang benar.

3. **Redirect yang aman.** `redirectTo` disimpan apa adanya. Kalau nilainya
   berasal dari input pengguna, validasi agar hanya menerima path internal —
   kalau tidak, ini menjadi open redirect.

   Titik perubahan: `OtpController::buat()` di
   `<PROJECT_ANDA>/app/Http/Controllers/OtpController.php` (contoh:
   `/home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/OtpController.php`
   baris 41–94), saat menerima `$request->input('redirectTo')`. Tolak nilai yang
   diawali `//` atau memuat skema (`http:`, `javascript:`) sebelum disimpan ke
   kolom `redirect_to`.

4. **Bersihkan challenge lama (opsional).** `wa_otp_challenges` tumbuh tanpa
   batas: setiap permintaan login menambah satu baris, dan tidak ada yang
   menghapusnya. Untuk volume rendah ini tidak masalah, tetapi bila dipakai
   luas tambahkan pembersihan berkala — misalnya perintah artisan terjadwal
   yang menghapus baris berstatus `expired`/`cancelled` lebih tua dari 30 hari.

   Titik perubahan: `<PROJECT_ANDA>/routes/console.php` (jadwal) dan perintah
   baru di `<PROJECT_ANDA>/app/Console/Commands/`.
   `ReverseOtp::rapikanKedaluwarsa()` — di
   `/home/abdhnf/dev/wa-broadcast-dashboard/app/Services/ReverseOtp.php` baris
   316 — hanya mengubah status, tidak menghapus baris.

---

## 6. Kesalahan yang mudah terjadi

| Gejala | Penyebab |
| :--- | :--- |
| Semua kiriman webhook dijawab **503** | `WA_WEBHOOK_SECRET` kosong di `<PROJECT_ANDA>/.env` |
| Challenge dibuat, tapi tidak pernah `verified` | Webhook belum terdaftar di wa-api, atau `matchValue` tidak cocok dengan format pesan |
| `419 CSRF token mismatch` | `api/otp/*` belum ada di pengecualian CSRF (`<PROJECT_ANDA>/bootstrap/app.php`) |
| `from` selalu `null` | Pengirim muncul sebagai LID; pemetaan LID belum ada di `/home/abdhnf/dev/wa-api` |
| Status tetap `pending` padahal pesan masuk | Nomor pengirim tidak sama dengan nomor challenge, atau token kedaluwarsa |
| Event gagal tidak pernah diproses ulang | Penerima menolak `deliveryId` yang sudah ada — lihat catatan di §7 |

---

## 7. Bug yang ditemukan dan diperbaiki saat referensi ini dibuat

`WaWebhookController` di
`/home/abdhnf/dev/wa-broadcast-dashboard/app/Http/Controllers/WaWebhookController.php`
sebelumnya memeriksa duplikat hanya dengan:

```php
$sudahAda = DB::table('wa_webhook_events')->where('delivery_id', $deliveryId)->exists();
if ($sudahAda) return response()->json(['ok' => true, 'duplicate' => true]);
```

akibatnya: event yang **gagal** diproses (500) lalu dikirim ulang oleh wa-api
dengan `deliveryId` yang sama langsung dijawab "duplicate" — dan event itu
**hilang selamanya**. Pada alur OTP artinya pelanggan mengirim token, dashboard
gagal sesaat, dan token tidak pernah terverifikasi.

Perbaikannya: yang dianggap duplikat hanya baris berstatus `processed`. Baris
`failed` diklaim ulang lewat `UPDATE` bersyarat (`whereIn('status', ['failed',
'received'])`), sehingga dua kiriman bersamaan tidak sama-sama memproses.

Buktikan dengan:

```bash
php artisan test --filter=WaWebhookRetryTest
```

---

## 8. Menjalankan tes

Semua perintah dijalankan dari akar project tempat tes berada, **bukan** dari
direktori lain:

```bash
cd <PROJECT_ANDA>
```

Untuk menjalankan tes referensi apa adanya (sebelum disalin), akarnya
`/home/abdhnf/dev/wa-broadcast-dashboard`.

| Path absolut berkas tes | Perintah | Yang dibuktikan |
| :--- | :--- | :--- |
| `/home/abdhnf/dev/wa-broadcast-dashboard/tests/Feature/ReverseOtpTest.php` | `php artisan test --filter=ReverseOtpTest` | Normalisasi nomor, ekstraksi token, verifikasi sekali pakai, penolakan LID, redaksi (termasuk token yang seluruhnya huruf) |
| `/home/abdhnf/dev/wa-broadcast-dashboard/tests/Feature/OtpControllerTest.php` | `php artisan test --filter=OtpControllerTest` | Endpoint API: buat, status, batalkan, isolasi antar-user |
| `/home/abdhnf/dev/wa-broadcast-dashboard/tests/Feature/WaWebhookRetryTest.php` | `php artisan test --filter=WaWebhookRetryTest` | Retry setelah gagal (bug §7), tanda tangan salah |

Setelah disalin ke project Anda, path-nya menjadi
`<PROJECT_ANDA>/tests/Feature/ReverseOtpTest.php` dan seterusnya; perintahnya
tetap sama.

```bash
cd /home/abdhnf/dev/wa-broadcast-dashboard

php artisan test --filter=ReverseOtpTest
php artisan test --filter=OtpControllerTest
php artisan test --filter=WaWebhookRetryTest

# Seluruh suite
php artisan test
```

Ketiganya memakai `RefreshDatabase`, dan
`/home/abdhnf/dev/wa-broadcast-dashboard/phpunit.xml` mengarahkan koneksi ke
SQLite `:memory:`, jadi tidak menyentuh database pengembangan dan tidak
meninggalkan data uji. Pastikan project Anda punya pengaturan serupa — tanpa
`DB_CONNECTION=sqlite` + `DB_DATABASE=:memory:` di
`<PROJECT_ANDA>/phpunit.xml`, tes akan memakai database asli.

---

## 9. Alternatif: magic link tanpa token yang diketik

Kalau Anda tidak ingin pengguna mengetik token, alurnya bisa dibalik: pengguna
mengirim pesan apa pun ("login") ke nomor layanan, wa-api meneruskan, dan
aplikasi **membalas** dengan magic link lewat API kirim wa-api. Referensi ini
tidak memakai jalur itu karena:

- Membalas berarti mengirim pesan (biaya, dan risiko nomor diblokir).
- Token yang dikirim lewat WhatsApp bisa diteruskan orang lain; token yang
  pengguna ketik sendiri dari layar tidak pernah meninggalkan chat itu kecuali
  oleh pemiliknya.

Kalau tetap ingin jalur balasan, gunakan `POST /api/v1/messages/send` wa-api
dengan `priority: "high"` (lihat dokumentasi di panel wa-api, tab Docs).
