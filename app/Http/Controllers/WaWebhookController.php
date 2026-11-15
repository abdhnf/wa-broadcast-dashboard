<?php

namespace App\Http\Controllers;

use App\Models\WaCampaign;
use App\Models\WaInboundMessage;
use App\Services\ReverseOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Penerima webhook dari wa-api.
 *
 * Rute ini TIDAK memakai API key: pemanggilnya server wa-api, bukan browser.
 * Autentikasinya tanda tangan HMAC-SHA256 atas `${timestamp}.${body}` dengan
 * `WA_WEBHOOK_SECRET` — nilai yang sama dengan yang ditampilkan wa-api sekali
 * saat webhook didaftarkan.
 *
 * Tiga hal yang dijaga di sini:
 *
 *   1. **Tanda tangan diverifikasi sebelum body diurai.** Body yang tidak sah
 *      tidak boleh menyentuh database sama sekali.
 *   2. **Timestamp diperiksa.** Tanpa jendela waktu, kiriman lama yang
 *      tertangkap bisa diputar ulang kapan saja.
 *   3. **Idempoten.** `delivery_id` unik, jadi kiriman ulang dari retry wa-api
 *      tidak membuat baris ganda.
 */
class WaWebhookController extends Controller
{
    /** Toleransi jam antara server wa-api dan dashboard. */
    private const TOLERANSI_DETIK = 300;

    /**
     * Salinan payload untuk kolom `wa_webhook_events.payload`.
     *
     * Kolom itu menyimpan riwayat dan tidak pernah dibersihkan, jadi isinya
     * harus aman disimpan lama. Token OTP disamarkan; sisa payload dibiarkan
     * utuh karena dibutuhkan untuk menelusuri masalah integrasi.
     *
     * Bentuk token tanpa label tidak bisa dibedakan dari kata biasa delapan
     * huruf ("sekarang", "harganya"), jadi `ReverseOtp::tokenDikenal()`
     * menanyakannya ke database — bukan menebak dari bentuk.
     */
    private function payloadUntukLog(array $payload): string
    {
        if (isset($payload['data']) && is_array($payload['data'])) {
            $userId = (string) ($payload['data']['userId'] ?? '');

            foreach (['text', 'mediaCaption'] as $kunci) {
                if (array_key_exists($kunci, $payload['data'])) {
                    $teks = $payload['data'][$kunci];
                    $payload['data'][$kunci] = ReverseOtp::samarkanToken(
                        $teks,
                        ReverseOtp::tokenDikenal($userId, $teks),
                    );
                }
            }
        }

        return json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public function receive(Request $request)
    {
        $secret = (string) config('services.wa_api.webhook_secret', '');
        if ($secret === '') {
            // Konfigurasi yang belum diisi bukan alasan menerima semua kiriman.
            Log::warning('Webhook wa-api ditolak: WA_WEBHOOK_SECRET belum diisi.');

            return response()->json(['error' => 'Webhook belum dikonfigurasi'], 503);
        }

        $body = $request->getContent();
        $timestamp = (string) $request->header('X-WA-Timestamp', '');
        $signature = (string) $request->header('X-WA-Signature', '');

        if ($timestamp === '' || $signature === '') {
            return response()->json(['error' => 'Header tanda tangan tidak lengkap'], 401);
        }

        // Jendela waktu: menolak kiriman yang terlalu tua atau dari masa depan.
        if (abs(time() - (int) $timestamp) > self::TOLERANSI_DETIK) {
            return response()->json(['error' => 'Timestamp di luar jendela yang diizinkan'], 401);
        }

        $expected = 'sha256='.hash_hmac('sha256', $timestamp.'.'.$body, $secret);
        // `hash_equals` membandingkan dalam waktu konstan, sehingga tanda tangan
        // tidak bisa ditebak lewat perbedaan waktu respons.
        if (! hash_equals($expected, $signature)) {
            return response()->json(['error' => 'Tanda tangan tidak valid'], 401);
        }

        $payload = json_decode($body, true);
        if (! is_array($payload)) {
            return response()->json(['error' => 'Body bukan JSON yang valid'], 400);
        }

        $event = (string) ($payload['event'] ?? '');
        $deliveryId = (string) ($payload['deliveryId'] ?? '');

        if ($deliveryId === '') {
            return response()->json(['error' => 'deliveryId wajib ada'], 400);
        }

        // Idempotensi. Yang dianggap duplikat HANYA kiriman yang sudah selesai
        // diproses.
        //
        // Sebelumnya cukup `exists()`, sehingga event yang gagal (500) lalu
        // dikirim ulang oleh wa-api dengan `deliveryId` yang sama langsung
        // dijawab "duplicate" — dan event itu hilang selamanya. Pada alur OTP
        // akibatnya nyata: pelanggan mengirim token, dashboard gagal sesaat,
        // dan token tidak pernah terverifikasi.
        $existing = DB::table('wa_webhook_events')->where('delivery_id', $deliveryId)->first();

        if ($existing && $existing->status === 'processed') {
            return response()->json(['ok' => true, 'duplicate' => true]);
        }

        if ($existing) {
            // Klaim baris dengan syarat status: dua kiriman yang datang
            // bersamaan tidak boleh sama-sama memproses. Hanya satu yang
            // berhasil mengubah status menjadi `processing`.
            $diklaim = DB::table('wa_webhook_events')
                ->where('id', $existing->id)
                ->whereIn('status', ['failed', 'received'])
                ->update([
                    'status' => 'processing',
                    'error' => null,
                    'updated_at' => now(),
                ]);

            if ($diklaim === 0) {
                // Baris sedang diproses permintaan lain, atau sudah selesai.
                return response()->json(['ok' => true, 'duplicate' => true]);
            }

            $logId = $existing->id;
        } else {
            // `insertOrIgnore` menutup balapan dua kiriman pertama yang tiba
            // bersamaan: yang kalah tidak melempar, lalu mengambil baris milik
            // pemenang dan mencoba mengklaimnya.
            DB::table('wa_webhook_events')->insertOrIgnore([
                'delivery_id' => $deliveryId,
                'event' => $event,
                'status' => 'processing',
                // Salinan untuk riwayat, bukan body mentah: baris ini tidak
                // pernah dihapus, dan token OTP tidak boleh hidup lebih lama
                // dari masa berlakunya. Tanda tangan HMAC sudah diverifikasi
                // di atas, jadi body asli tidak diperlukan lagi.
                'payload' => $this->payloadUntukLog($payload),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $baris = DB::table('wa_webhook_events')->where('delivery_id', $deliveryId)->first();
            $logId = $baris->id;

            if ($baris->status === 'processed') {
                return response()->json(['ok' => true, 'duplicate' => true]);
            }
        }

        try {
            match ($event) {
                'message.received' => $this->handleMessageReceived($payload['data'] ?? []),
                'message.status' => $this->handleMessageStatus($payload['data'] ?? []),
                'session.status' => $this->handleSessionStatus($payload['data'] ?? []),
                default => null,
            };
            DB::table('wa_webhook_events')->where('id', $logId)->update([
                'status' => 'processed',
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Galat dicatat lalu dijawab 500 supaya wa-api mencoba ulang.
            // Menjawab 200 di sini akan membuat event hilang tanpa jejak.
            DB::table('wa_webhook_events')->where('id', $logId)->update([
                'status' => 'failed',
                'error' => mb_substr($e->getMessage(), 0, 1000),
                'updated_at' => now(),
            ]);
            Log::error('Webhook wa-api gagal diproses: '.$e->getMessage(), ['event' => $event]);

            return response()->json(['error' => 'Gagal memproses event'], 500);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Simpan pesan masuk.
     *
     * `user_id` diambil dari payload — wa-api mengirimnya karena hanya dia yang
     * tahu pemilik sesi. Sebelumnya dashboard menebaknya dari kampanye terakhir
     * yang memakai sesi itu, dan hasilnya `unmapped` untuk semua pesan yang
     * datang di luar kampanye (yaitu hampir semuanya), sehingga inbox tidak
     * pernah tampil untuk pemiliknya.
     *
     * Mengembalikan `true` bila pesan ini memverifikasi sebuah challenge.
     * Pemanggil tidak lagi memakainya untuk penyamaran — `tokenDikenal()`
     * menjawab pertanyaan itu lebih tepat — tetapi tetap berguna sebagai
     * penanda di kolom `raw`.
     */
    private function handleMessageReceived(array $data): bool
    {
        $sessionId = (string) ($data['sessionId'] ?? '');

        if ($sessionId === '') {
            throw new \RuntimeException('sessionId tidak ada pada payload message.received');
        }

        $userId = (string) ($data['userId'] ?? '');
        if ($userId === '') {
            // Payload lama (dikirim sebelum wa-api menyertakan userId) tetap
            // disimpan, tetapi ditandai supaya bisa ditemukan dan dipetakan
            // ulang — bukan dibuang, karena pesannya sudah terlanjur diterima.
            $userId = 'unmapped';
        }

        // Reverse OTP dicoba LEBIH DULU, sebelum pesan disimpan.
        //
        // Bukan karena urutan penyimpanan berbahaya, tetapi karena hasilnya
        // menentukan apakah pesan ini perlu ditangani lebih lanjut. Pencocokan
        // hanya membaca token dan nomor; pesan biasa (mayoritas) langsung
        // dilewati tanpa biaya berarti.
        $terverifikasi = $this->cobaVerifikasiOtp($userId, $data);

        // Teks disamarkan SEBELUM disimpan.
        //
        // Verifikasi sudah selesai di atas, jadi nilai aslinya tidak dibutuhkan
        // lagi. Yang tersisa di database hanyalah riwayat: menyimpan token
        // mentah di `wa_inbound_messages.text` berarti token yang belum
        // terpakai (masa berlaku 5 menit) bisa dipakai siapa pun yang bisa
        // membaca tabel itu. Log webhook (`wa_webhook_events.payload`) memakai
        // salinan yang sudah disamarkan dengan alasan yang sama.
        //
        // `tokenDikenal()` memeriksa database alih-alih menebak dari bentuk,
        // karena bentuk telanjang tidak bisa dibedakan dari kata biasa. Pesan
        // yang bukan token tidak menghasilkan query tambahan.
        $teksSimpan = ReverseOtp::samarkanToken(
            $data['text'] ?? null,
            ReverseOtp::tokenDikenal($userId, $data['text'] ?? null),
        );
        $captionSimpan = ReverseOtp::samarkanToken(
            $data['mediaCaption'] ?? null,
            ReverseOtp::tokenDikenal($userId, $data['mediaCaption'] ?? null),
        );

        WaInboundMessage::updateOrCreate(
            [
                'session_id' => $sessionId,
                'wa_message_id' => $data['waMessageId'] ?? null,
            ],
            [
                'user_id' => $userId,
                'wa_inbound_id' => $data['id'] ?? null,
                'from_phone' => $data['from'] ?? null,
                'from_jid' => $data['fromJid'] ?? null,
                'push_name' => $data['pushName'] ?? null,
                'chat_type' => $data['chatType'] ?? 'private',
                'type' => $data['type'] ?? 'text',
                'text' => $teksSimpan,
                'media_mime' => $data['mediaMime'] ?? null,
                'media_caption' => $captionSimpan,
                'raw' => array_merge($data, [
                    'text' => $teksSimpan,
                    'mediaCaption' => $captionSimpan,
                    'otp_verified' => $terverifikasi,
                ]),
                'received_at' => $data['receivedAt'] ?? now(),
            ],
        );

        return $terverifikasi;
    }

    /**
     * Cocokkan pesan dengan challenge OTP yang menunggu.
     *
     * Kegagalan di sini TIDAK boleh menggagalkan penyimpanan pesan: pesan tetap
     * berharga untuk inbox, dan melempar akan membuat wa-api mencoba ulang
     * seluruh event hanya karena pencocokan OTP bermasalah.
     */
    private function cobaVerifikasiOtp(string $userId, array $data): bool
    {
        try {
            $hasil = ReverseOtp::cocokkanPesan(
                userId: $userId,
                fromPhone: $data['from'] ?? null,
                text: $data['text'] ?? null,
                mediaCaption: $data['mediaCaption'] ?? null,
                waMessageId: $data['waMessageId'] ?? null,
                sessionId: $data['sessionId'] ?? null,
            );

            if ($hasil === null) {
                return false;
            }

            Log::info('Reverse OTP terverifikasi', [
                'challenge_id' => $hasil['challenge']->id,
                'user_id' => $userId,
                'phone' => $hasil['challenge']->verified_by_phone,
                'purpose' => $hasil['challenge']->purpose,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Gagal mencocokkan Reverse OTP: '.$e->getMessage(), [
                'user_id' => $userId,
            ]);

            return false;
        }
    }

    /**
     * Perbarui hitungan kampanye dari perubahan status pesan.
     *
     * Dihitung dari status yang dilaporkan, bukan dihitung ulang dari tabel
     * pesan: dashboard tidak menyimpan setiap pesan keluar, hanya agregatnya.
     */
    private function handleMessageStatus(array $data): void
    {
        $batchId = $data['batchId'] ?? null;
        if (! $batchId) {
            return;
        }

        $campaign = WaCampaign::where('batch_id', $batchId)->first();
        if (! $campaign) {
            return;
        }

        $kolom = match ($data['status'] ?? '') {
            'sent' => 'sent_count',
            'delivered' => 'delivered_count',
            'read' => 'read_count',
            'failed', 'invalid_number', 'not_registered' => 'failed_count',
            default => null,
        };

        if ($kolom === null) {
            return;
        }

        $messageId = (string) ($data['messageId'] ?? '');
        if ($messageId === '') {
            return;
        }

        // Naikkan hanya bila status ini belum pernah dihitung untuk pesan itu.
        // Kunci unik (message_id, status) yang menjaganya, bukan pemeriksaan
        // teks pada payload — pemeriksaan teks bisa salah cocok dan tidak
        // atomik terhadap dua kiriman yang datang bersamaan.
        $baru = DB::table('wa_status_counted')->insertOrIgnore([
            'message_id' => $messageId,
            'status' => (string) $data['status'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($baru === 0) {
            return;
        }

        WaCampaign::where('id', $campaign->id)->increment($kolom);
    }

    /**
     * Catat perubahan status koneksi sesi.
     *
     * Disimpan sebagai baris log, bukan kolom pada tabel sesi: dashboard tidak
     * memiliki tabel sesi sendiri (itu milik wa-api), dan yang dibutuhkan di
     * sini hanyalah jejak kapan nomor terputus atau tersambung kembali.
     */
    private function handleSessionStatus(array $data): void
    {
        $sessionId = (string) ($data['sessionId'] ?? '');
        if ($sessionId === '') {
            return;
        }

        Log::info('Status sesi wa-api berubah', [
            'session_id' => $sessionId,
            'status' => $data['status'] ?? null,
            'reason' => $data['reason'] ?? null,
            'occurred_at' => $data['occurredAt'] ?? null,
        ]);
    }
}
