<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel inti Laravel: users, password_reset_tokens, sessions.
 *
 * PENTING — kenapa setiap create dibungkus hasTable():
 *
 * Di produksi (wa_blast) ketiga tabel ini sudah ada, dibuat oleh migration
 * ad-hoc 2026_09_11_104001_create_sessions_table dan pembuatan manual tabel
 * users/password_reset_tokens. Tabel `migrations` produksi TIDAK mencatat
 * migration ini, sehingga tanpa penjaga `php artisan migrate` akan gagal
 * dengan "table already exists" — dan pada varian yang memakai
 * dropIfExists di up() berisiko menghapus data.
 *
 * Dengan penjaga, migration ini idempoten: tabel yang sudah ada dilewati,
 * tabel yang belum ada dibuat. Aman dijalankan di produksi maupun di
 * instalasi baru.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (! Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
