<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Penerima webhook harus memproses ulang event yang GAGAL, bukan menolaknya
 * sebagai duplikat.
 *
 * Skenario nyata pada alur OTP: wa-api mengirim event, dashboard membalas 500
 * karena galat sesaat, wa-api mencoba ulang 1 menit kemudian dengan
 * `deliveryId` yang SAMA. Kalau penerima hanya memeriksa "deliveryId sudah
 * ada?", kiriman ulang itu dijawab "duplicate" dan token pelanggan tidak
 * pernah terverifikasi.
 */
class WaWebhookRetryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Endpoint menolak semua kiriman (503) bila secret kosong — perilaku
        // yang benar. Tes ini butuh secret terpasang agar bisa mencapai
        // pemrosesan.
        config(['services.wa_api.webhook_secret' => 'rahasia-uji']);
    }

    private function kirim(array $payload): TestResponse
    {
        $body = json_encode($payload);
        $ts = (string) time();
        $sig = 'sha256='.hash_hmac('sha256', $ts.'.'.$body, 'rahasia-uji');

        return $this->call(
            'POST',
            '/api/wa/webhook',
            [],
            [],
            [],
            [
                'HTTP_X-WA-Timestamp' => $ts,
                'HTTP_X-WA-Signature' => $sig,
                'CONTENT_TYPE' => 'application/json',
            ],
            $body,
        );
    }

    /**
     * Payload `message.received`.
     *
     * `sessionId` kosong membuat handler melempar — cara memicu kegagalan
     * tanpa merusak skema database.
     */
    private function payload(string $deliveryId, string $sessionId = 'sess_1'): array
    {
        return [
            'event' => 'message.received',
            'deliveryId' => $deliveryId,
            'occurredAt' => now()->toIso8601String(),
            'data' => [
                'id' => 'inb_1',
                'userId' => 'usr_1',
                'sessionId' => $sessionId,
                'waMessageId' => 'wamid_'.$deliveryId,
                'from' => '628111',
                'fromJid' => '628111@s.whatsapp.net',
                'chatType' => 'private',
                'type' => 'text',
                'text' => 'OTP ABC123',
                'receivedAt' => now()->toIso8601String(),
            ],
        ];
    }

    public function test_kiriman_ulang_setelah_gagal_masih_diproses(): void
    {
        // Percobaan 1: gagal karena sessionId kosong.
        $r1 = $this->kirim($this->payload('del-1', ''));
        $r1->assertStatus(500);
        $this->assertSame(
            'failed',
            DB::table('wa_webhook_events')->where('delivery_id', 'del-1')->value('status'),
            'event gagal harus tercatat failed',
        );

        // Percobaan 2: wa-api mengirim ulang dengan deliveryId SAMA, kini valid.
        $r2 = $this->kirim($this->payload('del-1'));
        $r2->assertStatus(200);

        $this->assertSame(
            'processed',
            DB::table('wa_webhook_events')->where('delivery_id', 'del-1')->value('status'),
            'kiriman ulang harus memproses event yang gagal, bukan menolaknya sebagai duplikat',
        );
        $this->assertSame(
            1,
            DB::table('wa_webhook_events')->where('delivery_id', 'del-1')->count(),
            'kiriman ulang tidak boleh membuat baris log baru',
        );
    }

    public function test_kiriman_ulang_setelah_sukses_tidak_diproses_dua_kali(): void
    {
        $this->kirim($this->payload('del-2'))->assertStatus(200);

        // Tabel pesan masuk mencatat satu baris.
        $this->assertSame(1, DB::table('wa_inbound_messages')->count());

        $r2 = $this->kirim($this->payload('del-2'));
        $r2->assertStatus(200);
        $r2->assertJson(['duplicate' => true]);

        $this->assertSame(
            1,
            DB::table('wa_inbound_messages')->count(),
            'event sukses yang dikirim ulang tidak boleh diproses dua kali',
        );
    }

    public function test_tanda_tangan_salah_ditolak(): void
    {
        $body = json_encode($this->payload('del-3'));
        $ts = (string) time();

        $this->call(
            'POST',
            '/api/wa/webhook',
            [], [], [],
            [
                'HTTP_X-WA-Timestamp' => $ts,
                'HTTP_X-WA-Signature' => 'sha256='.str_repeat('0', 64),
                'CONTENT_TYPE' => 'application/json',
            ],
            $body,
        )->assertStatus(401);

        $this->assertSame(0, DB::table('wa_webhook_events')->count(), 'body tidak sah tidak boleh menyentuh database');
    }
}
