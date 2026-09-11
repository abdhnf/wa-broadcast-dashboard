<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wa_templates', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 64)->index();
            $table->string('title', 180);
            // text | media | location — selaras skema /messages/send* di wa-api.
            $table->string('message_type', 20)->default('text');
            $table->string('media_type', 20)->nullable();
            $table->text('media_url')->nullable();
            $table->text('content');
            $table->json('location')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_templates');
    }
};
