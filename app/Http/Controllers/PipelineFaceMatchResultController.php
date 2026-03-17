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

        $verificationLog = $consultation->faceVerificationLogs()->create([
            'matched' => $validated['matched'],
            'face_match_score' => $validated['face_match_score'],
            'flagged' => $validated['flagged'] ?? ! $validated['matched'],
            'checked_at' => now(),
        ]);

        return response()->json([
            'id' => $verificationLog->id,
            'consultation_id' => $consultation->id,
            'matched' => $verificationLog->matched,
            'face_match_score' => $verificationLog->face_match_score,
            'flagged' => $verificationLog->flagged,
        ]);
    }
}
