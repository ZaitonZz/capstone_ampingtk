<?php

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Models\Patient;
use App\Models\User;

it('redirects guests to login on session page', function () {
    $consultation = Consultation::factory()->teleconsultation()->create();

    $this->get(route('consultations.session.show', $consultation))
        ->assertRedirect(route('login'));
});

it('forbids non-assigned doctor from viewing session page', function () {
    $ownerDoctor = User::factory()->doctor()->create();
    $otherDoctor = User::factory()->doctor()->create();

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $ownerDoctor->id,
    ]);

    $this->actingAs($otherDoctor)
        ->get(route('consultations.session.show', $consultation))
        ->assertForbidden();
});

it('allows consenting consultation doctor to view session page', function () {
    $doctor = User::factory()->doctor()->create();

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
    ]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.session.show', $consultation))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('consultations/session'));
});

it('forbids doctor without confirmed consent from viewing session page', function () {
    $doctor = User::factory()->doctor()->create();

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
    ]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $doctor->id,
        'consent_confirmed' => false,
        'confirmed_at' => null,
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.session.show', $consultation))
        ->assertForbidden();
});

it('allows admin audit access to session page without consent', function () {
    $doctor = User::factory()->doctor()->create();
    $admin = User::factory()->admin()->create();

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
    ]);

    $this->actingAs($admin)
        ->get(route('consultations.session.show', $consultation))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('consultations/session'));
});

it('allows consenting consultation patient to view session page', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patient->id,
    ]);

    ConsultationConsent::create([
        'consultation_id' => $consultation->id,
        'user_id' => $patientUser->id,
        'consent_confirmed' => true,
        'confirmed_at' => now(),
    ]);

    $this->actingAs($patientUser)
        ->get(route('consultations.session.show', $consultation))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('consultations/session'));
});
