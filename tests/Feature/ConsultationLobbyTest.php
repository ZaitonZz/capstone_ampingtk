<?php

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Models\Patient;
use App\Models\User;
use App\Services\ConsultationIdentityVerificationService;

// ── Guard: guests ─────────────────────────────────────────────────────────────

it('redirects guests to login on lobby show', function () {
    $consultation = Consultation::factory()->create();

    $this->get(route('consultations.lobby.show', $consultation))
        ->assertRedirect(route('login'));
});

// ── Authorization ─────────────────────────────────────────────────────────────

it("forbids a doctor from viewing another doctor's consultation lobby", function () {
    $owner = User::factory()->doctor()->create();
    $other = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $owner->id]);

    $this->actingAs($other)
        ->get(route('consultations.lobby.show', $consultation))
        ->assertForbidden();
});

// ── Show page: no consent ─────────────────────────────────────────────────────

it('renders the lobby page without an existing consent record', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.lobby.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/lobby')
                ->has('consultation')
                ->where('consent', null),
        );
});

// ── Show page: consent not yet confirmed ─────────────────────────────────────

it('renders the lobby page with an unconfirmed consent record', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);
    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => false,
        'confirmed_at' => null,
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.lobby.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/lobby')
                ->has('consultation')
                ->where('consent.consent_confirmed', false),
        );
});

// ── Show page: consent confirmed ─────────────────────────────────────────────

it('renders the lobby page with a confirmed consent record', function () {
    config()->set('services.livekit.enabled', false);

    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);
    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.lobby.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/lobby')
                ->has('consultation')
                ->where('consent.consent_confirmed', true)
                ->where('livekit.enabled', false),
        );
});

it('allows the consultation patient to view the teleconsultation lobby', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patientProfile = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patientProfile->id,
    ]);

    $this->actingAs($patientUser)
        ->get(route('consultations.lobby.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/lobby')
                ->has('consultation')
                ->has('livekit.connect_url'),
        );
});

it('forbids medical staff from viewing the teleconsultation lobby', function () {
    $doctor = User::factory()->doctor()->create();
    $medicalStaff = User::factory()->medicalStaff()->create();

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
    ]);

    $this->actingAs($medicalStaff)
        ->get(route('consultations.lobby.show', $consultation))
        ->assertForbidden();
});

it('includes configured OTP length in lobby verification payload', function () {
    config()->set('auth_otp.otp.length', 8);

    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.lobby.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/lobby')
                ->where('verification.otp_length', 8),
        );
});

it('shows manual override enabled state for assigned doctor in lobby payload', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'status' => 'scheduled',
    ]);

    $this->actingAs($doctor)
        ->post(route('consultations.identity-verification.override', $consultation))
        ->assertRedirect();

    $service = app(ConsultationIdentityVerificationService::class);

    expect($service->isManualOverrideEnabled($consultation->fresh()))->toBeTrue();

    $this->actingAs($doctor)
        ->get(route('consultations.lobby.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/lobby')
                ->where('verification.manual_override_enabled', true),
        );
});
