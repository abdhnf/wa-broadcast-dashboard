<?php

namespace App\Console\Commands;

use App\Models\WaInboundMessage;
use App\Services\ReverseOtp;
use App\Services\WaApiClient;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Impor riwayat pesan masuk dari wa-api ke database dashboard.
 *
 * Webhook hanya menangkap pesan sejak didaftarkan. Pesan yang datang sebelum
 * itu tetap tersimpan di wa-api, tetapi tidak pernah sampai ke inbox — dan
 * inbox yang hanya berisi dua pesan terakhir bukan riwayat.
 *
 * Perintah ini idempoten: kuncinya `(session_id, wa_message_id)`, sama dengan
 * index unik yang sudah dipakai webhook, jadi menjalankannya dua kali tidak
 * membuat baris ganda. Tidak ada yang dihapus.
 *
 * Teks disamarkan SEBELUM disimpan. wa-api menyimpan teks apa adanya, termasuk
 * token OTP yang masih berlaku; menyalinnya mentah ke tabel yang tidak pernah
 * dibersihkan akan memindahkan masalah ke tempat lain.
 */
class InboxBackfill extends Command
{
    protected $signature = 'inbox:backfill
        {--api-key= : Kunci API wa-api pemilik riwayat (default: WA_API_BACKFILL_KEY)}
        {--user= : Batasi ke satu user_id wa-api}
        {--session= : Batasi ke satu session_id}
        {--dry-run : Hitung saja, tidak menulis apa pun}';

    protected $description = 'Impor riwayat pesan masuk dari wa-api ke database dashboard';

    public function handle(): int
    {
        $apiKey = trim((string) ($this->option('api-key') ?: config('services.wa_api.backfill_key', '')));
        if ($apiKey === '') {
            $this->error('Kunci API wa-api belum ada. Isi WA_API_BACKFILL_KEY atau pakai --api-key=...');

            return self::FAILURE;
        }

        $filterUser = trim((string) $this->option('user'));
        $filterSesi = trim((string) $this->option('session'));
        $dryRun = (bool) $this->option('dry-run');

        $klien = WaApiClient::untuk($apiKey);
        $statistik = ['diperiksa' => 0, 'baru' => 0, 'diperbarui' => 0, 'dilewati' => 0, 'disamarkan' => 0];

        $halaman = 1;
        $totalHalaman = 1;

        do {
            $hasil = $klien->halamanMasuk($halaman, 200, $filterSesi !== '' ? $filterSesi : null);
            if ($hasil === null) {
                $this->error('Gagal membaca halaman '.$halaman.' dari wa-api. Tidak ada perubahan pada halaman ini.');

                return self::FAILURE;
            }

            $baris = is_array($hasil['messages'] ?? null) ? $hasil['messages'] : [];
            $totalHalaman = max(1, (int) ($hasil['totalPages'] ?? 1));

            foreach ($baris as $satu) {
                if (! is_array($satu)) {
                    continue;
                }

                $statistik['diperiksa']++;
                $this->simpanSatu($satu, $filterUser, $dryRun, $statistik);
            }

            $halaman++;
        } while ($halaman <= $totalHalaman);

        $this->newLine();
        $this->table(
            ['Diperiksa', 'Baru', 'Diperbarui', 'Dilewati', 'Disamarkan'],
            [[
                $statistik['diperiksa'],
                $statistik['baru'],
                $statistik['diperbarui'],
                $statistik['dilewati'],
                $statistik['disamarkan'],
            ]],
        );

        if ($dryRun) {
            $this->warn('Mode --dry-run: tidak ada baris yang ditulis.');
        }

        return self::SUCCESS;
    }

    private function simpanSatu(array $satu, string $filterUser, bool $dryRun, array &$statistik): void
    {
        $userId = (string) ($satu['userId'] ?? '');
        if ($userId === '') {
            // Sama seperti jalur webhook: pesan tetap disimpan, tetapi ditandai
            // supaya bisa ditemukan dan dipetakan ulang.
            $userId = 'unmapped';
        }

        if ($filterUser !== '' && $userId !== $filterUser) {
            $statistik['dilewati']++;

            return;
        }

        $sesi = (string) ($satu['sessionId'] ?? '');
        $waMessageId = $satu['waMessageId'] ?? null;
        $waInboundId = $satu['id'] ?? null;

        if ($sesi === '' || ($waMessageId === null && $waInboundId === null)) {
            $statistik['dilewati']++;

            return;
        }

        // Kunci yang sama dengan index unik webhook. Baris tanpa waMessageId
        // (payload lama) memakai id baris wa-api supaya tetap idempoten.
        $kunci = $waMessageId !== null
            ? ['session_id' => $sesi, 'wa_message_id' => $waMessageId]
            : ['session_id' => $sesi, 'wa_inbound_id' => $waInboundId];

        $teksAsli = $satu['text'] ?? null;
        $captionAsli = $satu['mediaCaption'] ?? null;

        $teks = ReverseOtp::samarkanToken($teksAsli, ReverseOtp::tokenDikenal($userId, $teksAsli));
        $caption = ReverseOtp::samarkanToken($captionAsli, ReverseOtp::tokenDikenal($userId, $captionAsli));

        if ($teks !== $teksAsli || $caption !== $captionAsli) {
            $statistik['disamarkan']++;
        }

        $waktu = $satu['receivedAt'] ?? null;
        $receivedAt = $waktu
            ? CarbonImmutable::parse($waktu)->setTimezone((string) config('app.timezone', 'UTC'))
            : CarbonImmutable::now();

        $pesan = WaInboundMessage::firstOrNew($kunci);
        $baru = ! $pesan->exists;

        $pesan->fill([
            'user_id' => $userId,
            'session_id' => $sesi,
            'wa_inbound_id' => $waInboundId,
            'wa_message_id' => $waMessageId,
            'from_phone' => $satu['fromPhone'] ?? null,
            'from_jid' => $satu['fromJid'] ?? null,
            'push_name' => $satu['pushName'] ?? null,
            'chat_type' => $satu['chatType'] ?? 'private',
            'type' => $satu['type'] ?? 'text',
            'text' => $teks,
            'media_mime' => $satu['mediaMime'] ?? null,
            'media_caption' => $caption,
            'received_at' => $receivedAt,
        ]);

        if ($baru) {
            $statistik['baru']++;
        } elseif ($pesan->isDirty()) {
            $statistik['diperbarui']++;
        }

        if (! $dryRun) {
            $pesan->save();
        }
    }
}
