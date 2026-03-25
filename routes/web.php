<?php

use App\Http\Controllers\ConsultationConsentController;
use App\Http\Controllers\ConsultationLiveKitController;
use App\Http\Controllers\ConsultationLiveKitWebhookController;
use App\Http\Controllers\ConsultationLobbyController;
use App\Http\Controllers\ConsultationSessionController;
use App\Http\Controllers\OtpVerificationController;
use App\Http\Controllers\PatientConsultationController;
use App\Http\Controllers\PipelineFaceEmbeddingController;
use App\Http\Controllers\PipelineFaceMatchResultController;
use App\Http\Controllers\PipelinePatientFaceController;
use App\Http\Controllers\PipelineRoomsController;
use App\Http\Controllers\PipelineScanResultController;
use Illuminate\Support\Facades\Route;

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

// ── Email OTP Authentication Routes ──────────────────────────────────────────
// Step 1: Start email/password login (validates credentials, sends OTP)
Route::post('/auth/email-login-start', [OtpVerificationController::class, 'startEmailLogin'])
    ->name('auth.email-login-start');

// Step 2: Show OTP verification page (accessible with pending login token)
Route::get('/auth/verify-otp', function () {
    $pendingLoginToken = session('pending_login_token');
    
    if (!$pendingLoginToken) {
        return redirect()->route('login');
    }
    
    // Load pending login state from cache to get expiry info
    $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
    $pendingLoginState = \Illuminate\Support\Facades\Cache::get($cacheKey);
    
    if (!$pendingLoginState) {
        session()->forget('pending_login_token');
        return redirect()->route('login');
    }
    
    $expiresAt = \Carbon\Carbon::parse($pendingLoginState['expires_at']);
    $expiresIn = max(0, now()->diffInSeconds($expiresAt, false));
    
    $resendAvailableAt = \Carbon\Carbon::parse($pendingLoginState['resend_available_at']);
    $resendAvailableIn = max(0, now()->diffInSeconds($resendAvailableAt, false));
    
    // Mask email for display
    $email = $pendingLoginState['user_email'];
    $parts = explode('@', $email);
    $localPart = $parts[0] ?? '';
    $domain = $parts[1] ?? '';
    $maskedEmail = substr($localPart, 0, 1) . str_repeat('*', max(1, strlen($localPart) - 1)) . '@' . $domain;
    
    return inertia('auth/otp-verification', [
        'maskedEmail' => $maskedEmail,
        'expiresIn' => $expiresIn,
        'resendAvailableIn' => $resendAvailableIn,
    ]);
})->name('auth.verify-otp');

// Step 3: Verify OTP code
Route::post('/auth/verify-otp', [OtpVerificationController::class, 'verify'])
    ->name('auth.verify-otp-post');

// Step 4: Resend OTP code
Route::post('/auth/resend-otp', [OtpVerificationController::class, 'resend'])
    ->name('auth.resend-otp');

// Step 5: Cancel OTP verification (optional back flow)
Route::post('/auth/cancel-otp', [OtpVerificationController::class, 'cancel'])
    ->name('auth.cancel-otp');

// ── Legacy OTP Verification Routes (For backward compatibility with require-otp middleware) ───────
// These routes are used after successful OTP verification
Route::get('/verify-otp-legacy', function () {
    if (!auth()->check() || !session('otp_verified')) {
        return redirect()->route('login');
    }
    
    return inertia('auth/otp-verification', [
        'email' => auth()->user()->email,
        'phone' => null,
        'otp_generated_at' => now()->timestamp,
        'is_fresh_otp' => false,
    ]);
})->middleware('auth')->name('verify-otp-legacy');

Route::post('/logout-otp', function () {
    session()->forget(['pending_login_token', 'otp_verified']);
    auth()->logout();
    session()->invalidate();
    session()->regenerateToken();
    return redirect()->route('login');
})->name('logout-otp');

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
Route::middleware(['auth', 'verified', 'require-otp', 'patient'])->group(function () {
    Route::get('patient/consultations', [PatientConsultationController::class, 'index'])
        ->name('patient.consultations.index');
    Route::get('patient/consultations/calendar', [PatientConsultationController::class, 'calendar'])
        ->name('patient.consultations.calendar');
    Route::post('patient/consultations/request', [PatientConsultationController::class, 'store'])
        ->name('patient.consultations.request');
    Route::get('patient/consultations/{consultation}', [PatientConsultationController::class, 'show'])
        ->name('patient.consultations.show');
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
        Route::get('consultation/{roomName}/patient-face', [PipelinePatientFaceController::class, 'show'])->name('patient-face.show');
        Route::post('face-embeddings/{patientPhoto}', [PipelineFaceEmbeddingController::class, 'store'])->name('face-embeddings.store');
        Route::post('face-match-results', [PipelineFaceMatchResultController::class, 'store'])->name('face-match-results.store');
    });

// ── Agent Testing Endpoints ──────────────────────────────────────────
Route::post('api/frame-results', [\App\Http\Controllers\AgentTestController::class, 'storeResult'])->name('agent.store-result');
Route::get('test-agent-verify', [\App\Http\Controllers\AgentTestController::class, 'verifyPage'])->name('agent.verify');

require __DIR__.'/settings.php';
require __DIR__.'/emr.php';
