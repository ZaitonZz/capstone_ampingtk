<?php

namespace App\Services;

use App\Models\DeepfakeScanLog;

class DeepfakeEscalationService
{
    private const STREAK_THRESHOLD = 5;

    public function __construct(
        private ConsultationIdentityVerificationService $identityVerificationService,
    ) {}

    public function handleNewScanLog(DeepfakeScanLog $log): void
    {
        if ($log->result !== 'fake') {
            return;
        }

        if (! in_array($log->verified_role, ['patient', 'doctor'], true)) {
            return;
        }

        if (! $this->hasReachedStreakThreshold($log, self::STREAK_THRESHOLD)) {
            return;
        }

        $this->identityVerificationService->beginForDeepfakeLog($log);
    }

    private function hasReachedStreakThreshold(DeepfakeScanLog $log, int $threshold): bool
    {
        return $this->consecutiveFakeStreak($log) === $threshold;
    }

    private function consecutiveFakeStreak(DeepfakeScanLog $log): int
    {
        $results = DeepfakeScanLog::query()
            ->where('consultation_id', $log->consultation_id)
            ->where('verified_role', $log->verified_role)
            ->orderByDesc('scanned_at')
            ->orderByDesc('id')
            ->limit(100)
            ->pluck('result');

        $streak = 0;

        foreach ($results as $result) {
            if ($result !== 'fake') {
                break;
            }

            $streak++;
        }

        return $streak;
    }
}
