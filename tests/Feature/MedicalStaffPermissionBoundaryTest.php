<?php

use App\Models\Consultation;
use App\Models\User;

it('forbids medical staff from accessing soap note endpoints', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $consultation = Consultation::factory()->create();

    $this->actingAs($medicalStaff)
        ->get(route('consultations.note.show', $consultation))
        ->assertForbidden();
});

it('forbids medical staff from accessing vitals endpoints', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $consultation = Consultation::factory()->create();

    $this->actingAs($medicalStaff)
        ->get(route('consultations.vitals.show', $consultation))
        ->assertForbidden();
});

it('forbids medical staff from accessing prescription endpoints', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $consultation = Consultation::factory()->create();

    $this->actingAs($medicalStaff)
        ->get(route('consultations.prescriptions.index', $consultation))
        ->assertForbidden();
});

it('forbids medical staff from accessing doctor profile endpoints', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();

    $this->actingAs($medicalStaff)
        ->get(route('doctor.profile.show'))
        ->assertForbidden();
});

it('allows doctors to access soap note endpoints', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.note.show', $consultation))
        ->assertSuccessful();
});

it('allows medical staff to approve pending consultations', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $consultation = Consultation::factory()->create([
        'status' => 'pending',
    ]);

    $this->actingAs($medicalStaff)
        ->patch(route('consultations.approve', $consultation))
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('scheduled');
});

it('allows medical staff to reschedule pending consultations', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $consultation = Consultation::factory()->create([
        'status' => 'pending',
        'scheduled_at' => now()->addDay(),
    ]);

    $newSchedule = now()->addDays(2)->toDateTimeString();

    $this->actingAs($medicalStaff)
        ->patch(route('consultations.reschedule', $consultation), [
            'scheduled_at' => $newSchedule,
        ])
        ->assertRedirect();

    expect($consultation->fresh()->scheduled_at?->toDateTimeString())->toBe(
        \Illuminate\Support\Carbon::parse($newSchedule)->toDateTimeString()
    );
});

it('allows medical staff to cancel pending consultations', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $consultation = Consultation::factory()->create([
        'status' => 'pending',
    ]);

    $this->actingAs($medicalStaff)
        ->patch(route('consultations.cancel', $consultation), [
            'cancellation_reason' => 'Patient requested schedule change.',
        ])
        ->assertRedirect();

    $consultation->refresh();

    expect($consultation->status)->toBe('cancelled');
    expect($consultation->cancellation_reason)->toBe('Patient requested schedule change.');
});
