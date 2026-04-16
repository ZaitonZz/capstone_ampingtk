<?php

use App\Http\Controllers\ConsultationConsentController;
use App\Http\Controllers\ConsultationLiveKitController;
use App\Http\Controllers\ConsultationLiveKitWebhookController;
use App\Http\Controllers\ConsultationLobbyController;
use App\Http\Controllers\ConsultationSessionController;
use App\Http\Controllers\OtpVerificationController;
use App\Http\Controllers\PatientConsultationController;
use App\Http\Controllers\PipelineDoctorFaceEmbeddingController;
use App\Http\Controllers\PipelineFaceEmbeddingController;
use App\Http\Controllers\PipelineFaceMatchResultController;
use App\Http\Controllers\PipelineMicrocheckController;
use App\Http\Controllers\PipelinePatientFaceController;
use App\Http\Controllers\PipelineRoomsController;
use App\Http\Controllers\PipelineScanResultController;
use App\Models\ActivityLog;
use App\Models\Consultation;
use App\Models\ConsultationFaceVerificationLog;
use App\Models\DeepfakeScanLog;
use App\Models\User;
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
Route::get('/auth/verify-otp', [OtpVerificationController::class, 'show'])
    ->name('auth.verify-otp');

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
    if (! auth()->check() || ! session('otp_verified')) {
        return redirect()->route('login');
    }

    $email = auth()->user()->email;
    $maskedEmail = preg_replace('/(^.).*(@.*$)/', '$1***$2', $email);

    return inertia('auth/otp-verification', [
        'maskedEmail' => $maskedEmail,
        'expiresIn' => 0,
        'resendAvailableIn' => 0,
    ]);
})->middleware('auth')->name('verify-otp-legacy');

Route::post('/logout-otp', function () {
    session()->forget(['pending_login_token', 'otp_verified']);
    auth()->logout();
    session()->invalidate();
    session()->regenerateToken();

    return redirect()->route('login');
})->name('logout-otp');

// ── Authenticated User OTP Verification Initialization ────────────────────────
Route::get('/verify-otp', [OtpVerificationController::class, 'ensureOtp'])
    ->middleware('auth')
    ->name('verify-otp');

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
                'notifications' => array_filter([
                    'Your consultation starts in 10 minutes',
                    $isIdentityVerified ? 'Identity verified successfully' : null,
                ]),
            ]);
        })->name('patient.dashboard');
    });

    // Admin-specific dashboard
    Route::middleware('admin')->group(function () {
        Route::get('admin/dashboard', function () {
            $failedLogins = ActivityLog::query()
                ->where('event_type', 'failed_login')
                ->with('user:id,name,email')
                ->latest('occurred_at')
                ->limit(20)
                ->get()
                ->map(function (ActivityLog $log): array {
                    return [
                        'id' => sprintf('activity-%d', $log->id),
                        'event_type' => 'failed_login',
                        'severity' => $log->severity,
                        'title' => $log->title,
                        'description' => $log->description,
                        'user_name' => $log->user?->name,
                        'user_email' => $log->context['email'] ?? $log->user?->email,
                        'ip_address' => $log->ip_address,
                        'occurred_at' => $log->occurred_at?->toIso8601String(),
                    ];
                });

            $faceFailureGroups = ConsultationFaceVerificationLog::query()
                ->selectRaw('user_id, verified_role, count(*) as failure_count, max(checked_at) as last_failed_at')
                ->whereNotNull('user_id')
                ->where('checked_at', '>=', now()->subDay())
                ->where(function ($query): void {
                    $query->where('matched', false)
                        ->orWhere('flagged', true);
                })
                ->groupBy('user_id', 'verified_role')
                ->havingRaw('count(*) >= 3')
                ->get();

            $deepfakeFailureGroups = DeepfakeScanLog::query()
                ->selectRaw('user_id, verified_role, count(*) as failure_count, max(scanned_at) as last_failed_at')
                ->whereNotNull('user_id')
                ->where('scanned_at', '>=', now()->subDay())
                ->where(function ($query): void {
                    $query->where('result', 'fake')
                        ->orWhere('flagged', true);
                })
                ->groupBy('user_id', 'verified_role')
                ->havingRaw('count(*) >= 3')
                ->get();

            $identityFailureUserIds = $faceFailureGroups
                ->pluck('user_id')
                ->merge($deepfakeFailureGroups->pluck('user_id'))
                ->filter()
                ->unique()
                ->values();

            $identityFailureUsers = User::query()
                ->whereIn('id', $identityFailureUserIds)
                ->get(['id', 'name', 'email'])
                ->keyBy('id');

            $repeatedIdentityFailures = $faceFailureGroups
                ->map(function ($group) use ($identityFailureUsers): array {
                    $user = $identityFailureUsers->get($group->user_id);

                    return [
                        'id' => sprintf('face-%d-%s', $group->user_id, $group->verified_role ?? 'unknown'),
                        'event_type' => 'repeated_identity_check_failure',
                        'severity' => 'high',
                        'title' => 'Repeated identity-check failures detected',
                        'description' => sprintf(
                            '%d failed face-match checks in the last 24 hours.',
                            (int) $group->failure_count
                        ),
                        'user_name' => $user?->name,
                        'user_email' => $user?->email,
                        'ip_address' => null,
                        'occurred_at' => filled($group->last_failed_at)
                            ? \Illuminate\Support\Carbon::parse($group->last_failed_at)->toIso8601String()
                            : null,
                    ];
                })
                ->merge(
                    $deepfakeFailureGroups->map(function ($group) use ($identityFailureUsers): array {
                        $user = $identityFailureUsers->get($group->user_id);

                        return [
                            'id' => sprintf('deepfake-%d-%s', $group->user_id, $group->verified_role ?? 'unknown'),
                            'event_type' => 'repeated_identity_check_failure',
                            'severity' => 'high',
                            'title' => 'Repeated identity-check failures detected',
                            'description' => sprintf(
                                '%d deepfake/flagged scan results in the last 24 hours.',
                                (int) $group->failure_count
                            ),
                            'user_name' => $user?->name,
                            'user_email' => $user?->email,
                            'ip_address' => null,
                            'occurred_at' => filled($group->last_failed_at)
                                ? \Illuminate\Support\Carbon::parse($group->last_failed_at)->toIso8601String()
                                : null,
                        ];
                    })
                );

            $unusualAccessPatterns = ActivityLog::query()
                ->where('event_type', 'unusual_access_pattern')
                ->with('user:id,name,email')
                ->latest('occurred_at')
                ->limit(20)
                ->get()
                ->map(function (ActivityLog $log): array {
                    return [
                        'id' => sprintf('activity-%d', $log->id),
                        'event_type' => 'unusual_access_pattern',
                        'severity' => $log->severity,
                        'title' => $log->title,
                        'description' => $log->description,
                        'user_name' => $log->user?->name,
                        'user_email' => $log->user?->email,
                        'ip_address' => $log->ip_address,
                        'occurred_at' => $log->occurred_at?->toIso8601String(),
                    ];
                });

            $activityLogs = $failedLogins
                ->merge($repeatedIdentityFailures)
                ->merge($unusualAccessPatterns)
                ->sortByDesc('occurred_at')
                ->take(30)
                ->values();

            return inertia('dashboard', [
                'admin_activity_logs' => $activityLogs,
                'admin_activity_summary' => [
                    'failed_logins_24h' => ActivityLog::query()
                        ->where('event_type', 'failed_login')
                        ->where('occurred_at', '>=', now()->subDay())
                        ->count(),
                    'repeated_identity_failures_24h' => $repeatedIdentityFailures->count(),
                    'unusual_access_patterns_24h' => ActivityLog::query()
                        ->where('event_type', 'unusual_access_pattern')
                        ->where('occurred_at', '>=', now()->subDay())
                        ->count(),
                ],
            ]);
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
        Route::post('face-embeddings/doctor/{doctorPhoto}', [PipelineDoctorFaceEmbeddingController::class, 'store'])->name('face-embeddings-doctor.store');
        Route::post('face-embeddings/{patientPhoto}', [PipelineFaceEmbeddingController::class, 'store'])->name('face-embeddings.store');
        Route::post('face-match-results', [PipelineFaceMatchResultController::class, 'store'])->name('face-match-results.store');
        Route::post('microchecks/claim', [PipelineMicrocheckController::class, 'claim'])->name('microchecks.claim');
    });

// ── Agent Testing Endpoints ──────────────────────────────────────────
Route::post('api/frame-results', [\App\Http\Controllers\AgentTestController::class, 'storeResult'])->name('agent.store-result');
Route::get('test-agent-verify', [\App\Http\Controllers\AgentTestController::class, 'verifyPage'])->name('agent.verify');

require __DIR__.'/settings.php';
require __DIR__.'/emr.php';
