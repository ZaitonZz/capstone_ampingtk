<?php

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Models\User;

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
                ->where('consent.consent_confirmed', true),
        );
});
