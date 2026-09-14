<?php

use App\Http\Controllers\CrmController;
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
    Route::delete('/groups/{id}', [CrmController::class, 'destroyGroup']);

    Route::get('/contacts', [CrmController::class, 'contacts']);
    Route::post('/contacts', [CrmController::class, 'storeContact']);
    Route::post('/contacts/batch', [CrmController::class, 'batchStoreContacts']);
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
});

// SPA fallback: seluruh rute tak dikenal tetap dirender oleh aplikasi React,
// bukan 404 halaman Laravel.
Route::fallback(function () {
    return Inertia::render('Dashboard');
});
