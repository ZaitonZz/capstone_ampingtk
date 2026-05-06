<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Services\ConsultationIdentityVerificationService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ConsultationLobbyController extends Controller
{
    public function __construct(
        private ConsultationIdentityVerificationService $identityVerificationService,
    ) {}

    public function show(Consultation $consultation): Response|RedirectResponse
    {
        $this->authorize('view', $consultation);

        $currentUser = auth()->user();

        if ($currentUser?->isMedicalStaff()) {
            abort(403, 'Medical staff can schedule consultations but cannot join consultation sessions.');
        }

        if ($consultation->type !== 'teleconsultation') {
            abort(404);
        }

        if ($consultation->requiresConsentForUser($currentUser)) {
            return redirect()->route('consultations.consent.show', $consultation);
        }

        $consultation->load(['patient', 'doctor']);

        $consent = $consultation->consentForUser($currentUser);

        $isConsultationDoctor = $consultation->isConsultationDoctor($currentUser);
        $isVerificationTarget =
            $currentUser !== null
            && $consultation->identity_verification_target_user_id !== null
            && $consultation->identity_verification_target_user_id === $currentUser->id;
        $otpLength = max(4, (int) config('auth_otp.otp.length', 6));

        return Inertia::render('consultations/lobby', [
            'consultation' => $consultation,
            'consent' => $consent,
            'verification' => [
                'is_paused' => $consultation->status === 'paused',
                'is_current_user_target' => $isVerificationTarget,
                'target_role' => $consultation->identity_verification_target_role,
                'otp_length' => $otpLength,
                'started_at' => $consultation->identity_verification_started_at,
                'expires_at' => $consultation->identity_verification_expires_at,
                'attempts' => $consultation->identity_verification_attempts,
                'resend_available_at' => $consultation->identity_verification_resend_available_at,
                'verify_url' => route('consultations.identity-verification.verify', $consultation),
                'resend_url' => route('consultations.identity-verification.resend', $consultation),
                'manual_override_enabled' => $this->identityVerificationService->isManualOverrideEnabled($consultation),
                'override_url' => $isConsultationDoctor && in_array($consultation->status, ['pending', 'scheduled'], true)
                    ? route('consultations.identity-verification.override', $consultation)
                    : null,
            ],
            'livekit' => [
                'enabled' => (bool) config('services.livekit.enabled', false),
                'room_status' => $consultation->livekit_room_status,
                'room_name' => $consultation->livekit_room_name,
                'connect_url' => route('consultations.livekit.connect', $consultation),
                'ws_url' => config('services.livekit.ws_url'),
            ],
        ]);
    }
}
