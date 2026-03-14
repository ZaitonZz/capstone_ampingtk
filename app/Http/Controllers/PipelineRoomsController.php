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
        $rooms = Consultation::query()
            ->where('type', 'teleconsultation')
            ->where('livekit_room_status', 'room_ready')
            ->whereNotNull('livekit_room_name')
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
