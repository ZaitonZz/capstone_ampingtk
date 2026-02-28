<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePrescriptionRequest;
use App\Http\Requests\UpdatePrescriptionRequest;
use App\Models\Consultation;
use App\Models\Prescription;
use Illuminate\Http\JsonResponse;

class PrescriptionController extends Controller
{
    public function index(Consultation $consultation): JsonResponse
    {
        return response()->json($consultation->prescriptions()->get());
    }

    public function store(StorePrescriptionRequest $request, Consultation $consultation): JsonResponse
    {
        $prescription = $consultation->prescriptions()->create([
            ...$request->validated(),
            'patient_id' => $consultation->patient_id,
            'doctor_id'  => $consultation->doctor_id,
        ]);

        return response()->json($prescription, 201);
    }

    public function update(UpdatePrescriptionRequest $request, Consultation $consultation, Prescription $prescription): JsonResponse
    {
        abort_if($prescription->consultation_id !== $consultation->id, 404);

        $prescription->update($request->validated());

        return response()->json($prescription->fresh());
    }

    public function destroy(Consultation $consultation, Prescription $prescription): JsonResponse
    {
        abort_if($prescription->consultation_id !== $consultation->id, 404);

        $prescription->delete();

        return response()->json(['message' => 'Prescription removed.']);
    }
}
