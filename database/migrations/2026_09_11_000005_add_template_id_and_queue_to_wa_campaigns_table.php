<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom yang dibutuhkan agar kampanye blast bisa bertahan di database.
 *
 * `template_id` menyimpan template mana yang dipakai; tanpa ini kampanye hanya
 * menyimpan judul template sehingga tidak bisa dicocokkan kembali dengan
 * isinya saat blast dijalankan. `queue` menyimpan daftar nomor target beserta
 * status tiap penerima (wa-api tidak punya konsep kampanye, jadi antreannya
 * memang milik dashboard).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wa_campaigns', function (Blueprint $table) {
            if (! Schema::hasColumn('wa_campaigns', 'template_id')) {
                $table->string('template_id', 64)->nullable()->after('group_name');
            }
            if (! Schema::hasColumn('wa_campaigns', 'queue')) {
                $table->json('queue')->nullable()->after('session_used');
            }
        });
    }

    public function down(): void
    {
        Schema::table('wa_campaigns', function (Blueprint $table) {
            if (Schema::hasColumn('wa_campaigns', 'template_id')) {
                $table->dropColumn('template_id');
            }
            if (Schema::hasColumn('wa_campaigns', 'queue')) {
                $table->dropColumn('queue');
            }
        });
    }
};
