<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wa_contacts', function (Blueprint $table) {
            $table->string('tag', 255)->nullable()->change();
        });

        Schema::table('wa_campaigns', function (Blueprint $table) {
            if (! Schema::hasColumn('wa_campaigns', 'target_type')) {
                $table->string('target_type', 32)->default('group')->after('group_name');
            }
            if (! Schema::hasColumn('wa_campaigns', 'target_tags')) {
                $table->json('target_tags')->nullable()->after('target_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('wa_contacts', function (Blueprint $table) {
            $table->string('tag', 60)->nullable()->change();
        });

        Schema::table('wa_campaigns', function (Blueprint $table) {
            if (Schema::hasColumn('wa_campaigns', 'target_type')) {
                $table->dropColumn('target_type');
            }
            if (Schema::hasColumn('wa_campaigns', 'target_tags')) {
                $table->dropColumn('target_tags');
            }
        });
    }
};
