<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pesan masuk dari wa-api.
 *
 * Dashboard sebelumnya hanya mengirim: seluruh data CRM di sini adalah audiens
 * dan kampanye, tidak ada tempat untuk menyimpan balasan pelanggan. Tanpa tabel
 * ini, webhook `message.received` tidak punya tujuan penyimpanan dan inbox
 * tidak bisa dibangun.
 *
 * `wa_message_id` unik per sesi, sama seperti di sisi wa-api. Baileys mengirim
 * ulang pesan setelah reconnect, dan tanpa kunci unik ini inbox akan berisi
 * duplikat — yang kemudian memicu balasan ganda.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wa_inbound_messages', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 64)->index();
            $table->string('session_id', 64)->index();
            // ID baris di wa-api, dipakai untuk menautkan tanpa menebak.
            $table->string('wa_inbound_id', 64)->nullable();
            $table->string('wa_message_id', 128)->nullable();
            $table->string('from_phone', 20)->nullable()->index();
            $table->string('from_jid', 190)->nullable();
            $table->string('push_name', 150)->nullable();
            $table->string('chat_type', 20)->default('private');
            $table->string('type', 20)->default('text');
            $table->text('text')->nullable();
            $table->string('media_mime', 120)->nullable();
            $table->text('media_caption')->nullable();
            // Nilai mentah dari event, untuk penelusuran saat integrasi bermasalah.
            $table->json('raw')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            // Kunci duplikasi dari sisi penerima: kiriman ulang dengan
            // wa_message_id yang sama tidak membuat baris baru.
            $table->unique(['session_id', 'wa_message_id'], 'wa_inbound_session_msg_unique');
            $table->index(['user_id', 'received_at']);
        });

        // Log setiap kiriman webhook yang diterima. Tanpa ini, "kenapa inbox
        // tidak terisi" hanya bisa dijawab dengan menebak.
        Schema::create('wa_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('delivery_id', 64)->unique();
            $table->string('event', 60)->index();
            $table->string('status', 20)->default('received');
            $table->text('error')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
        });

        // Penanda status yang sudah dihitung ke kampanye.
        //
        // Kunci unik (message_id, status) membuat penghitungan idempoten tanpa
        // perlu membaca ulang payload. Tanpa tabel ini, `sent` yang dilaporkan
        // ulang akan menambah hitungan berkali-kali.
        Schema::create('wa_status_counted', function (Blueprint $table) {
            $table->id();
            $table->string('message_id', 64);
            $table->string('status', 20);
            $table->timestamps();

            $table->unique(['message_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_inbound_messages');
        Schema::dropIfExists('wa_webhook_events');
        Schema::dropIfExists('wa_status_counted');
    }
};
