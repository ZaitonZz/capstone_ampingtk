<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Models\ConsultationMicrocheck;
use App\Models\DeepfakeScanLog;
use App\Services\ConsultationMicrocheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PipelineScanResultController extends Controller
{
    public function __construct(private ConsultationMicrocheckService $microcheckService) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'consultation_id' => ['required', 'integer', 'exists:consultations,id'],
            'microcheck_id' => ['required', 'integer', 'exists:consultation_microchecks,id'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'verified_role' => ['required', 'string', 'in:patient,doctor'],
            'result' => ['required', 'string', 'in:real,fake,inconclusive'],
            'confidence_score' => ['required', 'numeric', 'min:0', 'max:1'],
            'frame_path' => ['nullable', 'string', 'max:500'],
            'frame_number' => ['nullable', 'integer', 'min:0'],
            'model_version' => ['nullable', 'string', 'max:100'],
            'flagged' => ['sometimes', 'boolean'],
            'scanned_at' => ['nullable', 'date', 'before_or_equal:now'],
        ]);

        $consultation = Consultation::query()
            ->with('patient:id,user_id')
            ->findOrFail($validated['consultation_id']);

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

        $microcheck = ConsultationMicrocheck::query()
            ->where('consultation_id', $consultation->id)
            ->find($validated['microcheck_id']);

        if ($microcheck === null) {
            return response()->json([
                'message' => 'Microcheck does not belong to the specified consultation.',
            ], 422);
        }

        if ($microcheck->status !== 'claimed') {
            return response()->json([
                'message' => 'Microcheck must be claimed before scan result submission.',
            ], 422);
        }

        $completedAt = isset($validated['scanned_at'])
            ? Carbon::parse($validated['scanned_at'])
            : now();

        if ($microcheck->scheduled_at === null || $microcheck->scheduled_at->greaterThan($completedAt)) {
            return response()->json([
                'message' => 'Microcheck is not yet due for scan result submission.',
            ], 422);
        }

        $completedMicrocheck = $this->microcheckService->completeCheck($microcheck, $completedAt);
        $flagged = $validated['flagged'] ?? ($validated['result'] === 'fake');

        $log = DeepfakeScanLog::create([
            'consultation_id' => $consultation->id,
            'microcheck_id' => $completedMicrocheck->id,
            'user_id' => $validated['user_id'],
            'verified_role' => $validated['verified_role'],
            'result' => $validated['result'],
            'confidence_score' => $validated['confidence_score'],
            'frame_path' => $validated['frame_path'] ?? null,
            'frame_number' => $validated['frame_number'] ?? null,
            'model_version' => $validated['model_version'] ?? null,
            'flagged' => $flagged,
            'scanned_at' => $completedAt,
        ]);

        if ($log->result === 'fake') {
            $consultation->update(['deepfake_verified' => false]);
        }

        $this->microcheckService->ensurePendingCheck($consultation, $completedAt);

        return response()->json([
            'id' => $log->id,
            'consultation_id' => $log->consultation_id,
            'microcheck_id' => $completedMicrocheck->id,
            'latency_ms' => $completedMicrocheck->latency_ms,
            'user_id' => $log->user_id,
            'verified_role' => $log->verified_role,
        ], 201);
    }
}
