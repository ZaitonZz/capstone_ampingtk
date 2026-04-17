<?php

use App\Models\Consultation;
use App\Models\ConsultationFaceVerificationLog;
use App\Models\ConsultationMicrocheck;
use App\Models\DeepfakeEscalation;
use App\Models\DeepfakeScanLog;
use App\Models\DoctorPhoto;
use App\Models\Patient;
use App\Models\PatientPhoto;
use App\Models\User;
use App\Services\DeepfakeEscalationService;

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
    config()->set('services.pipeline.microcheck_min_interval_seconds', 1);
    config()->set('services.pipeline.microcheck_max_interval_seconds', 1);
    config()->set('services.pipeline.microcheck_expiry_seconds', 45);
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
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->subSeconds(4),
        'claimed_at' => now()->subSeconds(2),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
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
        ->assertJsonStructure(['id', 'consultation_id', 'microcheck_id', 'latency_ms', 'user_id', 'verified_role']);

    expect(
        DeepfakeScanLog::where('consultation_id', $consultation->id)
            ->where('microcheck_id', $microcheck->id)
            ->where('user_id', $patientUser->id)
            ->where('verified_role', 'patient')
            ->where('result', 'fake')
            ->exists()
    )->toBeTrue();

    expect($microcheck->fresh()->status)->toBe('completed');
    expect($microcheck->fresh()->latency_ms)->not->toBeNull();
});

it('stores an inconclusive scan result posted by the pipeline', function () {
    $consultation = Consultation::factory()->create();

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forDoctorRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->subSeconds(3),
        'claimed_at' => now()->subSeconds(1),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $consultation->doctor_id,
        'verified_role' => 'doctor',
        'result' => 'inconclusive',
        'confidence_score' => 0.51,
        'frame_number' => 11,
        'model_version' => 'efficientnet_v2_s',
        'flagged' => false,
    ];

    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertCreated()
        ->assertJsonStructure(['id', 'consultation_id', 'microcheck_id', 'latency_ms', 'user_id', 'verified_role']);

    expect(
        DeepfakeScanLog::where('consultation_id', $consultation->id)
            ->where('microcheck_id', $microcheck->id)
            ->where('user_id', $consultation->doctor_id)
            ->where('verified_role', 'doctor')
            ->where('result', 'inconclusive')
            ->exists()
    )->toBeTrue();
});

it('rejects scan result with invalid data', function () {
    $data = [
        'consultation_id' => 9999999,
        'microcheck_id' => 9999999,
        'user_id' => 9999999,
        'verified_role' => 'patient',
        'result' => 'maybe',
        'confidence_score' => 2.5,
    ];

    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertUnprocessable();
});

it('rejects scan result when microcheck has not been claimed', function () {
    $consultation = Consultation::factory()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $microcheck = ConsultationMicrocheck::factory()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'status' => 'pending',
        'scheduled_at' => now()->subSeconds(5),
        'claimed_at' => null,
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'result' => 'real',
        'confidence_score' => 0.92,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'Microcheck must be claimed before scan result submission.',
        ]);

    expect(DeepfakeScanLog::where('microcheck_id', $microcheck->id)->exists())->toBeFalse();
    expect($microcheck->fresh()->status)->toBe('pending');
});

it('rejects scan result when microcheck is scheduled in the future', function () {
    $consultation = Consultation::factory()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->addSeconds(10),
        'claimed_at' => now()->subSecond(),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'result' => 'real',
        'confidence_score' => 0.88,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'Microcheck is not yet due for scan result submission.',
        ]);

    expect(DeepfakeScanLog::where('microcheck_id', $microcheck->id)->exists())->toBeFalse();
    expect($microcheck->fresh()->status)->toBe('claimed');
});

it('expires overdue pending checks before scheduling next microcheck after scan result', function () {
    $consultation = Consultation::factory()->teleconsultation()->ongoing()->create([
        'livekit_room_name' => 'consultation-expiry-room',
        'livekit_room_status' => 'room_ready',
    ]);
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $overduePending = ConsultationMicrocheck::factory()->forDoctorRole()->create([
        'consultation_id' => $consultation->id,
        'status' => 'pending',
        'scheduled_at' => now()->subMinutes(2),
    ]);

    $claimedDue = ConsultationMicrocheck::factory()->claimed()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->subSeconds(5),
        'claimed_at' => now()->subSeconds(2),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $claimedDue->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'result' => 'real',
        'confidence_score' => 0.93,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertCreated();

    expect($overduePending->fresh()->status)->toBe('expired');
    expect($claimedDue->fresh()->status)->toBe('completed');
    expect(
        ConsultationMicrocheck::query()
            ->where('consultation_id', $consultation->id)
            ->where('status', 'pending')
            ->count()
    )->toBe(2);
});

it('claims a due microcheck for an identified participant', function () {
    $consultation = Consultation::factory()->teleconsultation()->ongoing()->create([
        'livekit_room_name' => 'consultation-claim-room',
        'livekit_room_status' => 'room_ready',
    ]);
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $microcheck = ConsultationMicrocheck::factory()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'status' => 'pending',
        'scheduled_at' => now()->subSecond(),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
    ];

    $response = $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.microchecks.claim'), $data)
        ->assertOk()
        ->assertJson(['claimed' => true]);

    expect($response->json('microcheck.id'))->toBe($microcheck->id);
    expect($microcheck->fresh()->status)->toBe('claimed');
});

it('returns already_claimed state when claim is retried for an active claimed microcheck', function () {
    $consultation = Consultation::factory()->teleconsultation()->ongoing()->create([
        'livekit_room_name' => 'consultation-already-claimed-room',
        'livekit_room_status' => 'room_ready',
    ]);
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->subSeconds(3),
        'claimed_at' => now()->subSecond(),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
    ];

    $response = $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.microchecks.claim'), $data)
        ->assertOk()
        ->assertJson([
            'claimed' => false,
            'reason' => 'already_claimed',
        ]);

    expect($response->json('microcheck.id'))->toBe($microcheck->id);
    expect($response->json('microcheck.status'))->toBe('claimed');
    expect($response->json('next_scheduled_at'))->toBe($microcheck->scheduled_at?->toIso8601String());
});

it('returns identity_required when microcheck claim has no role metadata', function () {
    $consultation = Consultation::factory()->teleconsultation()->ongoing()->create([
        'livekit_room_name' => 'consultation-identity-room',
        'livekit_room_status' => 'room_ready',
    ]);

    $data = [
        'consultation_id' => $consultation->id,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.microchecks.claim'), $data)
        ->assertOk()
        ->assertJson([
            'claimed' => false,
            'reason' => 'identity_required',
        ]);
});

it('creates paired pending microchecks for patient and doctor when a new cycle is initialized', function () {
    $consultation = Consultation::factory()->teleconsultation()->ongoing()->create([
        'livekit_room_name' => 'consultation-paired-cycle-room',
        'livekit_room_status' => 'room_ready',
    ]);

    $data = [
        'consultation_id' => $consultation->id,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.microchecks.claim'), $data)
        ->assertOk()
        ->assertJson([
            'claimed' => false,
            'reason' => 'identity_required',
        ]);

    $pendingChecks = ConsultationMicrocheck::query()
        ->where('consultation_id', $consultation->id)
        ->where('status', 'pending')
        ->orderBy('id')
        ->get();

    expect($pendingChecks)->toHaveCount(2);
    expect($pendingChecks->pluck('target_role')->sort()->values()->all())->toBe(['doctor', 'patient']);
    expect($pendingChecks->pluck('cycle_key')->filter()->unique()->count())->toBe(1);
});

it('rejects scan result when submitted role does not match microcheck target role', function () {
    $consultation = Consultation::factory()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forDoctorRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->subSeconds(4),
        'claimed_at' => now()->subSeconds(2),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'result' => 'real',
        'confidence_score' => 0.87,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'Microcheck role does not match the submitted verification role.',
        ]);

    expect(DeepfakeScanLog::where('microcheck_id', $microcheck->id)->exists())->toBeFalse();
    expect($microcheck->fresh()->status)->toBe('claimed');
});

it('creates an OTP verification escalation when doctor reaches 5 straight fake scans', function () {
    $consultation = Consultation::factory()->create();

    foreach (range(1, 4) as $offset) {
        DeepfakeScanLog::factory()->fake()->create([
            'consultation_id' => $consultation->id,
            'user_id' => $consultation->doctor_id,
            'verified_role' => 'doctor',
            'scanned_at' => now()->subSeconds(20 + $offset),
        ]);
    }

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forDoctorRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->subSeconds(4),
        'claimed_at' => now()->subSeconds(2),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $consultation->doctor_id,
        'verified_role' => 'doctor',
        'result' => 'fake',
        'confidence_score' => 0.94,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertCreated();

    $consultation->refresh();

    expect(
        DeepfakeEscalation::query()
            ->where('consultation_id', $consultation->id)
            ->where('type', DeepfakeEscalation::TYPE_OTP_VERIFICATION)
            ->where('triggered_role', 'doctor')
            ->where('status', DeepfakeEscalation::STATUS_OPEN)
            ->count()
    )->toBe(1);

    expect($consultation->status)->toBe('paused');
    expect($consultation->identity_verification_target_user_id)->toBe($consultation->doctor_id);
    expect($consultation->identity_verification_target_role)->toBe('doctor');
});

it('creates an OTP verification escalation when patient reaches 5 straight fake scans', function () {
    $consultation = Consultation::factory()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    foreach (range(1, 4) as $offset) {
        DeepfakeScanLog::factory()->fake()->create([
            'consultation_id' => $consultation->id,
            'user_id' => $patientUser->id,
            'verified_role' => 'patient',
            'scanned_at' => now()->subSeconds(20 + $offset),
        ]);
    }

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->subSeconds(4),
        'claimed_at' => now()->subSeconds(2),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'result' => 'fake',
        'confidence_score' => 0.95,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertCreated();

    $consultation->refresh();

    expect(
        DeepfakeEscalation::query()
            ->where('consultation_id', $consultation->id)
            ->where('type', DeepfakeEscalation::TYPE_OTP_VERIFICATION)
            ->where('triggered_role', 'patient')
            ->where('status', DeepfakeEscalation::STATUS_OPEN)
            ->count()
    )->toBe(1);

    expect($consultation->status)->toBe('paused');
    expect($consultation->identity_verification_target_user_id)->toBe($patientUser->id);
    expect($consultation->identity_verification_target_role)->toBe('patient');
});

it('does not create duplicate open OTP verification escalations for the same triggering log', function () {
    $consultation = Consultation::factory()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    foreach (range(1, 4) as $offset) {
        DeepfakeScanLog::factory()->fake()->create([
            'consultation_id' => $consultation->id,
            'user_id' => $patientUser->id,
            'verified_role' => 'patient',
            'scanned_at' => now()->subSeconds(20 + $offset),
        ]);
    }

    $triggerLog = DeepfakeScanLog::factory()->fake()->create([
        'consultation_id' => $consultation->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'scanned_at' => now(),
    ]);

    $service = app(DeepfakeEscalationService::class);

    $service->handleNewScanLog($triggerLog);
    $service->handleNewScanLog($triggerLog);

    expect(
        DeepfakeEscalation::query()
            ->where('consultation_id', $consultation->id)
            ->where('type', DeepfakeEscalation::TYPE_OTP_VERIFICATION)
            ->where('triggered_role', 'patient')
            ->where('status', DeepfakeEscalation::STATUS_OPEN)
            ->count()
    )->toBe(1);

    expect($consultation->fresh()->status)->toBe('paused');
});

it('does not escalate when a non-fake result breaks the fake streak', function () {
    $consultation = Consultation::factory()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    foreach (range(1, 4) as $offset) {
        DeepfakeScanLog::factory()->fake()->create([
            'consultation_id' => $consultation->id,
            'user_id' => $patientUser->id,
            'verified_role' => 'patient',
            'scanned_at' => now()->subSeconds(60 + $offset),
        ]);
    }

    DeepfakeScanLog::factory()->real()->create([
        'consultation_id' => $consultation->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'scanned_at' => now()->subSeconds(10),
    ]);

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'scheduled_at' => now()->subSeconds(4),
        'claimed_at' => now()->subSeconds(2),
    ]);

    $data = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'result' => 'fake',
        'confidence_score' => 0.96,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($data)))
        ->postJson(route('pipeline.scan-results.store'), $data)
        ->assertCreated();

    expect(
        DeepfakeEscalation::query()
            ->where('consultation_id', $consultation->id)
            ->where('triggered_role', 'patient')
            ->where('type', DeepfakeEscalation::TYPE_OTP_VERIFICATION)
            ->exists()
    )->toBeFalse();
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

it('returns doctor face data with null embedding when not yet enrolled', function () {
    $doctor = User::factory()->doctor()->create();
    $photo = DoctorPhoto::query()->create([
        'user_id' => $doctor->id,
        'uploaded_by' => $doctor->id,
        'file_path' => 'doctor-photos/doctor-no-embedding.jpg',
        'disk' => 'public',
        'is_primary' => true,
    ]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'livekit_room_name' => 'room-doctor-no-embedding',
        'livekit_room_status' => 'room_ready',
    ]);

    $response = $this->withHeaders(pipelineSignedHeaders('[]'))
        ->getJson(route('pipeline.patient-face.show', ['roomName' => $consultation->livekit_room_name, 'role' => 'doctor']))
        ->assertOk();

    expect($response->json('consultation_id'))->toBe($consultation->id);
    expect($response->json('subject_user_id'))->toBe($doctor->id);
    expect($response->json('subject_role'))->toBe('doctor');
    expect($response->json('photo_id'))->toBe($photo->id);
    expect($response->json('face_embedding'))->toBeNull();
});

it('returns doctor face data with stored embedding when enrolled', function () {
    $embedding = array_fill(0, 512, 0.01);
    $doctor = User::factory()->doctor()->create();
    DoctorPhoto::query()->create([
        'user_id' => $doctor->id,
        'uploaded_by' => $doctor->id,
        'file_path' => 'doctor-photos/doctor-with-embedding.jpg',
        'disk' => 'public',
        'is_primary' => true,
        'face_embedding' => $embedding,
    ]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'livekit_room_name' => 'room-doctor-with-embedding',
        'livekit_room_status' => 'room_ready',
    ]);

    $response = $this->withHeaders(pipelineSignedHeaders('[]'))
        ->getJson(route('pipeline.patient-face.show', ['roomName' => $consultation->livekit_room_name, 'role' => 'doctor']))
        ->assertOk();

    expect($response->json('face_embedding'))->toHaveCount(512);
});

it('returns latest doctor photo when no primary doctor photo exists', function () {
    $doctor = User::factory()->doctor()->create();
    DoctorPhoto::query()->create([
        'user_id' => $doctor->id,
        'uploaded_by' => $doctor->id,
        'file_path' => 'doctor-photos/doctor-fallback-1.jpg',
        'disk' => 'public',
        'is_primary' => false,
    ]);
    $latestPhoto = DoctorPhoto::query()->create([
        'user_id' => $doctor->id,
        'uploaded_by' => $doctor->id,
        'file_path' => 'doctor-photos/doctor-fallback-2.jpg',
        'disk' => 'public',
        'is_primary' => false,
    ]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'livekit_room_name' => 'room-doctor-fallback-photo',
        'livekit_room_status' => 'room_ready',
    ]);

    $response = $this->withHeaders(pipelineSignedHeaders('[]'))
        ->getJson(route('pipeline.patient-face.show', ['roomName' => $consultation->livekit_room_name, 'role' => 'doctor']))
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

it('rejects doctor face embedding without signature', function () {
    $doctor = User::factory()->doctor()->create();
    $photo = DoctorPhoto::query()->create([
        'user_id' => $doctor->id,
        'uploaded_by' => $doctor->id,
        'file_path' => 'doctor-photos/doctor-enroll.jpg',
        'disk' => 'public',
        'is_primary' => true,
    ]);

    $this->postJson(route('pipeline.face-embeddings-doctor.store', $photo), ['embedding' => []])
        ->assertUnauthorized();
});

it('rejects doctor face embedding with wrong size array', function () {
    $doctor = User::factory()->doctor()->create();
    $photo = DoctorPhoto::query()->create([
        'user_id' => $doctor->id,
        'uploaded_by' => $doctor->id,
        'file_path' => 'doctor-photos/doctor-enroll-invalid.jpg',
        'disk' => 'public',
        'is_primary' => true,
    ]);
    $data = ['embedding' => array_fill(0, 128, 0.5)];
    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.face-embeddings-doctor.store', $photo), $data)
        ->assertUnprocessable();
});

it('stores a 512-d ArcFace embedding on a doctor photo', function () {
    $doctor = User::factory()->doctor()->create();
    $photo = DoctorPhoto::query()->create([
        'user_id' => $doctor->id,
        'uploaded_by' => $doctor->id,
        'file_path' => 'doctor-photos/doctor-enroll-success.jpg',
        'disk' => 'public',
        'is_primary' => true,
    ]);
    $embedding = array_fill(0, 512, 0.02);
    $data = ['embedding' => $embedding];
    $body = json_encode($data);

    $this->withHeaders(pipelineSignedHeaders($body))
        ->postJson(route('pipeline.face-embeddings-doctor.store', $photo), $data)
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

it('upserts face verification result when the same microcheck is retried', function () {
    $consultation = Consultation::factory()->create();
    $consultation->patient->update(['user_id' => User::factory()->patient()->create()->id]);

    $microcheck = ConsultationMicrocheck::factory()->claimed()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
    ]);

    $first = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $consultation->patient->user_id,
        'verified_role' => 'patient',
        'matched' => false,
        'face_match_score' => 0.25,
        'flagged' => true,
    ];
    $second = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microcheck->id,
        'user_id' => $consultation->patient->user_id,
        'verified_role' => 'patient',
        'matched' => false,
        'face_match_score' => 0.22,
        'flagged' => true,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($first)))
        ->postJson(route('pipeline.face-match-results.store'), $first)
        ->assertOk()
        ->assertJson(['microcheck_id' => $microcheck->id]);

    $this->withHeaders(pipelineSignedHeaders(json_encode($second)))
        ->postJson(route('pipeline.face-match-results.store'), $second)
        ->assertOk()
        ->assertJson(['microcheck_id' => $microcheck->id]);

    $logs = ConsultationFaceVerificationLog::query()
        ->where('consultation_id', $consultation->id)
        ->where('microcheck_id', $microcheck->id)
        ->where('verified_role', 'patient')
        ->get();

    expect($logs)->toHaveCount(1);
    expect((float) $logs->first()->face_match_score)->toBe(0.22);
    expect($logs->first()->flagged)->toBeTrue();
});

it('pauses consultation when patient reaches 3 straight explicit face mismatches', function () {
    $consultation = Consultation::factory()->ongoing()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $microchecks = ConsultationMicrocheck::factory()
        ->count(3)
        ->claimed()
        ->forPatientRole()
        ->create([
            'consultation_id' => $consultation->id,
            'scheduled_at' => now()->subSeconds(4),
            'claimed_at' => now()->subSeconds(2),
        ]);

    foreach ($microchecks as $index => $microcheck) {
        $payload = [
            'consultation_id' => $consultation->id,
            'microcheck_id' => $microcheck->id,
            'user_id' => $patientUser->id,
            'verified_role' => 'patient',
            'matched' => false,
            'face_match_score' => 0.24 - ($index * 0.01),
            'flagged' => true,
        ];

        $this->withHeaders(pipelineSignedHeaders(json_encode($payload)))
            ->postJson(route('pipeline.face-match-results.store'), $payload)
            ->assertOk();
    }

    $consultation->refresh();

    expect($consultation->status)->toBe('paused');
    expect($consultation->identity_verification_target_user_id)->toBe($patientUser->id);
    expect($consultation->identity_verification_target_role)->toBe('patient');
    expect(
        DeepfakeEscalation::query()
            ->where('consultation_id', $consultation->id)
            ->where('type', DeepfakeEscalation::TYPE_OTP_VERIFICATION)
            ->where('triggered_role', 'patient')
            ->where('streak_count', 3)
            ->where('status', DeepfakeEscalation::STATUS_OPEN)
            ->count()
    )->toBe(1);
});

it('does not pause consultation when explicit face mismatch streak is broken', function () {
    $consultation = Consultation::factory()->ongoing()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $microchecks = ConsultationMicrocheck::factory()
        ->count(3)
        ->claimed()
        ->forPatientRole()
        ->create([
            'consultation_id' => $consultation->id,
            'scheduled_at' => now()->subSeconds(4),
            'claimed_at' => now()->subSeconds(2),
        ]);

    $firstFailure = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microchecks[0]->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'matched' => false,
        'face_match_score' => 0.23,
        'flagged' => true,
    ];
    $successfulCheck = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microchecks[1]->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'matched' => true,
        'face_match_score' => 0.82,
        'flagged' => false,
    ];
    $secondFailure = [
        'consultation_id' => $consultation->id,
        'microcheck_id' => $microchecks[2]->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
        'matched' => false,
        'face_match_score' => 0.22,
        'flagged' => true,
    ];

    $this->withHeaders(pipelineSignedHeaders(json_encode($firstFailure)))
        ->postJson(route('pipeline.face-match-results.store'), $firstFailure)
        ->assertOk();
    $this->withHeaders(pipelineSignedHeaders(json_encode($successfulCheck)))
        ->postJson(route('pipeline.face-match-results.store'), $successfulCheck)
        ->assertOk();
    $this->withHeaders(pipelineSignedHeaders(json_encode($secondFailure)))
        ->postJson(route('pipeline.face-match-results.store'), $secondFailure)
        ->assertOk();

    expect($consultation->fresh()->status)->toBe('ongoing');
    expect(
        DeepfakeEscalation::query()
            ->where('consultation_id', $consultation->id)
            ->where('type', DeepfakeEscalation::TYPE_OTP_VERIFICATION)
            ->where('triggered_role', 'patient')
            ->where('streak_count', 3)
            ->where('status', DeepfakeEscalation::STATUS_OPEN)
            ->exists()
    )->toBeFalse();
});
