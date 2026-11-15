<?php

namespace App\Services;

use App\Models\WaOtpChallenge;
use Illuminate\Support\Facades\DB;

/**
 * Reverse OTP / User-Initiated Magic Link.
 *
 * Alurnya terbalik dari OTP biasa. Aplikasi tidak mengirim kode; pengguna
 * mengirim token dari WhatsApp-nya sendiri, lalu wa-api meneruskannya lewat
 * webhook. Di sini token dicocokkan dengan challenge yang menunggu.
 *
 * Empat aturan yang menjaga alur ini tidak berubah menjadi jalan masuk:
 *
 *   1. **Token sekali pakai.** Klaim dilakukan dengan UPDATE bersyarat
 *      (`status = 'pending'`), bukan baca-lalu-tulis. Dua pesan identik yang
 *      tiba hampir bersamaan hanya menghasilkan satu verifikasi.
 *   2. **Nomor harus cocok.** Challenge dibuat untuk satu nomor; token yang
 *      dikirim dari nomor lain ditolak walau tokennya benar.
 *   3. **Batas waktu pendek.** Token beredar di chat WhatsApp, yang bisa dibaca
 *      siapa pun yang memegang ponsel itu.
 *   4. **Batas percobaan.** Tanpa ini, token pendek bisa ditebak berulang kali
 *      selama masa berlakunya.
 */
class ReverseOtp
{
    /** Masa berlaku token. Cukup lama untuk mengetik, cukup pendek untuk aman. */
    public const MASA_BERLAKU_DETIK = 300;

    /** Percobaan salah sebelum challenge dianggap hangus. */
    public const MAKS_PERCOBAAN = 5;

    /** Panjang token. 8 karakter alfanumerik ~ 2,8 triliun kemungkinan. */
    public const PANJANG_TOKEN = 8;

    /**
     * Huruf yang mirip sengaja dibuang (0/O, 1/I/L).
     *
     * Token diketik ulang oleh manusia dari layar ke WhatsApp, dan pasangan
     * huruf yang mirip adalah penyebab paling umum "token saya salah padahal
     * saya salin persis".
     */
    private const ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    /**
     * Normalisasi nomor WhatsApp ke bentuk kanonik `628xxx`.
     *
     * wa-api sudah mengirim nomor bersih (hanya digit, awalan 62), tetapi
     * bentuk `08xxx` tetap lazim dimasukkan manusia lewat formulir. Keduanya
     * harus menunjuk nomor yang sama, kalau tidak challenge tidak akan pernah
     * cocok meski penggunanya sama.
     */
    public static function normalisasiNomor(?string $nomor): ?string
    {
        if ($nomor === null) {
            return null;
        }

        $digit = preg_replace('/\D+/', '', $nomor) ?? '';
        if ($digit === '') {
            return null;
        }

        // 08xxx -> 628xxx
        if (str_starts_with($digit, '0')) {
            $digit = '62'.substr($digit, 1);
        }
        // 8123xxx (tanpa awalan) -> 628123xxx
        elseif (str_starts_with($digit, '8')) {
            $digit = '62'.$digit;
        }

        // Panjang nomor Indonesia: 62 + 8..12 digit.
        if (strlen($digit) < 10 || strlen($digit) > 15) {
            return null;
        }

        return $digit;
    }

    /** Buat token acak yang aman ditebak dan mudah dibaca. */
    public static function buatToken(int $panjang = self::PANJANG_TOKEN): string
    {
        $maks = strlen(self::ALFABET) - 1;
        $token = '';

        // `random_int` (CSPRNG), bukan `rand`/`mt_rand` yang bisa diprediksi.
        for ($i = 0; $i < $panjang; $i++) {
            $token .= self::ALFABET[random_int(0, $maks)];
        }

        return $token;
    }

    /**
     * Ambil token dari teks pesan.
     *
     * Dua bentuk diterima:
     *   - token berdiri sendiri     : "A1B2C3D4"
     *   - berlabel                  : "OTP A1B2C3D4", "kode: A1B2C3D4"
     *
     * Label opsional supaya pengguna yang mengetik "otp <token>" tidak
     * dianggap mengirim token yang salah.
     *
     * Ekstraksi ini SENGAJA permisif (`A-Z0-9`), lebih longgar daripada alfabet
     * generator yang membuang huruf mirip (0/O, 1/I/L). Yang menentukan benar
     * atau salah adalah perbandingan hash, bukan parser ini. Parser yang ketat
     * punya cacat yang tidak terlihat: tebakan seperti "SALAH1" tidak dikenali
     * sebagai token, sehingga tidak dihitung sebagai percobaan gagal dan batas
     * brute-force tidak pernah tercapai.
     */
    public static function ekstrakToken(?string $teks): ?string
    {
        if ($teks === null) {
            return null;
        }

        $bersih = trim($teks);
        if ($bersih === '') {
            return null;
        }

        // Token berdiri sendiri: seluruh pesan adalah satu kelompok alfanumerik.
        if (preg_match('/^[A-Z0-9]+$/i', $bersih)) {
            return strtoupper($bersih);
        }

        // Berlabel: "OTP A1B2C3D4", "kode: A1B2C3D4", "verify - A1B2C3D4".
        if (preg_match('/\b(?:otp|kode|code|token|verify|verifikasi)\b[^A-Za-z0-9]{0,3}([A-Z0-9]{4,16})\b/i', $bersih, $m)) {
            return strtoupper($m[1]);
        }

        return null;
    }

    /**
     * Buat challenge baru dan kembalikan token mentahnya.
     *
     * Token mentah hanya ada di nilai kembalian — tidak disimpan, tidak
     * dicatat di log. Pemanggil yang bertanggung jawab menyampaikannya.
     */
    public static function buat(
        string $userId,
        string $phone,
        string $purpose = 'login',
        ?string $redirectTo = null,
        ?int $masaBerlakuDetik = null,
    ): array {
        $nomor = self::normalisasiNomor($phone);
        if ($nomor === null) {
            throw new \InvalidArgumentException('Nomor tidak valid');
        }

        // Challenge lama yang masih pending untuk nomor ini dibatalkan.
        //
        // Tanpa ini, pengguna yang meminta ulang tiga kali punya tiga token
        // sah sekaligus — dan yang paling lama (mungkin sudah terlanjur
        // diteruskan) tetap bisa dipakai. Satu nomor, satu challenge aktif.
        WaOtpChallenge::where('user_id', $userId)
            ->where('phone', $nomor)
            ->where('status', 'pending')
            ->update(['status' => 'cancelled', 'updated_at' => now()]);

        $token = self::buatToken();
        $detik = $masaBerlakuDetik ?? self::MASA_BERLAKU_DETIK;

        $challenge = WaOtpChallenge::create([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token),
            'phone' => $nomor,
            'purpose' => $purpose,
            'redirect_to' => $redirectTo,
            'status' => 'pending',
            'expires_at' => now()->addSeconds($detik),
            'failed_attempts' => 0,
        ]);

        return [
            'challenge' => $challenge,
            'token' => $token,
            'expires_in' => $detik,
        ];
    }

    /**
     * Cocokkan pesan masuk dengan challenge yang menunggu.
     *
     * Mengembalikan `null` bila tidak ada yang cocok — bukan melempar, karena
     * pemanggilnya adalah jalur webhook yang harus tetap membalas 200 untuk
     * pesan yang bukan OTP.
     *
     * @return array{challenge: WaOtpChallenge, redirect_to: ?string}|null
     */
    public static function cocokkanPesan(
        string $userId,
        ?string $fromPhone,
        ?string $text,
        ?string $mediaCaption = null,
        ?string $waMessageId = null,
        ?string $sessionId = null,
    ): ?array {
        // Nomor pengirim wajib diketahui.
        //
        // Bila wa-api mengirim `from: null` (pengirim muncul sebagai LID yang
        // belum dipetakan), pesan TIDAK boleh dicocokkan berdasarkan LID:
        // LID adalah id internal WhatsApp, bukan nomor yang bisa diverifikasi
        // ke data pelanggan.
        $nomor = self::normalisasiNomor($fromPhone);
        if ($nomor === null) {
            return null;
        }

        // Token bisa ada di isi pesan atau di caption gambar.
        $token = self::ekstrakToken($text) ?? self::ekstrakToken($mediaCaption);
        if ($token === null) {
            return null;
        }

        $challenge = WaOtpChallenge::where('user_id', $userId)
            ->where('phone', $nomor)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();

        if (! $challenge) {
            return null;
        }

        if ($challenge->failed_attempts >= self::MAKS_PERCOBAAN) {
            $challenge->update(['status' => 'cancelled']);

            return null;
        }

        // Bandingkan HASH, bukan token. `hash_equals` dipakai agar waktu
        // perbandingan tidak membocorkan seberapa mirip tebakan dengan token.
        if (! hash_equals($challenge->token_hash, hash('sha256', $token))) {
            // Hitung percobaan berikutnya SEBELUM menyimpan: `increment()`
            // mengubah nilai di memori juga, sehingga menambahkan 1 setelahnya
            // akan menghitung dua kali.
            $percobaan = $challenge->failed_attempts + 1;

            if ($percobaan >= self::MAKS_PERCOBAAN) {
                // Habis percobaan: challenge ditutup, bukan dibiarkan bisa
                // ditebak sampai masa berlakunya berakhir.
                $challenge->update([
                    'status' => 'cancelled',
                    'failed_attempts' => $percobaan,
                ]);

                return null;
            }

            $challenge->increment('failed_attempts');

            return null;
        }

        // Klaim atomik: hanya baris yang masih `pending` dan belum kedaluwarsa
        // yang boleh berubah menjadi `verified`. Dua pesan identik yang tiba
        // bersamaan akan menghasilkan satu pemenang.
        $diklaim = DB::table('wa_otp_challenges')
            ->where('id', $challenge->id)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->update([
                'status' => 'verified',
                'verified_at' => now(),
                'verified_by_phone' => $nomor,
                'wa_message_id' => $waMessageId,
                'session_id' => $sessionId,
                'updated_at' => now(),
            ]);

        if ($diklaim === 0) {
            // Sudah dipakai permintaan lain, atau kedaluwarsa di antara
            // pembacaan dan klaim.
            return null;
        }

        $challenge->refresh();

        return [
            'challenge' => $challenge,
            'redirect_to' => $challenge->redirect_to,
        ];
    }

    /** Challenge pending yang belum kedaluwarsa untuk satu nomor. */
    public static function challengeAktif(string $userId, string $phone): ?WaOtpChallenge
    {
        $nomor = self::normalisasiNomor($phone);
        if ($nomor === null) {
            return null;
        }

        return WaOtpChallenge::where('user_id', $userId)
            ->where('phone', $nomor)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Tandai challenge yang sudah lewat waktu sebagai `expired`.
     *
     * Dilakukan malas (saat dibaca) alih-alih dengan penjadwal: challenge yang
     * kedaluwarsa tidak berbahaya selama `expires_at` diperiksa pada setiap
     * verifikasi, jadi tugas ini hanya merapikan status agar bisa dibaca
     * manusia.
     */
    public static function rapikanKedaluwarsa(string $userId): int
    {
        return WaOtpChallenge::where('user_id', $userId)
            ->where('status', 'pending')
            ->where('expires_at', '<=', now())
            ->update(['status' => 'expired', 'updated_at' => now()]);
    }

    /** Hash untuk dibandingkan, diekspos agar tes bisa memeriksa tanpa membongkar model. */
    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * Apakah `$teks` adalah token yang benar-benar ada dan belum kedaluwarsa?
     *
     * Dipakai hanya untuk memutuskan penyamaran, bukan untuk verifikasi. Bentuk
     * telanjang (`XXXXXXXX`) ambigu: alfabet token membuang `0/O/1/I/L`, tetapi
     * huruf lain sama dengan huruf biasa — "sekarang", "harganya", dan
     * "sebentar" semuanya delapan huruf yang seluruhnya ada di alfabet token.
     * Menyamarkan setiap teks delapan karakter akan mengubah pesan pelanggan
     * menjadi "****" dan menghapus konteks yang dibutuhkan operator.
     *
     * Menebak dari bentuknya tidak bisa dipercaya ke arah mana pun, jadi
     * ditanyakan ke database. Hasilnya tepat: kata biasa tidak akan cocok
     * dengan token mana pun, sedangkan token sah — termasuk yang dikirim dari
     * nomor yang salah, atau yang baru saja terpakai — selalu cocok selama
     * masa berlakunya belum habis. Justru token jenis terakhir yang paling
     * berbahaya bila tersimpan mentah.
     *
     * Pemeriksaan bentuk dilakukan lebih dulu supaya pesan biasa tidak
     * menghasilkan query.
     */
    public static function tokenDikenal(string $userId, ?string $teks): bool
    {
        if ($teks === null) {
            return false;
        }

        $bersih = trim($teks);
        if (! preg_match('/^['.self::ALFABET.']{'.self::PANJANG_TOKEN.'}$/i', $bersih)) {
            return false;
        }

        // Status tidak disaring: challenge yang sudah `verified` pun tokennya
        // harus disamarkan, karena token itu masih sah sampai `expires_at`.
        return WaOtpChallenge::where('user_id', $userId)
            ->where('token_hash', hash('sha256', strtoupper($bersih)))
            ->where('expires_at', '>', now())
            ->exists();
    }

    /**
     * Samarkan token di dalam teks pesan sebelum disimpan.
     *
     * Teks pesan masuk disimpan di `wa_inbound_messages.text` dan di
     * `wa_webhook_events.payload`, dan tidak ada yang menghapusnya. Token yang
     * sudah terpakai masih hidup sampai `expires_at`, dan yang belum terpakai
     * lebih berbahaya lagi: siapa pun yang bisa membaca tabel itu bisa
     * memverifikasi nomor orang lain. Menyimpannya mentah tidak memberi manfaat
     * audit apa pun — verifikasi selesai sebelum penyimpanan, dan yang perlu
     * diketahui dari riwayat hanyalah "ada pesan OTP", bukan isinya.
     *
     * Bentuk berlabel (`OTP XXXXXXXX`) tidak ambigu: pengguna menyatakan
     * maksudnya, jadi apa pun setelah label disamarkan.
     *
     * Bentuk telanjang hanya disamarkan bila mengandung angka (tidak ada kata
     * Indonesia delapan karakter berangka) atau bila `$tokenDikenal` —
     * hasil `tokenDikenal()`. Tanpa parameter itu, token yang seluruhnya huruf
     * tidak bisa dibedakan dari kata biasa.
     */
    public static function samarkanToken(?string $teks, bool $tokenDikenal = false): ?string
    {
        if ($teks === null || $teks === '') {
            return $teks;
        }

        $panjang = self::PANJANG_TOKEN;

        // Token berdiri sendiri tanpa label.
        if (preg_match('/^['.self::ALFABET.']{'.$panjang.'}$/i', trim($teks))) {
            if ($tokenDikenal || preg_match('/\d/', $teks) === 1) {
                return '****';
            }
        }

        // Berlabel: labelnya dipertahankan, nilainya disamarkan.
        $hasil = preg_replace(
            '/\b(otp|kode|code|token|verify|verifikasi)\b([^A-Za-z0-9]{0,3})(['.self::ALFABET.']{'.$panjang.'})\b/i',
            '$1$2****',
            $teks,
        );

        return $hasil ?? $teks;
    }

    /** Token yang layak ditampilkan: tidak pernah dipakai di luar pembuatan. */
    public static function petunjukPengiriman(string $token): string
    {
        return 'Kirim pesan berikut ke nomor WhatsApp layanan: OTP '.$token;
    }
}
