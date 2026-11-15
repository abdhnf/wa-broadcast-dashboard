<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Challenge OTP untuk alur Reverse OTP / User-Initiated Magic Link.
 *
 * Alurnya terbalik dari OTP biasa: aplikasi TIDAK mengirim kode ke pengguna.
 * Pengguna yang sudah login (atau sedang login) mengirim token dari WhatsApp-nya
 * sendiri, dan wa-api meneruskan pesan itu lewat webhook. Aplikasi lalu
 * mencocokkan token + nomor pengirim.
 *
 * Kenapa token disimpan sebagai HASH, bukan teks:
 *   Tabel ini berisi kredensial yang, bila bocor, bisa dipakai menukar identitas
 *   selama masa berlakunya. Hash membuat isi database tidak cukup untuk
 *   melakukan verifikasi — penyerang harus menebak token aslinya.
 *
 * Kenapa `used_at` bukan penghapusan baris:
 *   Token yang sudah dipakai perlu tetap ada untuk menjawab "apakah token ini
 *   pernah dipakai?" saat ada sengketa. Menghapusnya juga membuat replay tidak
 *   bisa dibedakan dari token yang tidak pernah ada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wa_otp_challenges', function (Blueprint $table) {
            $table->id();

            // Pemilik challenge, memakai id user wa-api (sama seperti tabel CRM
            // lain di dashboard ini). Tidak ada tabel user Laravel untuk CRM.
            $table->string('user_id', 64)->index();

            // Hash token, bukan token. Lihat catatan di kepala berkas.
            $table->string('token_hash', 64)->index();

            // Nomor yang diminta mencocokkan. Diisi saat challenge dibuat,
            // sehingga token hanya sah untuk nomor itu — bukan nomor apa pun.
            $table->string('phone', 20)->index();

            // Tujuan setelah verifikasi berhasil (URL magic link atau penanda
            // aksi). Disimpan agar pemanggil tidak perlu mengirim ulang.
            $table->string('purpose', 60)->default('login');
            $table->string('redirect_to', 500)->nullable();

            // pending -> verified | expired | cancelled
            $table->string('status', 20)->default('pending')->index();

            // Kapan kedaluwarsa. Sengaja pendek (default 5 menit): token yang
            // beredar di chat WhatsApp bisa dibaca siapa pun yang memegang
            // ponsel itu, dan tidak ada gunanya berlaku lama.
            $table->timestamp('expires_at')->index();

            // Diisi saat verifikasi berhasil.
            $table->timestamp('verified_at')->nullable();
            $table->string('verified_by_phone', 20)->nullable();
            $table->string('session_id', 64)->nullable();
            $table->string('wa_message_id', 128)->nullable();

            // Percobaan dengan token salah untuk challenge ini. Dipakai untuk
            // membatasi tebak-tebakan tanpa harus mencatat setiap tebakan.
            $table->unsignedInteger('failed_attempts')->default(0);

            $table->timestamps();

            // Satu token hanya boleh punya satu challenge aktif. Tanpa ini,
            // token acak yang kebetulan sama (atau sengaja didaur ulang
            // pemanggil) bisa memverifikasi challenge yang salah.
            $table->unique(['user_id', 'token_hash'], 'wa_otp_user_token_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_otp_challenges');
    }
};
