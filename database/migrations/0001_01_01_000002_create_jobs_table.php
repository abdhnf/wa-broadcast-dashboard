<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel antrean: jobs, job_batches, failed_jobs.
 *
 * PENTING — kenapa ada penjaga hasTable() per tabel:
 *
 * Di produksi (wa_blast) tabel `jobs` sudah ada, dibuat migration ad-hoc
 * 2026_09_11_104003_create_jobs_table, tetapi tabel itu TIDAK mencatat
 * dirinya di tabel `migrations`. Akibatnya:
 *   1. Tanpa penjaga, `php artisan migrate` gagal "table jobs already exists".
 *   2. Tabel `job_batches` dan `failed_jobs` tidak pernah terbentuk, karena
 *      migration ad-hoc produksi hanya membuat `jobs`.
 *
 * `QUEUE_CONNECTION=database`, jadi ketiganya memang bagian dari skema yang
 * seharusnya ada. Penjaga membuat migration idempoten: yang sudah ada
 * dilewati, yang belum dibuat.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table) {
                $table->id();
                $table->string('queue')->index();
                $table->longText('payload');
                $table->unsignedSmallInteger('attempts');
                $table->unsignedInteger('reserved_at')->nullable();
                $table->unsignedInteger('available_at');
                $table->unsignedInteger('created_at');
            });
        }

        if (! Schema::hasTable('job_batches')) {
            Schema::create('job_batches', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('name');
                $table->integer('total_jobs');
                $table->integer('pending_jobs');
                $table->integer('failed_jobs');
                $table->longText('failed_job_ids');
                $table->mediumText('options')->nullable();
                $table->integer('cancelled_at')->nullable();
                $table->integer('created_at');
                $table->integer('finished_at')->nullable();
            });
        }

        if (! Schema::hasTable('failed_jobs')) {
            Schema::create('failed_jobs', function (Blueprint $table) {
                $table->id();
                $table->string('uuid')->unique();
                $table->string('connection');
                $table->string('queue');
                $table->longText('payload');
                $table->longText('exception');
                $table->timestamp('failed_at')->useCurrent();

                $table->index(['connection', 'queue', 'failed_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('jobs');
    }
};
