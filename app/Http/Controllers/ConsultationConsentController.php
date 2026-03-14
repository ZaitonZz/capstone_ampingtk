<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmConsultationConsentRequest;
use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Services\LiveKitService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ConsultationConsentController extends Controller
{
    public function __construct(private LiveKitService $liveKitService) {}

    public function show(Consultation $consultation): Response
    {
        $this->authorize('view', $consultation);

        $consultation->load(['patient', 'doctor']);

        $consent = ConsultationConsent::query()
            ->where('consultation_id', $consultation->id)
            ->where('user_id', auth()->user()?->id)
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

        if (
            $consultation->type === 'teleconsultation'
            && (bool) config('services.livekit.enabled', false)
        ) {
            try {
                $this->liveKitService->ensureRoomForConsultation($consultation);
            } catch (\Throwable $exception) {
                Log::warning('LiveKit room provisioning failed after consent submission.', [
                    'consultation_id' => $consultation->id,
                    'user_id' => $request->user()->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        $redirectRoute = $consultation->type === 'teleconsultation'
            ? 'consultations.lobby.show'
            : 'consultations.show';

        return redirect()
            ->route($redirectRoute, $consultation)
            ->with('success', 'Consent confirmed.');
    }
}
