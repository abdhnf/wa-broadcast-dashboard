<?php

namespace Tests\Unit;

use App\Models\WaInboundMessage;
use App\Services\InboxHistory;
use Tests\TestCase;

/**
 * Aturan penggabungan riwayat dua arah.
 *
 * Fungsi-fungsi ini murni (tanpa database dan tanpa HTTP) justru karena di
 * sinilah kesalahan paling mahal terjadi: zona waktu, urutan, dan kebocoran
 * field payload.
 */
class InboxHistoryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['app.timezone' => 'Asia/Jakarta']);
    }

    public function test_waktu_utc_dinormalkan_ke_zona_aplikasi(): void
    {
        $this->assertSame(
            '2026-11-15T11:44:10+07:00',
            InboxHistory::waktuLokal('2026-11-15T04:44:10.599Z'),
        );
    }

    public function test_waktu_kosong_tetap_kosong(): void
    {
        $this->assertNull(InboxHistory::waktuLokal(null));
        $this->assertNull(InboxHistory::waktuLokal(''));
    }

    public function test_pesan_keluar_dipetakan_tanpa_media_base64(): void
    {
        $hasil = InboxHistory::petakanKeluar([
            'id' => 'msg_1',
            'sessionId' => 'sess-1',
            'to' => '628111',
            'mode' => 'media',
            'mediaType' => 'image',
            'mediaBase64' => 'AAAABBBBCCCC',
            'mediaUrl' => 'https://contoh.test/gambar.jpg',
            'mediaMimeType' => 'image/jpeg',
            'caption' => 'Promo akhir tahun',
            'status' => 'delivered',
            'timestamp' => '2026-11-15T04:44:10.599Z',
            'batchId' => 'batch-1',
        ]);

        $this->assertSame('out', $hasil['direction']);
        $this->assertSame('image', $hasil['type']);
        $this->assertSame('delivered', $hasil['status']);
        $this->assertSame('2026-11-15T11:44:10+07:00', $hasil['at']);
        $this->assertArrayNotHasKey('mediaBase64', $hasil);
        $this->assertArrayNotHasKey('payload', $hasil);
    }

    public function test_pesan_lokasi_membawa_koordinat(): void
    {
        $hasil = InboxHistory::petakanKeluar([
            'id' => 'msg_2',
            'sessionId' => 'sess-1',
            'to' => '628111',
            'mode' => 'location',
            'latitude' => -6.225588,
            'longitude' => 106.808591,
            'name' => 'Kantor Pusat',
            'address' => 'Jl. Sudirman',
            'status' => 'sent',
            'timestamp' => '2026-11-15T04:44:10.599Z',
        ]);

        $this->assertSame('location', $hasil['type']);
        $this->assertSame(-6.225588, $hasil['location']['latitude']);
        $this->assertSame('Kantor Pusat', $hasil['location']['name']);
    }

    public function test_pesan_masuk_dipetakan_dengan_direction_in(): void
    {
        $pesan = new WaInboundMessage([
            'type' => 'text',
            'text' => 'Halo',
            'received_at' => '2026-11-15 10:00:00',
        ]);
        $pesan->id = 9;

        $hasil = InboxHistory::petakanMasuk($pesan);

        $this->assertSame('in', $hasil['direction']);
        $this->assertSame('in:9', $hasil['id']);
        $this->assertSame('2026-11-15T10:00:00+07:00', $hasil['at']);
        $this->assertNull($hasil['status']);
    }

    public function test_pesan_bertimestamp_sama_menaruh_masuk_lebih_dulu(): void
    {
        $waktu = '2026-11-15T11:00:00+07:00';
        $hasil = InboxHistory::gabung(
            [['id' => 'in:1', 'direction' => 'in', 'at' => $waktu]],
            [['id' => 'out:a', 'direction' => 'out', 'at' => $waktu]],
        );

        $this->assertSame(['in:1', 'out:a'], array_column($hasil['messages'], 'id'));
        $this->assertFalse($hasil['truncated']);
    }

    public function test_gabungan_diurutkan_dari_lama_ke_baru(): void
    {
        $hasil = InboxHistory::gabung(
            [
                ['id' => 'in:1', 'direction' => 'in', 'at' => '2026-11-15T10:00:00+07:00'],
                ['id' => 'in:2', 'direction' => 'in', 'at' => '2026-11-15T12:00:00+07:00'],
            ],
            [
                ['id' => 'out:a', 'direction' => 'out', 'at' => '2026-11-15T11:00:00+07:00'],
            ],
        );

        $this->assertSame(
            ['in:1', 'out:a', 'in:2'],
            array_column($hasil['messages'], 'id'),
        );
    }

    public function test_pesan_berlebih_dipotong_dari_yang_tertua(): void
    {
        $masuk = [];
        for ($i = 1; $i <= InboxHistory::BATAS_PESAN + 5; $i++) {
            $masuk[] = [
                'id' => 'in:'.$i,
                'direction' => 'in',
                'at' => sprintf('2026-11-15T10:%02d:%02d+07:00', intdiv($i, 60) % 60, $i % 60),
            ];
        }

        $hasil = InboxHistory::gabung($masuk, []);

        $this->assertTrue($hasil['truncated']);
        $this->assertCount(InboxHistory::BATAS_PESAN, $hasil['messages']);
        $this->assertSame('in:'.(InboxHistory::BATAS_PESAN + 5), end($hasil['messages'])['id']);
        $this->assertSame('in:6', $hasil['messages'][0]['id'], 'lima baris tertua terpotong');
    }

    public function test_ringkasan_keluar_mengambil_pesan_terakhir_per_nomor(): void
    {
        $ringkas = InboxHistory::ringkasKeluar([
            [
                'id' => 'msg_baru',
                'sessionId' => 'sess-1',
                'to' => '628111',
                'mode' => 'text',
                'text' => 'Terbaru',
                'status' => 'read',
                'timestamp' => '2026-11-15T05:00:00.000Z',
            ],
            [
                'id' => 'msg_lama',
                'sessionId' => 'sess-1',
                'to' => '628111',
                'mode' => 'text',
                'text' => 'Lebih lama',
                'status' => 'sent',
                'timestamp' => '2026-11-15T04:00:00.000Z',
            ],
            [
                'id' => 'msg_lain',
                'sessionId' => 'sess-2',
                'to' => '628222',
                'mode' => 'text',
                'text' => 'Nomor lain',
                'status' => 'delivered',
                'timestamp' => '2026-11-15T03:00:00.000Z',
            ],
        ]);

        $this->assertCount(2, $ringkas);
        $this->assertSame('Terbaru', $ringkas['sess-1|628111']['lastText']);
        $this->assertSame('out', $ringkas['sess-1|628111']['lastDirection']);
        $this->assertSame('read', $ringkas['sess-1|628111']['lastStatus']);
    }

    public function test_ringkasan_melewati_baris_tanpa_sesi_atau_nomor(): void
    {
        $ringkas = InboxHistory::ringkasKeluar([
            ['id' => 'msg_1', 'sessionId' => '', 'to' => '628111'],
            ['id' => 'msg_2', 'sessionId' => 'sess-1', 'to' => ''],
            'bukan-array',
        ]);

        $this->assertSame([], $ringkas);
    }
}
