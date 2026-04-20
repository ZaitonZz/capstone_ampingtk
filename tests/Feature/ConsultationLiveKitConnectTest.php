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
