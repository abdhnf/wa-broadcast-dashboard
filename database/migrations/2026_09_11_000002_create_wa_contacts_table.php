<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wa_contacts', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 64)->index();
            $table->string('name', 150);
            // Disimpan ternormalisasi (628xxx) agar pencarian & de-duplikasi konsisten.
            $table->string('phone', 20);
            // Grup disimpan sebagai nama, bukan foreign key: audiens sering pindah grup
            // tanpa ingin riwayat kampanye lama ikut berubah.
            $table->string('group_name', 150)->nullable();
            $table->string('tag', 60)->nullable();
            // Field bebas (kota, tier, voucher, ...) dipakai sebagai {{variabel}} template.
            $table->json('custom')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'phone']);
            $table->index(['user_id', 'group_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_contacts');
    }
};
