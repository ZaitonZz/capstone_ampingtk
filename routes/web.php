<?php

use App\Http\Controllers\ConsultationController;
use App\Http\Controllers\PatientConsultationController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

// ── Role-based Dashboard routes ───────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    // Patient dashboard
    Route::middleware('role:patient')->prefix('patient')->name('patient.')->group(function () {
        Route::get('dashboard', [App\Http\Controllers\Patient\DashboardController::class, 'index'])
            ->name('dashboard');
    });

    // Doctor dashboard
    Route::middleware('role:doctor')->prefix('doctor')->name('doctor.')->group(function () {
        Route::get('dashboard', [App\Http\Controllers\Doctor\DashboardController::class, 'index'])
            ->name('dashboard');
    });

    // Nurse dashboard
    Route::middleware('role:nurse')->prefix('nurse')->name('nurse.')->group(function () {
        Route::get('dashboard', [App\Http\Controllers\Nurse\DashboardController::class, 'index'])
            ->name('dashboard');
    });

    // Admin dashboard
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', [App\Http\Controllers\Admin\DashboardController::class, 'index'])
            ->name('dashboard');
    });
});

// ── Patient-facing routes ─────────────────────────────────────────────────────
Route::middleware(['auth', 'role:patient'])->prefix('patient')->name('patient.')->group(function () {
    // View patient's own consultations (read-only access)
    Route::get('consultations', [ConsultationController::class, 'index'])
        ->name('consultations.index');
    Route::get('consultations/calendar', [ConsultationController::class, 'calendar'])
        ->name('consultations.calendar');
    Route::get('consultations/{consultation}', [ConsultationController::class, 'show'])
        ->name('consultations.show');

    // Request new consultation appointment
    Route::post('consultations/request', [PatientConsultationController::class, 'store'])
        ->name('consultations.request');
});

require __DIR__.'/settings.php';
require __DIR__.'/emr.php';
