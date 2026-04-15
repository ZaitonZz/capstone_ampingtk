<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use Inertia\Inertia;
use Inertia\Response;

class ConsultationSessionController extends Controller
{
    public function show(Consultation $consultation): Response
    {
        $this->authorize('view', $consultation);

        if ($consultation->type !== 'teleconsultation') {
            abort(404);
        }

        $consultation->load(['patient', 'doctor']);

        $user = auth()->user();
        $isConsultationDoctor = $user !== null && $consultation->doctor_id === $user->id;
        $isConsultationPatient = $user !== null && $consultation->patient()->where('user_id', $user->id)->exists();
        $isAdminAudit = $user?->isAdmin() && ! $isConsultationDoctor && ! $isConsultationPatient;

        $consent = ConsultationConsent::query()
            ->where('consultation_id', $consultation->id)
            ->where('user_id', $user?->id)
            ->first();

        $canEnterSession = $isAdminAudit || $consent?->consent_confirmed === true;

        if (! $canEnterSession) {
            abort(403);
        }

        $isVerificationTarget =
            $user !== null
            && $consultation->identity_verification_target_user_id !== null
            && $consultation->identity_verification_target_user_id === $user->id;

        return Inertia::render('consultations/session', [
            'consultation' => $consultation,
            'verification' => [
                'is_paused' => $consultation->status === 'paused',
                'is_current_user_target' => $isVerificationTarget,
                'target_role' => $consultation->identity_verification_target_role,
                'expires_at' => $consultation->identity_verification_expires_at,
            ],
            'livekit' => [
                'enabled' => (bool) config('services.livekit.enabled', false),
                'ws_url' => config('services.livekit.ws_url'),
                'room_name' => $consultation->livekit_room_name,
                'room_status' => $consultation->livekit_room_status,
            ],
        ]);
    }
}
