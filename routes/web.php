<?php

use App\Http\Controllers\CrmController;
use App\Http\Controllers\OtpController;
use App\Http\Controllers\WaWebhookController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Dashboard');
});

// Gerbang masuk dari link peluncuran wa-api (?token=...).
// Dirender ke halaman Inertia yang sama; komponen Login membaca token dari query.
Route::get('/auth/launch', function () {
    return Inertia::render('Dashboard');
});

/*
| Data CRM (kontak, grup, template, kampanye).
|
| Otorisasi memakai API key wa-api milik pengguna, dikirim sebagai header
| X-API-Key. CrmController memverifikasinya ke wa-api lalu mengunci query pada
| user_id hasil verifikasi — sehingga satu pengguna tidak dapat membaca atau
| menulis data pengguna lain meski menebak ID baris.
|
| Dashboard diakses tanpa login web Laravel (gerbangnya ada di wa-api), jadi
| grup ini sengaja tidak memakai middleware `auth` bawaan.
*/
Route::prefix('api/crm')->group(function () {
    Route::get('/groups', [CrmController::class, 'groups']);
    Route::post('/groups', [CrmController::class, 'storeGroup']);
    Route::get('/groups/{id}/contacts', [CrmController::class, 'groupContacts']);
    Route::delete('/groups/{id}', [CrmController::class, 'destroyGroup']);

    Route::get('/contacts', [CrmController::class, 'contacts']);
    Route::post('/contacts', [CrmController::class, 'storeContact']);
    Route::post('/contacts/batch', [CrmController::class, 'batchStoreContacts']);
    Route::post('/contacts/bulk-update', [CrmController::class, 'bulkUpdateContacts']);
    Route::post('/contacts/bulk-delete', [CrmController::class, 'bulkDeleteContacts']);
    Route::patch('/contacts/{id}', [CrmController::class, 'updateContact']);
    Route::delete('/contacts/{id}', [CrmController::class, 'destroyContact']);

    Route::get('/templates', [CrmController::class, 'templates']);
    Route::post('/templates', [CrmController::class, 'storeTemplate']);
    Route::patch('/templates/{id}', [CrmController::class, 'updateTemplate']);
    Route::delete('/templates/{id}', [CrmController::class, 'destroyTemplate']);

    Route::get('/campaigns', [CrmController::class, 'campaigns']);
    Route::post('/campaigns', [CrmController::class, 'storeCampaign']);
    Route::patch('/campaigns/{id}', [CrmController::class, 'updateCampaign']);
    Route::delete('/campaigns/{id}', [CrmController::class, 'destroyCampaign']);

    // Inbox: pesan masuk yang dikirim wa-api lewat webhook.
    Route::get('/inbox', [CrmController::class, 'inbox']);
    Route::get('/inbox/conversation', [CrmController::class, 'conversation']);
});

// Reverse OTP / User-Initiated Magic Link.
//
// Otorisasi sama dengan grup CRM: API key wa-api, bukan sesi browser. Token
// TIDAK pernah diterima di sini — token datang lewat WhatsApp pengguna dan
// dicocokkan di jalur webhook (WaWebhookController). Endpoint di bawah hanya
// membuat challenge dan menanyakan hasilnya.
Route::prefix('api/otp')->group(function () {
    Route::post('/challenge', [OtpController::class, 'buat']);
    Route::get('/challenge/{id}', [OtpController::class, 'status']);
    Route::post('/challenge/{id}/cancel', [OtpController::class, 'batalkan']);
});

// Penerima webhook dari wa-api.
//
// Sengaja di luar grup `api/crm` dan tanpa middleware `auth`: pemanggilnya
// server wa-api, bukan browser pengguna. Autentikasinya tanda tangan HMAC
// (lihat WaWebhookController), bukan API key.
//
// `withoutMiddleware` tidak dipakai karena grup ini memang tidak memakai
// middleware apa pun; CSRF juga tidak berlaku untuk rute di `web.php` yang
// dipanggil mesin — Laravel hanya memeriksa CSRF pada metode yang membawa
// sesi browser.
Route::post('/api/wa/webhook', [WaWebhookController::class, 'receive']);

// SPA fallback: seluruh rute tak dikenal tetap dirender oleh aplikasi React,
// bukan 404 halaman Laravel.
Route::fallback(function () {
    return Inertia::render('Dashboard');
});
