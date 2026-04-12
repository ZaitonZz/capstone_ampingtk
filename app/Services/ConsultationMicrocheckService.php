<?php

namespace App\Services;

use App\Models\Consultation;
use App\Models\ConsultationMicrocheck;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConsultationMicrocheckService
{
    public function expirePendingChecks(Consultation $consultation, ?CarbonInterface $referenceTime = null): int
    {
        $referenceTime ??= now();
        $expiryCutoff = $referenceTime->copy()->subSeconds($this->expirySeconds());

        return ConsultationMicrocheck::query()
            ->where('consultation_id', $consultation->id)
            ->whereIn('status', ['pending', 'claimed'])
            ->where('scheduled_at', '<=', $expiryCutoff)
            ->update([
                'status' => 'expired',
                'expires_at' => $referenceTime,
                'updated_at' => $referenceTime,
            ]);
    }

    public function ensurePendingCheck(Consultation $consultation, ?CarbonInterface $referenceTime = null): ?ConsultationMicrocheck
    {
        $referenceTime ??= now();

        if (! $this->isEligibleConsultation($consultation)) {
            return null;
        }

        return DB::transaction(function () use ($consultation, $referenceTime): ConsultationMicrocheck {
            Consultation::query()->whereKey($consultation->id)->lockForUpdate()->firstOrFail();
            $this->expirePendingChecks($consultation, $referenceTime);

            $activeCheck = $this->activeCheckQuery($consultation)
                ->lockForUpdate()
                ->first();

            if ($activeCheck !== null) {
                return $activeCheck;
            }

            [$patientCheck] = $this->createPendingPair($consultation, $referenceTime);

            return $patientCheck;
        });
    }

    public function claimDueCheck(
        Consultation $consultation,
        string $verifiedRole,
        ?CarbonInterface $referenceTime = null
    ): ?ConsultationMicrocheck {
        $referenceTime ??= now();

        if (! $this->isEligibleConsultation($consultation)) {
            return null;
        }

        if (! in_array($verifiedRole, ['patient', 'doctor'], true)) {
            return null;
        }

        return DB::transaction(function () use ($consultation, $verifiedRole, $referenceTime): ?ConsultationMicrocheck {
            Consultation::query()->whereKey($consultation->id)->lockForUpdate()->firstOrFail();
            $this->expirePendingChecks($consultation, $referenceTime);

            $activeCheck = $this->activeCheckQueryForRole($consultation, $verifiedRole)
                ->lockForUpdate()
                ->first();

            if ($activeCheck === null) {
                $anyActiveCheck = $this->activeCheckQuery($consultation)
                    ->lockForUpdate()
                    ->first();

                if ($anyActiveCheck === null) {
                    $this->createPendingPair($consultation, $referenceTime);
                }

                return null;
            }

            if ($activeCheck->status === 'claimed') {
                return null;
            }

            if ($activeCheck->scheduled_at === null || $activeCheck->scheduled_at->greaterThan($referenceTime)) {
                return null;
            }

            $activeCheck->forceFill([
                'status' => 'claimed',
                'claimed_at' => $referenceTime,
            ])->save();

            return $activeCheck->fresh();
        });
    }

    public function completeCheck(ConsultationMicrocheck $microcheck, CarbonInterface $completedAt): ConsultationMicrocheck
    {
        return DB::transaction(function () use ($microcheck, $completedAt): ConsultationMicrocheck {
            /** @var ConsultationMicrocheck $locked */
            $locked = ConsultationMicrocheck::query()
                ->whereKey($microcheck->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (in_array($locked->status, ['completed', 'expired'], true)) {
                return $locked;
            }

            $scheduledAt = $locked->scheduled_at ?? $completedAt;
            $latencyMs = max(0, $completedAt->getTimestampMs() - $scheduledAt->getTimestampMs());

            $locked->forceFill([
                'status' => 'completed',
                'completed_at' => $completedAt,
                'latency_ms' => $latencyMs,
            ])->save();

            return $locked->fresh();
        });
    }

    public function nextPendingScheduledAt(Consultation $consultation): ?CarbonInterface
    {
        $nextPending = $this->activeCheckQuery($consultation)->first();

        return $nextPending?->scheduled_at;
    }

    public function activeCheck(Consultation $consultation): ?ConsultationMicrocheck
    {
        return $this->activeCheckQuery($consultation)->first();
    }

    public function activeCheckForRole(Consultation $consultation, string $verifiedRole): ?ConsultationMicrocheck
    {
        return $this->activeCheckQueryForRole($consultation, $verifiedRole)->first();
    }

    private function createPendingPair(Consultation $consultation, CarbonInterface $referenceTime): array
    {
        $scheduledAt = $referenceTime->copy()->addSeconds($this->randomIntervalSeconds());
        $expiresAt = $scheduledAt->copy()->addSeconds($this->expirySeconds());
        $cycleKey = (string) Str::uuid();

        $patientCheck = ConsultationMicrocheck::query()->create([
            'consultation_id' => $consultation->id,
            'cycle_key' => $cycleKey,
            'target_role' => 'patient',
            'status' => 'pending',
            'scheduled_at' => $scheduledAt,
            'expires_at' => $expiresAt,
        ]);

        $doctorCheck = ConsultationMicrocheck::query()->create([
            'consultation_id' => $consultation->id,
            'cycle_key' => $cycleKey,
            'target_role' => 'doctor',
            'status' => 'pending',
            'scheduled_at' => $scheduledAt,
            'expires_at' => $expiresAt,
        ]);

        return [$patientCheck, $doctorCheck];
    }

    private function activeCheckQuery(Consultation $consultation): Builder
    {
        return ConsultationMicrocheck::query()
            ->where('consultation_id', $consultation->id)
            ->whereIn('status', ['pending', 'claimed'])
            ->orderBy('scheduled_at')
            ->orderBy('id');
    }

    private function activeCheckQueryForRole(Consultation $consultation, string $verifiedRole): Builder
    {
        return $this->activeCheckQuery($consultation)
            ->where(function (Builder $query) use ($verifiedRole): void {
                $query->where('target_role', $verifiedRole)
                    ->orWhereNull('target_role');
            });
    }

    private function randomIntervalSeconds(): int
    {
        $minimum = max(1, (int) config('services.pipeline.microcheck_min_interval_seconds', 20));
        $maximum = max($minimum, (int) config('services.pipeline.microcheck_max_interval_seconds', 60));

        return random_int($minimum, $maximum);
    }

    private function expirySeconds(): int
    {
        return max(1, (int) config('services.pipeline.microcheck_expiry_seconds', 45));
    }

    private function isEligibleConsultation(Consultation $consultation): bool
    {
        if ($consultation->type !== 'teleconsultation') {
            return false;
        }

        if ($consultation->livekit_room_name === null || $consultation->livekit_room_status !== 'room_ready') {
            return false;
        }

        return in_array($consultation->status, ['pending', 'scheduled', 'ongoing'], true);
    }
}
