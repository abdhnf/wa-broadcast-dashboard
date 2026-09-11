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
    ],

];
