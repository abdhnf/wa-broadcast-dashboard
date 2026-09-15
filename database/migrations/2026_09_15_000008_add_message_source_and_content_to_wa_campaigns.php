<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambahkan dukungan pesan teks manual langsung pada kampanye blast,
     * sehingga pengguna tidak selalu harus memilih dari master template.
     */
    public function up(): void
    {
        Schema::table('wa_campaigns', function (Blueprint $table) {
            if (! Schema::hasColumn('wa_campaigns', 'message_source')) {
                $table->string('message_source', 20)->default('template')->after('template_title');
            }
            if (! Schema::hasColumn('wa_campaigns', 'message_content')) {
                $table->text('message_content')->nullable()->after('message_source');
            }
        });
    }

    public function down(): void
    {
        Schema::table('wa_campaigns', function (Blueprint $table) {
            if (Schema::hasColumn('wa_campaigns', 'message_content')) {
                $table->dropColumn('message_content');
            }
            if (Schema::hasColumn('wa_campaigns', 'message_source')) {
                $table->dropColumn('message_source');
            }
        });
    }
};
