<?php

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\PatientNote;
use App\Models\User;

it('redirects guests to login', function () {
    $consultation = Consultation::factory()->create();

    $this->get(route('consultations.note.show', $consultation))
        ->assertRedirect(route('login'));
});

it('returns null when no note exists for a consultation', function () {
    $doctor       = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $response = $this->actingAs($doctor)
        ->getJson(route('consultations.note.show', $consultation))
        ->assertOk();

    expect($response->json())->toBeNull();
});

it('creates a SOAP note with patient_id and doctor_id inherited from consultation', function () {
    $doctor       = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.note.store', $consultation), [
            'subjective' => 'Patient reports headache for 3 days.',
            'objective'  => 'BP 130/85, HR 80bpm.',
            'assessment' => 'Hypertensive headache.',
            'plan'       => 'Prescribe antihypertensive. Follow up in 1 week.',
        ])
        ->assertCreated()
        ->assertJsonStructure(['id', 'subjective', 'objective', 'assessment', 'plan']);

    $this->assertDatabaseHas('patient_notes', [
        'consultation_id' => $consultation->id,
        'patient_id'      => $consultation->patient_id,
        'doctor_id'       => $consultation->doctor_id,
    ]);
});

it('upserts the note — no duplicate rows created on second store', function () {
    $doctor       = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $payload = ['subjective' => 'First write.', 'plan' => 'Plan A.'];

    $this->actingAs($doctor)->postJson(route('consultations.note.store', $consultation), $payload);
    $this->actingAs($doctor)->postJson(route('consultations.note.store', $consultation), $payload);

    $this->assertDatabaseCount('patient_notes', 1);
});

it('updates the plan field of an existing note', function () {
    $doctor       = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    PatientNote::create([
        'consultation_id' => $consultation->id,
        'patient_id'      => $consultation->patient_id,
        'doctor_id'       => $consultation->doctor_id,
        'subjective'      => 'Initial.',
        'plan'            => 'Old plan.',
    ]);

    $this->actingAs($doctor)
        ->patchJson(route('consultations.note.update', $consultation), [
            'plan' => 'Follow up in 2 weeks.',
        ])
        ->assertOk()
        ->assertJsonFragment(['plan' => 'Follow up in 2 weeks.']);

    $this->assertDatabaseHas('patient_notes', [
        'consultation_id' => $consultation->id,
        'plan'            => 'Follow up in 2 weeks.',
    ]);
});
