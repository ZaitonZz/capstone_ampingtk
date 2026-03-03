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

        $consultation->load(['patient', 'doctor']);

        $consent = ConsultationConsent::query()
            ->where('consultation_id', $consultation->id)
            ->where('user_id', auth()->id())
            ->first();

        return Inertia::render('consultations/lobby', [
            'consultation' => $consultation,
            'consent' => $consent,
        ]);
    }
}
