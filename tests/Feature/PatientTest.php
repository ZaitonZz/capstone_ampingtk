<?php

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;

it('redirects guests to login', function () {
    $this->get(route('patients.index'))->assertRedirect(route('login'));
});

it('returns paginated patients for authenticated users', function () {
    $doctor = User::factory()->doctor()->create();
    Patient::factory(3)->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->getJson(route('patients.index'))
        ->assertOk()
        ->assertJsonStructure(['data', 'current_page', 'total']);
});

it('filters patients by search query', function () {
    $doctor = User::factory()->doctor()->create();
    Patient::factory()->create(['first_name' => 'Unique', 'last_name' => 'Searchable', 'registered_by' => $doctor->id]);
    Patient::factory()->create(['first_name' => 'Other',  'last_name' => 'Person',    'registered_by' => $doctor->id]);

    $response = $this->actingAs($doctor)
        ->getJson(route('patients.index', ['search' => 'Searchable']))
        ->assertOk();

    $names = collect($response->json('data'))->pluck('last_name');
    expect($names)->toContain('Searchable');
    expect($names)->not->toContain('Person');
});

it('returns a patient with relationships on show', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);
    Consultation::factory()->create(['patient_id' => $patient->id, 'doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->getJson(route('patients.show', $patient))
        ->assertOk()
        ->assertJsonStructure(['id', 'first_name', 'last_name', 'consultations']);
});

it('stores a new patient and sets registered_by to auth user', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('patients.store'), [
            'first_name'    => 'Juan',
            'last_name'     => 'Dela Cruz',
            'date_of_birth' => '1990-05-15',
            'gender'        => 'male',
        ])
        ->assertCreated()
        ->assertJsonFragment(['first_name' => 'Juan']);

    $this->assertDatabaseHas('patients', [
        'first_name'    => 'Juan',
        'registered_by' => $doctor->id,
    ]);
});

it('returns 422 when required fields are missing on store', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('patients.store'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['first_name', 'last_name', 'date_of_birth', 'gender']);
});

it('updates a patient record', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->patchJson(route('patients.update', $patient), ['first_name' => 'Updated'])
        ->assertOk()
        ->assertJsonFragment(['first_name' => 'Updated']);

    $this->assertDatabaseHas('patients', ['id' => $patient->id, 'first_name' => 'Updated']);
});

it('soft-deletes a patient on destroy', function () {
    $doctor  = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->deleteJson(route('patients.destroy', $patient))
        ->assertOk()
        ->assertJsonFragment(['message' => 'Patient deleted.']);

    expect(Patient::find($patient->id))->toBeNull();
    expect(Patient::withTrashed()->find($patient->id))->not->toBeNull();
});
