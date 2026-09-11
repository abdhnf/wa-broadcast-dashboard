<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        /*
         * Data CRM diautentikasi dengan header X-API-Key (milik wa-api), bukan
         * cookie sesi. Token CSRF tidak menambah perlindungan apa pun di situ
         * sementara Laravel tetap menolak POST/PATCH tanpa token — jadi prefix
         * ini dikecualikan dari verifikasi CSRF.
         *
         * Dampaknya nihil: penyerang lintas situs tidak dapat membaca API key
         * dari localStorage, sehingga tetap tidak bisa memalsukan request yang
         * lolos verifikasi di CrmController.
         */
        $middleware->validateCsrfTokens(except: [
            'api/crm/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
