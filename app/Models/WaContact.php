<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Kontak audiens CRM. Nomor disimpan ternormalisasi tanpa simbol (628xxx)
 * agar cocok langsung dengan skema wa-api.
 */
class WaContact extends Model
{
    protected $fillable = ['user_id', 'name', 'phone', 'group_name', 'tag', 'custom'];

    protected $casts = [
        'custom' => 'array',
    ];
}
