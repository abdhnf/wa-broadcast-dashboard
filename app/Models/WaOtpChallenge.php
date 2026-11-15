<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Satu permintaan verifikasi lewat WhatsApp (Reverse OTP / magic link).
 *
 * Token aslinya TIDAK pernah disimpan — hanya hash-nya. Pemanggil yang
 * memegang token (dari pesan WhatsApp pengguna) mencocokkannya lewat
 * `ReverseOtp::verify()`.
 */
class WaOtpChallenge extends Model
{
    protected $table = 'wa_otp_challenges';

    protected $fillable = [
        'user_id',
        'token_hash',
        'phone',
        'purpose',
        'redirect_to',
        'status',
        'expires_at',
        'verified_at',
        'verified_by_phone',
        'session_id',
        'wa_message_id',
        'failed_attempts',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
        'failed_attempts' => 'integer',
    ];

    /** Challenge masih bisa diverifikasi. */
    public function masihBerlaku(): bool
    {
        return $this->status === 'pending' && $this->expires_at->isFuture();
    }
}
