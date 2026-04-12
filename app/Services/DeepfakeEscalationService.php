<?php

namespace App\Services;

use App\Models\DeepfakeEscalation;
use App\Models\DeepfakeScanLog;

class DeepfakeEscalationService
{
    private const STREAK_THRESHOLD = 5;

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

        $type = $log->verified_role === 'doctor'
            ? DeepfakeEscalation::TYPE_ADMIN_ALERT
            : DeepfakeEscalation::TYPE_DOCTOR_DECISION;

        $alreadyOpen = DeepfakeEscalation::query()
            ->where('consultation_id', $log->consultation_id)
            ->where('type', $type)
            ->where('status', DeepfakeEscalation::STATUS_OPEN)
            ->exists();

        if ($alreadyOpen) {
            return;
        }

        DeepfakeEscalation::query()->create([
            'consultation_id' => $log->consultation_id,
            'triggered_by_user_id' => $log->user_id,
            'triggered_role' => $log->verified_role,
            'type' => $type,
            'streak_count' => self::STREAK_THRESHOLD,
            'status' => DeepfakeEscalation::STATUS_OPEN,
            'notes' => $log->verified_role === 'doctor'
                ? 'Doctor reached 5 straight fake scans.'
                : 'Patient reached 5 straight fake scans; doctor decision is required.',
        ]);
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
