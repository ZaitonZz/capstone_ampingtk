<?php

namespace App\Services;

use App\Models\ConsultationFaceVerificationLog;

class FaceMatchEscalationService
{
    private const STREAK_THRESHOLD = 3;

    public function __construct(
        private ConsultationIdentityVerificationService $identityVerificationService,
    ) {}

    public function handleNewFaceMatchLog(ConsultationFaceVerificationLog $log): void
    {
        if (! $this->isExplicitFailure($log)) {
            return;
        }

        if (! in_array($log->verified_role, ['patient', 'doctor'], true)) {
            return;
        }

        if ($log->user_id === null) {
            return;
        }

        if (! $this->hasReachedStreakThreshold($log, self::STREAK_THRESHOLD)) {
            return;
        }

        $this->identityVerificationService->beginForFaceMatchLog($log, self::STREAK_THRESHOLD);
    }

    private function isExplicitFailure(ConsultationFaceVerificationLog $log): bool
    {
        return $log->microcheck_id !== null
            && ! $log->matched
            && $log->flagged;
    }

    private function hasReachedStreakThreshold(ConsultationFaceVerificationLog $log, int $threshold): bool
    {
        return $this->consecutiveFailureStreak($log) === $threshold;
    }

    private function consecutiveFailureStreak(ConsultationFaceVerificationLog $log): int
    {
        $recentLogs = ConsultationFaceVerificationLog::query()
            ->where('consultation_id', $log->consultation_id)
            ->where('verified_role', $log->verified_role)
            ->where('user_id', $log->user_id)
            ->orderByDesc('checked_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get(['microcheck_id', 'matched', 'flagged']);

        $streak = 0;

        foreach ($recentLogs as $recentLog) {
            if ($recentLog->microcheck_id === null || $recentLog->matched || ! $recentLog->flagged) {
                break;
            }

            $streak++;
        }

        return $streak;
    }
}
