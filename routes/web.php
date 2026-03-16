<?php

use App\Http\Controllers\OtpVerificationController;
use App\Http\Controllers\ConsultationConsentController;
use App\Http\Controllers\ConsultationLiveKitController;
use App\Http\Controllers\ConsultationLiveKitWebhookController;
use App\Http\Controllers\ConsultationLobbyController;
use App\Http\Controllers\ConsultationSessionController;
use App\Http\Controllers\PatientConsultationController;
use App\Http\Controllers\PipelineRoomsController;
use App\Http\Controllers\PipelineScanResultController;
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
    
    $isFirstTime = false;
    // Initialize OTP only if not already set
    if (!session('otp_code')) {
        session(['otp_code' => '123456']);
        session(['otp_generated_at' => now()->timestamp]);
        logger('OTP test code initialized: 123456');
        $isFirstTime = true;
    }
    
    return inertia('auth/otp-verification', [
        'email' => auth()->user()->email,
        'phone' => null, // For future SMS implementation
        'otp_generated_at' => session('otp_generated_at'), // Pass timestamp for timer persistence
        'is_fresh_otp' => $isFirstTime, // Signal to frontend that this is a fresh OTP
    ]);
})->middleware('auth')->name('verify-otp');

Route::post('/verify-otp', [OtpVerificationController::class, 'verify'])
    ->middleware('auth')
    ->name('verify-otp-post');

Route::post('/resend-otp', [OtpVerificationController::class, 'resend'])
    ->middleware('auth')
    ->name('resend-otp');

Route::post('/clear-otp', function () {
    // Clear OTP-related session keys specifically
    session()->forget(['otp_code', 'otp_generated_at', 'otp_verified']);
    // Logout user
    auth()->logout();
    // Redirect to login page
    return redirect()->route('login');
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

Route::middleware(['auth'])->group(function () {
    Route::prefix('consultations/{consultation}')->name('consultations.')->group(function () {
        Route::get('consent', [ConsultationConsentController::class, 'show'])->name('consent.show');
        Route::post('consent', [ConsultationConsentController::class, 'store'])->name('consent.store');
        Route::get('lobby', [ConsultationLobbyController::class, 'show'])->name('lobby.show');
        Route::get('session', [ConsultationSessionController::class, 'show'])->name('session.show');
        Route::post('livekit/connect', [ConsultationLiveKitController::class, 'connect'])->name('livekit.connect');
    });
});

// ── Patient-facing routes ─────────────────────────────────────────────────────
Route::middleware(['auth', 'verified', 'patient'])->group(function () {
    Route::get('patient/consultations/calendar', [PatientConsultationController::class, 'calendar'])
        ->name('patient.consultations.calendar');
    Route::post('patient/consultations/request', [PatientConsultationController::class, 'store'])
        ->name('patient.consultations.request');
});

// ── LiveKit server-to-server webhook (CSRF-exempt, signature-verified) ────────
Route::post('livekit/webhook', [ConsultationLiveKitWebhookController::class, 'handle'])
    ->name('livekit.webhook');

// ── Internal pipeline API (CSRF-exempt, HMAC signature-verified) ─────────────
Route::prefix('internal/pipeline')
    ->name('pipeline.')
    ->middleware('pipeline.internal')
    ->group(function () {
        Route::get('rooms', [PipelineRoomsController::class, 'index'])->name('rooms');
        Route::post('scan-results', [PipelineScanResultController::class, 'store'])->name('scan-results.store');
    });

// ── Agent Testing Endpoints ──────────────────────────────────────────
Route::post('api/frame-results', [\App\Http\Controllers\AgentTestController::class, 'storeResult'])->name('agent.store-result');
Route::get('test-agent-verify', [\App\Http\Controllers\AgentTestController::class, 'verifyPage'])->name('agent.verify');

require __DIR__.'/settings.php';
require __DIR__.'/emr.php';
