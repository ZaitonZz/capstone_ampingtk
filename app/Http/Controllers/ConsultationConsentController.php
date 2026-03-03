<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmConsultationConsentRequest;
use App\Models\Consultation;
use App\Models\ConsultationConsent;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ConsultationConsentController extends Controller
{
    public function show(Consultation $consultation): Response
    {
        $this->authorize('view', $consultation);

        $consultation->load(['patient', 'doctor']);

        $consent = ConsultationConsent::query()
            ->where('consultation_id', $consultation->id)
            ->where('user_id', auth()->id())
            ->first();

        return Inertia::render('consultations/consent', [
            'consultation' => $consultation,
            'consent' => $consent,
        ]);
    }

    public function store(ConfirmConsultationConsentRequest $request, Consultation $consultation): RedirectResponse
    {
        $this->authorize('view', $consultation);

        ConsultationConsent::updateOrCreate(
            [
                'consultation_id' => $consultation->id,
                'user_id' => $request->user()->id,
            ],
            [
                'consent_confirmed' => true,
                'confirmed_at' => now(),
            ],
        );

        return redirect()
            ->route('consultations.show', $consultation)
            ->with('success', 'Consent confirmed.');
    }
}
