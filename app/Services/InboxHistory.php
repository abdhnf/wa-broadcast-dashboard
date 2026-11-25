<?php

namespace App\Services;

use App\Models\WaInboundMessage;
use Carbon\CarbonImmutable;

/**
 * Penggabungan riwayat pesan masuk (database dashboard) dengan pesan keluar
 * (wa-api) menjadi satu percakapan dua arah.
 *
 * Semua fungsi di sini murni: tidak ada query, tidak ada HTTP. Itu disengaja —
 * aturan penggabungan adalah bagian yang paling mudah salah (zona waktu,
 * urutan, duplikat), jadi harus bisa diuji tanpa database maupun gateway.
 *
 * Dua sumber memakai format waktu berbeda: wa-api mengirim ISO-8601 UTC
 * (`2026-11-15T04:44:10.599Z`), sedangkan `wa_inbound_messages.received_at`
 * adalah DATETIME tanpa zona yang ditulis dalam zona aplikasi. Membandingkan
 * keduanya apa adanya menghasilkan urutan yang meleset tujuh jam, jadi setiap
 * waktu dinormalkan ke zona aplikasi lebih dulu.
 */
class InboxHistory
{
    /** Batas pesan yang dikirim ke browser per percakapan. */
    public const BATAS_PESAN = 300;

    /** Batas baris pesan keluar yang ditarik untuk menyusun daftar percakapan. */
    public const BATAS_RINGKASAN = 200;

    /** Batas halaman pesan keluar saat membuka satu percakapan (200 baris/halaman). */
    public const BATAS_HALAMAN = 3;

    /** Kunci percakapan: satu nomor pada satu sesi. */
    public static function kunci(string $sessionId, string $phone): string
    {
        return $sessionId.'|'.$phone;
    }

    /**
     * Petakan satu baris pesan masuk menjadi bentuk tampilan.
     *
     * Hanya field yang dibutuhkan layar yang diambil; `raw` tidak pernah ikut
     * karena isinya salinan payload mentah dan tidak dipakai UI.
     */
    public static function petakanMasuk(WaInboundMessage $pesan): array
    {
        return [
            'id' => 'in:'.$pesan->id,
            'direction' => 'in',
            'type' => $pesan->type ?: 'text',
            'text' => $pesan->text,
            'caption' => $pesan->media_caption,
            'mime' => $pesan->media_mime,
            'mediaUrl' => null,
            'fileName' => null,
            'location' => null,
            'at' => self::waktuLokal($pesan->received_at),
            'status' => null,
            'error' => null,
            'batchId' => null,
        ];
    }

    /**
     * Petakan satu baris pesan keluar dari wa-api.
     *
     * Daftar field di sini adalah daftar putih, bukan daftar hitam: payload
     * wa-api memuat `mediaBase64` (bisa beberapa megabyte) dan salinan mentah
     * pesan. Apa pun yang tidak disebut di sini tidak pernah sampai ke browser.
     */
    public static function petakanKeluar(array $baris): array
    {
        $mode = (string) ($baris['mode'] ?? 'text');
        $mediaType = $baris['mediaType'] ?? null;

        $tipe = match (true) {
            $mode === 'location' => 'location',
            $mode === 'media' => is_string($mediaType) && $mediaType !== '' ? $mediaType : 'document',
            default => 'text',
        };

        $lokasi = null;
        if ($mode === 'location') {
            $lokasi = [
                'name' => $baris['name'] ?? null,
                'address' => $baris['address'] ?? null,
                'latitude' => $baris['latitude'] ?? null,
                'longitude' => $baris['longitude'] ?? null,
            ];
        }

        return [
            'id' => 'out:'.(string) ($baris['id'] ?? ''),
            'direction' => 'out',
            'type' => $tipe,
            'text' => $baris['text'] ?? null,
            'caption' => $baris['caption'] ?? null,
            'mime' => $baris['mediaMimeType'] ?? null,
            'mediaUrl' => $baris['mediaUrl'] ?? null,
            'fileName' => $baris['fileName'] ?? null,
            'location' => $lokasi,
            'at' => self::waktuLokal($baris['timestamp'] ?? $baris['created_at'] ?? null),
            'status' => $baris['status'] ?? null,
            'error' => $baris['errorDetail'] ?? null,
            'batchId' => $baris['batchId'] ?? null,
        ];
    }

    /**
     * Gabungkan dua arah menjadi satu urutan lama → baru.
     *
     * Bila waktunya sama, pesan masuk diletakkan lebih dulu: balasan operator
     * selalu datang setelah pesan yang dibalasnya.
     *
     * @return array{messages: array<int, array>, truncated: bool}
     */
    public static function gabung(array $masuk, array $keluar): array
    {
        $semua = array_merge($masuk, $keluar);

        usort($semua, function (array $a, array $b): int {
            return [
                (string) ($a['at'] ?? ''),
                $a['direction'] === 'in' ? 0 : 1,
                (string) ($a['id'] ?? ''),
            ] <=> [
                (string) ($b['at'] ?? ''),
                $b['direction'] === 'in' ? 0 : 1,
                (string) ($b['id'] ?? ''),
            ];
        });

        $terpotong = count($semua) > self::BATAS_PESAN;

        return [
            'messages' => $terpotong ? array_slice($semua, -self::BATAS_PESAN) : $semua,
            'truncated' => $terpotong,
        ];
    }

    /**
     * Ringkas pesan keluar menjadi satu baris per percakapan.
     *
     * wa-api mengembalikan baris terbaru lebih dulu, jadi kemunculan pertama
     * setiap pasangan sesi+nomor sudah merupakan pesan terakhirnya. Tidak perlu
     * mengurutkan ulang di sini.
     *
     * @return array<string, array> kunci => ringkasan
     */
    public static function ringkasKeluar(array $baris): array
    {
        $hasil = [];

        foreach ($baris as $satu) {
            if (! is_array($satu)) {
                continue;
            }

            $sesi = (string) ($satu['sessionId'] ?? '');
            $nomor = (string) ($satu['to'] ?? '');
            if ($sesi === '' || $nomor === '') {
                continue;
            }

            $kunci = self::kunci($sesi, $nomor);
            if (isset($hasil[$kunci])) {
                continue;
            }

            $pesan = self::petakanKeluar($satu);
            $hasil[$kunci] = [
                'sessionId' => $sesi,
                'phone' => $nomor,
                'lastText' => $pesan['text'] ?? $pesan['caption'],
                'lastType' => $pesan['type'],
                'lastAt' => $pesan['at'],
                'lastDirection' => 'out',
                'lastStatus' => $pesan['status'],
                'batchId' => $pesan['batchId'],
            ];
        }

        return $hasil;
    }

    /** Normalkan waktu apa pun ke ISO-8601 zona aplikasi. */
    public static function waktuLokal(mixed $nilai): ?string
    {
        if ($nilai === null || $nilai === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($nilai)
                ->setTimezone((string) config('app.timezone', 'UTC'))
                ->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }
}
