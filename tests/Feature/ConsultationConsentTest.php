<?php

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\Http;

$validPayload = [
    'read_privacy_notice' => true,
    'agree_identity_guard' => true,
    'agree_liveness_check' => true,
];

// ── Guard: guests ─────────────────────────────────────────────────────────────

it('redirects guests to login on consent show', function () {
    $consultation = Consultation::factory()->create();

    $this->get(route('consultations.consent.show', $consultation))
        ->assertRedirect(route('login'));
});

it('redirects guests to login on consent store', function () {
    $consultation = Consultation::factory()->create();

    $this->post(route('consultations.consent.store', $consultation))
        ->assertRedirect(route('login'));
});

// ── Authorization ─────────────────────────────────────────────────────────────

it("forbids a doctor from viewing another doctor's consultation consent page", function () {
    $owner = User::factory()->doctor()->create();
    $other = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $owner->id]);

    $this->actingAs($other)
        ->get(route('consultations.consent.show', $consultation))
        ->assertForbidden();
});

it("forbids a doctor from confirming consent on another doctor's consultation", function () use (&$validPayload) {
    $owner = User::factory()->doctor()->create();
    $other = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $owner->id]);

    $this->actingAs($other)
        ->post(route('consultations.consent.store', $consultation), $validPayload)
        ->assertForbidden();
});

// ── Show page ─────────────────────────────────────────────────────────────────

it('renders the consent page for the owning doctor without an existing consent', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.consent.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/consent')
                ->has('consultation')
                ->where('consent', null),
        );
});

it('renders the consent page with an existing confirmed consent record', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.consent.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/consent')
                ->where('consent.consent_confirmed', true),
        );
});

it('renders the consent page for an admin', function () {
    $admin = User::factory()->admin()->create();
    $consultation = Consultation::factory()->create();

    $this->actingAs($admin)
        ->get(route('consultations.consent.show', $consultation))
        ->assertOk();
});

it('renders the consent page for the consultation patient', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);
    $consultation = Consultation::factory()->teleconsultation()->create(['patient_id' => $patient->id]);

    $this->actingAsVerified($user)
        ->get(route('consultations.consent.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/consent')
                ->where('consultation.id', $consultation->id)
        );
});

// ── Store: validation ─────────────────────────────────────────────────────────

it('requires all checkboxes on consent store', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->post(route('consultations.consent.store', $consultation), [])
        ->assertSessionHasErrors([
            'read_privacy_notice',
            'agree_identity_guard',
            'agree_liveness_check',
        ]);
});

it('rejects a false checkbox value on consent store', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->post(route('consultations.consent.store', $consultation), [
            'read_privacy_notice' => false,
            'agree_identity_guard' => true,
            'agree_liveness_check' => true,
        ])
        ->assertSessionHasErrors(['read_privacy_notice']);
});

// ── Store: success ────────────────────────────────────────────────────────────

it('creates a consent record and redirects with success flash', function () use (&$validPayload) {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->post(route('consultations.consent.store', $consultation), $validPayload)
        ->assertRedirect(route('consultations.lobby.show', $consultation))
        ->assertSessionHas('success', 'Consent confirmed.');

    $this->assertDatabaseHas('consultation_consents', [
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
    ]);
});

it('redirects patient in-person consent back to the patient consultation details page', function () use (&$validPayload) {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);
    $consultation = Consultation::factory()->create([
        'patient_id' => $patient->id,
        'type' => 'in_person',
        'session_token' => null,
    ]);

    $this->actingAsVerified($user)
        ->post(route('consultations.consent.store', $consultation), $validPayload)
        ->assertRedirect(route('patient.consultations.show', $consultation))
        ->assertSessionHas('success', 'Consent confirmed.');
});

it('upserts consent on a subsequent confirmation', function () use (&$validPayload) {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => false,
        'confirmed_at' => null,
    ]);

    $this->actingAs($doctor)
        ->post(route('consultations.consent.store', $consultation), $validPayload)
        ->assertRedirect(route('consultations.lobby.show', $consultation));

    expect(
        ConsultationConsent::where([
            'consultation_id' => $consultation->id,
            'user_id' => $doctor->id,
        ])->count(),
    )->toBe(1);

    expect(
        ConsultationConsent::where([
            'consultation_id' => $consultation->id,
            'user_id' => $doctor->id,
        ])->value('consent_confirmed'),
    )->toBeTrue();
});

it('provisions a LiveKit room after consent when integration is enabled', function () use (&$validPayload) {
    config()->set('services.livekit.enabled', true);
    config()->set('services.livekit.url', 'https://livekit.test');
    config()->set('services.livekit.api_key', 'test-api-key');
    config()->set('services.livekit.api_secret', 'test-api-secret');

    Http::fake([
        'https://livekit.test/twirp/livekit.RoomService/CreateRoom' => Http::response([
            'sid' => 'RM_test_room_sid',
        ], 200),
    ]);

    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->teleconsultation()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->post(route('consultations.consent.store', $consultation), $validPayload)
        ->assertRedirect(route('consultations.lobby.show', $consultation));

    $consultation->refresh();

    expect($consultation->livekit_room_name)->not->toBeNull();
    expect($consultation->livekit_room_sid)->toBe('RM_test_room_sid');
    expect($consultation->livekit_room_status)->toBe('room_ready');
});
