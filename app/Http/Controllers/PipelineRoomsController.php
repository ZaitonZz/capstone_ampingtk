<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Services\LiveKitService;
use Illuminate\Http\JsonResponse;

class PipelineRoomsController extends Controller
{
    public function __construct(private LiveKitService $liveKitService) {}

    public function index(): JsonResponse
    {
        // Simple pagination to avoid issuing tokens for an unbounded number of rooms
        $perPage = (int) request()->query('per_page', 50);
        $perPage = max(1, min($perPage, 200)); // enforce sane bounds
        $page = (int) request()->query('page', 1);
        $page = max(1, $page);
        $offset = ($page - 1) * $perPage;

        $rooms = Consultation::query()
            ->where('type', 'teleconsultation')
            ->whereIn('status', Consultation::LIVEKIT_ELIGIBLE_STATUSES)
            ->where('livekit_room_status', 'room_ready')
            ->whereNotNull('livekit_room_name')
            ->skip($offset)
            ->take($perPage)
            ->get()
            ->map(fn (Consultation $c): array => [
                'consultation_id' => $c->id,
                'room_name' => $c->livekit_room_name,
                'room_sid' => $c->livekit_room_sid,
                'ws_url' => config('services.livekit.ws_url'),
                'pipeline_token' => $this->liveKitService->issuePipelineToken($c),
            ]);

        return response()->json($rooms);
    }
}
