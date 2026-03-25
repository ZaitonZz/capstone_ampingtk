<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

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
        $photoUrl = null;

        if ($photo !== null) {
            $disk = Storage::disk($photo->disk);
            $photoUrl = method_exists($disk, 'url') ? $disk->url($photo->file_path) : null;
        }

        return response()->json([
            'consultation_id' => $consultation->id,
            'patient_id' => $patient?->id,
            'patient_name' => $patient?->full_name,
            'photo_id' => $photo?->id,
            'photo_url' => $photoUrl,
            'face_embedding' => $photo?->face_embedding,
            'used_fallback_photo' => $usedFallbackPhoto,
        ]);
    }
}
