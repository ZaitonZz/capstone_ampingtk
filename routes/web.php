<?php

use App\Http\Controllers\PatientConsultationController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return auth()->check() ? redirect()->route('dashboard') : redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

// ── Patient-facing routes ─────────────────────────────────────────────────────
Route::middleware(['auth', 'patient'])->group(function () {
    Route::get('patient/consultations/calendar', [PatientConsultationController::class, 'calendar'])
        ->name('patient.consultations.calendar');
    Route::post('patient/consultations/request', [PatientConsultationController::class, 'store'])
        ->name('patient.consultations.request');
});

require __DIR__.'/settings.php';
require __DIR__.'/emr.php';
