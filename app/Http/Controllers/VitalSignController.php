<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVitalSignRequest;
use App\Models\Consultation;
use Illuminate\Http\JsonResponse;

class VitalSignController extends Controller
{
    public function show(Consultation $consultation): JsonResponse
    {
        return response()->json($consultation->vitalSigns);
    }

    public function store(StoreVitalSignRequest $request, Consultation $consultation): JsonResponse
    {
        // Upsert — one set of vitals per consultation
        $vitals = $consultation->vitalSigns()->updateOrCreate(
            ['consultation_id' => $consultation->id],
            [
                ...$request->validated(),
                'patient_id'  => $consultation->patient_id,
                'recorded_by' => $request->user()->id,
            ]
        );

        $status = $vitals->wasRecentlyCreated ? 201 : 200;

        return response()->json($vitals, $status);
    }
}
