<?php

use App\Models\Consultation;
use App\Models\DeepfakeScanLog;

function pipelineSignedHeaders(string $body, string $secret = 'pipeline-test-secret'): array
{
    $signature = hash_hmac('sha256', $body, $secret);

    return [
        'X-Pipeline-Signature' => 'sha256='.$signature,
        'Content-Type' => 'application/json',
    ];
}

beforeEach(function () {
    config()->set('services.livekit.api_key', 'test-key');
    config()->set('services.livekit.api_secret', 'test-api-secret');
    config()->set('services.livekit.ws_url', 'wss://livekit.test');
    config()->set('services.pipeline.secret', 'pipeline-test-secret');
});

// ── Pipeline rooms endpoint ────────────────────────────────────────────────────

it('rejects pipeline rooms request with missing signature', function () {
    $this->getJson(route('pipeline.rooms'))
        ->assertUnauthorized();
});

it('rejects pipeline rooms request with wrong secret', function () {
    // getJson sends json_encode([]) = '[]' as the body; sign with the wrong secret
    $badSig = 'sha256='.hash_hmac('sha256', '[]', 'wrong-secret');

    $this->withHeaders(['X-Pipeline-Signature' => $badSig])
        ->getJson(route('pipeline.rooms'))
        ->assertUnauthorized();
});

it('returns active teleconsultation rooms for the pipeline', function () {
    $ready = Consultation::factory()->teleconsultation()->create([
        'livekit_room_name' => 'consultation-10-readyroom',
        'livekit_room_status' => 'room_ready',
    ]);

    Consultation::factory()->teleconsultation()->create([
        'livekit_room_name' => 'consultation-11-endedroom',
        'livekit_room_status' => 'ended',
    ]);

    Consultation::factory()->create(['type' => 'in_person']);

    // getJson sends json_encode([]) = '[]' as the request body — sign against that exact string
    $response = $this->withHeaders(pipelineSignedHeaders('[]'))
        ->getJson(route('pipeline.rooms'))
        ->assertOk()
        ->assertJsonCount(1);

    expect($response->json('0.consultation_id'))->toBe($ready->id);
    expect($response->json('0.room_name'))->toBe('consultation-10-readyroom');
    expect($response->json('0.ws_url'))->toBe('wss://livekit.test');
    expect($response->json('0.pipeline_token'))->not->toBeNull();
});

// ── Pipeline scan results endpoint ────────────────────────────────────────────

it('rejects scan result without signature', function () {
    $consultation = Consultation::factory()->create();

    $this->postJson(route('pipeline.scan-results.store'), [
        'consultation_id' => $consultation->id,
        'result' => 'real',
        'confidence_score' => 0.9,
    ])->assertUnauthorized();
});

it('stores a scan result posted by the pipeline', function () {
    $consultation = Consultation::factory()->create();

    $data = [
        'consultation_id' => $consultation->id,
        'result' => 'fake',
        'confidence_score' => 0.97,
        'frame_number' => 42,
        'model_version' => 'v1.2.3',
        'flagged' => true,
    ];

    // postJson sends json_encode($data) as the body — sign against the exact same string
    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertCreated()
        ->assertJsonStructure(['id', 'consultation_id']);

    expect(
        DeepfakeScanLog::where('consultation_id', $consultation->id)
            ->where('result', 'fake')
            ->exists()
    )->toBeTrue();
});

it('rejects scan result with invalid data', function () {
    $data = [
        'consultation_id' => 9999999,
        'result' => 'maybe',
        'confidence_score' => 2.5,
    ];

    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertUnprocessable();
});
