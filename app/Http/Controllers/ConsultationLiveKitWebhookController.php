<?php

namespace App\Http\Controllers;

use App\Concerns\InteractsWithLiveKitParticipants;
use App\Models\Consultation;
use App\Services\LiveKitService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

class ConsultationLiveKitWebhookController extends Controller
{
    use InteractsWithLiveKitParticipants;

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

        // Handle the case where doctor leaves while patient never joined the consultation.
        // This can happen via explicit leave or network disconnect.
        if (
            $eventType === 'participant_left'
            && $participantRole === 'doctor'
            && ! in_array($consultation->status, Consultation::TERMINAL_STATUSES, true)
        ) {
            $this->handleDoctorDeparture($consultation);
        }

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

        if ($this->participantRepresentsUser($identity, (int) $consultation->doctor_id)) {
            return 'doctor';
        }

        $consultation->loadMissing('patient');
        $patientUserId = $consultation->patient?->user_id;

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

    /**
     * Handle doctor departure, including cleanup and status updates.
     * 
     * When the doctor leaves (either via explicit leave or network disconnect),
     * we need to check if the patient is still in the room and handle cleanup accordingly.
     * If the patient never joined, mark the consultation as NO_SHOW.
     */
    private function handleDoctorDeparture(Consultation $consultation): void
    {
        try {
            $participants = $this->liveKitService->listParticipants($consultation);
            $hasPatient = $this->hasPatientParticipantInRoom($consultation, $participants);

            // If patient is still in the room, don't end the session.
            // Let the patient or the room_finished event handle cleanup.
            if ($hasPatient) {
                Log::info('Doctor left but patient still in LiveKit room.', [
                    'consultation_id' => $consultation->id,
                    'room_name' => $consultation->livekit_room_name,
                ]);

                return;
            }

            // Doctor left and patient is not in room. Check if patient ever joined.
            if ($consultation->livekit_patient_joined_at === null) {
                // Patient never joined - this is a no-show scenario.
                // Delete the room and mark consultation as NO_SHOW.
                Log::info('Doctor left and patient never joined. Marking as no-show.', [
                    'consultation_id' => $consultation->id,
                    'room_name' => $consultation->livekit_room_name,
                ]);

                try {
                    $this->liveKitService->deleteRoom($consultation);
                } catch (Throwable $exception) {
                    Log::error('Failed to delete LiveKit room during no-show cleanup.', [
                        'consultation_id' => $consultation->id,
                        'room_name' => $consultation->livekit_room_name,
                        'error' => $exception->getMessage(),
                    ]);

                    $consultation->forceFill([
                        'livekit_last_error' => $exception->getMessage(),
                    ])->save();

                    return;
                }

                $consultation->forceFill([
                    'status' => Consultation::STATUS_NO_SHOW,
                    'ended_at' => now(),
                    'cancellation_reason' => 'Doctor left the consultation without patient joining.',
                    'livekit_room_status' => 'ended',
                    'livekit_ended_at' => now(),
                ])->save();

                return;
            }

            // Doctor left and patient is alone in the room.
            // Mark as cancelled since the patient was present but the doctor left.
            Log::info('Doctor left and patient is alone in room. Marking as cancelled.', [
                'consultation_id' => $consultation->id,
                'room_name' => $consultation->livekit_room_name,
            ]);

            try {
                $this->liveKitService->deleteRoom($consultation);
            } catch (Throwable $exception) {
                Log::error('Failed to delete LiveKit room during doctor departure cleanup.', [
                    'consultation_id' => $consultation->id,
                    'room_name' => $consultation->livekit_room_name,
                    'error' => $exception->getMessage(),
                ]);

                $consultation->forceFill([
                    'livekit_last_error' => $exception->getMessage(),
                ])->save();

                return;
            }

            $consultation->forceFill([
                'status' => Consultation::STATUS_CANCELLED,
                'ended_at' => now(),
                'cancellation_reason' => 'Doctor disconnected from the consultation.',
                'livekit_room_status' => 'ended',
                'livekit_ended_at' => now(),
            ])->save();
        } catch (Throwable $exception) {
            Log::error('Error handling doctor departure from LiveKit room.', [
                'consultation_id' => $consultation->id,
                'room_name' => $consultation->livekit_room_name,
                'error' => $exception->getMessage(),
            ]);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();
        }
    }

    /**
     * Check if a patient participant exists in the room.
     * @param  array<int, array{identity: string, metadata: ?string}>  $participants
     */
    private function hasPatientParticipantInRoom(Consultation $consultation, array $participants): bool
    {
        $patientUserId = $consultation->patient()->value('user_id');

        foreach ($participants as $participant) {
            if ($patientUserId !== null && $this->participantRepresentsUser($participant['identity'], (int) $patientUserId)) {
                return true;
            }

            $metadata = $this->decodeParticipantMetadata($participant['metadata']);

            if (($metadata['role'] ?? null) === 'patient') {
                return true;
            }
        }

        return false;
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
