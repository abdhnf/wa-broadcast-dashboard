<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wa_groups', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 64)->index();
            $table->string('name', 150);
            $table->string('description', 255)->nullable();
            $table->timestamps();

            // Nama grup unik per pemilik: mencegah dua grup kembar dalam satu akun.
            $table->unique(['user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_groups');
    }
};
