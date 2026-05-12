<?php

use App\Concerns\InteractsWithLiveKitParticipants;

it('matches user identities using both supported formats', function () {
    $helper = new class
    {
        use InteractsWithLiveKitParticipants;

        public function representsUser(string $identity, int $userId): bool
        {
            return $this->participantRepresentsUser($identity, $userId);
        }
    };

    expect($helper->representsUser('user-42', 42))->toBeTrue()
        ->and($helper->representsUser('42', 42))->toBeTrue()
        ->and($helper->representsUser('user-999', 42))->toBeFalse();
});

it('decodes participant metadata only for valid JSON objects', function (mixed $metadata, array $expectedDecoded) {
    $helper = new class
    {
        use InteractsWithLiveKitParticipants;

        /**
         * @return array<string, mixed>
         */
        public function decode(mixed $metadata): array
        {
            return $this->decodeParticipantMetadata($metadata);
        }
    };

    expect($helper->decode($metadata))->toBe($expectedDecoded);
})->with([
    [null, []],
    ['', []],
    [123, []],
    [false, []],
    [[], []],
    ['not-json', []],
    ['"string-value"', []],
    ['[1,2,3]', []],
    ['{"role":"patient","audit_mode":false}', ['role' => 'patient', 'audit_mode' => false]],
]);
