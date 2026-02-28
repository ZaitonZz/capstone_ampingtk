<?php

use App\Models\Consultation;
use App\Models\Prescription;
use App\Models\User;

it('redirects guests to login', function () {
    $consultation = Consultation::factory()->create();

    $this->get(route('consultations.prescriptions.index', $consultation))
        ->assertRedirect(route('login'));
});

it('returns all prescriptions for a consultation', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    Prescription::factory(3)->create([
        'consultation_id' => $consultation->id,
        'patient_id' => $consultation->patient_id,
        'doctor_id' => $doctor->id,
    ]);

    $this->actingAs($doctor)
        ->getJson(route('consultations.prescriptions.index', $consultation))
        ->assertOk()
        ->assertJsonCount(3);
});

it('creates a prescription with patient_id and doctor_id from parent consultation', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.prescriptions.store', $consultation), [
            'medication_name' => 'Amoxicillin',
            'dosage' => '500mg',
            'frequency' => 'Three times daily',
            'duration' => '7 days',
            'route' => 'oral',
        ])
        ->assertCreated()
        ->assertJsonFragment(['medication_name' => 'Amoxicillin']);

    $this->assertDatabaseHas('prescriptions', [
        'consultation_id' => $consultation->id,
        'patient_id' => $consultation->patient_id,
        'doctor_id' => $consultation->doctor_id,
        'medication_name' => 'Amoxicillin',
    ]);
});

it('returns 422 when medication_name is missing on store', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.prescriptions.store', $consultation), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['medication_name']);
});

it('updates a prescription dosage', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    $prescription = Prescription::factory()->create([
        'consultation_id' => $consultation->id,
        'patient_id' => $consultation->patient_id,
        'doctor_id' => $doctor->id,
    ]);

    $this->actingAs($doctor)
        ->patchJson(route('consultations.prescriptions.update', [$consultation, $prescription]), [
            'dosage' => '1g',
        ])
        ->assertOk()
        ->assertJsonFragment(['dosage' => '1g']);

    $this->assertDatabaseHas('prescriptions', ['id' => $prescription->id, 'dosage' => '1g']);
});

it('soft-deletes a prescription on destroy', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    $prescription = Prescription::factory()->create([
        'consultation_id' => $consultation->id,
        'patient_id' => $consultation->patient_id,
        'doctor_id' => $doctor->id,
    ]);

    $this->actingAs($doctor)
        ->deleteJson(route('consultations.prescriptions.destroy', [$consultation, $prescription]))
        ->assertOk()
        ->assertJsonFragment(['message' => 'Prescription removed.']);

    expect(Prescription::find($prescription->id))->toBeNull();
    expect(Prescription::withTrashed()->find($prescription->id))->not->toBeNull();
});

it('returns 404 when updating a prescription from a different consultation', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation1 = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    $consultation2 = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    $prescription = Prescription::factory()->create([
        'consultation_id' => $consultation2->id,
        'patient_id' => $consultation2->patient_id,
        'doctor_id' => $doctor->id,
    ]);

    $this->actingAs($doctor)
        ->patchJson(route('consultations.prescriptions.update', [$consultation1, $prescription]), [
            'dosage' => '500mg',
        ])
        ->assertNotFound();
});
