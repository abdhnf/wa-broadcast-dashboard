<?php
// Daftar kampanye ber-batch_id NULL + apakah mereka punya pesan di gateway.
// Dijalankan dari root wa-broadcast-dashboard: php scripts/audit-null-batchid.php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== kampanye ber-batch_id NULL ===\n";
$rows = DB::table('wa_campaigns')->whereNull('batch_id')
    ->orderBy('id')->get(['id', 'name', 'status', 'sent_count', 'failed_count', 'total_recipients']);

foreach ($rows as $r) {
    printf("  id=%-4s %-26s status=%-12s sent=%-3s failed=%-3s total=%s\n",
        $r->id, substr($r->name, 0, 26), $r->status,
        $r->sent_count ?? 0, $r->failed_count ?? 0, $r->total_recipients ?? 0);
}

echo "\n=== kampanye yang SUDAH mulai (sent/failed > 0 atau status in_progress/paused/completed) tapi batch_id NULL ===\n";
$risky = DB::table('wa_campaigns')->whereNull('batch_id')
    ->where(function ($q) {
        $q->whereIn('status', ['in_progress', 'paused', 'completed'])
          ->orWhere('sent_count', '>', 0)
          ->orWhere('failed_count', '>', 0);
    })->get(['id', 'name', 'status', 'sent_count', 'failed_count']);

if ($risky->isEmpty()) {
    echo "  TIDAK ADA — semua kampanye NULL belum pernah mulai.\n";
    echo "  -> Aman mengubah fallback batchId.\n";
} else {
    foreach ($risky as $r) {
        printf("  id=%s %s status=%s sent=%s failed=%s\n", $r->id, $r->name, $r->status, $r->sent_count, $r->failed_count);
    }
}

echo "\n=== distribusi status kampanye ===\n";
foreach (DB::table('wa_campaigns')->select('status', DB::raw('COUNT(*) as n'))
            ->groupBy('status')->orderByDesc('n')->get() as $r) {
    echo "  " . str_pad($r->status, 14) . $r->n . "\n";
}
