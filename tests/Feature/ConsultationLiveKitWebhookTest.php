<?php

use App\Models\Consultation;

/**
 * Build a LiveKit-style webhook JWT whose payload includes a sha256 body hash.
 * In the test we use postJson($uri, $data), which sends json_encode($data) as
 * the raw body.  The token must be signed against that exact byte sequence.
 */
function livekitWebhookToken(string $rawBody, string $apiSecret = 'test-secret'): string
{
    $headerJson = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $payloadJson = json_encode([
        'sub' => 'livekit-server',
        'iat' => now()->timestamp,
        'exp' => now()->addMinutes(5)->timestamp,
        'sha256' => hash('sha256', $rawBody),
    ]);

    $b64url = fn (string $s): string => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');

    $encodedHeader = $b64url($headerJson);
    $encodedPayload = $b64url($payloadJson);
    $signingInput = $encodedHeader.'.'.$encodedPayload;
    $signature = hash_hmac('sha256', $signingInput, $apiSecret, true);

    return $signingInput.'.'.$b64url($signature);
}

beforeEach(function () {
    config()->set('services.livekit.api_key', 'test-key');
    config()->set('services.livekit.api_secret', 'test-secret');
});

it('returns 401 when Authorization header is missing', function () {
    $this->postJson(route('livekit.webhook'), ['event' => 'room_finished', 'room' => ['name' => 'test']])
        ->assertUnauthorized();
});

it('returns 401 when webhook JWT signature is invalid', function () {
    $data = ['event' => 'room_finished', 'room' => ['name' => 'test-room']];

    $this->withHeaders(['Authorization' => 'bad.jwt.token'])
        ->postJson(route('livekit.webhook'), $data)
        ->assertUnauthorized();
});

it('marks room as ended on room_finished event', function () {
    $consultation = Consultation::factory()->teleconsultation()->create([
        'livekit_room_name' => 'consultation-55-abc12345',
        'livekit_room_status' => 'room_ready',
    ]);

    $data = [
        'event' => 'room_finished',
        'room' => ['name' => 'consultation-55-abc12345', 'sid' => 'RM_test'],
        'id' => 'EV_test',
        'createdAt' => now()->timestamp,
    ];

    // postJson sends json_encode($data) as the raw body — sign against that exact string
    $body = json_encode($data);
    $token = livekitWebhookToken($body);

    $this->withHeaders(['Authorization' => $token])
        ->postJson(route('livekit.webhook'), $data)
        ->assertNoContent();

    $consultation->refresh();

    expect($consultation->livekit_room_status)->toBe('ended');
    expect($consultation->livekit_ended_at)->not->toBeNull();
});

it('updates last activity on participant_joined event', function () {
    $consultation = Consultation::factory()->teleconsultation()->create([
        'livekit_room_name' => 'consultation-66-xyz98765',
        'livekit_room_status' => 'room_ready',
        'livekit_last_activity_at' => now()->subHour(),
    ]);

    $data = [
        'event' => 'participant_joined',
        'room' => ['name' => 'consultation-66-xyz98765'],
        'participant' => ['identity' => 'user-1'],
        'id' => 'EV_join',
        'createdAt' => now()->timestamp,
    ];

    $body = json_encode($data);
    $token = livekitWebhookToken($body);

    $this->withHeaders(['Authorization' => $token])
        ->postJson(route('livekit.webhook'), $data)
        ->assertNoContent();

    $consultation->refresh();

    expect($consultation->livekit_last_activity_at->isAfter(now()->subMinute()))->toBeTrue();
    expect($consultation->livekit_room_status)->toBe('room_ready');
});

it('returns no content for unknown room names', function () {
    $data = [
        'event' => 'room_finished',
        'room' => ['name' => 'nonexistent-room'],
    ];

    $body = json_encode($data);
    $token = livekitWebhookToken($body);

    $this->withHeaders(['Authorization' => $token])
        ->postJson(route('livekit.webhook'), $data)
        ->assertNoContent();
});

it('returns no content for events without a room name', function () {
    $data = ['event' => 'room_finished'];

    $body = json_encode($data);
    $token = livekitWebhookToken($body);

    $this->withHeaders(['Authorization' => $token])
        ->postJson(route('livekit.webhook'), $data)
        ->assertNoContent();
});
