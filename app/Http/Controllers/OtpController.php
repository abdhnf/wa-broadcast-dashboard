<?php

namespace App\Http\Controllers;

use App\Models\WaOtpChallenge;
use App\Services\ReverseOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * API Reverse OTP untuk aplikasi pemanggil.
 *
 * Tiga endpoint:
 *   1. POST /api/otp/challenge        buat token, kembalikan token + nomor tujuan
 *   2. GET  /api/otp/challenge/{id}   cek status (polling dari frontend)
 *   3. POST /api/otp/challenge/{id}/cancel
 *
 * Otorisasi memakai API key wa-api, sama seperti CrmController: dashboard ini
 * tidak punya tabel pengguna sendiri. `user_id` selalu berasal dari hasil
 * verifikasi kunci, tidak pernah dari body.
 *
 * Yang SENGAJA tidak ada: endpoint yang menerima token dari browser lalu
 * memverifikasinya. Token datang dari WhatsApp pengguna, diterima wa-api, dan
 * dicocokkan di jalur webhook. Endpoint verifikasi di sisi browser akan
 * mengubah desain ini menjadi OTP biasa — dan membuka jalan bagi siapa pun
 * yang memegang sesi browser untuk memverifikasi nomor yang bukan miliknya.
 */
class OtpController extends Controller
{
    /** Batas pembuatan challenge per user per menit. */
    private const MAKS_CHALLENGE_PER_MENIT = 5;

    /**
     * Buat challenge baru.
     *
     * Body:
     *   phone       wajib, nomor yang akan memverifikasi (08xx / 628xx)
     *   purpose     opsional, default 'login'
     *   redirectTo  opsional, tujuan setelah verifikasi
     */
    public function buat(Request $request)
    {
        $user = $this->userDariApiKey($request);
        if ($user === null) {
            return $this->unauthorized();
        }

        $nomor = ReverseOtp::normalisasiNomor((string) $request->input('phone', ''));
        if ($nomor === null) {
            return response()->json(['error' => 'Nomor tidak valid'], 422);
        }

        // Batas per user dan per nomor.
        //
        // Per-user mencegah satu akun membanjiri layanan; per-nomor mencegah
        // satu nomor target dijadikan sasaran permintaan berulang. Keduanya
        // dihitung terpisah karena sasarannya berbeda.
        $kunciUser = 'otp:buat:user:'.$user['id'];
        $kunciNomor = 'otp:buat:nomor:'.$nomor;

        if (RateLimiter::tooManyAttempts($kunciUser, self::MAKS_CHALLENGE_PER_MENIT)) {
            return response()->json([
                'error' => 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
                'retry_after' => RateLimiter::availableIn($kunciUser),
            ], 429);
        }
        if (RateLimiter::tooManyAttempts($kunciNomor, self::MAKS_CHALLENGE_PER_MENIT)) {
            return response()->json([
                'error' => 'Terlalu banyak permintaan untuk nomor ini. Coba lagi sebentar lagi.',
                'retry_after' => RateLimiter::availableIn($kunciNomor),
            ], 429);
        }

        RateLimiter::hit($kunciUser, 60);
        RateLimiter::hit($kunciNomor, 60);

        $hasil = ReverseOtp::buat(
            userId: $user['id'],
            phone: $nomor,
            purpose: (string) $request->input('purpose', 'login'),
            redirectTo: $request->input('redirectTo'),
        );

        return response()->json([
            'challengeId' => $hasil['challenge']->id,
            'phone' => $nomor,
            'token' => $hasil['token'],
            'expiresIn' => $hasil['expires_in'],
            'expiresAt' => $hasil['challenge']->expires_at->toIso8601String(),
            // Petunjuk siap tampil. Token TIDAK dikirim lewat WhatsApp oleh
            // sistem ini — penggunalah yang mengirimnya. Itu inti alur ini.
            'instruksi' => ReverseOtp::petunjukPengiriman($hasil['token']),
        ], 201);
    }

    /** Status satu challenge, untuk polling dari frontend. */
    public function status(Request $request, int $id)
    {
        $user = $this->userDariApiKey($request);
        if ($user === null) {
            return $this->unauthorized();
        }

        ReverseOtp::rapikanKedaluwarsa($user['id']);

        $challenge = WaOtpChallenge::where('id', $id)
            ->where('user_id', $user['id'])
            ->first();

        if (! $challenge) {
            return response()->json(['error' => 'Challenge tidak ditemukan'], 404);
        }

        // Token hash dan nomor pemverifikasi tidak ikut dikirim: status saja
        // cukup untuk frontend, dan detailnya tidak menambah apa pun selain
        // permukaan kebocoran.
        return response()->json([
            'challengeId' => $challenge->id,
            'status' => $challenge->status,
            'verified' => $challenge->status === 'verified',
            'expiresAt' => $challenge->expires_at->toIso8601String(),
            'verifiedAt' => $challenge->verified_at?->toIso8601String(),
            'redirectTo' => $challenge->status === 'verified' ? $challenge->redirect_to : null,
        ]);
    }

    /** Batalkan challenge yang belum terverifikasi. */
    public function batalkan(Request $request, int $id)
    {
        $user = $this->userDariApiKey($request);
        if ($user === null) {
            return $this->unauthorized();
        }

        $dibatalkan = WaOtpChallenge::where('id', $id)
            ->where('user_id', $user['id'])
            ->where('status', 'pending')
            ->update(['status' => 'cancelled', 'updated_at' => now()]);

        if ($dibatalkan === 0) {
            return response()->json(['error' => 'Challenge tidak ditemukan atau sudah selesai'], 404);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Verifikasi API key ke wa-api.
     *
     * Duplikasi kecil dari CrmController dengan sengaja: menyatukannya berarti
     * mengubah controller CRM yang sudah berjalan, dan keduanya punya alasan
     * berbeda untuk berubah. Bila nanti ada sumber identitas bersama, keduanya
     * bisa dipindahkan sekaligus.
     *
     * `protected`, bukan `private`, supaya tes bisa menggantinya tanpa
     * memanggil wa-api sungguhan.
     */
    protected function userDariApiKey(Request $request): ?array
    {
        $apiKey = trim((string) $request->header('X-API-Key', ''));
        if ($apiKey === '') {
            return null;
        }

        $base = rtrim((string) (config('services.wa_api.base') ?: ''), '/');
        if ($base === '') {
            return null;
        }

        $ch = curl_init($base.'/auth/me');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER => ['X-API-Key: '.$apiKey, 'Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status !== 200 || ! is_string($body)) {
            return null;
        }

        $data = json_decode($body, true);
        if (! is_array($data) || empty($data['id'])) {
            return null;
        }

        return ['id' => (string) $data['id'], 'name' => $data['name'] ?? null];
    }

    private function unauthorized()
    {
        return response()->json([
            'error' => 'API key tidak valid atau wa-api tidak dapat dihubungi.',
        ], 401);
    }
}
