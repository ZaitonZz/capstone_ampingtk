<?php

use App\Models\Consultation;
use App\Models\ConsultationFaceVerificationLog;
use App\Models\DeepfakeScanLog;
use App\Models\Patient;
use App\Models\PatientPhoto;
use App\Models\User;

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

// ── Patient face endpoint ─────────────────────────────────────────────────────

it('rejects patient face request with missing signature', function () {
    $this->getJson(route('pipeline.patient-face.show', ['roomName' => 'test-room']))
        ->assertUnauthorized();
});

it('returns 404 for unknown room name', function () {
    $this->withHeaders(pipelineSignedHeaders('[]'))
        ->getJson(route('pipeline.patient-face.show', ['roomName' => 'non-existent-room']))
        ->assertNotFound();
});

it('returns patient face data with null embedding when not yet enrolled', function () {
    $patient = Patient::factory()->withUserAccount()->create();
    $photo = PatientPhoto::factory()->primary()->create(['patient_id' => $patient->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'patient_id' => $patient->id,
        'livekit_room_name' => 'room-patient-no-embedding',
        'livekit_room_status' => 'room_ready',
    ]);

    $response = $this->withHeaders(pipelineSignedHeaders('[]'))
        ->getJson(route('pipeline.patient-face.show', ['roomName' => $consultation->livekit_room_name, 'role' => 'patient']))
        ->assertOk();

    expect($response->json('consultation_id'))->toBe($consultation->id);
    expect($response->json('subject_user_id'))->toBe($patient->user_id);
    expect($response->json('subject_role'))->toBe('patient');
    expect($response->json('photo_id'))->toBe($photo->id);
    expect($response->json('face_embedding'))->toBeNull();
});

it('returns patient face data with stored embedding when enrolled', function () {
    $embedding = array_fill(0, 512, 0.01);
    $patient = Patient::factory()->create();
    $photo = PatientPhoto::factory()->primary()->create([
        'patient_id' => $patient->id,
        'face_embedding' => $embedding,
    ]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'patient_id' => $patient->id,
        'livekit_room_name' => 'room-patient-with-embedding',
        'livekit_room_status' => 'room_ready',
    ]);

    $response = $this->withHeaders(pipelineSignedHeaders('[]'))
        ->getJson(route('pipeline.patient-face.show', ['roomName' => $consultation->livekit_room_name, 'role' => 'patient']))
        ->assertOk();

    expect($response->json('face_embedding'))->toHaveCount(512);
});

it('returns latest patient photo when no primary photo exists', function () {
    $patient = Patient::factory()->create();
    PatientPhoto::factory()->create([
        'patient_id' => $patient->id,
        'is_primary' => false,
    ]);
    $latestPhoto = PatientPhoto::factory()->create([
        'patient_id' => $patient->id,
        'is_primary' => false,
    ]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'patient_id' => $patient->id,
        'livekit_room_name' => 'room-patient-fallback-photo',
        'livekit_room_status' => 'room_ready',
    ]);

    $response = $this->withHeaders(pipelineSignedHeaders('[]'))
        ->getJson(route('pipeline.patient-face.show', ['roomName' => $consultation->livekit_room_name, 'role' => 'patient']))
        ->assertOk();

    expect($response->json('photo_id'))->toBe($latestPhoto->id);
    expect($response->json('used_fallback_photo'))->toBeTrue();
});

// ── Face embedding enrollment endpoint ───────────────────────────────────────

it('rejects face embedding without signature', function () {
    $photo = PatientPhoto::factory()->create();

    $this->postJson(route('pipeline.face-embeddings.store', $photo), ['embedding' => []])
        ->assertUnauthorized();
});

it('rejects face embedding with wrong size array', function () {
    $photo = PatientPhoto::factory()->create();
    $data = ['embedding' => array_fill(0, 128, 0.5)]; // wrong size
    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.face-embeddings.store', $photo), $data)
        ->assertUnprocessable();
});

it('stores a 512-d ArcFace embedding on a patient photo', function () {
    $photo = PatientPhoto::factory()->create();
    $embedding = array_fill(0, 512, 0.02);
    $data = ['embedding' => $embedding];
    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.face-embeddings.store', $photo), $data)
        ->assertOk()
        ->assertJson(['photo_id' => $photo->id, 'enrolled' => true]);

    expect($photo->fresh()->face_embedding)->toHaveCount(512);
});

// ── Face match result endpoint ────────────────────────────────────────────────

it('rejects face match result without signature', function () {
    $consultation = Consultation::factory()->create();

    $this->postJson(route('pipeline.face-match-results.store'), [
        'consultation_id' => $consultation->id,
        'matched' => true,
        'face_match_score' => 0.85,
    ])->assertUnauthorized();
});

it('rejects face match result with non-existent consultation', function () {
    $data = [
        'consultation_id' => 9999999,
        'matched' => true,
        'face_match_score' => 0.85,
    ];
    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.face-match-results.store'), $data)
        ->assertUnprocessable();
});

it('records a successful face match log', function () {
    $consultation = Consultation::factory()->create();
    $consultation->patient->update(['user_id' => User::factory()->patient()->create()->id]);

    $data = [
        'consultation_id' => $consultation->id,
        'user_id' => $consultation->patient->user_id,
        'verified_role' => 'patient',
        'matched' => true,
        'face_match_score' => 0.87,
    ];
    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.face-match-results.store'), $data)
        ->assertOk()
        ->assertJson(['matched' => true]);

    $log = ConsultationFaceVerificationLog::query()
        ->where('consultation_id', $consultation->id)
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->matched)->toBeTrue();
    expect((float) $log->face_match_score)->toBe(0.87);
    expect($log->flagged)->toBeFalse();
    expect($log->user_id)->toBe($consultation->patient->user_id);
    expect($log->verified_role)->toBe('patient');
});

it('records a failed face match log', function () {
    $consultation = Consultation::factory()->create();
    $consultation->patient->update(['user_id' => User::factory()->patient()->create()->id]);

    $data = [
        'consultation_id' => $consultation->id,
        'user_id' => $consultation->patient->user_id,
        'verified_role' => 'patient',
        'matched' => false,
        'face_match_score' => 0.21,
        'flagged' => true,
    ];
    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.face-match-results.store'), $data)
        ->assertOk()
        ->assertJson(['matched' => false]);

    $log = ConsultationFaceVerificationLog::query()
        ->where('consultation_id', $consultation->id)
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->matched)->toBeFalse();
    expect((float) $log->face_match_score)->toBe(0.21);
    expect($log->flagged)->toBeTrue();
    expect($log->user_id)->toBe($consultation->patient->user_id);
    expect($log->verified_role)->toBe('patient');
});

it('stores multiple face verification records for one consultation', function () {
    $consultation = Consultation::factory()->create();
    $consultation->patient->update(['user_id' => User::factory()->patient()->create()->id]);

    $first = [
        'consultation_id' => $consultation->id,
        'user_id' => $consultation->patient->user_id,
        'verified_role' => 'patient',
        'matched' => true,
        'face_match_score' => 0.81,
    ];
    $second = [
        'consultation_id' => $consultation->id,
        'user_id' => $consultation->patient->user_id,
        'verified_role' => 'patient',
        'matched' => false,
        'face_match_score' => 0.24,
        'flagged' => true,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($first)))
        ->postJson(route('pipeline.face-match-results.store'), $first)
        ->assertOk();

    $this->withHeaders(pipelineSignedHeaders(json_encode($second)))
        ->postJson(route('pipeline.face-match-results.store'), $second)
        ->assertOk();

    $count = ConsultationFaceVerificationLog::query()
        ->where('consultation_id', $consultation->id)
        ->count();

    expect($count)->toBe(2);
});
