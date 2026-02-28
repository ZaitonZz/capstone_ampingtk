<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientPhotoRequest;
use App\Models\Patient;
use App\Models\PatientPhoto;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class PatientPhotoController extends Controller
{
    public function index(Patient $patient): JsonResponse
    {
        $this->authorize('view', $patient);

        return response()->json(
            $patient->photos()->latest()->get()
        );
    }

    public function store(StorePatientPhotoRequest $request, Patient $patient): JsonResponse
    {
        $this->authorize('update', $patient);

        $isPrimary = (bool) $request->input('is_primary', false);

        // If flagged as primary, unset other primary photos
        if ($isPrimary) {
            $patient->photos()->update(['is_primary' => false]);
        }

        $path = $request->file('photo')->store(
            "patients/{$patient->id}/photos",
            'local'
        );

        $photo = $patient->photos()->create([
            'file_path' => $path,
            'disk' => 'local',
            'is_primary' => $isPrimary,
            'notes' => $request->input('notes'),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json($photo, 201);
    }

    public function destroy(Patient $patient, PatientPhoto $photo): JsonResponse
    {
        $this->authorize('update', $patient);

        abort_if($photo->patient_id !== $patient->id, 404);

        Storage::disk($photo->disk)->delete($photo->file_path);
        $photo->delete();

        return response()->json(['message' => 'Photo removed.']);
    }
}
