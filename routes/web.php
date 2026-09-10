<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Dashboard');
});

Route::get('/auth/launch', function () {
    return Inertia::render('Dashboard');
});

Route::fallback(function () {
    return Inertia::render('Dashboard');
});
