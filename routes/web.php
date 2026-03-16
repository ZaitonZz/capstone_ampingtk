<?php

use App\Http\Controllers\OtpVerificationController;
use App\Http\Controllers\PatientConsultationController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::get('/', function () {
    if (auth()->check()) {
        // Redirect based on user role
        return match (auth()->user()->role) {
            'doctor' => redirect()->route('doctor.dashboard'),
            'patient' => redirect()->route('patient.dashboard'),
            'admin' => redirect()->route('admin.dashboard'),
            default => redirect()->route('dashboard'),
        };
    }
    return redirect()->route('login');
})->name('home');

// ── OTP Verification Routes (Authentication Flow) ─────────────────────────────
Route::get('/verify-otp', function () {
    if (!auth()->check()) {
        return redirect()->route('login');
    }
    return inertia('auth/otp-verification', [
        'email' => auth()->user()->email,
        'phone' => null, // For future SMS implementation
        'otp_generated_at' => session('otp_generated_at'), // Pass timestamp for timer persistence
    ]);
})->middleware('auth')->name('verify-otp');

Route::post('/verify-otp', [OtpVerificationController::class, 'verify'])
    ->middleware('auth')
    ->name('verify-otp-post');

Route::post('/resend-otp', [OtpVerificationController::class, 'resend'])
    ->middleware('auth')
    ->name('resend-otp');

Route::post('/clear-otp', function () {
    // Fully logout user and clear all session data
    session()->flush();
    auth()->logout();
    return response()->json(['success' => true, 'message' => 'Logged out successfully']);
})->middleware('auth')->name('clear-otp');

// ── Authenticated Dashboard Routes ────────────────────────────────────────────
Route::middleware(['auth', 'verified', 'require-otp'])->group(function () {
    // Default dashboard (accessible by all authenticated users)
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Doctor-specific dashboard
    Route::middleware('doctor')->group(function () {
        Route::get('doctor/dashboard', function () {
            return inertia('dashboard');
        })->name('doctor.dashboard');
    });

    // Patient-specific dashboard
    Route::middleware('patient')->group(function () {
        Route::get('patient/dashboard', function () {
            return inertia('dashboard');
        })->name('patient.dashboard');
    });

    // Admin-specific dashboard
    Route::middleware('admin')->group(function () {
        Route::get('admin/dashboard', function () {
            return inertia('dashboard');
        })->name('admin.dashboard');
    });
});

// ── Patient-facing routes ─────────────────────────────────────────────────────
Route::middleware(['auth', 'verified', 'patient'])->group(function () {
    Route::get('patient/consultations/calendar', [PatientConsultationController::class, 'calendar'])
        ->name('patient.consultations.calendar');
    Route::post('patient/consultations/request', [PatientConsultationController::class, 'store'])
        ->name('patient.consultations.request');
});

require __DIR__.'/settings.php';
require __DIR__.'/emr.php';
