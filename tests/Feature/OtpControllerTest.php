<?php

namespace Tests\Feature;

use App\Http\Controllers\OtpController;
use App\Models\WaOtpChallenge;
use App\Services\ReverseOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Endpoint API Reverse OTP.
 *
 * Verifikasi API key ke wa-api di-stub: tes ini memeriksa perilaku controller,
 * bukan ketersediaan server wa-api.
 */
class OtpControllerTest extends TestCase
{
    use RefreshDatabase;

    private function purakanApiKey(string $userId = 'usr_otp'): void
    {
        // Ganti `userDariApiKey` di container dengan objek yang mengembalikan
        // identitas tetap, tanpa memanggil curl.
        $this->app->bind(
            OtpController::class,
            fn () => new class extends OtpController
            {
                protected function userDariApiKey(Request $request): ?array
                {
                    return $request->header('X-API-Key') === 'kunci-sah'
                        ? ['id' => 'usr_otp', 'name' => 'Tester']
                        : null;
                }
            },
        );
    }

    public function test_buat_challenge_mengembalikan_token(): void
    {
        $this->purakanApiKey();

        $res = $this->postJson('/api/otp/challenge', [
            'phone' => '08999000111',
        ], ['X-API-Key' => 'kunci-sah']);

        $res->assertStatus(201);
        $res->assertJsonPath('phone', '628999000111', 'nomor dinormalisasi');
        $this->assertArrayHasKey('token', $res->json());
        $this->assertSame(ReverseOtp::PANJANG_TOKEN, strlen($res->json('token')));
        $this->assertArrayHasKey('challengeId', $res->json());
        $this->assertStringContainsString('OTP', $res->json('instruksi'));
    }

    public function test_kunci_salah_ditolak(): void
    {
        $this->purakanApiKey();

        $this->postJson('/api/otp/challenge', ['phone' => '08999000111'], ['X-API-Key' => 'kunci-palsu'])
            ->assertStatus(401);
    }

    public function test_nomor_tidak_valid_ditolak(): void
    {
        $this->purakanApiKey();

        $this->postJson('/api/otp/challenge', ['phone' => '12345'], ['X-API-Key' => 'kunci-sah'])
            ->assertStatus(422);
    }

    public function test_status_mengikuti_verifikasi(): void
    {
        $this->purakanApiKey();

        $buat = $this->postJson('/api/otp/challenge', ['phone' => '08999000111'], ['X-API-Key' => 'kunci-sah']);
        $id = $buat->json('challengeId');

        $this->getJson("/api/otp/challenge/{$id}", ['X-API-Key' => 'kunci-sah'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('verified', false);

        // Verifikasi lewat service, seperti yang dilakukan jalur webhook.
        $token = $buat->json('token');
        $hasil = ReverseOtp::cocokkanPesan('usr_otp', '628999000111', 'OTP '.$token);
        $this->assertNotNull($hasil, 'token seharusnya cocok');

        $this->getJson("/api/otp/challenge/{$id}", ['X-API-Key' => 'kunci-sah'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'verified')
            ->assertJsonPath('verified', true);
    }

    public function test_challenge_user_lain_tidak_bisa_dilihat(): void
    {
        $this->purakanApiKey();

        $buat = $this->postJson('/api/otp/challenge', ['phone' => '08999000111'], ['X-API-Key' => 'kunci-sah']);
        $id = $buat->json('challengeId');

        // Challenge itu milik usr_otp; endpoint lain memakai id user berbeda.
        $lain = WaOtpChallenge::find($id);
        $lain->update(['user_id' => 'usr_lain']);

        $this->getJson("/api/otp/challenge/{$id}", ['X-API-Key' => 'kunci-sah'])
            ->assertStatus(404);
    }

    public function test_batalkan_challenge(): void
    {
        $this->purakanApiKey();

        $buat = $this->postJson('/api/otp/challenge', ['phone' => '08999000111'], ['X-API-Key' => 'kunci-sah']);
        $id = $buat->json('challengeId');

        $this->postJson("/api/otp/challenge/{$id}/cancel", [], ['X-API-Key' => 'kunci-sah'])
            ->assertStatus(200);

        $this->getJson("/api/otp/challenge/{$id}", ['X-API-Key' => 'kunci-sah'])
            ->assertJsonPath('status', 'cancelled');
    }
}
