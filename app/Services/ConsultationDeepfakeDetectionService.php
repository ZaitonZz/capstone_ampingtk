<?php

namespace App\Services;

use App\Models\Consultation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ConsultationDeepfakeDetectionService
{
    public function __construct(private LiveKitService $liveKitService) {}

    public function enforceOrCancel(Consultation $consultation): Consultation
    {
        if (! $this->shouldMonitor($consultation)) {
            return $consultation;
        }

        if (! $this->isTimedOut($consultation)) {
            return $consultation;
        }

        return $this->cancelForMissingDetection($consultation);
    }

    public function statusPayload(Consultation $consultation): array
    {
        $timeoutSeconds = $this->timeoutSeconds();
        $heartbeatAt = $consultation->pipeline_last_heartbeat_at;
        $ageSeconds = $heartbeatAt === null ? null : max(0, now()->diffInSeconds($heartbeatAt));
        $state = $this->displayState($consultation);

        return [
            'state' => $state,
            'status' => $consultation->pipeline_detection_status,
            'timeout_seconds' => $timeoutSeconds,
            'last_heartbeat_at' => $heartbeatAt?->toIso8601String(),
            'last_heartbeat_age_seconds' => $ageSeconds,
            'started_at' => $consultation->pipeline_detection_started_at?->toIso8601String(),
            'last_scan_at' => $consultation->pipeline_last_scan_at?->toIso8601String(),
            'last_error' => $consultation->pipeline_last_error,
            'guidance' => $this->normalizeGuidance($consultation->pipeline_guidance),
        ];
    }

    public function recordPipelineStatus(Consultation $consultation, array $payload): Consultation
    {
        $status = (string) $payload['status'];
        $now = now();
        $startedAt = $consultation->pipeline_detection_started_at;

        if ($status === 'started' && $startedAt === null) {
            $startedAt = $now;
        }

        $consultation->forceFill([
            'pipeline_detection_status' => $status,
            'pipeline_detection_started_at' => $startedAt,
            'pipeline_last_heartbeat_at' => $now,
            'pipeline_last_scan_at' => isset($payload['last_scan_at'])
                ? Carbon::parse($payload['last_scan_at'])
                : $consultation->pipeline_last_scan_at,
            'pipeline_last_error' => $payload['error'] ?? null,
            'pipeline_guidance' => array_key_exists('guidance', $payload)
                ? $this->normalizeGuidance($payload['guidance'])
                : $this->normalizeGuidance($consultation->pipeline_guidance),
        ])->save();

        return $consultation->fresh();
    }

    private function displayState(Consultation $consultation): string
    {
        if ($this->isDetectionCancellation($consultation)) {
            return 'cancelled';
        }

        if ($consultation->type !== 'teleconsultation' || $consultation->livekit_room_status !== 'room_ready') {
            return 'unavailable';
        }

        if ($this->isTimedOut($consultation)) {
            return 'delayed';
        }

        return match ($consultation->pipeline_detection_status) {
            'started' => 'starting',
            'running' => 'running',
            'stalled', 'error' => 'delayed',
            default => 'starting',
        };
    }

    private function shouldMonitor(Consultation $consultation): bool
    {
        return $consultation->type === 'teleconsultation'
            && $consultation->livekit_room_status === 'room_ready'
            && in_array($consultation->status, Consultation::LIVEKIT_ELIGIBLE_STATUSES, true);
    }

    private function isDetectionCancellation(Consultation $consultation): bool
    {
        return $consultation->status === Consultation::STATUS_CANCELLED
            && str_contains(
                strtolower((string) $consultation->cancellation_reason),
                'deepfake detection'
            );
    }

    private function isTimedOut(Consultation $consultation): bool
    {
        if ($consultation->pipeline_detection_status === 'error') {
            return true;
        }

        $referenceAt = $consultation->pipeline_last_heartbeat_at
            ?? $consultation->pipeline_detection_started_at
            ?? $consultation->livekit_room_created_at
            ?? $consultation->livekit_last_activity_at;

        if ($referenceAt === null) {
            return false;
        }

        return $referenceAt->lessThanOrEqualTo(now()->subSeconds($this->timeoutSeconds()));
    }

    private function cancelForMissingDetection(Consultation $consultation): Consultation
    {
        $consultation->refresh();

        if (in_array($consultation->status, Consultation::TERMINAL_STATUSES, true)) {
            return $consultation;
        }

        try {
            $this->liveKitService->deleteRoom($consultation);
        } catch (RuntimeException $exception) {
            Log::warning('Unable to end LiveKit room during deepfake detection safety cancellation.', [
                'consultation_id' => $consultation->id,
                'error' => $exception->getMessage(),
            ]);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();
        }

        $consultation->forceFill([
            'status' => Consultation::STATUS_CANCELLED,
            'ended_at' => now(),
            'cancellation_reason' => 'Consultation cancelled because deepfake detection was not running.',
            'pipeline_detection_status' => 'stalled',
        ])->save();

        return $consultation->fresh();
    }

    private function normalizeGuidance(mixed $guidance): array
    {
        if (! is_array($guidance)) {
            return [
                'low_light' => false,
                'too_far' => false,
                'face_area_ratio' => null,
                'brightness' => null,
                'participant_identity' => null,
                'role' => null,
            ];
        }

        return [
            'low_light' => (bool) ($guidance['low_light'] ?? false),
            'too_far' => (bool) ($guidance['too_far'] ?? false),
            'face_area_ratio' => isset($guidance['face_area_ratio']) ? (float) $guidance['face_area_ratio'] : null,
            'brightness' => isset($guidance['brightness']) ? (float) $guidance['brightness'] : null,
            'participant_identity' => isset($guidance['participant_identity']) ? (string) $guidance['participant_identity'] : null,
            'role' => isset($guidance['role']) ? (string) $guidance['role'] : null,
        ];
    }

    private function timeoutSeconds(): int
    {
        return max(1, (int) config('services.pipeline.detection_timeout_seconds', 60));
    }
}
