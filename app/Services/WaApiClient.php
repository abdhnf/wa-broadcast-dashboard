<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Klien baca-saja ke wa-api untuk riwayat pesan.
 *
 * Dipakai di dua tempat: Inbox (menggabungkan pesan keluar ke tampilan
 * percakapan) dan perintah `inbox:backfill` (menarik riwayat masuk lama).
 *
 * Sengaja baca-saja dan sengaja mengembalikan `null` saat gagal, bukan
 * melempar exception: gateway yang mati tidak boleh membuat inbox ikut mati.
 * Pemanggil yang memutuskan bagaimana menampilkan kekurangan itu.
 *
 * Kunci API tidak pernah diterima dari klien pada jalur HTTP — pemanggil
 * meneruskan kunci yang sudah diverifikasi `CrmController::resolveUser()`.
 * wa-api yang menyaring baris berdasarkan pemilik kunci itu.
 */
class WaApiClient
{
    public function __construct(private readonly string $apiKey) {}

    public static function untuk(string $apiKey): self
    {
        return new self(trim($apiKey));
    }

    /** Riwayat pesan keluar ke satu nomor pada satu sesi. */
    public function riwayatKeluar(string $sessionId, string $phone, int $limit = 200, int $offset = 0): ?array
    {
        return $this->ambil('/messages/'.rawurlencode($sessionId), [
            'phones' => $phone,
            'limit' => $limit,
            'offset' => max(0, $offset),
        ]);
    }

    /**
     * Pesan keluar terakhir lintas sesi untuk satu pengguna.
     *
     * Dipakai untuk menyusun daftar percakapan: satu panggilan untuk semua
     * sesi, bukan satu panggilan per percakapan.
     */
    public function ringkasanKeluar(int $limit = 200): ?array
    {
        return $this->ambil('/messages/all', ['limit' => $limit]);
    }

    /** Satu halaman riwayat pesan masuk (untuk backfill). */
    public function halamanMasuk(int $page, int $limit = 200, ?string $sessionId = null): ?array
    {
        $query = ['page' => max(1, $page), 'limit' => $limit];
        if ($sessionId !== null && $sessionId !== '') {
            $query['sessionId'] = $sessionId;
        }

        return $this->ambil('/inbound', $query);
    }

    /**
     * Daftar sesi yang masih terdaftar di wa-api.
     *
     * Dipakai Inbox untuk dua hal: menyusun pilihan sesi dengan nama dan
     * statusnya, dan menyaring percakapan milik sesi yang sudah dihapus.
     * Riwayat pesan tidak ikut terhapus saat sesi dihapus, jadi tanpa daftar
     * ini nomor-nomor lama tetap muncul di inbox.
     */
    public function sesi(): ?array
    {
        return $this->ambil('/sessions', []);
    }

    private function ambil(string $path, array $query): ?array
    {
        if ($this->apiKey === '' || $this->base() === '') {
            return null;
        }

        try {
            // URL lengkap, bukan `baseUrl()` + path: path yang dimulai dengan
            // "/" mengganti seluruh path basis di Guzzle, sehingga prefix
            // `/api/v1` akan hilang dan permintaan mendarat di tempat yang salah.
            $res = $this->klien()->get($this->base().$path, $query);
        } catch (\Throwable $e) {
            Log::warning('wa-api tidak dapat dihubungi untuk riwayat pesan', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if (! $res->successful()) {
            // 401/403 berarti kunci tidak sah — bukan gangguan sementara, tetapi
            // tetap bukan alasan menjatuhkan halaman yang sedang dibuka.
            Log::warning('wa-api menolak permintaan riwayat pesan', [
                'path' => $path,
                'status' => $res->status(),
            ]);

            return null;
        }

        $data = $res->json();

        return is_array($data) ? $data : null;
    }

    private function base(): string
    {
        return rtrim((string) config('services.wa_api.base', ''), '/');
    }

    private function klien(): PendingRequest
    {
        $timeout = max(1, (int) config('services.wa_api.history_timeout', 3));

        return Http::withHeaders([
            'X-API-Key' => $this->apiKey,
            'Accept' => 'application/json',
        ])
            ->connectTimeout($timeout)
            ->timeout($timeout);
    }
}
