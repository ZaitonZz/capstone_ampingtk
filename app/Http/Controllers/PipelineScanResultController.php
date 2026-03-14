<?php

namespace App\Http\Controllers;

use App\Models\DeepfakeScanLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PipelineScanResultController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'consultation_id' => ['required', 'integer', 'exists:consultations,id'],
            'result' => ['required', 'string', 'in:real,fake,unknown'],
            'confidence_score' => ['required', 'numeric', 'min:0', 'max:1'],
            'frame_path' => ['nullable', 'string', 'max:500'],
            'frame_number' => ['nullable', 'integer', 'min:0'],
            'model_version' => ['nullable', 'string', 'max:100'],
            'flagged' => ['sometimes', 'boolean'],
            'scanned_at' => ['nullable', 'date'],
        ]);

        $log = DeepfakeScanLog::create([
            ...$validated,
            'scanned_at' => $validated['scanned_at'] ?? now(),
        ]);

        return response()->json([
            'id' => $log->id,
            'consultation_id' => $log->consultation_id,
        ], 201);
    }
}
