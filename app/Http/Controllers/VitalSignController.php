<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVitalSignRequest;
use App\Models\Consultation;
use Illuminate\Http\JsonResponse;

class VitalSignController extends Controller
{
    public function show(Consultation $consultation): JsonResponse
    {
        $this->authorize('view', $consultation);

        $vitals = $consultation->vitalSigns;

        if (is_null($vitals)) {
            return response()->json(null, 204);
        }

        return response()->json($vitals);
    }

    public function store(StoreVitalSignRequest $request, Consultation $consultation): JsonResponse
    {
        $this->authorize('manage', $consultation);

        // Upsert — one set of vitals per consultation
        $vitals = $consultation->vitalSigns()->updateOrCreate(
            ['consultation_id' => $consultation->id],
            [
                ...$request->validated(),
                'patient_id' => $consultation->patient_id,
                'recorded_by' => $request->user()->id,
            ]
        );

        $status = $vitals->wasRecentlyCreated ? 201 : 200;

        return response()->json($vitals, $status);
    }
}
