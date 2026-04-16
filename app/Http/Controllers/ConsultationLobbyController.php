<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use Inertia\Inertia;
use Inertia\Response;

class ConsultationLobbyController extends Controller
{
    public function show(Consultation $consultation): Response
    {
        $this->authorize('view', $consultation);

        if ($consultation->type !== 'teleconsultation') {
            abort(404);
        }

        $consultation->load(['patient', 'doctor']);

        $consent = ConsultationConsent::query()
            ->where('consultation_id', $consultation->id)
            ->where('user_id', auth()->user()?->id)
            ->first();

        $currentUser = auth()->user();
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
