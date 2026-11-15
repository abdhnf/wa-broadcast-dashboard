<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Pesan masuk dari wa-api.
 *
 * `user_id` di sini adalah id pemilik di wa-api, bukan id user Laravel —
 * dashboard tidak punya tabel pengguna sendiri untuk CRM (gerbangnya ada di
 * wa-api). Kolomnya sengaja diberi nama sama dengan tabel CRM lain supaya
 * penguncian query per tenant konsisten.
 */
class WaInboundMessage extends Model
{
    protected $table = 'wa_inbound_messages';

    protected $fillable = [
        'user_id',
        'session_id',
        'wa_inbound_id',
        'wa_message_id',
        'from_phone',
        'from_jid',
        'push_name',
        'chat_type',
        'type',
        'text',
        'media_mime',
        'media_caption',
        'raw',
        'received_at',
    ];

    protected $casts = [
        'raw' => 'array',
        'received_at' => 'datetime',
    ];
}
