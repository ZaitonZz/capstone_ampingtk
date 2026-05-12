<?php

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config()->set('services.livekit.enabled', true);
    config()->set('services.livekit.url', 'https://livekit.test');
    config()->set('services.livekit.ws_url', 'wss://livekit.test');
    config()->set('services.livekit.api_key', 'test-api-key');
    config()->set('services.livekit.api_secret', 'test-api-secret');

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/CreateRoom' => Http::response([
            'sid' => 'RM_test_room_sid',
        ], 200),
        'https://livekit.test/twirp/livekit.RoomService/DeleteRoom' => Http::response([], 200),
    ]);
});

it('redirects guests to login on connect', function () {
    $consultation = Consultation::factory()->teleconsultation()->create();

    $this->post(route('consultations.livekit.connect', $consultation))
        ->assertRedirect(route('login'));
});

it('requires consent for a consultation doctor before issuing token', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'Consent must be confirmed before joining the teleconsultation room.',
        ]);
});

it('returns connect credentials for a consenting consultation doctor', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertOk()
        ->assertJsonStructure([
            'room_name',
            'room_status',
            'participant_token',
            'ws_url',
            'role',
        ])
        ->assertJson([
            'room_status' => 'room_ready',
            'ws_url' => 'wss://livekit.test',
            'role' => 'doctor',
        ]);

    $consultation->refresh();

    expect($consultation->livekit_room_name)->not->toBeNull();
    expect($consultation->livekit_last_activity_at)->not->toBeNull();
});

it('returns connect credentials for a consenting consultation patient', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
    ]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $patientUser->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($patientUser)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertOk()
        ->assertJson([
            'role' => 'patient',
        ]);
});

it('does not cancel a consultation on leave when no LiveKit room has been provisioned', function () {
    config()->set('services.livekit.enabled', false);

    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'status' => Consultation::STATUS_SCHEDULED,
        'livekit_room_name' => null,
        'ended_at' => null,
        'cancellation_reason' => null,
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertOk()
        ->assertJson([
            'status' => Consultation::STATUS_SCHEDULED,
            'cancelled' => false,
            'redirect_url' => route('consultations.index'),
        ]);

    $consultation->refresh();

    expect($consultation->status)->toBe(Consultation::STATUS_SCHEDULED);
    expect($consultation->ended_at)->toBeNull();
    expect($consultation->cancellation_reason)->toBeNull();
    expect($consultation->livekit_room_name)->toBeNull();

    Http::assertNothingSent();
});

it('allows admin audit connect without explicit consent', function () {
    $doctor = User::factory()->doctor()->create();
    $admin = User::factory()->admin()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($admin)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertOk()
        ->assertJson([
            'role' => 'admin_audit',
        ]);
});

it('forbids medical staff from connecting to a consultation session', function () {
    $doctor = User::factory()->doctor()->create();
    $medicalStaff = User::factory()->medicalStaff()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($medicalStaff)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertForbidden();
});

it('allows connect when deepfake detection heartbeat is stale', function () {
    config()->set('services.pipeline.detection_timeout_seconds', 60);

    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'livekit_room_name' => 'consultation-99-stale',
        'livekit_room_status' => 'room_ready',
        'livekit_room_created_at' => now()->subMinutes(2),
        'pipeline_detection_status' => 'running',
        'pipeline_last_heartbeat_at' => now()->subSeconds(61),
    ]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertOk()
        ->assertJson([
            'room_status' => 'room_ready',
            'role' => 'doctor',
        ]);

    $consultation->refresh();

    expect($consultation->status)->not->toBe('cancelled');
    expect($consultation->livekit_room_status)->toBe('room_ready');
});

it('cancels connect when no face has been detected for 30 seconds', function () {
    config()->set('services.pipeline.no_face_timeout_seconds', 30);

    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'livekit_room_name' => 'consultation-101-no-face',
        'livekit_room_status' => 'room_ready',
        'livekit_room_created_at' => now()->subMinutes(2),
        'pipeline_detection_status' => 'running',
        'pipeline_last_heartbeat_at' => now()->subSeconds(5),
        'pipeline_guidance' => [
            'no_face_detected' => true,
            'no_face_detected_since' => now()->subSeconds(31)->toIso8601String(),
        ],
    ]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertConflict()
        ->assertJson([
            'message' => 'Consultation cancelled because no face was detected for 30 seconds.',
            'status' => 'cancelled',
        ]);

    $consultation->refresh();

    expect($consultation->status)->toBe('cancelled');
    expect($consultation->livekit_room_status)->toBe('ended');
});

it('allows connect when no face has not reached the cancellation timeout', function () {
    config()->set('services.pipeline.no_face_timeout_seconds', 30);

    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'livekit_room_name' => 'consultation-102-no-face-fresh',
        'livekit_room_status' => 'room_ready',
        'livekit_room_created_at' => now()->subMinutes(2),
        'pipeline_detection_status' => 'running',
        'pipeline_last_heartbeat_at' => now()->subSeconds(5),
        'pipeline_guidance' => [
            'no_face_detected' => true,
            'no_face_detected_since' => now()->subSeconds(10)->toIso8601String(),
        ],
    ]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertOk()
        ->assertJson([
            'room_status' => 'room_ready',
            'role' => 'doctor',
        ]);

    expect($consultation->fresh()->status)->not->toBe('cancelled');
});

it('allows connect when deepfake detection heartbeat is fresh', function () {
    config()->set('services.pipeline.detection_timeout_seconds', 60);

    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'livekit_room_name' => 'consultation-100-fresh',
        'livekit_room_status' => 'room_ready',
        'livekit_room_created_at' => now()->subMinutes(2),
        'pipeline_detection_status' => 'running',
        'pipeline_last_heartbeat_at' => now()->subSeconds(10),
    ]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.connect', $consultation))
        ->assertOk()
        ->assertJson([
            'room_status' => 'room_ready',
            'role' => 'doctor',
        ]);

    expect($consultation->fresh()->status)->not->toBe('cancelled');
});

it('lets a doctor leave without cancelling when the patient remains in the room', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-201-leave',
        'livekit_room_status' => 'room_ready',
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/RemoveParticipant' => Http::response([], 200),
        'https://livekit.test/twirp/livekit.RoomService/ListParticipants' => Http::response([
            'participants' => [
                ['identity' => sprintf('user-%d', $patientUser->id), 'metadata' => json_encode(['role' => 'patient'])],
            ],
        ], 200),
        'https://livekit.test/twirp/livekit.RoomService/DeleteRoom' => Http::response([], 200),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertOk()
        ->assertJson([
            'status' => 'ongoing',
            'cancelled' => false,
            'redirect_url' => route('consultations.index'),
        ]);

    Http::assertSent(fn ($request) => $request->url() === 'https://livekit.test/twirp/livekit.RoomService/RemoveParticipant'
        && $request['room'] === 'consultation-201-leave'
        && $request['identity'] === sprintf('user-%d', $doctor->id));

    Http::assertNotSent(fn ($request) => $request->url() === 'https://livekit.test/twirp/livekit.RoomService/DeleteRoom');

    expect($consultation->fresh()->status)->toBe('ongoing');
});

it('prompts the doctor to confirm ending for everyone when the patient is present', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-201-preview',
        'livekit_room_status' => 'room_ready',
        'livekit_doctor_joined_at' => now()->subMinutes(10),
        'livekit_patient_joined_at' => null,
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/ListParticipants' => Http::response([
            'participants' => [
                ['identity' => sprintf('user-%d', $doctor->id)],
                ['identity' => sprintf('user-%d', $patientUser->id)],
            ],
        ], 200),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation), [
            'preview' => true,
        ])
        ->assertOk()
        ->assertJson([
            'requires_confirmation' => true,
            'status' => 'ongoing',
            'cancelled' => false,
        ]);
});

it('does not require doctor confirmation when the patient is not present', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-201-preview-no-patient',
        'livekit_room_status' => 'room_ready',
        'livekit_doctor_joined_at' => now()->subMinutes(10),
        'livekit_patient_joined_at' => null,
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/ListParticipants' => Http::response([
            'participants' => [
                ['identity' => sprintf('user-%d', $doctor->id)],
            ],
        ], 200),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation), [
            'preview' => true,
        ])
        ->assertOk()
        ->assertJson([
            'requires_confirmation' => false,
            'status' => 'ongoing',
            'cancelled' => false,
        ]);
});

it('ends the consultation for everyone when the doctor confirms ending for all', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-201-end-all',
        'livekit_room_status' => 'room_ready',
        'livekit_doctor_joined_at' => now()->subMinutes(10),
        'livekit_patient_joined_at' => now()->subMinutes(8),
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/DeleteRoom' => Http::response([], 200),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation), [
            'end_for_all' => true,
        ])
        ->assertOk()
        ->assertJson([
            'status' => Consultation::STATUS_COMPLETED,
            'cancelled' => false,
            'ended_for_all' => true,
            'redirect_url' => route('consultations.index'),
        ]);

    $freshConsultation = $consultation->fresh();

    expect($freshConsultation->status)->toBe(Consultation::STATUS_COMPLETED);
    expect($freshConsultation->ended_at)->not->toBeNull();
    expect($freshConsultation->livekit_room_status)->toBe('ended');
});

it('cancels the consultation as a no-show when the doctor leaves alone', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-202-last-leave',
        'livekit_room_status' => 'room_ready',
        'livekit_doctor_joined_at' => now()->subMinutes(10),
        'livekit_patient_joined_at' => null,
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/RemoveParticipant' => Http::response([], 200),
        'https://livekit.test/twirp/livekit.RoomService/ListParticipants' => Http::response([
            'participants' => [
                ['identity' => 'pipeline-bot-202'],
                ['identity' => 'user-9999', 'metadata' => json_encode(['role' => 'admin', 'audit_mode' => true])],
            ],
        ], 200),
        'https://livekit.test/twirp/livekit.RoomService/DeleteRoom' => Http::response([], 200),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertOk()
        ->assertJson([
            'status' => 'cancelled',
            'cancelled' => true,
            'redirect_url' => route('consultations.index'),
        ]);

    $freshConsultation = $consultation->fresh();

    expect($freshConsultation->status)->toBe('cancelled');
    expect($freshConsultation->livekit_room_status)->toBe('ended');
    expect($freshConsultation->ended_at)->not->toBeNull();
    expect($freshConsultation->cancellation_reason)
        ->toBe('Consultation cancelled because the patient never joined the LiveKit room.');
});

it('cancels the consultation when the patient leaves and the doctor never joined', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-208-patient-only',
        'livekit_room_status' => 'room_ready',
        'livekit_doctor_joined_at' => null,
        'livekit_patient_joined_at' => now()->subMinutes(8),
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/RemoveParticipant' => Http::response([], 200),
        'https://livekit.test/twirp/livekit.RoomService/ListParticipants' => Http::response([
            'participants' => [
                ['identity' => 'pipeline-bot-208'],
            ],
        ], 200),
        'https://livekit.test/twirp/livekit.RoomService/DeleteRoom' => Http::response([], 200),
    ]);

    $this->actingAs($patientUser)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertOk()
        ->assertJson([
            'status' => Consultation::STATUS_CANCELLED,
            'cancelled' => true,
            'message' => 'Consultation cancelled because the doctor never joined the LiveKit room.',
            'redirect_url' => route('patient.consultations.index'),
        ]);

    $freshConsultation = $consultation->fresh();

    expect($freshConsultation->status)->toBe(Consultation::STATUS_CANCELLED);
    expect($freshConsultation->cancellation_reason)
        ->toBe('Consultation cancelled because the doctor never joined the LiveKit room.');
});

it('uses a neutral cancellation reason when join tracking is unavailable', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-209-unknown-join',
        'livekit_room_status' => 'room_ready',
        'livekit_doctor_joined_at' => null,
        'livekit_patient_joined_at' => null,
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/RemoveParticipant' => Http::response([], 200),
        'https://livekit.test/twirp/livekit.RoomService/ListParticipants' => Http::response([
            'participants' => [
                ['identity' => 'pipeline-bot-209'],
            ],
        ], 200),
        'https://livekit.test/twirp/livekit.RoomService/DeleteRoom' => Http::response([], 200),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertOk()
        ->assertJson([
            'status' => Consultation::STATUS_CANCELLED,
            'cancelled' => true,
            'message' => 'Consultation cancelled because participant attendance could not be confirmed in the LiveKit room.',
            'redirect_url' => route('consultations.index'),
        ]);

    $freshConsultation = $consultation->fresh();

    expect($freshConsultation->status)->toBe(Consultation::STATUS_CANCELLED);
    expect($freshConsultation->cancellation_reason)
        ->toBe('Consultation cancelled because participant attendance could not be confirmed in the LiveKit room.');
});

it('returns accepted and records the LiveKit error when participant removal fails on leave', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-206-remove-fails',
        'livekit_room_status' => 'room_ready',
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/RemoveParticipant' => Http::response([
            'code' => 'internal',
            'msg' => 'temporary LiveKit failure',
        ], 500),
        'https://livekit.test/twirp/livekit.RoomService/ListParticipants' => Http::response([], 200),
        'https://livekit.test/twirp/livekit.RoomService/DeleteRoom' => Http::response([], 200),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertAccepted()
        ->assertJson([
            'message' => 'Participant leave was accepted, but LiveKit removal could not be confirmed.',
            'status' => 'ongoing',
            'cancelled' => false,
            'redirect_url' => route('consultations.index'),
        ]);

    Http::assertNotSent(fn ($request) => $request->url() === 'https://livekit.test/twirp/livekit.RoomService/ListParticipants');

    $freshConsultation = $consultation->fresh();

    expect($freshConsultation->status)->toBe('ongoing');
    expect(str_contains((string) $freshConsultation->livekit_last_error, 'LiveKit participant removal failed'))->toBeTrue();
});

it('completes the consultation when the last participant leaves after both parties joined', function () {
    config()->set('services.livekit.url', 'https://livekit-delete-fails.test');

    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-207-delete-fails',
        'livekit_room_status' => 'room_ready',
        'livekit_doctor_joined_at' => now()->subMinutes(10),
        'livekit_patient_joined_at' => now()->subMinutes(8),
    ]);

    Http::fake([
        'https://livekit-delete-fails.test/twirp/livekit.RoomService/RemoveParticipant' => Http::response([], 200),
        'https://livekit-delete-fails.test/twirp/livekit.RoomService/ListParticipants' => Http::response([
            'participants' => [
                ['identity' => 'pipeline-bot-207'],
            ],
        ], 200),
        'https://livekit-delete-fails.test/twirp/livekit.RoomService/DeleteRoom' => Http::response([
            'code' => 'internal',
            'msg' => 'delete failed',
        ], 500),
    ]);

    $this->actingAs($patientUser)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertOk()
        ->assertJson([
            'status' => Consultation::STATUS_COMPLETED,
            'cancelled' => false,
            'redirect_url' => route('patient.consultations.index'),
        ]);

    $freshConsultation = $consultation->fresh();

    expect($freshConsultation->status)->toBe(Consultation::STATUS_COMPLETED);
    expect($freshConsultation->ended_at)->not->toBeNull();
    expect($freshConsultation->cancellation_reason)->toBeNull();
    expect($freshConsultation->livekit_room_status)->toBe('ended');
});

it('does not cancel when an admin audit user leaves', function () {
    $doctor = User::factory()->doctor()->create();
    $admin = User::factory()->admin()->create();

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'status' => 'ongoing',
        'livekit_room_name' => 'consultation-203-admin-leave',
        'livekit_room_status' => 'room_ready',
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/*' => Http::response([], 200),
    ]);

    $this->actingAs($admin)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertOk()
        ->assertJson([
            'status' => 'ongoing',
            'cancelled' => false,
            'redirect_url' => route('consultations.index'),
        ]);

    Http::assertNothingSent();

    expect($consultation->fresh()->status)->toBe('ongoing');
});

it('forbids unrelated users from leaving a consultation room', function () {
    $doctor = User::factory()->doctor()->create();
    $otherDoctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'livekit_room_name' => 'consultation-204-forbidden-leave',
    ]);

    $this->actingAs($otherDoctor)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertForbidden();
});

it('returns a stable leave response for terminal consultations', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'status' => 'completed',
        'livekit_room_name' => 'consultation-205-completed-leave',
    ]);

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/*' => Http::response([], 200),
    ]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.livekit.leave', $consultation))
        ->assertOk()
        ->assertJson([
            'status' => 'completed',
            'cancelled' => false,
            'redirect_url' => route('consultations.index'),
        ]);

    Http::assertNothingSent();
    expect($consultation->fresh()->status)->toBe('completed');
});
