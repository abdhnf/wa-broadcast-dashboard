<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index untuk query percakapan Inbox.
 *
 * Riwayat satu percakapan difilter `user_id` + `session_id` + `from_phone` lalu
 * diurutkan `received_at`. Index yang ada sekarang (`user_id, received_at` dan
 * `from_phone` terpisah) tidak menutup pola itu, sehingga MySQL harus menyaring
 * sendiri baris milik nomor lain setiap kali percakapan dibuka.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wa_inbound_messages', function (Blueprint $table) {
            $table->index(
                ['user_id', 'session_id', 'from_phone', 'received_at'],
                'wa_inbound_conv_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::table('wa_inbound_messages', function (Blueprint $table) {
            $table->dropIndex('wa_inbound_conv_idx');
        });
    }
};
