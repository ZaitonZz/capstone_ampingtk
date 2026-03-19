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
use App\Models\Consultation;
use App\Models\DeepfakeScanLog;
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

// ── OTP Verification Routes (Authentication Flow) ─────────────────────────────
Route::get('/verify-otp', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    $isFirstTime = false;
    // Initialize OTP only if not already set
    if (! session('otp_code')) {
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
    // Invalidate the session and regenerate CSRF token to prevent session fixation
    session()->invalidate();
    session()->regenerateToken();

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
            $user = auth()->user();
            $patient = $user?->patientProfile;

            $upcomingAppointment = null;
            $recentConsultations = collect();
            $lastDeepfakeCheckAt = null;
            $isIdentityVerified = false;

            if ($patient) {
                $consultationQuery = Consultation::query()
                    ->where('patient_id', $patient->id)
                    ->with(['doctor:id,name']);

                $upcoming = (clone $consultationQuery)
                    ->whereIn('status', ['scheduled', 'pending'])
                    ->orderBy('scheduled_at')
                    ->first();

                $upcomingAppointment = $upcoming
                    ? [
                        'doctor_name' => 'Dr. '.($upcoming->doctor?->name ?? 'Assigned Doctor'),
                        'date_time' => $upcoming->scheduled_at
                            ? $upcoming->scheduled_at->format('M d, Y g:i A')
                            : 'To be announced',
                        'status' => $upcoming->status === 'scheduled' ? 'confirmed' : 'pending',
                    ]
                    : null;

                $recentConsultations = (clone $consultationQuery)
                    ->latest('scheduled_at')
                    ->limit(3)
                    ->get()
                    ->map(fn (Consultation $consultation) => [
                        'id' => $consultation->id,
                        'doctor_name' => 'Dr. '.($consultation->doctor?->name ?? 'Assigned Doctor'),
                        'date' => $consultation->scheduled_at
                            ? $consultation->scheduled_at->format('M d, Y')
                            : 'No date set',
                        'status' => str($consultation->status)->replace('_', ' ')->title()->value(),
                    ]);

                $lastDeepfakeCheck = DeepfakeScanLog::query()
                    ->whereHas('consultation', fn ($query) => $query->where('patient_id', $patient->id))
                    ->latest('scanned_at')
                    ->first();

                $lastDeepfakeCheckAt = $lastDeepfakeCheck?->scanned_at?->format('M d, Y g:i A');
                $hasFaceEnrollment = $patient->photos()->exists();
                $isIdentityVerified = $hasFaceEnrollment && ($lastDeepfakeCheck?->result !== 'fake');
            }

            return inertia('patient/dashboard', [
                'identity_guard' => [
                    'status' => $isIdentityVerified ? 'Verified' : 'Pending',
                    'description' => $isIdentityVerified
                        ? 'Your identity is verified. This session is protected from impersonation and deepfakes.'
                        : 'Identity verification is in progress. Complete face enrollment to secure your teleconsultation session.',
                    'last_check_at' => $lastDeepfakeCheckAt,
                ],
                'upcoming_appointment' => $upcomingAppointment,
                'recent_consultations' => $recentConsultations,
                'notifications' => [
                    'Your consultation starts in 10 minutes',
                    'Identity verified successfully',
                ],
            ]);
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
    Route::get('patient/lobby', function () {
        $user = auth()->user();
        $patient = $user?->patientProfile;

        if (! $patient) {
            return redirect()
                ->route('patient.consultations.index')
                ->with('error', 'No patient profile found for this account.');
        }

        $consultation = Consultation::query()
            ->where('patient_id', $patient->id)
            ->where('type', 'teleconsultation')
            ->whereIn('status', ['ongoing', 'scheduled', 'pending'])
            ->orderByRaw("case when status = 'ongoing' then 0 when status = 'scheduled' then 1 else 2 end")
            ->orderBy('scheduled_at')
            ->first();

        if (! $consultation) {
            return redirect()
                ->route('patient.consultations.index')
                ->with('error', 'No teleconsultation is available to join yet.');
        }

        return redirect()->route('consultations.lobby.show', $consultation);
    })->name('patient.lobby');

    Route::get('patient/consultation/live', function () {
        return inertia('patient/consultation-live');
    })->name('patient.consultation.live');

    Route::get('patient/profile', function () {
        $user = auth()->user();
        $patient = $user?->patientProfile;

        $latestFacePhoto = $patient?->photos()->latest('updated_at')->first();
        $isFaceEnrollmentCompleted = $latestFacePhoto !== null;

        return inertia('patient/profile', [
            'face_enrollment_status' => $isFaceEnrollmentCompleted ? 'Completed' : 'Not Completed',
            'face_enrollment_last_updated' => $latestFacePhoto?->updated_at?->format('M d, Y g:i A'),
        ]);
    })->name('patient.profile');

    Route::get('patient/medical-records', function () {
        return inertia('patient/medical-records');
    })->name('patient.medical-records');

    Route::get('patient/prescriptions', function () {
        return inertia('patient/prescriptions');
    })->name('patient.prescriptions');

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
