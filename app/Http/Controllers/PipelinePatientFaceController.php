<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use Illuminate\Http\JsonResponse;

class PipelinePatientFaceController extends Controller
{
    public function show(string $roomName): JsonResponse
    {
        $role = request()->query('role', 'patient');

        $consultation = Consultation::query()
            ->where('livekit_room_name', $roomName)
            ->firstOrFail();

        if ($role === 'doctor') {
            return $this->getDoctorFace($consultation);
        }

        return $this->getPatientFace($consultation);
    }

    private function getPatientFace(Consultation $consultation): JsonResponse
    {
        $consultation->load(['patient.primaryPhoto']);
        $patient = $consultation->patient;
        $photo = $patient?->primaryPhoto ?? $patient?->photos()->latest('id')->first();
        $usedFallbackPhoto = $photo !== null && ($patient?->primaryPhoto?->id !== $photo->id);
        $photoPath = null;

        if ($photo !== null && $photo->disk === 'public') {
            $photoPath = "/storage/{$photo->file_path}";
        }

        return response()->json([
            'consultation_id' => $consultation->id,
            'subject_role' => 'patient',
            'subject_user_id' => $patient?->user_id,
            'subject_name' => $patient?->full_name,
            'photo_id' => $photo?->id,
            'photo_path' => $photoPath,
            'face_embedding' => $photo?->face_embedding,
            'used_fallback_photo' => $usedFallbackPhoto,
        ]);
    }

    private function getDoctorFace(Consultation $consultation): JsonResponse
    {
        $consultation->load(['doctor.primaryDoctorPhoto']);
        $doctor = $consultation->doctor;
        $photo = $doctor?->primaryDoctorPhoto ?? $doctor?->doctorPhotos()->latest('id')->first();
        $usedFallbackPhoto = $photo !== null && ($doctor?->primaryDoctorPhoto?->id !== $photo->id);
        $photoPath = null;

        if ($photo !== null && $photo->disk === 'public') {
            $photoPath = "/storage/{$photo->file_path}";
        }

        return response()->json([
            'consultation_id' => $consultation->id,
            'subject_role' => 'doctor',
            'subject_user_id' => $doctor?->id,
            'subject_name' => $doctor?->name,
            'photo_id' => $photo?->id,
            'photo_path' => $photoPath,
            'face_embedding' => $photo?->face_embedding,
            'used_fallback_photo' => $usedFallbackPhoto,
        ]);
    }
}
