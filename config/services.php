<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | WA API Gateway
    |--------------------------------------------------------------------------
    |
    | Alamat wa-api yang dipakai SERVER dashboard untuk memverifikasi API key
    | pemilik data CRM (lihat CrmController). Diisi alamat internal, karena
    | request ini berangkat dari mesin dashboard sendiri — berbeda dengan
    | VITE_WA_API_BASE yang dipakai browser pengguna.
    |
    */

    'wa_api' => [
        'base' => env('WA_API_BASE', 'http://127.0.0.1:3100/api/v1'),

        /*
         * Secret untuk memverifikasi tanda tangan webhook dari wa-api.
         *
         * Nilainya ditampilkan wa-api SEKALI saat webhook didaftarkan (POST
         * /webhooks). Simpan di sini. Selama kosong, endpoint penerima menolak
         * semua kiriman dengan 503 — lebih baik gagal terang-terangan daripada
         * menerima kiriman yang tidak bisa diverifikasi.
         */
        'webhook_secret' => env('WA_WEBHOOK_SECRET', ''),

        /*
         * Riwayat pesan keluar di Inbox.
         *
         * Pesan keluar tidak pernah disimpan dashboard (browser mengirim
         * langsung ke wa-api), jadi halaman Inbox membacanya dari wa-api saat
         * percakapan dibuka. Timeout dibuat pendek: gateway yang lambat tidak
         * boleh menahan halaman yang sebenarnya masih punya pesan masuk untuk
         * ditampilkan.
         *
         * Set `WA_API_HISTORY_ENABLED=false` untuk kembali ke perilaku lama
         * tanpa deploy ulang.
         */
        'history_enabled' => filter_var(env('WA_API_HISTORY_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
        'history_timeout' => (int) env('WA_API_HISTORY_TIMEOUT', 3),

        /*
         * Kunci API untuk `php artisan inbox:backfill`.
         *
         * Perintah CLI tidak punya request yang membawa header, jadi kuncinya
         * dibaca dari sini atau dari opsi `--api-key=`. Kunci ini hanya dipakai
         * untuk membaca riwayat milik pemiliknya sendiri — bukan kunci admin.
         */
        'backfill_key' => env('WA_API_BACKFILL_KEY', ''),
    ],

];
