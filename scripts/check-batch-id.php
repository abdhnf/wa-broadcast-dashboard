<?php
// Periksa apakah kolom batch_id pada wa_campaigns benar-benar terisi.
// Dijalankan dari root wa-broadcast-dashboard: php scripts/check-batch-id.php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$cols = array_column(DB::select('SHOW COLUMNS FROM wa_campaigns'), 'Field');
echo 'kolom wa_campaigns: ' . implode(', ', $cols) . "\n\n";

$rows = DB::table('wa_campaigns')->orderByDesc('id')->limit(10)->get(['id', 'name', 'status', 'batch_id']);
foreach ($rows as $r) {
    printf(
        "  id=%-4s batch_id=%-24s %-14s %s\n",
        $r->id,
        $r->batch_id === null ? 'NULL' : $r->batch_id,
        $r->status,
        substr($r->name, 0, 26)
    );
}

$nullCount = DB::table('wa_campaigns')->whereNull('batch_id')->count();
$total = DB::table('wa_campaigns')->count();
echo "\nbatch_id NULL: {$nullCount} dari {$total} kampanye\n";
