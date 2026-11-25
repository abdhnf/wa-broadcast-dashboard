<?php
// Sesi mana yang biasa dipakai kampanye nyata, dan nomor apa saja yang sering dikirimi.
// Dijalankan dari root wa-broadcast-dashboard: php scripts/session-usage.php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== sesi yang dipakai kampanye ===\n";
foreach (DB::table('wa_campaigns')->select('session_used', DB::raw('COUNT(*) as n'))
            ->groupBy('session_used')->orderByDesc('n')->get() as $r) {
    echo "  " . str_pad((string) ($r->session_used ?? 'NULL'), 24) . " {$r->n} kampanye\n";
}

echo "\n=== kampanye terakhir yang sukses ===\n";
foreach (DB::table('wa_campaigns')->orderByDesc('updated_at')->limit(5)
            ->get(['id', 'name', 'session_used', 'total_recipients', 'sent_count', 'delivered_count', 'status']) as $r) {
    echo sprintf("  id=%-4s %-22s sesi=%-20s total=%-4s sent=%-4s delivered=%-4s %s\n",
        $r->id, substr($r->name, 0, 22), (string) $r->session_used,
        (string) $r->total_recipients, (string) $r->sent_count, (string) $r->delivered_count, $r->status);
}

echo "\n=== 12 kontak yang paling sering jadi penerima kampanye ===\n";
$rows = DB::table('wa_campaigns')->whereNotNull('queue')->orderByDesc('updated_at')->limit(6)->get(['name', 'queue']);
foreach ($rows as $r) {
    $q = json_decode($r->queue ?? '[]', true) ?: [];
    $phones = array_map(fn($i) => $i['phone'] ?? '?', array_slice($q, 0, 6));
    echo "  [{$r->name}] " . implode(', ', $phones) . "\n";
}
