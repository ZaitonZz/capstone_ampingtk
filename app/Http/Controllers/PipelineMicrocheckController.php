<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Services\ConsultationMicrocheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PipelineMicrocheckController extends Controller
{
    public function __construct(private ConsultationMicrocheckService $microcheckService) {}

    public function claim(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'consultation_id' => ['required', 'integer', 'exists:consultations,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'verified_role' => ['nullable', 'string', 'in:patient,doctor'],
        ]);

        $hasUser = array_key_exists('user_id', $validated) && $validated['user_id'] !== null;
        $hasRole = array_key_exists('verified_role', $validated) && $validated['verified_role'] !== null;

        if ($hasUser xor $hasRole) {
            return response()->json([
                'message' => 'user_id and verified_role must be provided together.',
            ], 422);
        }

        $consultation = Consultation::query()
            ->with('patient:id,user_id')
            ->findOrFail($validated['consultation_id']);

        $referenceTime = now();
        $this->microcheckService->expirePendingChecks($consultation, $referenceTime);
        $this->microcheckService->ensurePendingCheck($consultation, $referenceTime);

        if (! $hasUser || ! $hasRole) {
            return response()->json([
                'claimed' => false,
                'reason' => 'identity_required',
                'next_scheduled_at' => $this->microcheckService->nextPendingScheduledAt($consultation)?->toIso8601String(),
            ]);
        }

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

        $microcheck = $this->microcheckService->claimDueCheck($consultation, $referenceTime);

        if ($microcheck === null) {
            $activeCheck = $this->microcheckService->activeCheck($consultation);
            $reason = match (true) {
                $activeCheck === null => 'no_active_microcheck',
                $activeCheck->status === 'claimed' => 'already_claimed',
                default => 'not_due',
            };

            return response()->json([
                'claimed' => false,
                'reason' => $reason,
                'microcheck' => $activeCheck === null ? null : [
                    'id' => $activeCheck->id,
                    'consultation_id' => $activeCheck->consultation_id,
                    'status' => $activeCheck->status,
                    'scheduled_at' => $activeCheck->scheduled_at?->toIso8601String(),
                    'claimed_at' => $activeCheck->claimed_at?->toIso8601String(),
                    'expires_at' => $activeCheck->expires_at?->toIso8601String(),
                ],
                'next_scheduled_at' => $this->microcheckService->nextPendingScheduledAt($consultation)?->toIso8601String(),
            ]);
        }

        return response()->json([
            'claimed' => true,
            'microcheck' => [
                'id' => $microcheck->id,
                'consultation_id' => $microcheck->consultation_id,
                'status' => $microcheck->status,
                'scheduled_at' => $microcheck->scheduled_at?->toIso8601String(),
                'claimed_at' => $microcheck->claimed_at?->toIso8601String(),
                'expires_at' => $microcheck->expires_at?->toIso8601String(),
            ],
        ]);
    }
}
