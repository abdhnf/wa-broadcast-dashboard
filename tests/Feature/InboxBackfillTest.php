<?php

namespace Tests\Feature;

use App\Models\WaInboundMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Perintah `inbox:backfill`: menarik riwayat pesan masuk dari wa-api.
 *
 * Yang dijaga di sini: idempoten (dijalankan dua kali tidak menggandakan
 * baris), token OTP tersamarkan sebelum disimpan, dan `--dry-run` benar-benar
 * tidak menulis.
 */
class InboxBackfillTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.timezone' => 'Asia/Jakarta',
            'services.wa_api.base' => 'http://wa-api.test/api/v1',
            'services.wa_api.backfill_key' => '',
        ]);
    }

    private function barisMasuk(array $ganti = []): array
    {
        return array_merge([
            'id' => 'inb_1',
            'sessionId' => 'sess-1',
            'userId' => 'usr_uji',
            'waMessageId' => 'wamid_1',
            'fromJid' => '628111@s.whatsapp.net',
            'fromPhone' => '628111',
            'pushName' => 'Budi',
            'chatType' => 'private',
            'type' => 'text',
            'text' => 'Halo',
            'mediaMime' => null,
            'mediaCaption' => null,
            'receivedAt' => '2026-11-15T03:00:00.000Z',
        ], $ganti);
    }

    private function fakeHalaman(array $baris, int $totalPages = 1): void
    {
        Http::fake([
            '*/api/v1/inbound*' => Http::response([
                'messages' => $baris,
                'total' => count($baris),
                'page' => 1,
                'limit' => 200,
                'totalPages' => $totalPages,
            ]),
        ]);
    }

    public function test_riwayat_masuk_diimpor_dan_waktunya_dikonversi(): void
    {
        $this->fakeHalaman([$this->barisMasuk()]);

        $this->artisan('inbox:backfill', ['--api-key' => 'kunci-sah'])->assertExitCode(0);

        $this->assertSame(1, WaInboundMessage::count());

        $pesan = WaInboundMessage::first();
        $this->assertSame('usr_uji', $pesan->user_id);
        $this->assertSame('628111', $pesan->from_phone);
        $this->assertSame('Halo', $pesan->text);
        $this->assertSame('2026-11-15 10:00:00', $pesan->received_at->format('Y-m-d H:i:s'));
    }

    public function test_token_otp_disamarkan_sebelum_disimpan(): void
    {
        $this->fakeHalaman([
            $this->barisMasuk([
                'id' => 'inb_2',
                'waMessageId' => 'wamid_2',
                'fromPhone' => '628222',
                'text' => 'OTP A2B3C4D5',
            ]),
        ]);

        $this->artisan('inbox:backfill', ['--api-key' => 'kunci-sah'])->assertExitCode(0);

        $this->assertSame('OTP ****', WaInboundMessage::first()->text);
    }

    public function test_dijalankan_dua_kali_tidak_menggandakan_baris(): void
    {
        $this->fakeHalaman([$this->barisMasuk()]);

        $this->artisan('inbox:backfill', ['--api-key' => 'kunci-sah'])->assertExitCode(0);
        $this->artisan('inbox:backfill', ['--api-key' => 'kunci-sah'])->assertExitCode(0);

        $this->assertSame(1, WaInboundMessage::count());
    }

    public function test_dry_run_tidak_menulis_apa_pun(): void
    {
        $this->fakeHalaman([$this->barisMasuk()]);

        $this->artisan('inbox:backfill', ['--api-key' => 'kunci-sah', '--dry-run' => true])
            ->assertExitCode(0);

        $this->assertSame(0, WaInboundMessage::count());
    }

    public function test_tanpa_kunci_api_perintah_menolak(): void
    {
        $this->artisan('inbox:backfill')->assertExitCode(1);
    }

    public function test_gateway_gagal_membuat_perintah_gagal_tanpa_menulis(): void
    {
        Http::fake(['*' => Http::response(['error' => 'gagal'], 500)]);

        $this->artisan('inbox:backfill', ['--api-key' => 'kunci-sah'])->assertExitCode(1);

        $this->assertSame(0, WaInboundMessage::count());
    }
}
