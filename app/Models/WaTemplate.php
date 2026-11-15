<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Template pesan. Satu template mewakili satu jenis kirim wa-api:
 * text, media (media_url), atau location (location).
 */
class WaTemplate extends Model
{
    protected $fillable = [
        'user_id', 'title', 'message_type', 'media_type', 'media_url', 'content', 'location',
    ];

    protected $casts = [
        'location' => 'array',
    ];
}
