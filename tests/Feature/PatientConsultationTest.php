<?php

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;

it('allows a patient to see their own consultations index', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);

    Consultation::factory(3)->create(['patient_id' => $patient->id]);
    Consultation::factory(2)->create(); // other

    $this->actingAs($user)
        ->get(route('patient.consultations.index'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/index')
                ->has('consultations.data', 3)
        );
});

it('allows a patient to view a specific consultation', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);
    $consultation = Consultation::factory()->create(['patient_id' => $patient->id]);

    $this->actingAs($user)
        ->get(route('patient.consultations.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/show')
                ->where('consultation.id', $consultation->id)
        );
});

it('filters consultations by status', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);

    Consultation::factory(2)->create(['patient_id' => $patient->id, 'status' => 'pending']);
    Consultation::factory(3)->create(['patient_id' => $patient->id, 'status' => 'completed']);

    $this->actingAs($user)
        ->get(route('patient.consultations.index', ['status' => 'pending']))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/index')
                ->has('consultations.data', 2)
                ->where('filters.status', 'pending')
        );
});

it('filters consultations by type', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);

    Consultation::factory(2)->create(['patient_id' => $patient->id, 'type' => 'in_person']);
    Consultation::factory()->teleconsultation()->create(['patient_id' => $patient->id]);

    $this->actingAs($user)
        ->get(route('patient.consultations.index', ['type' => 'teleconsultation']))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/index')
                ->has('consultations.data', 1)
                ->where('filters.type', 'teleconsultation')
        );
});

it('preserves filters in pagination links', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);

    Consultation::factory(5)->create(['patient_id' => $patient->id, 'status' => 'scheduled']);

    $this->actingAs($user)
        ->get(route('patient.consultations.index', ['status' => 'scheduled', 'per_page' => 2]))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/index')
                ->has('consultations.data', 2)
                ->where('consultations.last_page', 3)
                ->where('filters.status', 'scheduled')
        );
});

it('prevents a patient from viewing another patient\'s consultation', function () {
    $user = User::factory()->patient()->create();
    Patient::factory()->create(['user_id' => $user->id]);
    $otherConsultation = Consultation::factory()->create();

    $this->actingAs($user)
        ->get(route('patient.consultations.show', $otherConsultation))
        ->assertForbidden();
});
