<?php

namespace App\Concerns;

trait InteractsWithLiveKitParticipants
{
    protected function participantRepresentsUser(string $identity, int $userId): bool
    {
        return $identity === sprintf('user-%d', $userId) || $identity === (string) $userId;
    }

    /**
     * LiveKit participant metadata is expected to be a JSON object.
     * JSON arrays are intentionally ignored and treated as empty metadata.
     *
     * @return array<string, mixed>
     */
    protected function decodeParticipantMetadata(mixed $metadata): array
    {
        if ($metadata === null || ! is_string($metadata) || $metadata === '') {
            return [];
        }

        $decoded = json_decode($metadata, true);

        if (! is_array($decoded) || array_is_list($decoded)) {
            return [];
        }

        return $decoded;
    }
}
