<?php

use App\Models\Consultation;
use App\Models\DoctorDutySchedule;
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
        'scheduled_at' => now()->addDay()->setHour(10)->setMinute(0)->setSecond(0),
    ]);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $consultation->doctor_id,
        'duty_date' => $consultation->scheduled_at->toDateString(),
        'start_time' => '08:00',
        'end_time' => '17:00',
        'status' => 'on_duty',
    ]);

    $this->actingAsVerified($medicalStaff)
        ->patch(route('consultations.approve', $consultation))
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('scheduled');
});

it('allows medical staff to reschedule pending consultations', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $newSchedule = now()->addDays(2)->setHour(10)->setMinute(0)->setSecond(0);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $newSchedule->toDateString(),
        'start_time' => '08:00',
        'end_time' => '17:00',
        'status' => 'on_duty',
    ]);

    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'pending',
        'scheduled_at' => now()->addDay(),
    ]);

    $newScheduleString = $newSchedule->toDateTimeString();

    $this->actingAs($medicalStaff)
        ->patch(route('consultations.reschedule', $consultation), [
            'scheduled_at' => $newScheduleString,
        ])
        ->assertRedirect();

    expect($consultation->fresh()->scheduled_at?->toDateTimeString())->toBe(
        \Illuminate\Support\Carbon::parse($newScheduleString)->toDateTimeString()
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
