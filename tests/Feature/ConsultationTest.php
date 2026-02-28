<?php

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;

it('redirects guests to login', function () {
    $this->get(route('consultations.index'))->assertRedirect(route('login'));
});

it('returns paginated consultations for authenticated users', function () {
    $doctor = User::factory()->doctor()->create();
    Consultation::factory(3)->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->getJson(route('consultations.index'))
        ->assertOk()
        ->assertJsonStructure(['data', 'current_page', 'total']);
});

it('filters consultations by patient_id', function () {
    $doctor = User::factory()->doctor()->create();
    $patient1 = Patient::factory()->create(['registered_by' => $doctor->id]);
    $patient2 = Patient::factory()->create(['registered_by' => $doctor->id]);
    Consultation::factory()->create(['doctor_id' => $doctor->id, 'patient_id' => $patient1->id]);
    Consultation::factory()->create(['doctor_id' => $doctor->id, 'patient_id' => $patient2->id]);

    $response = $this->actingAs($doctor)
        ->getJson(route('consultations.index', ['patient_id' => $patient1->id]))
        ->assertOk();

    $patientIds = collect($response->json('data'))->pluck('patient_id');
    expect($patientIds->every(fn ($id) => $id === $patient1->id))->toBeTrue();
});

it('filters consultations by status', function () {
    $doctor = User::factory()->doctor()->create();
    Consultation::factory()->completed()->create(['doctor_id' => $doctor->id]);
    Consultation::factory()->create(['doctor_id' => $doctor->id, 'status' => 'scheduled']);

    $response = $this->actingAs($doctor)
        ->getJson(route('consultations.index', ['status' => 'completed']))
        ->assertOk();

    $statuses = collect($response->json('data'))->pluck('status');
    expect($statuses->every(fn ($s) => $s === 'completed'))->toBeTrue();
});

it('returns a consultation with all related data on show', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->getJson(route('consultations.show', $consultation))
        ->assertOk()
        ->assertJsonStructure([
            'id',
            'patient',
            'doctor',
            'note',
            'vital_signs',
            'prescriptions',
            'deepfake_scan_logs',
        ]);
});

it('creates an in-person consultation', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'in_person',
            'chief_complaint' => 'Fever and headache',
            'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])
        ->assertCreated()
        ->assertJsonFragment(['type' => 'in_person'])
        ->assertJsonFragment(['session_token' => null]);
});

it('creates a teleconsultation and generates a session_token', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    $response = $this->actingAs($doctor)
        ->postJson(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'teleconsultation',
            'chief_complaint' => 'Follow-up',
            'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])
        ->assertCreated()
        ->assertJsonFragment(['type' => 'teleconsultation']);

    expect($response->json('session_token'))->not->toBeNull();
});

it('updates consultation status', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->patchJson(route('consultations.update', $consultation), ['status' => 'completed'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'completed']);
});

it('soft-deletes a consultation on destroy', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->deleteJson(route('consultations.destroy', $consultation))
        ->assertOk()
        ->assertJsonFragment(['message' => 'Consultation removed.']);

    expect(Consultation::find($consultation->id))->toBeNull();
    expect(Consultation::withTrashed()->find($consultation->id))->not->toBeNull();
});
