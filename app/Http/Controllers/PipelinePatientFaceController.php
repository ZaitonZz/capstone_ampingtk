<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use Illuminate\Http\JsonResponse;

class PipelinePatientFaceController extends Controller
{
    public function show(string $roomName): JsonResponse
    {
        $consultation = Consultation::query()
            ->where('livekit_room_name', $roomName)
            ->with(['patient.primaryPhoto'])
            ->firstOrFail();

        $patient = $consultation->patient;
        $photo = $patient?->primaryPhoto ?? $patient?->photos()->latest('id')->first();
        $usedFallbackPhoto = $photo !== null && ($patient?->primaryPhoto?->id !== $photo->id);
        $photoPath = null;

        if ($photo !== null && $photo->disk === 'public') {
            $photoPath = "/storage/{$photo->file_path}";
        }

        return response()->json([
            'consultation_id' => $consultation->id,
            'patient_id' => $patient?->id,
            'patient_name' => $patient?->full_name,
            'photo_id' => $photo?->id,
            'photo_path' => $photoPath,
            'face_embedding' => $photo?->face_embedding,
            'used_fallback_photo' => $usedFallbackPhoto,
        ]);
    }
}
