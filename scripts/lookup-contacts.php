<?php
// Ambil nama kontak + custom field untuk nomor yang SERING dikirimi,
// supaya uji bulk memakai data personalisasi asli (bukan nomor acak).
// Dijalankan dari root wa-broadcast-dashboard: php scripts/lookup-contacts.php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$targets = ['6285867151226', '6282242168002'];

$cols = array_column(DB::select('SHOW COLUMNS FROM wa_contacts'), 'Field');
echo 'kolom wa_contacts: ' . implode(', ', $cols) . "\n\n";

foreach ($targets as $t) {
    $rows = DB::table('wa_contacts')
        ->where('phone', 'like', '%' . substr($t, -10) . '%')
        ->get();
    if ($rows->isEmpty()) {
        echo "  {$t} -> TIDAK ADA di wa_contacts\n";
        continue;
    }
    foreach ($rows as $r) {
        $arr = (array) $r;
        $name = $arr['name'] ?? ($arr['nama'] ?? '?');
        $custom = $arr['custom_fields'] ?? ($arr['custom'] ?? null);
        echo "  {$t} -> nama='{$name}' custom=" . (is_string($custom) ? $custom : json_encode($custom)) . "\n";
    }
}
