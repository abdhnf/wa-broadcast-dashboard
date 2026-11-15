<?php

namespace Tests\Feature;

use App\Models\WaInboundMessage;
use App\Models\WaOtpChallenge;
use App\Services\ReverseOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Reverse OTP: alur verifikasi lewat pesan WhatsApp pengguna.
 *
 * Yang diuji adalah jalur webhook (bukan HTTP controller), karena di situlah
 * token benar-benar dicocokkan.
 */
class ReverseOtpTest extends TestCase
{
    use RefreshDatabase;

    private const USER = 'usr_otp_test';

    private const PHONE = '628999000111';

    private const SESI = 'sess_otp';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.wa_api.webhook_secret' => 'rahasia-uji']);
    }

    /** Kirim event message.received lewat jalur webhook yang sesungguhnya. */
    private function webhookKirimPesan(array $data, string $deliveryId = 'del-x'): TestResponse
    {
        $payload = [
            'event' => 'message.received',
            'deliveryId' => $deliveryId,
            'occurredAt' => now()->toIso8601String(),
            'data' => array_merge([
                'id' => 'inb_'.$deliveryId,
                'userId' => self::USER,
                'sessionId' => self::SESI,
                'waMessageId' => 'wamid_'.$deliveryId,
                'from' => self::PHONE,
                'fromJid' => self::PHONE.'@s.whatsapp.net',
                'pushName' => 'Budi',
                'chatType' => 'private',
                'type' => 'text',
                'text' => null,
                'mediaCaption' => null,
                'receivedAt' => now()->toIso8601String(),
            ], $data),
        ];

        $body = json_encode($payload);
        $ts = (string) time();
        $sig = 'sha256='.hash_hmac('sha256', $ts.'.'.$body, 'rahasia-uji');

        return $this->call(
            'POST',
            '/api/wa/webhook',
            [], [], [],
            [
                'HTTP_X-WA-Timestamp' => $ts,
                'HTTP_X-WA-Signature' => $sig,
                'CONTENT_TYPE' => 'application/json',
            ],
            $body,
        );
    }

    // ---------- Normalisasi nomor ----------

    public function test_normalisasi_nomor(): void
    {
        $this->assertSame('628999000111', ReverseOtp::normalisasiNomor('628999000111'));
        $this->assertSame('628999000111', ReverseOtp::normalisasiNomor('08999000111'));
        $this->assertSame('628999000111', ReverseOtp::normalisasiNomor('+62 899-9000-111'));
        $this->assertSame('628999000111', ReverseOtp::normalisasiNomor('8999000111'));
        $this->assertNull(ReverseOtp::normalisasiNomor(''));
        $this->assertNull(ReverseOtp::normalisasiNomor(null));
        $this->assertNull(ReverseOtp::normalisasiNomor('12345'), 'terlalu pendek');
    }

    // ---------- Ekstraksi token ----------

    public function test_ekstraksi_token(): void
    {
        $this->assertSame('A1B2C3D4', ReverseOtp::ekstrakToken('A1B2C3D4'));
        $this->assertSame('A1B2C3D4', ReverseOtp::ekstrakToken('OTP A1B2C3D4'));
        $this->assertSame('A1B2C3D4', ReverseOtp::ekstrakToken('otp: a1b2c3d4'));
        $this->assertSame('A1B2C3D4', ReverseOtp::ekstrakToken('kode A1B2C3D4'));
        $this->assertSame('A1B2C3D4', ReverseOtp::ekstrakToken('  a1b2c3d4  '));

        $this->assertNull(ReverseOtp::ekstrakToken('halo apa kabar'));
        $this->assertNull(ReverseOtp::ekstrakToken(''));
        $this->assertNull(ReverseOtp::ekstrakToken(null));
    }

    // ---------- Alur utama ----------

    public function test_verifikasi_berhasil_dari_pesan_whatsapp(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE, 'login', 'https://app.test/dashboard');
        $token = $hasil['token'];

        $this->assertSame('pending', $hasil['challenge']->fresh()->status);

        $this->webhookKirimPesan(['text' => 'OTP '.$token], 'del-sukses')->assertStatus(200);

        $challenge = $hasil['challenge']->fresh();
        $this->assertSame('verified', $challenge->status, 'token yang benar harus memverifikasi challenge');
        $this->assertNotNull($challenge->verified_at);
        $this->assertSame(self::PHONE, $challenge->verified_by_phone);
    }

    public function test_token_bisa_dikirim_tanpa_kata_otp(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);
        $this->webhookKirimPesan(['text' => $hasil['token']], 'del-polos')->assertStatus(200);
        $this->assertSame('verified', $hasil['challenge']->fresh()->status);
    }

    public function test_token_dari_nomor_lain_ditolak(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        // Nomor lain mengirim token yang benar.
        $this->webhookKirimPesan([
            'text' => 'OTP '.$hasil['token'],
            'from' => '628777000222',
            'fromJid' => '628777000222@s.whatsapp.net',
        ], 'del-nomor-lain')->assertStatus(200);

        $this->assertSame(
            'pending',
            $hasil['challenge']->fresh()->status,
            'token hanya sah untuk nomor yang memintanya',
        );
    }

    public function test_token_sekali_pakai(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        $this->webhookKirimPesan(['text' => 'OTP '.$hasil['token']], 'del-1')->assertStatus(200);
        $this->assertSame('verified', $hasil['challenge']->fresh()->status);

        $waktuVerifikasi = $hasil['challenge']->fresh()->verified_at;

        // Kiriman kedua dengan token yang sama, waMessageId berbeda (bukan
        // duplikat dari sisi webhook), jadi jalur pencocokan benar-benar jalan.
        $this->webhookKirimPesan([
            'text' => 'OTP '.$hasil['token'],
            'waMessageId' => 'wamid-kedua',
        ], 'del-2')->assertStatus(200);

        $c = $hasil['challenge']->fresh();
        $this->assertSame('verified', $c->status);
        $this->assertSame(
            $waktuVerifikasi?->toDateTimeString(),
            $c->verified_at?->toDateTimeString(),
            'waktu verifikasi tidak boleh berubah: token ini tidak diverifikasi ulang',
        );
        $this->assertSame(
            'wamid_del-1',
            $c->wa_message_id,
            'pesan pertama yang menang; pesan kedua tidak menimpa bukti verifikasi',
        );
    }

    public function test_token_kedaluwarsa_ditolak(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        // Mundurkan masa berlaku.
        WaOtpChallenge::where('id', $hasil['challenge']->id)->update([
            'expires_at' => now()->subMinute(),
        ]);

        $this->webhookKirimPesan(['text' => 'OTP '.$hasil['token']], 'del-exp')->assertStatus(200);

        $this->assertSame(
            'pending',
            $hasil['challenge']->fresh()->status,
            'token kedaluwarsa tidak boleh memverifikasi apa pun',
        );
    }

    public function test_challenge_baru_membatalkan_yang_lama(): void
    {
        $lama = ReverseOtp::buat(self::USER, self::PHONE);
        $baru = ReverseOtp::buat(self::USER, self::PHONE);

        $this->assertSame('cancelled', $lama['challenge']->fresh()->status, 'token lama harus dibatalkan');
        $this->assertSame('pending', $baru['challenge']->fresh()->status);

        // Token lama tidak lagi berguna.
        $this->webhookKirimPesan(['text' => 'OTP '.$lama['token']], 'del-lama')->assertStatus(200);
        $this->assertSame('cancelled', $lama['challenge']->fresh()->status);
        $this->assertSame('pending', $baru['challenge']->fresh()->status);
    }

    public function test_batas_percobaan_salah(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        for ($i = 1; $i <= ReverseOtp::MAKS_PERCOBAAN; $i++) {
            $this->webhookKirimPesan(['text' => 'OTP SALAH'.$i], 'del-salah-'.$i)->assertStatus(200);
        }

        $c = $hasil['challenge']->fresh();
        $this->assertSame('cancelled', $c->status, 'setelah batas percobaan, challenge ditutup');

        // Token yang benar pun tidak lagi diterima.
        $this->webhookKirimPesan(['text' => 'OTP '.$hasil['token']], 'del-benar')->assertStatus(200);
        $this->assertSame('cancelled', $c->fresh()->status);
    }

    public function test_pengirim_lid_tanpa_nomor_tidak_diverifikasi(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        // wa-api mengirim from = null ketika pengirim muncul sebagai LID yang
        // belum dipetakan. Token TIDAK boleh dicocokkan berdasarkan LID.
        $this->webhookKirimPesan([
            'text' => 'OTP '.$hasil['token'],
            'from' => null,
            'fromJid' => '14396814266545@lid',
        ], 'del-lid')->assertStatus(200);

        $this->assertSame(
            'pending',
            $hasil['challenge']->fresh()->status,
            'LID bukan nomor telepon; tidak boleh dipakai memverifikasi',
        );
    }

    public function test_token_di_caption_gambar_diterima(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        $this->webhookKirimPesan([
            'type' => 'image',
            'text' => null,
            'mediaCaption' => 'OTP '.$hasil['token'],
        ], 'del-caption')->assertStatus(200);

        $this->assertSame('verified', $hasil['challenge']->fresh()->status);
    }

    public function test_pesan_biasa_tidak_mengganggu_challenge(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        $this->webhookKirimPesan(['text' => 'halo, saya mau tanya produk'], 'del-biasa')->assertStatus(200);

        $c = $hasil['challenge']->fresh();
        $this->assertSame('pending', $c->status);
        $this->assertSame(0, $c->failed_attempts, 'pesan tanpa token bukan percobaan salah');
    }

    public function test_token_disimpan_sebagai_hash(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);
        $token = $hasil['token'];

        $tersimpan = WaOtpChallenge::find($hasil['challenge']->id);
        $this->assertNotSame($token, $tersimpan->token_hash, 'token mentah tidak boleh tersimpan');
        $this->assertSame(hash('sha256', $token), $tersimpan->token_hash);
        $this->assertSame(64, strlen($tersimpan->token_hash));
    }

    public function test_token_dari_user_lain_tidak_cocok(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        // Challenge milik user lain tidak boleh terverifikasi oleh pesan user ini.
        $this->webhookKirimPesan([
            'text' => 'OTP '.$hasil['token'],
            'userId' => 'usr_penyusup',
        ], 'del-lain-user')->assertStatus(200);

        $this->assertSame(
            'pending',
            $hasil['challenge']->fresh()->status,
            'isolasi tenant: token milik user A tidak boleh dipakai user B',
        );
    }

    // ---------- Redaksi token saat disimpan ----------

    public function test_token_tidak_tersimpan_mentah_di_inbox(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);
        $token = $hasil['token'];

        $this->webhookKirimPesan(['text' => 'OTP '.$token], 'del-redaksi')->assertStatus(200);

        $pesan = WaInboundMessage::where('wa_message_id', 'wamid_del-redaksi')->first();
        $this->assertNotNull($pesan);

        $this->assertStringNotContainsString(
            $token,
            (string) $pesan->text,
            'token mentah tidak boleh tersimpan di inbox: tabel ini tidak pernah dibersihkan',
        );
        $this->assertSame('OTP ****', $pesan->text, 'bentuk pesan tetap terbaca sebagai pesan OTP');

        // `raw` juga tidak boleh menyimpan salinan mentahnya.
        $this->assertStringNotContainsString($token, json_encode($pesan->raw));
    }

    public function test_token_tidak_tersimpan_mentah_di_log_webhook(): void
    {
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);
        $token = $hasil['token'];

        $this->webhookKirimPesan(['text' => 'OTP '.$token], 'del-log')->assertStatus(200);

        $payload = DB::table('wa_webhook_events')
            ->where('delivery_id', 'del-log')
            ->value('payload');

        $this->assertStringNotContainsString(
            $token,
            (string) $payload,
            'kolom payload tidak pernah dibersihkan, jadi token tidak boleh ada di sana',
        );
    }

    public function test_pesan_biasa_tidak_ikut_disamarkan(): void
    {
        // Pola redaksi harus ketat. Kalau tidak, inbox penuh "****" dan
        // operator kehilangan isi percakapan yang justru dibutuhkan.
        $this->assertSame('halo kak', ReverseOtp::samarkanToken('halo kak'));
        $this->assertSame('promo bulan ini', ReverseOtp::samarkanToken('promo bulan ini'));
        $this->assertSame('resi JP1234567890', ReverseOtp::samarkanToken('resi JP1234567890'));
        $this->assertSame('', ReverseOtp::samarkanToken(''));

        // Kasus yang paling mudah salah: kata Indonesia delapan huruf yang
        // seluruh hurufnya ada di alfabet token (0/O/1/I/L sudah dibuang,
        // tetapi sisanya sama dengan huruf biasa).
        foreach (['sekarang', 'harganya', 'sebentar', 'pesanan', 'silakan'] as $kata) {
            $this->assertSame(
                $kata,
                ReverseOtp::samarkanToken($kata),
                "kata biasa \"$kata\" tidak boleh disamarkan",
            );
        }

        // Token sebenarnya tetap disamarkan.
        //
        // Bentuk telanjang yang seluruhnya huruf hanya bisa dikenali lewat
        // database, jadi `tokenDikenal` diteruskan di sini. Yang tidak
        // ambigu — berlabel atau mengandung angka — disamarkan tanpa bantuan.
        $this->assertSame('****', ReverseOtp::samarkanToken('GRQQCYTU', true));
        $this->assertSame('OTP ****', ReverseOtp::samarkanToken('OTP GRQQCYTU'));
        $this->assertSame('kode: ****', ReverseOtp::samarkanToken('kode: GRQQCYTU'));

        // Token telanjang yang mengandung angka selalu disamarkan: tidak ada
        // kata Indonesia delapan karakter berangka, jadi tidak ambigu.
        $this->assertSame('****', ReverseOtp::samarkanToken('8B2XQ7KM'));

        // Tanpa hasil pemeriksaan database, bentuk telanjang yang seluruhnya
        // huruf dibiarkan apa adanya — lebih baik daripada merusak pesan biasa.
        $this->assertSame('GRQQCYTU', ReverseOtp::samarkanToken('GRQQCYTU'));
    }

    public function test_token_tanpa_label_yang_seluruhnya_huruf_tetap_disamarkan(): void
    {
        // Sekitar 6% token yang dihasilkan seluruhnya huruf. Bentuknya sama
        // dengan kata biasa delapan huruf, jadi `tokenDikenal()` yang
        // membedakannya — bukan tebakan dari bentuk.
        $token = 'SEKARANG'; // 8 huruf, semuanya ada di alfabet token
        $challenge = WaOtpChallenge::create([
            'user_id' => self::USER,
            'token_hash' => hash('sha256', $token),
            'phone' => self::PHONE,
            'purpose' => 'login',
            'status' => 'pending',
            'expires_at' => now()->addMinutes(5),
            'failed_attempts' => 0,
        ]);

        $this->assertTrue(
            ReverseOtp::tokenDikenal(self::USER, $token),
            'token yang ada di database harus dikenali',
        );
        $this->assertFalse(
            ReverseOtp::tokenDikenal(self::USER, 'harganya'),
            'kata biasa bukan token, walau bentuknya sama',
        );
        $this->assertFalse(
            ReverseOtp::tokenDikenal('usr_lain', $token),
            'token milik user lain tidak boleh dikenali',
        );

        // Batasan yang diketahui: bila token yang sedang aktif kebetulan sama
        // dengan kata yang sedang diketik pengguna lain, kata itu ikut
        // disamarkan. Arah salahnya aman — yang terjadi hanya teks kehilangan
        // isi, tidak ada rahasia yang bocor — dan peluangnya 1 dari 31^8.
        $this->assertTrue(
            ReverseOtp::tokenDikenal(self::USER, 'sekarang'),
            'token SEKARANG aktif, jadi kata "sekarang" dikenali sebagai token',
        );

        $this->webhookKirimPesan(['text' => $token], 'del-huruf')->assertStatus(200);

        $this->assertSame('verified', $challenge->fresh()->status);

        $pesan = WaInboundMessage::where('wa_message_id', 'wamid_del-huruf')->first();
        $this->assertSame('****', $pesan->text, 'token tanpa label yang terbukti cocok tetap disamarkan');

        $payload = DB::table('wa_webhook_events')->where('delivery_id', 'del-huruf')->value('payload');
        $this->assertStringNotContainsString($token, (string) $payload);
    }

    public function test_token_dari_nomor_lain_tetap_disamarkan(): void
    {
        // Kasus yang paling mudah terlewat: token sah dikirim dari nomor yang
        // salah. Verifikasi gagal, tetapi tokennya tetap rahasia dan tidak
        // boleh tersimpan mentah.
        $hasil = ReverseOtp::buat(self::USER, self::PHONE);

        $this->webhookKirimPesan([
            'text' => $hasil['token'],
            'from' => '628777000222',
            'fromJid' => '628777000222@s.whatsapp.net',
        ], 'del-nomor-salah')->assertStatus(200);

        $this->assertSame('pending', $hasil['challenge']->fresh()->status);

        $pesan = WaInboundMessage::where('wa_message_id', 'wamid_del-nomor-salah')->first();
        $this->assertStringNotContainsString($hasil['token'], (string) $pesan->text);
    }
}
