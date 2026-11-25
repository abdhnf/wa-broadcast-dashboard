<?php

namespace Tests\Feature;

use App\Http\Controllers\CrmController;
use App\Models\WaInboundMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Inbox dua arah: pesan masuk dari database sendiri, pesan keluar dari wa-api.
 *
 * Verifikasi API key di-stub (tidak memanggil curl) dan seluruh panggilan
 * wa-api dipalsukan, sehingga tes ini memeriksa penggabungan — bukan
 * ketersediaan gateway.
 */
class InboxHistoryTest extends TestCase
{
    use RefreshDatabase;

    private const USER = 'usr_uji';

    private const SESI = 'sess-1';

    private const NOMOR = '628111222333';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.timezone' => 'Asia/Jakarta',
            'services.wa_api.base' => 'http://wa-api.test/api/v1',
            'services.wa_api.history_enabled' => true,
            'services.wa_api.history_timeout' => 3,
        ]);

        // CrmController::resolveUser() memanggil wa-api lewat curl. Diganti
        // dengan identitas tetap supaya tes tidak bergantung pada gateway.
        $this->app->bind(CrmController::class, fn () => new class extends CrmController
        {
            protected function resolveUser(Request $request): ?array
            {
                return $request->header('X-API-Key') === 'kunci-sah'
                    ? ['id' => 'usr_uji', 'name' => 'Tester', 'role' => 'user']
                    : null;
            }
        });
    }

    private function pesanMasuk(array $ganti = []): WaInboundMessage
    {
        return WaInboundMessage::create(array_merge([
            'user_id' => self::USER,
            'session_id' => self::SESI,
            'wa_message_id' => 'wamid_'.uniqid(),
            'from_phone' => self::NOMOR,
            'from_jid' => self::NOMOR.'@s.whatsapp.net',
            'push_name' => 'Budi',
            'chat_type' => 'private',
            'type' => 'text',
            'text' => 'Halo, masih buka?',
            'received_at' => '2026-11-15 10:00:00',
        ], $ganti));
    }

    private function fakeRiwayat(array $keluar = [], int $total = 1, int $status = 200): void
    {
        Http::fake([
            '*/api/v1/messages/all*' => Http::response([
                'messages' => $keluar,
                'total' => $total,
            ], $status),
            '*/api/v1/messages/*' => Http::response([
                'messages' => $keluar,
                'total' => $total,
            ], $status),
            '*' => Http::response(['messages' => [], 'total' => 0]),
        ]);
    }

    public function test_percakapan_menggabungkan_masuk_dan_keluar_urut_waktu(): void
    {
        $this->pesanMasuk(['received_at' => '2026-11-15 10:00:00']);

        // 03:30 UTC = 10:30 WIB, jadi harus muncul SETELAH pesan masuk 10:00.
        $this->fakeRiwayat([[
            'id' => 'msg_1',
            'sessionId' => self::SESI,
            'to' => self::NOMOR,
            'mode' => 'text',
            'text' => 'Masih kak, silakan',
            'status' => 'delivered',
            'timestamp' => '2026-11-15T03:30:00.000Z',
        ]]);

        $res = $this->getJson(
            '/api/crm/inbox/conversation?sessionId='.self::SESI.'&phone='.self::NOMOR,
            ['X-API-Key' => 'kunci-sah'],
        );

        $res->assertOk();
        $res->assertJsonPath('degraded', false);
        $res->assertJsonCount(2, 'messages');
        $res->assertJsonPath('messages.0.direction', 'in');
        $res->assertJsonPath('messages.1.direction', 'out');
        $res->assertJsonPath('messages.1.status', 'delivered');
        $res->assertJsonPath('messages.1.at', '2026-11-15T10:30:00+07:00');
    }

    public function test_pesan_keluar_tidak_membawa_media_base64_ke_browser(): void
    {
        $this->pesanMasuk();

        $this->fakeRiwayat([[
            'id' => 'msg_media',
            'sessionId' => self::SESI,
            'to' => self::NOMOR,
            'mode' => 'media',
            'mediaType' => 'image',
            'mediaBase64' => str_repeat('A', 1000),
            'mediaUrl' => 'https://contoh.test/p.jpg',
            'caption' => 'Bukti',
            'status' => 'sent',
            'timestamp' => '2026-11-15T03:40:00.000Z',
        ]]);

        $res = $this->getJson(
            '/api/crm/inbox/conversation?sessionId='.self::SESI.'&phone='.self::NOMOR,
            ['X-API-Key' => 'kunci-sah'],
        );

        $res->assertOk();
        $keluar = collect($res->json('messages'))->firstWhere('direction', 'out');
        $this->assertArrayNotHasKey('mediaBase64', $keluar);
        $this->assertSame('image', $keluar['type']);
        $this->assertSame('https://contoh.test/p.jpg', $keluar['mediaUrl']);
    }

    public function test_gateway_gagal_pesan_masuk_tetap_tampil_dengan_penanda_degraded(): void
    {
        $this->pesanMasuk();

        Http::fake([
            '*' => Http::response(['error' => 'gagal'], 500),
        ]);

        $res = $this->getJson(
            '/api/crm/inbox/conversation?sessionId='.self::SESI.'&phone='.self::NOMOR,
            ['X-API-Key' => 'kunci-sah'],
        );

        $res->assertOk();
        $res->assertJsonPath('degraded', true);
        $res->assertJsonCount(1, 'messages');
        $res->assertJsonPath('messages.0.direction', 'in');
    }

    public function test_kunci_tidak_sah_ditolak(): void
    {
        $this->getJson('/api/crm/inbox')->assertStatus(401);
    }

    public function test_daftar_memuat_percakapan_yang_hanya_punya_pesan_keluar(): void
    {
        $this->pesanMasuk(['from_phone' => self::NOMOR]);

        $this->fakeRiwayat([
            [
                'id' => 'msg_a',
                'sessionId' => self::SESI,
                'to' => self::NOMOR,
                'mode' => 'text',
                'text' => 'Balasan terbaru',
                'status' => 'read',
                'timestamp' => '2026-11-15T05:00:00.000Z',
            ],
            [
                'id' => 'msg_b',
                'sessionId' => self::SESI,
                'to' => '628999888777',
                'mode' => 'text',
                'text' => 'Blast saja',
                'status' => 'sent',
                'batchId' => 'batch-9',
                'timestamp' => '2026-11-15T06:00:00.000Z',
            ],
        ], 2);

        $res = $this->getJson('/api/crm/inbox?limit=50', ['X-API-Key' => 'kunci-sah']);

        $res->assertOk();
        $res->assertJsonPath('outboundAvailable', true);
        $res->assertJsonCount(2, 'conversations');

        $nomor = collect($res->json('conversations'))->pluck('phone')->all();
        $this->assertContains('628999888777', $nomor, 'nomor hanya-blast ikut muncul');

        // Yang paling baru (06:00 UTC = 13:00 WIB) harus di urutan pertama.
        $res->assertJsonPath('conversations.0.phone', '628999888777');
        $res->assertJsonPath('conversations.0.lastDirection', 'out');
        $res->assertJsonPath('conversations.0.batchId', 'batch-9');
    }

    public function test_daftar_tetap_tampil_saat_gateway_mati(): void
    {
        $this->pesanMasuk();

        Http::fake(['*' => Http::response([], 503)]);

        $res = $this->getJson('/api/crm/inbox', ['X-API-Key' => 'kunci-sah']);

        $res->assertOk();
        $res->assertJsonPath('outboundAvailable', false);
        $res->assertJsonCount(1, 'conversations');
        $res->assertJsonPath('conversations.0.lastDirection', 'in');
    }

    private function fakeSesi(array $sesi): void
    {
        Http::fake([
            '*/api/v1/sessions*' => Http::response(['sessions' => $sesi]),
            '*' => Http::response(['messages' => [], 'total' => 0]),
        ]);
    }

    public function test_sesi_yang_sudah_dihapus_tidak_muncul_di_daftar(): void
    {
        $this->pesanMasuk(['session_id' => self::SESI]);

        Http::fake([
            '*/api/v1/sessions*' => Http::response(['sessions' => [
                ['id' => self::SESI, 'name' => 'Nomor Bisnis', 'phone' => '628111', 'status' => 'connected'],
            ]]),
            '*/api/v1/messages/all*' => Http::response(['messages' => [
                [
                    'id' => 'msg_lama',
                    'sessionId' => 'sess_sudah_dihapus',
                    'to' => '628999000111',
                    'mode' => 'text',
                    'text' => 'Pesan dari sesi lama',
                    'status' => 'sent',
                    'timestamp' => '2026-11-15T06:00:00.000Z',
                ],
            ], 'total' => 1]),
            '*' => Http::response(['messages' => [], 'total' => 0]),
        ]);

        $res = $this->getJson('/api/crm/inbox', ['X-API-Key' => 'kunci-sah']);

        $res->assertOk();
        $res->assertJsonPath('sessionsKnown', true);
        $res->assertJsonCount(1, 'conversations');
        $res->assertJsonPath('conversations.0.sessionId', self::SESI);
        $res->assertJsonCount(1, 'sessions');
        $res->assertJsonPath('sessions.0.name', 'Nomor Bisnis');
        $res->assertJsonPath('sessions.0.status', 'connected');
    }

    public function test_percakapan_dari_sesi_yang_sudah_dihapus_ditolak(): void
    {
        $this->pesanMasuk(['session_id' => 'sess_sudah_dihapus']);

        $this->fakeSesi([
            ['id' => self::SESI, 'name' => 'Nomor Bisnis', 'phone' => '628111', 'status' => 'connected'],
        ]);

        $res = $this->getJson(
            '/api/crm/inbox/conversation?sessionId=sess_sudah_dihapus&phone='.self::NOMOR,
            ['X-API-Key' => 'kunci-sah'],
        );

        $res->assertStatus(404);
        $res->assertJsonPath('error', 'Sesi ini sudah tidak aktif. Riwayatnya disembunyikan.');
    }

    public function test_pilihan_sesi_membawa_nama_dan_status(): void
    {
        $this->pesanMasuk();

        $this->fakeSesi([
            ['id' => 'sess-b', 'name' => 'Nomor Bisnis', 'phone' => '628111', 'status' => 'connected'],
            ['id' => 'sess-a', 'name' => 'Cadangan', 'phone' => '628222', 'status' => 'disconnected'],
        ]);

        $res = $this->getJson('/api/crm/inbox', ['X-API-Key' => 'kunci-sah']);

        $res->assertOk();
        $res->assertJsonCount(2, 'sessions');
        // Diurutkan menurut nama, bukan id.
        $res->assertJsonPath('sessions.0.name', 'Cadangan');
        $res->assertJsonPath('sessions.0.status', 'disconnected');
        $res->assertJsonPath('sessions.1.name', 'Nomor Bisnis');
    }

    public function test_riwayat_keluar_bisa_dimatikan_lewat_konfigurasi(): void
    {
        config(['services.wa_api.history_enabled' => false]);
        $this->pesanMasuk();

        Http::fake(['*' => Http::response([], 500)]);

        $res = $this->getJson(
            '/api/crm/inbox/conversation?sessionId='.self::SESI.'&phone='.self::NOMOR,
            ['X-API-Key' => 'kunci-sah'],
        );

        $res->assertOk();
        $res->assertJsonPath('degraded', false);
        $res->assertJsonPath('outboundEnabled', false);
        $res->assertJsonCount(1, 'messages');
    }
}
