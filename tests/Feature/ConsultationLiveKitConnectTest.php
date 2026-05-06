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
