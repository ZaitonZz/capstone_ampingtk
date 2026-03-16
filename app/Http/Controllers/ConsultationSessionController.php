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

        return Inertia::render('consultations/session', [
            'consultation' => $consultation,
            'livekit' => [
                'enabled' => (bool) config('services.livekit.enabled', false),
                'ws_url' => config('services.livekit.ws_url'),
                'room_name' => $consultation->livekit_room_name,
                'room_status' => $consultation->livekit_room_status,
            ],
        ]);
    }
}
