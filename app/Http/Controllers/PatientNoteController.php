<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientNoteRequest;
use App\Http\Requests\UpdatePatientNoteRequest;
use App\Models\Consultation;
use Illuminate\Http\JsonResponse;

class PatientNoteController extends Controller
{
    public function show(Consultation $consultation): JsonResponse
    {
        return response()->json($consultation->note);
    }

    public function store(StorePatientNoteRequest $request, Consultation $consultation): JsonResponse
    {
        // Upsert — one SOAP note per consultation
        $note = $consultation->note()->updateOrCreate(
            ['consultation_id' => $consultation->id],
            [
                ...$request->validated(),
                'patient_id' => $consultation->patient_id,
                'doctor_id'  => $consultation->doctor_id,
            ]
        );

        $status = $note->wasRecentlyCreated ? 201 : 200;

        return response()->json($note, $status);
    }

    public function update(UpdatePatientNoteRequest $request, Consultation $consultation): JsonResponse
    {
        abort_unless($consultation->note, 404);

        $consultation->note->update($request->validated());

        return response()->json($consultation->note->fresh());
    }
}
