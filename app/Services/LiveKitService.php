<?php

namespace App\Services;

use App\Models\Consultation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class LiveKitService
{
    public function ensureRoomForConsultation(Consultation $consultation): Consultation
    {
        if ($consultation->type !== 'teleconsultation') {
            return $consultation;
        }

        return DB::transaction(function () use ($consultation): Consultation {
            $lockedConsultation = Consultation::query()
                ->whereKey($consultation->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedConsultation->livekit_room_name !== null) {
                return $lockedConsultation;
            }

            $roomName = $this->buildRoomName($lockedConsultation);
            $roomSid = $this->createRoom($roomName);

            $lockedConsultation->forceFill([
                'livekit_room_name' => $roomName,
                'livekit_room_sid' => $roomSid,
                'livekit_room_status' => 'room_ready',
                'livekit_room_created_at' => now(),
                'livekit_last_error' => null,
            ])->save();

            return $lockedConsultation;
        });
    }

    public function issueParticipantToken(Consultation $consultation, User $user, bool $isAdminAudit = false): string
    {
        if ($consultation->livekit_room_name === null) {
            throw new RuntimeException('Cannot issue participant token without a provisioned room.');
        }

        $ttlInMinutes = (int) config('services.livekit.participant_ttl_minutes', 120);
        $issuedAt = now();

        return $this->issueJwt([
            'sub' => sprintf('user-%d', $user->id),
            'name' => $user->name,
            'nbf' => $issuedAt->timestamp,
            'iat' => $issuedAt->timestamp,
            'exp' => $issuedAt->copy()->addMinutes($ttlInMinutes)->timestamp,
            'video' => [
                'roomJoin' => true,
                'room' => $consultation->livekit_room_name,
                'canPublish' => ! $isAdminAudit,
                'canPublishData' => ! $isAdminAudit,
                'canSubscribe' => true,
            ],
            'metadata' => json_encode([
                'role' => $user->role,
                'consultation_id' => $consultation->id,
                'audit_mode' => $isAdminAudit,
            ]),
        ]);
    }

    public function issuePipelineToken(Consultation $consultation): string
    {
        if ($consultation->livekit_room_name === null) {
            throw new RuntimeException('Cannot issue pipeline token without a provisioned room.');
        }

        $issuedAt = now();

        return $this->issueJwt([
            'sub' => sprintf('pipeline-bot-%d', $consultation->id),
            'name' => 'DeepfakePipelineBot',
            'nbf' => $issuedAt->timestamp,
            'iat' => $issuedAt->timestamp,
            'exp' => $issuedAt->copy()->addMinutes(60)->timestamp,
            'video' => [
                'roomJoin' => true,
                'room' => $consultation->livekit_room_name,
                'canPublish' => false,
                'canPublishData' => false,
                'canSubscribe' => true,
                'hidden' => true,
                'recorder' => true,
            ],
        ]);
    }

    public function removeParticipantFromConsultation(Consultation $consultation, User $user): void
    {
        if ($consultation->livekit_room_name === null) {
            return;
        }

        $baseUrl = trim((string) config('services.livekit.url'));

        if ($baseUrl === '') {
            throw new RuntimeException('Missing services.livekit.url configuration value.');
        }

        $serverToken = $this->issueJwt([
            'sub' => 'consultation-room-admin',
            'nbf' => now()->timestamp,
            'iat' => now()->timestamp,
            'exp' => now()->addMinutes(5)->timestamp,
            'video' => [
                'roomAdmin' => true,
            ],
        ]);

        $identity = sprintf('user-%d', $user->id);

        $response = Http::acceptJson()
            ->withToken($serverToken)
            ->asJson()
            ->post(rtrim($baseUrl, '/').'/twirp/livekit.RoomService/RemoveParticipant', [
                'room' => $consultation->livekit_room_name,
                'identity' => $identity,
            ]);

        if ($response->successful()) {
            return;
        }

        $errorCode = (string) $response->json('code');

        if ($response->status() === 404 || in_array($errorCode, ['not_found', 'participant_not_found'], true)) {
            return;
        }

        throw new RuntimeException(
            sprintf('LiveKit participant removal failed [%d]: %s', $response->status(), $response->body())
        );
    }

    public function deleteRoom(Consultation $consultation): void
    {
        if ($consultation->livekit_room_name === null) {
            return;
        }

        $baseUrl = trim((string) config('services.livekit.url'));

        if ($baseUrl === '') {
            throw new RuntimeException('Missing services.livekit.url configuration value.');
        }

        $serverToken = $this->issueJwt([
            'sub' => 'consultation-room-admin',
            'nbf' => now()->timestamp,
            'iat' => now()->timestamp,
            'exp' => now()->addMinutes(5)->timestamp,
            'video' => [
                'roomAdmin' => true,
            ],
        ]);

        $response = Http::acceptJson()
            ->withToken($serverToken)
            ->asJson()
            ->post(rtrim($baseUrl, '/').'/twirp/livekit.RoomService/DeleteRoom', [
                'room' => $consultation->livekit_room_name,
            ]);

        $errorCode = (string) $response->json('code');

        if (! $response->successful() && ! ($response->status() === 404 || $errorCode === 'not_found')) {
            throw new RuntimeException(
                sprintf('LiveKit room deletion failed [%d]: %s', $response->status(), $response->body())
            );
        }

        $consultation->forceFill([
            'livekit_room_status' => 'ended',
            'livekit_ended_at' => now(),
            'livekit_last_activity_at' => now(),
            'livekit_last_error' => null,
        ])->save();
    }

    protected function createRoom(string $roomName): ?string
    {
        $baseUrl = trim((string) config('services.livekit.url'));

        if ($baseUrl === '') {
            throw new RuntimeException('Missing services.livekit.url configuration value.');
        }

        $serverToken = $this->issueJwt([
            'sub' => 'consultation-room-provisioner',
            'nbf' => now()->timestamp,
            'iat' => now()->timestamp,
            'exp' => now()->addMinutes(5)->timestamp,
            'video' => [
                'roomCreate' => true,
                'roomAdmin' => true,
                'roomList' => true,
            ],
        ]);

        $response = Http::acceptJson()
            ->withToken($serverToken)
            ->asJson()
            ->post(rtrim($baseUrl, '/').'/twirp/livekit.RoomService/CreateRoom', [
                'name' => $roomName,
                'empty_timeout' => (int) config('services.livekit.empty_timeout_seconds', 600),
                'max_participants' => (int) config('services.livekit.max_participants', 3),
            ]);

        if ($response->successful()) {
            return $response->json('sid');
        }

        $errorCode = (string) $response->json('code');

        if ($response->status() === 409 || $errorCode === 'already_exists') {
            return null;
        }

        throw new RuntimeException(
            sprintf('LiveKit room creation failed [%d]: %s', $response->status(), $response->body())
        );
    }

    protected function issueJwt(array $claims): string
    {
        $apiKey = trim((string) config('services.livekit.api_key'));
        $apiSecret = trim((string) config('services.livekit.api_secret'));

        if ($apiKey === '' || $apiSecret === '') {
            throw new RuntimeException('Missing LiveKit API credentials.');
        }

        $header = [
            'alg' => 'HS256',
            'typ' => 'JWT',
        ];

        $payload = [
            'iss' => $apiKey,
            ...$claims,
        ];

        $encodedHeader = $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR));
        $encodedPayload = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $encodedHeader.'.'.$encodedPayload, $apiSecret, true);

        return $encodedHeader.'.'.$encodedPayload.'.'.$this->base64UrlEncode($signature);
    }

    protected function buildRoomName(Consultation $consultation): string
    {
        $sessionTokenSuffix = substr((string) $consultation->session_token, 0, 8);

        return sprintf('consultation-%d-%s', $consultation->id, $sessionTokenSuffix);
    }

    protected function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
