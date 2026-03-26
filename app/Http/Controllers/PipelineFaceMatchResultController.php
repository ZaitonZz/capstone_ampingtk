<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFaceMatchResultRequest;
use App\Models\Consultation;
use Illuminate\Http\JsonResponse;

class PipelineFaceMatchResultController extends Controller
{
    public function store(StoreFaceMatchResultRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $consultation = Consultation::findOrFail($validated['consultation_id']);

        // Validate user_id matches consultation participant for the given role
        $isValidUser = match ($validated['verified_role']) {
            'patient' => $consultation->patient?->user_id === $validated['user_id'],
            'doctor' => $consultation->doctor_id === $validated['user_id'],
            default => false,
        };

        if (! $isValidUser) {
            return response()->json([
                'message' => 'Verification user does not match consultation participant for the specified role.',
            ], 422);
        }

        $verificationLog = $consultation->faceVerificationLogs()->create([
            'user_id' => $validated['user_id'],
            'verified_role' => $validated['verified_role'],
            'matched' => $validated['matched'],
            'face_match_score' => $validated['face_match_score'],
            'flagged' => $validated['flagged'] ?? ! $validated['matched'],
            'checked_at' => now(),
        ]);

        return response()->json([
            'id' => $verificationLog->id,
            'consultation_id' => $consultation->id,
            'user_id' => $verificationLog->user_id,
            'verified_role' => $verificationLog->verified_role,
            'matched' => $verificationLog->matched,
            'face_match_score' => $verificationLog->face_match_score,
            'flagged' => $verificationLog->flagged,
        ]);
    }
}
