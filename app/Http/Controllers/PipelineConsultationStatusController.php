<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Services\ConsultationDeepfakeDetectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PipelineConsultationStatusController extends Controller
{
    public function __construct(private ConsultationDeepfakeDetectionService $detectionService) {}

    public function store(Request $request, Consultation $consultation): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:started,running,stalled,error'],
            'room_name' => ['nullable', 'string', 'max:255'],
            'last_scan_at' => ['nullable', 'date', 'before_or_equal:now'],
            'error' => ['nullable', 'string', 'max:1000'],
            'guidance' => ['nullable', 'array'],
            'guidance.low_light' => ['nullable', 'boolean'],
            'guidance.too_far' => ['nullable', 'boolean'],
            'guidance.face_area_ratio' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'guidance.brightness' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'guidance.participant_identity' => ['nullable', 'string', 'max:255'],
            'guidance.role' => ['nullable', 'string', 'in:patient,doctor,unknown'],
        ]);

        if (
            isset($validated['room_name'])
            && $consultation->livekit_room_name !== null
            && $validated['room_name'] !== $consultation->livekit_room_name
        ) {
            return response()->json([
                'message' => 'Room name does not match consultation.',
            ], 422);
        }

        $updatedConsultation = $this->detectionService->recordPipelineStatus($consultation, $validated);

        return response()->json([
            'deepfake_detection' => $this->detectionService->statusPayload($updatedConsultation),
        ]);
    }
}
