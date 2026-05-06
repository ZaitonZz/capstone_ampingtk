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

        $candidateConsultations = Consultation::query()
            ->where('type', 'teleconsultation')
            ->whereIn('status', Consultation::LIVEKIT_ELIGIBLE_STATUSES)
            ->where('livekit_room_status', 'room_ready')
            ->whereNotNull('livekit_room_name')
            ->orderBy('id')
            ->get();

        $participantCounts = $this->liveKitService->activeRoomParticipantCounts(
            $candidateConsultations
                ->pluck('livekit_room_name')
                ->filter()
                ->values()
                ->all()
        );

        $rooms = $candidateConsultations
            ->filter(fn (Consultation $c): bool => ($participantCounts[$c->livekit_room_name] ?? 0) > 0)
            ->slice($offset, $perPage)
            ->values()
            ->map(fn (Consultation $c): array => [
                'consultation_id' => $c->id,
                'room_name' => $c->livekit_room_name,
                'room_sid' => $c->livekit_room_sid,
                'participant_count' => $participantCounts[$c->livekit_room_name] ?? 0,
                'ws_url' => config('services.livekit.ws_url'),
                'pipeline_token' => $this->liveKitService->issuePipelineToken($c),
            ]);

        return response()->json($rooms);
    }
}
