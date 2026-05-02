<?php

namespace App\Services;

use App\Mail\ConsultationIdentityOtpMail;
use App\Models\Consultation;
use App\Models\ConsultationFaceVerificationLog;
use App\Models\DeepfakeEscalation;
use App\Models\DeepfakeScanLog;
use App\Models\User;
use DateTimeInterface;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ConsultationIdentityVerificationService
{
    private const CACHE_PREFIX = 'consultation:identity_verification:';

    public function __construct(private LiveKitService $liveKitService) {}

    public function beginForDeepfakeLog(DeepfakeScanLog $log): void
    {
        if (! in_array($log->verified_role, ['patient', 'doctor'], true) || $log->user_id === null) {
            return;
        }

        $this->beginIdentityVerificationForTarget(
            consultationId: $log->consultation_id,
            userId: $log->user_id,
            targetRole: $log->verified_role,
            streakCount: 5,
            notes: sprintf(
                '%s reached 5 straight fake scans. Consultation paused pending OTP verification.',
                $log->verified_role === 'doctor' ? 'Doctor' : 'Patient'
            ),
        );
    }

    public function beginForFaceMatchLog(
        ConsultationFaceVerificationLog $log,
        int $streakCount = 3,
    ): void {
        if (! in_array($log->verified_role, ['patient', 'doctor'], true) || $log->user_id === null) {
            return;
        }

        if ($log->matched || ! $log->flagged) {
            return;
        }

        $this->beginIdentityVerificationForTarget(
            consultationId: $log->consultation_id,
            userId: $log->user_id,
            targetRole: $log->verified_role,
            streakCount: $streakCount,
            notes: sprintf(
                '%s reached %d straight facial recognition mismatches. Consultation paused pending OTP verification.',
                $log->verified_role === 'doctor' ? 'Doctor' : 'Patient',
                $streakCount,
            ),
        );
    }

    private function beginIdentityVerificationForTarget(
        int $consultationId,
        int $userId,
        string $targetRole,
        int $streakCount,
        string $notes,
    ): void {
        if (! in_array($targetRole, ['patient', 'doctor'], true)) {
            return;
        }

        $otp = $this->generateOtp();
        $otpHash = Hash::make($otp);
        $ttlSeconds = max(60, (int) config('auth_otp.otp.ttl', 300));
        $maxAttempts = max(1, (int) config('auth_otp.otp.max_attempts', 5));
        $maxResends = max(0, (int) config('auth_otp.otp.max_resends', 3));
        $resendCooldownSeconds = max(1, (int) config('auth_otp.otp.resend_cooldown', 60));
        $now = now();
        $expiresAt = $now->copy()->addSeconds($ttlSeconds);
        $resendAvailableAt = $now->copy()->addSeconds($resendCooldownSeconds);

        $payload = DB::transaction(function () use (
            $consultationId,
            $userId,
            $targetRole,
            $streakCount,
            $notes,
            $otpHash,
            $maxAttempts,
            $maxResends,
            $now,
            $expiresAt,
            $resendAvailableAt,
            $otp
        ): ?array {
            $consultation = Consultation::query()
                ->whereKey($consultationId)
                ->lockForUpdate()
                ->first();

            if ($consultation === null) {
                return null;
            }

            if (! in_array($consultation->status, Consultation::IDENTITY_VERIFICATION_ELIGIBLE_STATUSES, true)) {
                return null;
            }

            $targetUser = User::query()->find($userId);

            if ($targetUser === null || trim((string) $targetUser->email) === '') {
                return null;
            }

            $openEscalation = DeepfakeEscalation::query()
                ->where('consultation_id', $consultation->id)
                ->where('type', DeepfakeEscalation::TYPE_OTP_VERIFICATION)
                ->where('status', DeepfakeEscalation::STATUS_OPEN)
                ->first();

            if ($openEscalation !== null) {
                return null;
            }

            DeepfakeEscalation::query()->create([
                'consultation_id' => $consultation->id,
                'triggered_by_user_id' => $targetUser->id,
                'triggered_role' => $targetRole,
                'type' => DeepfakeEscalation::TYPE_OTP_VERIFICATION,
                'streak_count' => $streakCount,
                'status' => DeepfakeEscalation::STATUS_OPEN,
                'notes' => $notes,
            ]);

            $statusBeforePause = $consultation->status === Consultation::STATUS_PAUSED
                ? ($consultation->status_before_pause ?? Consultation::STATUS_ONGOING)
                : $consultation->status;

            $consultation->forceFill([
                'status' => Consultation::STATUS_PAUSED,
                'status_before_pause' => $statusBeforePause,
                'identity_verification_target_user_id' => $targetUser->id,
                'identity_verification_target_role' => $targetRole,
                'identity_verification_started_at' => $now,
                'identity_verification_expires_at' => $expiresAt,
                'identity_verification_attempts' => 0,
                'identity_verification_resend_available_at' => $resendAvailableAt,
            ])->save();

            Cache::put(
                $this->cacheKey($consultation),
                [
                    'otp_hash' => $otpHash,
                    'target_user_id' => $targetUser->id,
                    'target_role' => $targetRole,
                    'attempts' => 0,
                    'max_attempts' => $maxAttempts,
                    'resend_count' => 0,
                    'max_resends' => $maxResends,
                    'expires_at' => $expiresAt->toIso8601String(),
                    'resend_available_at' => $resendAvailableAt->toIso8601String(),
                ],
                $expiresAt,
            );

            return [
                'consultation_id' => $consultation->id,
                'target_user_id' => $targetUser->id,
                'target_user_email' => $targetUser->email,
                'target_user_name' => $targetUser->name,
                'target_role' => $targetRole,
                'otp' => $otp,
                'expires_at' => $expiresAt,
            ];
        }, attempts: 5);

        if ($payload === null) {
            return;
        }

        $mailSent = $this->sendOtpMail(
            consultationId: (int) $payload['consultation_id'],
            recipientEmail: (string) $payload['target_user_email'],
            recipientName: (string) $payload['target_user_name'],
            targetRole: (string) $payload['target_role'],
            otp: (string) $payload['otp'],
            expiresAt: $payload['expires_at'],
        );

        if (! $mailSent) {
            $consultation = Consultation::query()->find((int) $payload['consultation_id']);

            if ($consultation !== null) {
                $this->cancelForFailedVerification(
                    $consultation,
                    'Identity verification code could not be delivered. Consultation cancelled for safety.'
                );
            }

            return;
        }

        $this->disconnectFlaggedParticipant(
            consultationId: (int) $payload['consultation_id'],
            userId: (int) $payload['target_user_id'],
        );
    }

    public function resendForConsultation(Consultation $consultation, User $actor): array
    {
        $this->ensureTargetActor($consultation, $actor);

        if ($consultation->status !== Consultation::STATUS_PAUSED) {
            return [
                'status' => 'invalid_state',
                'message' => 'Consultation is not waiting for identity verification.',
            ];
        }

        $state = Cache::get($this->cacheKey($consultation));

        if (! is_array($state)) {
            $this->cancelForFailedVerification($consultation, 'Identity verification challenge expired.');

            return [
                'status' => 'cancelled',
                'message' => 'Verification challenge expired. Consultation has been cancelled.',
            ];
        }

        $expiresAt = Carbon::parse((string) ($state['expires_at'] ?? now()->toIso8601String()));

        if (now()->greaterThanOrEqualTo($expiresAt)) {
            $this->cancelForFailedVerification($consultation, 'Identity verification challenge expired.');

            return [
                'status' => 'cancelled',
                'message' => 'Verification challenge expired. Consultation has been cancelled.',
            ];
        }

        $resendAvailableAt = Carbon::parse((string) ($state['resend_available_at'] ?? now()->toIso8601String()));

        if (now()->lessThan($resendAvailableAt)) {
            $secondsRemaining = now()->diffInSeconds($resendAvailableAt, false);

            return [
                'status' => 'cooldown',
                'message' => sprintf('Please wait %d seconds before requesting a new code.', max(0, $secondsRemaining)),
            ];
        }

        $maxResends = max(0, (int) ($state['max_resends'] ?? config('auth_otp.otp.max_resends', 3)));
        $resendCount = (int) ($state['resend_count'] ?? 0);

        if ($resendCount >= $maxResends) {
            return [
                'status' => 'limit_reached',
                'message' => 'Maximum resend attempts reached for this verification challenge.',
            ];
        }

        $otp = $this->generateOtp();
        $ttlSeconds = max(60, (int) config('auth_otp.otp.ttl', 300));
        $resendCooldownSeconds = max(1, (int) config('auth_otp.otp.resend_cooldown', 60));
        $newExpiresAt = now()->addSeconds($ttlSeconds);
        $newResendAvailableAt = now()->addSeconds($resendCooldownSeconds);

        $state['otp_hash'] = Hash::make($otp);
        $state['resend_count'] = $resendCount + 1;
        $state['expires_at'] = $newExpiresAt->toIso8601String();
        $state['resend_available_at'] = $newResendAvailableAt->toIso8601String();

        Cache::put($this->cacheKey($consultation), $state, $newExpiresAt);

        $consultation->forceFill([
            'identity_verification_started_at' => now(),
            'identity_verification_expires_at' => $newExpiresAt,
            'identity_verification_resend_available_at' => $newResendAvailableAt,
        ])->save();

        $email = trim((string) $actor->email);

        if ($email === '' || ! $this->sendOtpMail(
            consultationId: $consultation->id,
            recipientEmail: $email,
            recipientName: $actor->name,
            targetRole: (string) $consultation->identity_verification_target_role,
            otp: $otp,
            expiresAt: $newExpiresAt,
        )) {
            return [
                'status' => 'send_failed',
                'message' => 'Unable to send a new verification code right now.',
            ];
        }

        return [
            'status' => 'sent',
            'message' => 'A new verification code has been sent to your email.',
        ];
    }

    public function verifyForConsultation(Consultation $consultation, User $actor, string $otpCode): array
    {
        $this->ensureTargetActor($consultation, $actor);

        if ($consultation->status !== Consultation::STATUS_PAUSED) {
            return [
                'status' => 'invalid_state',
                'message' => 'Consultation is not waiting for identity verification.',
            ];
        }

        $state = Cache::get($this->cacheKey($consultation));

        if (! is_array($state)) {
            $this->cancelForFailedVerification($consultation, 'Identity verification challenge expired.', $actor->id);

            return [
                'status' => 'cancelled',
                'message' => 'Verification challenge expired. Consultation has been cancelled.',
            ];
        }

        $expiresAt = Carbon::parse((string) ($state['expires_at'] ?? now()->toIso8601String()));

        if (now()->greaterThanOrEqualTo($expiresAt)) {
            $this->cancelForFailedVerification($consultation, 'Identity verification challenge expired.', $actor->id);

            return [
                'status' => 'cancelled',
                'message' => 'Verification challenge expired. Consultation has been cancelled.',
            ];
        }

        if (! Hash::check($otpCode, (string) ($state['otp_hash'] ?? ''))) {
            $attempts = (int) ($state['attempts'] ?? 0) + 1;
            $maxAttempts = max(1, (int) ($state['max_attempts'] ?? config('auth_otp.otp.max_attempts', 5)));
            $state['attempts'] = $attempts;

            $consultation->forceFill([
                'identity_verification_attempts' => $attempts,
            ])->save();

            if ($attempts >= $maxAttempts) {
                $this->cancelForFailedVerification(
                    $consultation,
                    'Identity verification failed after maximum OTP attempts.',
                    $actor->id
                );

                return [
                    'status' => 'cancelled',
                    'message' => 'Maximum OTP attempts reached. Consultation has been cancelled.',
                ];
            }

            Cache::put($this->cacheKey($consultation), $state, $expiresAt);

            return [
                'status' => 'invalid_otp',
                'message' => sprintf('Invalid verification code. %d attempt(s) remaining.', $maxAttempts - $attempts),
            ];
        }

        $verificationCompleted = DB::transaction(function () use ($consultation, $actor): bool {
            $lockedConsultation = Consultation::query()
                ->whereKey($consultation->id)
                ->lockForUpdate()
                ->first();

            if ($lockedConsultation === null) {
                return false;
            }

            $this->resumeFromIdentityVerification(
                consultation: $lockedConsultation,
                resolvedBy: $actor->id,
                escalationNotes: 'Identity verification succeeded. Consultation resumed.',
            );

            return true;
        }, attempts: 5);

        if (! $verificationCompleted) {
            return [
                'status' => 'invalid_state',
                'message' => 'Consultation is not waiting for identity verification.',
            ];
        }

        Cache::forget($this->cacheKey($consultation));

        return [
            'status' => 'verified',
            'message' => 'Identity verified successfully. Consultation resumed.',
        ];
    }

    public function overrideForConsultation(Consultation $consultation, User $actor): array
    {
        $this->ensureDoctorOverrideActor($consultation, $actor);

        if ($consultation->status !== Consultation::STATUS_PAUSED) {
            return [
                'status' => 'invalid_state',
                'message' => 'Consultation is not waiting for identity verification.',
            ];
        }

        $overrideApplied = DB::transaction(function () use ($consultation, $actor): bool {
            $lockedConsultation = Consultation::query()
                ->whereKey($consultation->id)
                ->lockForUpdate()
                ->first();

            if ($lockedConsultation === null || $lockedConsultation->status !== Consultation::STATUS_PAUSED) {
                return false;
            }

            $this->resumeFromIdentityVerification(
                consultation: $lockedConsultation,
                resolvedBy: $actor->id,
                escalationNotes: 'Identity verification manually overridden by assigned doctor. Consultation resumed.',
            );

            return true;
        }, attempts: 5);

        if (! $overrideApplied) {
            return [
                'status' => 'invalid_state',
                'message' => 'Consultation is not waiting for identity verification.',
            ];
        }

        Cache::forget($this->cacheKey($consultation));

        return [
            'status' => 'overridden',
            'message' => 'Manual override applied. Consultation resumed.',
        ];
    }

    public function cancelForFailedVerification(
        Consultation $consultation,
        string $reason,
        ?int $resolvedBy = null
    ): void {
        $consultationCancelled = DB::transaction(function () use ($consultation, $reason, $resolvedBy): bool {
            $lockedConsultation = Consultation::query()
                ->whereKey($consultation->id)
                ->lockForUpdate()
                ->first();

            if ($lockedConsultation === null) {
                return false;
            }

            $lockedConsultation->forceFill([
                'status' => Consultation::STATUS_CANCELLED,
                'cancellation_reason' => $reason,
                'ended_at' => $lockedConsultation->ended_at ?? now(),
                'status_before_pause' => null,
                'identity_verification_target_user_id' => null,
                'identity_verification_target_role' => null,
                'identity_verification_started_at' => null,
                'identity_verification_expires_at' => null,
                'identity_verification_attempts' => 0,
                'identity_verification_resend_available_at' => null,
            ])->save();

            $this->resolveOpenEscalation(
                consultationId: $lockedConsultation->id,
                decision: 'cancel',
                notes: $reason,
                resolvedBy: $resolvedBy,
            );

            return true;
        }, attempts: 5);

        if (! $consultationCancelled) {
            return;
        }

        Cache::forget($this->cacheKey($consultation));

        $freshConsultation = Consultation::query()->find($consultation->id);

        if ($freshConsultation === null) {
            return;
        }

        try {
            $this->liveKitService->deleteRoom($freshConsultation);
        } catch (Throwable $exception) {
            report($exception);

            Consultation::query()->whereKey($consultation->id)->update([
                'livekit_last_error' => $exception->getMessage(),
            ]);
        }
    }

    private function resolveOpenEscalation(
        int $consultationId,
        string $decision,
        string $notes,
        ?int $resolvedBy,
    ): void {
        $escalation = DeepfakeEscalation::query()
            ->where('consultation_id', $consultationId)
            ->where('type', DeepfakeEscalation::TYPE_OTP_VERIFICATION)
            ->where('status', DeepfakeEscalation::STATUS_OPEN)
            ->latest('id')
            ->first();

        if ($escalation === null) {
            return;
        }

        $escalation->update([
            'status' => DeepfakeEscalation::STATUS_RESOLVED,
            'decision' => $decision,
            'resolved_by' => $resolvedBy,
            'resolved_at' => now(),
            'notes' => $notes,
        ]);
    }

    private function resumeFromIdentityVerification(
        Consultation $consultation,
        int $resolvedBy,
        string $escalationNotes,
    ): void {
        $statusBeforePause = $consultation->status_before_pause ?? Consultation::STATUS_ONGOING;

        if ($statusBeforePause === Consultation::STATUS_PAUSED) {
            $statusBeforePause = Consultation::STATUS_ONGOING;
        }

        $consultation->forceFill([
            'status' => $statusBeforePause,
            'status_before_pause' => null,
            'identity_verification_target_user_id' => null,
            'identity_verification_target_role' => null,
            'identity_verification_started_at' => null,
            'identity_verification_expires_at' => null,
            'identity_verification_attempts' => 0,
            'identity_verification_resend_available_at' => null,
        ])->save();

        $this->resolveOpenEscalation(
            consultationId: $consultation->id,
            decision: 'continue',
            notes: $escalationNotes,
            resolvedBy: $resolvedBy,
        );
    }

    private function ensureTargetActor(Consultation $consultation, User $actor): void
    {
        if ((int) $consultation->identity_verification_target_user_id !== $actor->id) {
            throw new AuthorizationException('Only the flagged participant can complete this identity verification.');
        }
    }

    private function ensureDoctorOverrideActor(Consultation $consultation, User $actor): void
    {
        if (! $actor->isDoctor() || (int) $consultation->doctor_id !== $actor->id) {
            throw new AuthorizationException('Only the assigned doctor can manually override identity verification.');
        }
    }

    private function disconnectFlaggedParticipant(int $consultationId, int $userId): void
    {
        $consultation = Consultation::query()->find($consultationId);
        $user = User::query()->find($userId);

        if ($consultation === null || $user === null) {
            return;
        }

        try {
            $this->liveKitService->removeParticipantFromConsultation($consultation, $user);
        } catch (Throwable $exception) {
            report($exception);

            Consultation::query()->whereKey($consultation->id)->update([
                'livekit_last_error' => $exception->getMessage(),
            ]);
        }
    }

    private function sendOtpMail(
        int $consultationId,
        string $recipientEmail,
        string $recipientName,
        string $targetRole,
        string $otp,
        DateTimeInterface $expiresAt,
    ): bool {
        try {
            Mail::send(new ConsultationIdentityOtpMail(
                consultationId: $consultationId,
                recipientEmail: $recipientEmail,
                recipientName: $recipientName,
                targetRole: $targetRole,
                otp: $otp,
                expiryMinutes: max(1, now()->diffInMinutes($expiresAt)),
            ));

            return true;
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }
    }

    private function generateOtp(): string
    {
        $length = max(4, (int) config('auth_otp.otp.length', 6));
        $max = (10 ** $length) - 1;

        return str_pad((string) random_int(0, $max), $length, '0', STR_PAD_LEFT);
    }

    private function cacheKey(Consultation $consultation): string
    {
        return self::CACHE_PREFIX.$consultation->id;
    }
}
