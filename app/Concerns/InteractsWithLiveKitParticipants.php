<?php

namespace App\Concerns;

trait InteractsWithLiveKitParticipants
{
    protected function participantRepresentsUser(string $identity, int $userId): bool
    {
        return $identity === sprintf('user-%d', $userId) || $identity === (string) $userId;
    }

    /**
     * @return array<string, mixed>
     */
    protected function decodeParticipantMetadata(mixed $metadata): array
    {
        if (! is_string($metadata) || $metadata === '') {
            return [];
        }

        $decoded = json_decode($metadata, true);

        return is_array($decoded) ? $decoded : [];
    }
}
