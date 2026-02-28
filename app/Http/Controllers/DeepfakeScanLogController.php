<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReviewDeepfakeScanLogRequest;
use App\Http\Requests\StoreDeepfakeScanLogRequest;
use App\Models\Consultation;
use App\Models\DeepfakeScanLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeepfakeScanLogController extends Controller
{
    public function index(Request $request, Consultation $consultation): JsonResponse
    {
        $logs = $consultation->deepfakeScanLogs()
            ->when(
                $request->filled('flagged'),
                fn($q) =>
                $q->where('flagged', filter_var($request->flagged, FILTER_VALIDATE_BOOLEAN))
            )
            ->when($request->result, fn($q, $r) => $q->where('result', $r))
            ->orderByDesc('scanned_at')
            ->get();

        return response()->json($logs);
    }

    public function show(Consultation $consultation, DeepfakeScanLog $log): JsonResponse
    {
        abort_if($log->consultation_id !== $consultation->id, 404);

        $log->load('reviewer');

        return response()->json($log);
    }

    public function store(StoreDeepfakeScanLogRequest $request, Consultation $consultation): JsonResponse
    {
        $log = $consultation->deepfakeScanLogs()->create($request->validated());

        // If the scan is flagged as fake, mark consultation's deepfake_verified flag
        if ($log->result === 'fake') {
            $consultation->update(['deepfake_verified' => false]);
        }

        return response()->json($log, 201);
    }

    /** Reviewer marks a scan log (flag/unflag + notes) */
    public function update(ReviewDeepfakeScanLogRequest $request, Consultation $consultation, DeepfakeScanLog $log): JsonResponse
    {
        abort_if($log->consultation_id !== $consultation->id, 404);

        $log->update([
            ...$request->validated(),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json($log->fresh('reviewer'));
    }
}
