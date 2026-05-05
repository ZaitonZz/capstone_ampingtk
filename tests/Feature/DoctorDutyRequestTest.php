<?php

use App\Models\DoctorDutyRequest;
use App\Models\DoctorDutySchedule;
use App\Models\Patient;
use App\Models\User;

it('allows doctors to submit leave or absence requests', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->post(route('doctor-duty-requests.store'), [
            'request_type' => 'on_leave',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'remarks' => 'Medical conference',
        ])
        ->assertRedirect();

    expect(DoctorDutyRequest::query()->count())->toBe(1);
    expect(DoctorDutyRequest::query()->first()?->status)->toBe('pending');
});

it('allows medical staff to approve duty requests and applies absence status', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => now()->addDay()->toDateString(),
        'start_time' => '08:00',
        'end_time' => '17:00',
        'status' => 'on_duty',
    ]);

    $request = DoctorDutyRequest::factory()->create([
        'doctor_id' => $doctor->id,
        'request_type' => 'absent',
        'start_date' => now()->addDay()->toDateString(),
        'end_date' => now()->addDay()->toDateString(),
        'status' => 'pending',
    ]);

    $this->actingAs($medicalStaff)
        ->patch(route('doctor-duty-requests.review', $request), [
            'decision' => 'approved',
            'reviewer_notes' => 'Approved for valid reason.',
        ])
        ->assertRedirect();

    expect($request->fresh()->status)->toBe('approved');

    $updatedSchedule = DoctorDutySchedule::query()->where('doctor_id', $doctor->id)->first();
    expect($updatedSchedule?->status)->toBe('absent');
});

it('prevents doctor from reviewing leave or absence requests', function () {
    $doctor = User::factory()->doctor()->create();
    $request = DoctorDutyRequest::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'pending',
    ]);

    $this->actingAs($doctor)
        ->patch(route('doctor-duty-requests.review', $request), [
            'decision' => 'approved',
        ])
        ->assertForbidden();
});

it(
    'approved leave request excludes doctor from consultation availability',
    function () {
        $medicalStaff = User::factory()->medicalStaff()->create();
        $doctor = User::factory()->doctor()->create();
        $patient = Patient::factory()->create(['registered_by' => $medicalStaff->id]);
        $scheduledAt = now()->addDays(3)->setHour(10)->setMinute(0)->setSecond(0);

        DoctorDutySchedule::factory()->create([
            'doctor_id' => $doctor->id,
            'duty_date' => $scheduledAt->toDateString(),
            'start_time' => '08:00',
            'end_time' => '17:00',
            'status' => 'on_duty',
        ]);

        $request = DoctorDutyRequest::factory()->create([
            'doctor_id' => $doctor->id,
            'request_type' => 'on_leave',
            'start_date' => $scheduledAt->toDateString(),
            'end_date' => $scheduledAt->toDateString(),
            'status' => 'pending',
        ]);

        $this->actingAs($medicalStaff)
            ->patch(route('doctor-duty-requests.review', $request), [
                'decision' => 'approved',
            ])
            ->assertRedirect();

        $this->actingAs($medicalStaff)
            ->post(route('consultations.store'), [
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'type' => 'teleconsultation',
                'chief_complaint' => 'Routine follow-up',
                'scheduled_at' => $scheduledAt->toDateTimeString(),
            ])
            ->assertSessionHasErrors('doctor_id');
    }
);
