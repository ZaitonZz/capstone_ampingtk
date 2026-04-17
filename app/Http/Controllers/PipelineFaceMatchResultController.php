<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFaceMatchResultRequest;
use App\Models\Consultation;
use App\Models\ConsultationMicrocheck;
use App\Services\FaceMatchEscalationService;
use Illuminate\Http\JsonResponse;

class PipelineFaceMatchResultController extends Controller
{
    public function __construct(private FaceMatchEscalationService $faceMatchEscalationService) {}

    public function store(StoreFaceMatchResultRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $consultation = Consultation::query()
            ->with('patient:id,user_id')
            ->findOrFail($validated['consultation_id']);

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

        $microcheck = null;
        if (array_key_exists('microcheck_id', $validated) && $validated['microcheck_id'] !== null) {
            $microcheck = ConsultationMicrocheck::query()
                ->where('consultation_id', $consultation->id)
                ->find($validated['microcheck_id']);

            if ($microcheck === null) {
                return response()->json([
                    'message' => 'Microcheck does not belong to the specified consultation.',
                ], 422);
            }

            if ($microcheck->target_role !== null && $microcheck->target_role !== $validated['verified_role']) {
                return response()->json([
                    'message' => 'Microcheck role does not match the submitted verification role.',
                ], 422);
            }
        }

        $logPayload = [
            'user_id' => $validated['user_id'],
            'verified_role' => $validated['verified_role'],
            'matched' => $validated['matched'],
            'face_match_score' => $validated['face_match_score'],
            'flagged' => $validated['flagged'] ?? ! $validated['matched'],
            'checked_at' => now(),
        ];

        if ($microcheck !== null) {
            $logPayload['microcheck_id'] = $microcheck->id;

            $verificationLog = $consultation->faceVerificationLogs()->updateOrCreate(
                [
                    'consultation_id' => $consultation->id,
                    'microcheck_id' => $microcheck->id,
                    'user_id' => $validated['user_id'],
                    'verified_role' => $validated['verified_role'],
                ],
                $logPayload,
            );
        } else {
            $verificationLog = $consultation->faceVerificationLogs()->create($logPayload);
        }

        $this->faceMatchEscalationService->handleNewFaceMatchLog($verificationLog);

        return response()->json([
            'id' => $verificationLog->id,
            'consultation_id' => $consultation->id,
            'microcheck_id' => $verificationLog->microcheck_id,
            'user_id' => $verificationLog->user_id,
            'verified_role' => $verificationLog->verified_role,
            'matched' => $verificationLog->matched,
            'face_match_score' => $verificationLog->face_match_score,
            'flagged' => $verificationLog->flagged,
        ]);
    }
}
