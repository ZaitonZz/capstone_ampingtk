<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Services\LiveKitService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

class ConsultationLiveKitWebhookController extends Controller
{
    public function __construct(private LiveKitService $liveKitService) {}

    public function handle(Request $request): Response
    {
        $rawBody = $request->getContent();

        $authHeader = $request->header('Authorization', '');
        $token = str_starts_with($authHeader, 'Bearer ') ? substr($authHeader, 7) : $authHeader;

        if (! $this->verifyWebhookToken($token, $rawBody)) {
            Log::warning('LiveKit webhook: invalid or missing signature.', [
                'ip' => $request->ip(),
            ]);

            abort(401, 'Invalid webhook signature.');
        }

        /** @var array<string,mixed> $event */
        $event = json_decode($rawBody, true) ?? [];
        $eventType = (string) ($event['event'] ?? '');
        $roomName = (string) ($event['room']['name'] ?? '');

        if ($roomName === '') {
            return response()->noContent();
        }

        $consultation = Consultation::query()
            ->where('livekit_room_name', $roomName)
            ->first();

        if ($consultation === null) {
            return response()->noContent();
        }

        $participantRole = in_array($eventType, ['participant_joined', 'participant_left'], true)
            ? $this->participantRoleForEvent($consultation, $event)
            : null;

        match ($eventType) {
            'participant_joined' => $this->recordParticipantJoined($consultation, $participantRole),
            'participant_left' => $this->recordParticipantLeft($consultation, $participantRole),
            'room_finished' => (function () use ($consultation) {
                $hasDoc = $consultation->hasClinicalDocumentation();
                $shouldComplete = $hasDoc && $consultation->status === Consultation::STATUS_ONGOING;

                return $consultation->forceFill(array_filter([
                    'status' => $shouldComplete ? Consultation::STATUS_COMPLETED : null,
                    'ended_at' => $shouldComplete && $consultation->ended_at === null ? now() : null,
                    'livekit_room_status' => 'ended',
                    'livekit_ended_at' => now(),
                    'livekit_last_activity_at' => now(),
                ], static fn ($value) => $value !== null))->save();
            })(),
            default => null,
        };

        if (
            $eventType === 'participant_joined'
            && $consultation->status === Consultation::STATUS_PAUSED
            && $consultation->identity_verification_target_user_id !== null
        ) {
            $participantIdentity = (string) ($event['participant']['identity'] ?? '');
            $targetUserId = (int) $consultation->identity_verification_target_user_id;
            $targetIdentity = sprintf('user-%d', $targetUserId);

            if ($participantIdentity === $targetIdentity || $participantIdentity === (string) $targetUserId) {
                try {
                    $this->liveKitService->removeParticipantByIdentity($consultation, $participantIdentity);
                } catch (Throwable $exception) {
                    report($exception);

                    $consultation->forceFill([
                        'livekit_last_error' => $exception->getMessage(),
                    ])->save();
                }
            }
        }

        return response()->noContent();
    }

    /**
     * @param  array<string,mixed>  $event
     */
    private function participantRoleForEvent(Consultation $consultation, array $event): ?string
    {
        $participant = $event['participant'] ?? [];
        $participant = is_array($participant) ? $participant : [];

        $identity = (string) ($participant['identity'] ?? '');
        $patientUserId = $consultation->patient()->value('user_id');

        if ($this->participantRepresentsUser($identity, (int) $consultation->doctor_id)) {
            return 'doctor';
        }

        if ($patientUserId !== null && $this->participantRepresentsUser($identity, (int) $patientUserId)) {
            return 'patient';
        }

        $metadata = $this->decodeParticipantMetadata($participant['metadata'] ?? null);
        $role = $metadata['role'] ?? null;

        return in_array($role, ['doctor', 'patient'], true) ? $role : null;
    }

    private function recordParticipantJoined(Consultation $consultation, ?string $role): void
    {
        $now = now();
        $updates = [
            'status' => in_array($consultation->status, Consultation::RESCHEDULABLE_STATUSES, true)
                ? Consultation::STATUS_ONGOING
                : $consultation->status,
            'started_at' => $consultation->started_at ?? $now,
            'livekit_last_activity_at' => $now,
        ];

        if ($role === 'doctor' && $consultation->livekit_doctor_joined_at === null) {
            $updates['livekit_doctor_joined_at'] = $now;
        }

        if ($role === 'patient' && $consultation->livekit_patient_joined_at === null) {
            $updates['livekit_patient_joined_at'] = $now;
        }

        $consultation->forceFill($updates)->save();
    }

    private function recordParticipantLeft(Consultation $consultation, ?string $role): void
    {
        $now = now();
        $updates = [
            'livekit_last_activity_at' => $now,
        ];

        if ($role === 'doctor') {
            $updates['livekit_doctor_left_at'] = $now;
        }

        if ($role === 'patient') {
            $updates['livekit_patient_left_at'] = $now;
        }

        $consultation->forceFill($updates)->save();
    }

    private function participantRepresentsUser(string $identity, int $userId): bool
    {
        return $identity === sprintf('user-%d', $userId) || $identity === (string) $userId;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeParticipantMetadata(mixed $metadata): array
    {
        if (! is_string($metadata) || $metadata === '') {
            return [];
        }

        $decoded = json_decode($metadata, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Verify the webhook JWT signature and body hash.
     *
     * LiveKit signs webhooks with a JWT whose payload includes a `sha256` field
     * equal to the SHA-256 hex digest of the raw request body.
     */
    private function verifyWebhookToken(string $token, string $rawBody): bool
    {
        $apiSecret = trim((string) config('services.livekit.api_secret', ''));

        if ($apiSecret === '' || $token === '') {
            return false;
        }

        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return false;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        /**
         * 1. Verify HS256 signature.
         */
        $expectedSig = hash_hmac('sha256', $encodedHeader.'.'.$encodedPayload, $apiSecret, true);
        $providedSig = $this->base64UrlDecode($encodedSignature);

        if ($expectedSig === false || $providedSig === false) {
            return false;
        }

        if (! hash_equals($expectedSig, $providedSig)) {
            return false;
        }

        /**
         * 2. Verify body hash from JWT payload.
         */
        $payloadJson = $this->base64UrlDecode($encodedPayload);

        if ($payloadJson === false) {
            return false;
        }

        $payload = json_decode($payloadJson, true);

        if (! is_array($payload)) {
            return false;
        }

        $claimedHash = $payload['sha256'] ?? null;

        if (! is_string($claimedHash) || $claimedHash === '') {
            return false;
        }

        return hash_equals($claimedHash, hash('sha256', $rawBody));
    }

    private function base64UrlDecode(string $input): string|false
    {
        $paddingNeeded = strlen($input) % 4;

        if ($paddingNeeded !== 0) {
            $input .= str_repeat('=', 4 - $paddingNeeded);
        }

        return base64_decode(strtr($input, '-_', '+/'), true);
    }
}
