<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Riwayat kampanye blast. Statistik dikembalikan oleh wa-api sebagai sumber
 * kebenaran; baris ini menyimpan konteks kampanye milik dashboard.
 */
class WaCampaign extends Model
{
    protected $fillable = [
        'user_id', 'name', 'batch_id', 'group_name', 'target_type', 'target_tags', 'template_id', 'template_title',
        'message_source', 'message_content',
        'total_recipients', 'sent_count', 'delivered_count', 'read_count',
        'failed_count', 'status', 'session_used', 'queue',
    ];

    protected $casts = [
        'total_recipients' => 'integer',
        'sent_count' => 'integer',
        'delivered_count' => 'integer',
        'read_count' => 'integer',
        'failed_count' => 'integer',
        'target_tags' => 'array',
        'queue' => 'array',
    ];
}
