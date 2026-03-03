<?php

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;

it('redirects guests to login', function () {
    $this->get(route('consultations.index'))->assertRedirect(route('login'));
});

it('renders the consultations index for a doctor', function () {
    $doctor = User::factory()->doctor()->create();
    Consultation::factory(3)->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.index'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/index')
                ->has('consultations.data', 3)
        );
});

it('filters consultations by patient_id', function () {
    $doctor = User::factory()->doctor()->create();
    $patient1 = Patient::factory()->create(['registered_by' => $doctor->id]);
    $patient2 = Patient::factory()->create(['registered_by' => $doctor->id]);
    Consultation::factory()->create(['doctor_id' => $doctor->id, 'patient_id' => $patient1->id]);
    Consultation::factory()->create(['doctor_id' => $doctor->id, 'patient_id' => $patient2->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.index', ['patient_id' => $patient1->id]))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/index')
                ->has('consultations.data', 1)
                ->where('consultations.data.0.patient_id', $patient1->id)
        );
});

it('filters consultations by status', function () {
    $doctor = User::factory()->doctor()->create();
    Consultation::factory()->completed()->create(['doctor_id' => $doctor->id]);
    Consultation::factory()->create(['doctor_id' => $doctor->id, 'status' => 'scheduled']);

    $this->actingAs($doctor)
        ->get(route('consultations.index', ['status' => 'completed']))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/index')
                ->has('consultations.data', 1)
                ->where('consultations.data.0.status', 'completed')
        );
});

it('renders the show page with all related data', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/show')
                ->has('consultation.patient')
                ->has('consultation.doctor')
        );
});

it('creates an in-person consultation and redirects', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->post(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'in_person',
            'chief_complaint' => 'Fever and headache',
            'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])
        ->assertRedirect();

    expect(Consultation::where('type', 'in_person')->where('patient_id', $patient->id)->exists())->toBeTrue();
});

it('creates a teleconsultation and generates a session_token', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->post(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'teleconsultation',
            'chief_complaint' => 'Follow-up',
            'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])
        ->assertRedirect();

    $consultation = Consultation::where('type', 'teleconsultation')->where('patient_id', $patient->id)->first();
    expect($consultation)->not->toBeNull();
    expect($consultation->session_token)->not->toBeNull();
});

it('updates consultation status and redirects', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->patch(route('consultations.update', $consultation), ['status' => 'completed'])
        ->assertRedirect(route('consultations.show', $consultation));

    expect($consultation->fresh()->status)->toBe('completed');
});

it('soft-deletes a consultation and redirects to index', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->delete(route('consultations.destroy', $consultation))
        ->assertRedirect(route('consultations.index'));

    expect(Consultation::find($consultation->id))->toBeNull();
    expect(Consultation::withTrashed()->find($consultation->id))->not->toBeNull();
});
