<?php

namespace App\Services;

use App\Models\Consultation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
            'sub' => $this->buildParticipantIdentity($user),
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
                'canPublishData' => true,
                'canSubscribe' => true,
                'hidden' => true,
                'recorder' => true,
            ],
        ]);
    }

    /**
     * @param  array<int, string>  $roomNames
     * @return array<string, int>
     */
    public function activeRoomParticipantCounts(array $roomNames): array
    {
        $roomNames = array_values(array_unique(array_filter(
            array_map(fn (string $roomName): string => trim($roomName), $roomNames),
            fn (string $roomName): bool => $roomName !== ''
        )));

        if ($roomNames === []) {
            return [];
        }

        $baseUrl = trim((string) config('services.livekit.url'));

        if ($baseUrl === '') {
            throw new RuntimeException('Missing services.livekit.url configuration value.');
        }

        $serverToken = $this->issueJwt([
            'sub' => 'consultation-room-lister',
            'nbf' => now()->timestamp,
            'iat' => now()->timestamp,
            'exp' => now()->addMinutes(5)->timestamp,
            'video' => [
                'roomList' => true,
            ],
        ]);

        $participantCounts = [];

        foreach (array_chunk($roomNames, 100) as $roomNameChunk) {
            $response = Http::acceptJson()
                ->withToken($serverToken)
                ->asJson()
                ->post(rtrim($baseUrl, '/').'/twirp/livekit.RoomService/ListRooms', [
                    'names' => $roomNameChunk,
                ]);

            if (! $response->successful()) {
                Log::warning('LiveKit room listing failed for pipeline room discovery.', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                throw new RuntimeException(
                    sprintf('LiveKit room listing failed [%d]: %s', $response->status(), $response->body())
                );
            }

            foreach ((array) $response->json('rooms', []) as $room) {
                if (! is_array($room)) {
                    continue;
                }

                $name = (string) ($room['name'] ?? '');

                if ($name === '') {
                    continue;
                }

                $participantCounts[$name] = (int) ($room['num_participants'] ?? 0);
            }
        }

        return $participantCounts;
    }

    public function removeParticipantFromConsultation(Consultation $consultation, User $user): void
    {
        foreach ($this->candidateParticipantIdentities($user) as $identity) {
            if ($this->removeParticipantByIdentity($consultation, $identity)) {
                return;
            }
        }
    }

    public function removeParticipantByIdentity(Consultation $consultation, string $identity): bool
    {
        if ($consultation->livekit_room_name === null || trim($identity) === '') {
            return false;
        }

        $baseUrl = trim((string) config('services.livekit.url'));

        if ($baseUrl === '') {
            throw new RuntimeException('Missing services.livekit.url configuration value.');
        }

        $serverToken = $this->issueRoomAdminToken($consultation->livekit_room_name);

        $response = Http::acceptJson()
            ->withToken($serverToken)
            ->asJson()
            ->post(rtrim($baseUrl, '/').'/twirp/livekit.RoomService/RemoveParticipant', [
                'room' => $consultation->livekit_room_name,
                'identity' => $identity,
            ]);

        if ($response->successful()) {
            return true;
        }

        $errorCode = (string) $response->json('code');

        if ($response->status() === 404 || in_array($errorCode, ['not_found', 'participant_not_found'], true)) {
            return false;
        }

        throw new RuntimeException(
            sprintf('LiveKit participant removal failed [%d]: %s', $response->status(), $response->body())
        );
    }

    /**
     * @return array<int, array{identity: string, metadata: ?string}>
     */
    public function listParticipants(Consultation $consultation): array
    {
        if ($consultation->livekit_room_name === null) {
            return [];
        }

        $baseUrl = trim((string) config('services.livekit.url'));

        if ($baseUrl === '') {
            throw new RuntimeException('Missing services.livekit.url configuration value.');
        }

        $serverToken = $this->issueRoomAdminToken($consultation->livekit_room_name);

        $response = Http::acceptJson()
            ->withToken($serverToken)
            ->asJson()
            ->post(rtrim($baseUrl, '/').'/twirp/livekit.RoomService/ListParticipants', [
                'room' => $consultation->livekit_room_name,
            ]);

        $errorCode = (string) $response->json('code');

        if ($response->status() === 404 || $errorCode === 'not_found') {
            return [];
        }

        if (! $response->successful()) {
            throw new RuntimeException(
                sprintf('LiveKit participant listing failed [%d]: %s', $response->status(), $response->body())
            );
        }

        $participants = [];

        foreach ((array) $response->json('participants', []) as $participant) {
            if (! is_array($participant)) {
                continue;
            }

            $identity = trim((string) ($participant['identity'] ?? ''));

            if ($identity === '') {
                continue;
            }

            $metadata = $participant['metadata'] ?? null;

            $participants[] = [
                'identity' => $identity,
                'metadata' => is_string($metadata) && $metadata !== '' ? $metadata : null,
            ];
        }

        return $participants;
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

        $serverToken = $this->issueRoomAdminToken($consultation->livekit_room_name);

        // Try deletion by room name first. If that fails for reasons other
        // than not-found, attempt a fallback using the stored room SID (if
        // available). This improves robustness when LiveKit rejects by-name
        // deletes but accepts SID-based deletes.
        $deleteEndpoint = rtrim($baseUrl, '/').'/twirp/livekit.RoomService/DeleteRoom';

        $response = Http::acceptJson()
            ->withToken($serverToken)
            ->asJson()
            ->post($deleteEndpoint, [
                'room' => $consultation->livekit_room_name,
            ]);

        $errorCode = (string) $response->json('code');

        if (! $response->successful() && ! ($response->status() === 404 || $errorCode === 'not_found')) {
            // Log original failure and attempt fallback by SID if available.
            Log::warning('LiveKit DeleteRoom by name failed, attempting SID fallback.', [
                'room' => $consultation->livekit_room_name,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $roomSid = $consultation->livekit_room_sid;

            if ($roomSid !== null && trim((string) $roomSid) !== '') {
                $fallbackResponse = Http::acceptJson()
                    ->withToken($serverToken)
                    ->asJson()
                    ->post($deleteEndpoint, [
                        'sid' => $roomSid,
                    ]);

                $fallbackErrorCode = (string) $fallbackResponse->json('code');

                if (! $fallbackResponse->successful() && ! ($fallbackResponse->status() === 404 || $fallbackErrorCode === 'not_found')) {
                    throw new RuntimeException(
                        sprintf('LiveKit room deletion failed (name then sid) [%d]: %s', $fallbackResponse->status(), $fallbackResponse->body())
                    );
                }
            } else {
                throw new RuntimeException(
                    sprintf('LiveKit room deletion failed [%d]: %s', $response->status(), $response->body())
                );
            }
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

    /**
     * @return array<int, string>
     */
    private function candidateParticipantIdentities(User $user): array
    {
        return array_values(array_unique([
            $this->buildParticipantIdentity($user),
            (string) $user->id,
        ]));
    }

    private function buildParticipantIdentity(User $user): string
    {
        return sprintf('user-%d', $user->id);
    }

    private function issueRoomAdminToken(?string $roomName = null): string
    {
        $videoGrant = [
            'roomAdmin' => true,
        ];

        if ($roomName !== null && $roomName !== '') {
            $videoGrant['room'] = $roomName;
        }

        return $this->issueJwt([
            'sub' => 'consultation-room-admin',
            'nbf' => now()->timestamp,
            'iat' => now()->timestamp,
            'exp' => now()->addMinutes(5)->timestamp,
            'video' => $videoGrant,
        ]);
    }
}
