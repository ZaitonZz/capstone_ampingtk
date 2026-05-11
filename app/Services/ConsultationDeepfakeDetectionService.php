<?php

namespace App\Services;

use App\Models\Consultation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ConsultationDeepfakeDetectionService
{
    public function __construct(private LiveKitService $liveKitService) {}

    public function statusPayload(Consultation $consultation): array
    {
        $timeoutSeconds = $this->timeoutSeconds();
        $noFaceTimeoutSeconds = $this->noFaceTimeoutSeconds();
        $heartbeatAt = $consultation->pipeline_last_heartbeat_at;
        $ageSeconds = $heartbeatAt === null ? null : max(0, now()->diffInSeconds($heartbeatAt));
        $guidance = $this->publicGuidancePayload($consultation->pipeline_guidance);
        $state = $this->displayState($consultation);

        return [
            'state' => $state,
            'status' => $consultation->pipeline_detection_status,
            'timeout_seconds' => $timeoutSeconds,
            'no_face_timeout_seconds' => $noFaceTimeoutSeconds,
            'last_heartbeat_at' => $heartbeatAt?->toIso8601String(),
            'last_heartbeat_age_seconds' => $ageSeconds,
            'started_at' => $consultation->pipeline_detection_started_at?->toIso8601String(),
            'last_scan_at' => $consultation->pipeline_last_scan_at?->toIso8601String(),
            'guidance' => $guidance,
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

        $guidance = array_key_exists('guidance', $payload)
            ? $this->normalizeGuidance([
                ...$this->normalizeGuidance($consultation->pipeline_guidance),
                ...(is_array($payload['guidance']) ? $payload['guidance'] : []),
            ])
            : $this->normalizeGuidance($consultation->pipeline_guidance);

        $consultation->forceFill([
            'pipeline_detection_status' => $status,
            'pipeline_detection_started_at' => $startedAt,
            'pipeline_last_heartbeat_at' => $now,
            'pipeline_last_scan_at' => isset($payload['last_scan_at'])
                ? Carbon::parse($payload['last_scan_at'])
                : $consultation->pipeline_last_scan_at,
            'pipeline_last_error' => $payload['error'] ?? null,
            'pipeline_guidance' => $guidance,
        ])->save();

        return $this->enforceNoFaceOrCancel($consultation->fresh());
    }

    public function enforceNoFaceOrCancel(Consultation $consultation): Consultation
    {
        if (! $this->shouldMonitor($consultation) || ! $this->hasNoFaceTimedOut($consultation)) {
            return $consultation;
        }

        try {
            $this->liveKitService->deleteRoom($consultation);
        } catch (RuntimeException $exception) {
            Log::warning('Failed to delete LiveKit room after no-face timeout cancellation.', [
                'consultation_id' => $consultation->id,
                'message' => $exception->getMessage(),
            ]);
        }

        $consultation->forceFill([
            'status' => Consultation::STATUS_CANCELLED,
            'ended_at' => now(),
            'cancellation_reason' => $this->noFaceCancellationMessage(),
        ])->save();

        return $consultation->fresh();
    }

    public function noFaceCancellationMessage(): string
    {
        return sprintf(
            'Consultation cancelled because no face was detected for %d seconds.',
            $this->noFaceTimeoutSeconds()
        );
    }

    public function isNoFaceCancellation(Consultation $consultation): bool
    {
        return $consultation->status === Consultation::STATUS_CANCELLED
            && str_contains(
                strtolower((string) $consultation->cancellation_reason),
                'no face was detected'
            );
    }

    private function displayState(Consultation $consultation): string
    {
        if ($this->isNoFaceCancellation($consultation)) {
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
        // Do not monitor while an identity verification is in progress for this
        // consultation. If a participant is paused for OTP verification we must
        // avoid cancelling the room due to transient "no face" guidance.
        if ($consultation->identity_verification_target_user_id !== null
            || $consultation->identity_verification_started_at !== null
        ) {
            return false;
        }

        return $consultation->type === 'teleconsultation'
            && $consultation->livekit_room_status === 'room_ready'
            && in_array($consultation->status, Consultation::LIVEKIT_ELIGIBLE_STATUSES, true);
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

    private function hasNoFaceTimedOut(Consultation $consultation): bool
    {
        $guidance = $this->normalizeGuidance($consultation->pipeline_guidance);

        if (! $guidance['no_face_detected'] || $guidance['no_face_detected_since'] === null) {
            return false;
        }

        return Carbon::parse($guidance['no_face_detected_since'])
            ->lessThanOrEqualTo(now()->subSeconds($this->noFaceTimeoutSeconds()));
    }

    private function normalizeGuidance(mixed $guidance): array
    {
        if (! is_array($guidance)) {
            return [
                'no_face_detected' => false,
                'no_face_detected_since' => null,
                'participant_identity' => null,
                'role' => null,
            ];
        }

        $noFaceDetected = (bool) ($guidance['no_face_detected'] ?? false);
        $existingSince = $guidance['no_face_detected_since'] ?? null;
        $noFaceDetectedSince = $noFaceDetected
            ? $this->normalizeTimestamp($existingSince) ?? now()->toIso8601String()
            : null;

        return [
            'no_face_detected' => $noFaceDetected,
            'no_face_detected_since' => $noFaceDetectedSince,
            'participant_identity' => isset($guidance['participant_identity']) ? (string) $guidance['participant_identity'] : null,
            'role' => isset($guidance['role']) ? (string) $guidance['role'] : null,
        ];
    }

    private function publicGuidancePayload(mixed $guidance): array
    {
        $normalizedGuidance = $this->normalizeGuidance($guidance);

        return [
            'no_face_detected' => $normalizedGuidance['no_face_detected'],
            'no_face_detected_since' => $normalizedGuidance['no_face_detected_since'],
        ];
    }

    private function timeoutSeconds(): int
    {
        return max(1, (int) config('services.pipeline.detection_timeout_seconds', 60));
    }

    private function noFaceTimeoutSeconds(): int
    {
        return max(1, (int) config('services.pipeline.no_face_timeout_seconds', 30));
    }

    private function normalizeTimestamp(mixed $timestamp): ?string
    {
        if ($timestamp === null || $timestamp === '') {
            return null;
        }

        try {
            return Carbon::parse($timestamp)->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }
}
