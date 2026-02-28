<?php

use App\Models\Consultation;
use App\Models\User;

it('redirects guests to login', function () {
    $consultation = Consultation::factory()->create();

    $this->get(route('consultations.vitals.show', $consultation))
        ->assertRedirect(route('login'));
});

it('returns 204 when no vitals have been recorded', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->getJson(route('consultations.vitals.show', $consultation))
        ->assertNoContent();
});

it('creates vital signs and sets recorded_by to auth user', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.vitals.store', $consultation), [
            'temperature' => 36.5,
            'blood_pressure_systolic' => 120,
            'blood_pressure_diastolic' => 80,
            'heart_rate' => 72,
            'respiratory_rate' => 16,
            'oxygen_saturation' => 98.5,
        ])
        ->assertCreated()
        ->assertJsonFragment(['heart_rate' => 72]);

    $this->assertDatabaseHas('vital_signs', [
        'consultation_id' => $consultation->id,
        'recorded_by' => $doctor->id,
    ]);
});

it('upserts vitals — no duplicate rows created on second store', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    $payload = ['temperature' => 36.5, 'heart_rate' => 70];

    $this->actingAs($doctor)->postJson(route('consultations.vitals.store', $consultation), $payload);
    $this->actingAs($doctor)->postJson(route('consultations.vitals.store', $consultation), $payload);

    $this->assertDatabaseCount('vital_signs', 1);
});

it('auto-computes bmi from weight and height', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $response = $this->actingAs($doctor)
        ->postJson(route('consultations.vitals.store', $consultation), [
            'weight' => 70,
            'height' => 175,
        ])
        ->assertCreated();

    expect($response->json('bmi'))->not->toBeNull();
    // BMI = 70 / (1.75^2) ≈ 22.86
    expect((float) $response->json('bmi'))->toBeGreaterThan(22.0)->toBeLessThan(24.0);
});

it('validates vital sign values are within clinical ranges', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.vitals.store', $consultation), [
            'temperature' => 200, // invalid
            'oxygen_saturation' => 200, // invalid
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['temperature', 'oxygen_saturation']);
});
