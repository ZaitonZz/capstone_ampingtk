<?php

use App\Models\DoctorDutySchedule;
use App\Models\DoctorDutyRequest;
use App\Models\User;

it('allows medical staff to create, update, and delete doctor duty schedules', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($medicalStaff)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'schedule_mode' => 'single',
            'duty_date' => now()->addDay()->toDateString(),
            'start_time' => '08:00',
            'end_time' => '12:00',
            'status' => 'on_duty',
            'remarks' => 'Morning OPD',
        ])
        ->assertRedirect();

    $schedule = DoctorDutySchedule::query()->first();

    expect($schedule)->not->toBeNull();

    $this->actingAs($medicalStaff)
        ->patch(route('doctor-duty-schedules.update', $schedule), [
            'doctor_id' => $doctor->id,
            'duty_date' => now()->addDay()->toDateString(),
            'start_time' => '09:00',
            'end_time' => '13:00',
            'status' => 'on_duty',
            'remarks' => 'Updated duty window',
        ])
        ->assertRedirect();

    expect(substr((string) $schedule->fresh()->start_time, 0, 5))->toBe('09:00');

    $this->actingAs($medicalStaff)
        ->delete(route('doctor-duty-schedules.destroy', $schedule))
        ->assertRedirect();

    expect(DoctorDutySchedule::query()->count())->toBe(0);
});

it('creates duty schedules with per-date entries and different times', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $date1 = now()->startOfWeek()->addDay()->toDateString();
    $date2 = now()->startOfWeek()->addDays(2)->toDateString();
    $date3 = now()->startOfWeek()->addDays(4)->toDateString();

    $this->actingAs($medicalStaff)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'schedule_mode' => 'multiple_dates',
            'specific_date_entries' => [
                [
                    'duty_date' => $date1,
                    'start_time' => '08:00',
                    'end_time' => '12:00',
                    'status' => 'on_duty',
                    'remarks' => 'Morning OPD',
                ],
                [
                    'duty_date' => $date2,
                    'start_time' => '13:00',
                    'end_time' => '17:00',
                    'status' => 'on_duty',
                    'remarks' => 'Afternoon clinic',
                ],
                [
                    'duty_date' => $date3,
                    'start_time' => '09:00',
                    'end_time' => '14:00',
                    'status' => 'on_duty',
                    'remarks' => 'Half day',
                ],
            ],
        ])
        ->assertRedirect();

    expect(DoctorDutySchedule::query()->where('doctor_id', $doctor->id)->count())->toBe(3);

    // Verify each entry has the correct times
    $schedules = DoctorDutySchedule::query()
        ->where('doctor_id', $doctor->id)
        ->orderBy('duty_date')
        ->get();

    expect($schedules[0]->duty_date->toDateString())->toBe($date1);
    expect(substr((string) $schedules[0]->start_time, 0, 5))->toBe('08:00');
    expect(substr((string) $schedules[0]->end_time, 0, 5))->toBe('12:00');

    expect($schedules[1]->duty_date->toDateString())->toBe($date2);
    expect(substr((string) $schedules[1]->start_time, 0, 5))->toBe('13:00');
    expect(substr((string) $schedules[1]->end_time, 0, 5))->toBe('17:00');

    expect($schedules[2]->duty_date->toDateString())->toBe($date3);
    expect(substr((string) $schedules[2]->start_time, 0, 5))->toBe('09:00');
    expect(substr((string) $schedules[2]->end_time, 0, 5))->toBe('14:00');
});

it('validates individual date entries in specific_date_entries', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $date1 = now()->startOfWeek()->addDay()->toDateString();
    $date2 = now()->startOfWeek()->addDays(2)->toDateString();

    $this->actingAs($medicalStaff)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'schedule_mode' => 'multiple_dates',
            'specific_date_entries' => [
                [
                    'duty_date' => $date1,
                    'start_time' => '08:00',
                    'end_time' => '12:00',
                    'status' => 'on_duty',
                    'remarks' => 'Valid entry',
                ],
                [
                    'duty_date' => $date2,
                    'start_time' => '17:00',
                    'end_time' => '13:00', // End time before start time - should fail
                    'status' => 'on_duty',
                    'remarks' => 'Invalid entry',
                ],
            ],
        ])
        ->assertSessionHasErrors();

    // No schedules should be created
    expect(DoctorDutySchedule::query()->where('doctor_id', $doctor->id)->count())->toBe(0);
});

it('detects overlapping schedules with per-date entries', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $dutyDate = now()->addDay()->toDateString();

    // Create an existing schedule
    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $dutyDate,
        'start_time' => '08:00',
        'end_time' => '12:00',
        'status' => 'on_duty',
    ]);

    // Try to add an overlapping schedule using specific_date_entries
    $this->actingAs($medicalStaff)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'schedule_mode' => 'multiple_dates',
            'specific_date_entries' => [
                [
                    'duty_date' => $dutyDate,
                    'start_time' => '11:00',
                    'end_time' => '14:00',
                    'status' => 'on_duty',
                    'remarks' => 'Overlapping shift',
                ],
            ],
        ])
        ->assertSessionHasErrors('specific_date_entries');

    // Still only one schedule should exist
    expect(DoctorDutySchedule::query()->where('doctor_id', $doctor->id)->count())->toBe(1);
});

it('creates duty schedules for multiple selected dates', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $date1 = now()->startOfWeek()->addDay()->toDateString();
    $date2 = now()->startOfWeek()->addDays(2)->toDateString();
    $date3 = now()->startOfWeek()->addDays(4)->toDateString();

    $this->actingAs($medicalStaff)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'schedule_mode' => 'multiple_dates',
            'specific_date_entries' => [
                [
                    'duty_date' => $date1,
                    'start_time' => '08:00',
                    'end_time' => '16:00',
                    'status' => 'on_duty',
                    'remarks' => 'Bulk OPD block',
                ],
                [
                    'duty_date' => $date2,
                    'start_time' => '08:00',
                    'end_time' => '16:00',
                    'status' => 'on_duty',
                    'remarks' => 'Bulk OPD block',
                ],
                [
                    'duty_date' => $date3,
                    'start_time' => '08:00',
                    'end_time' => '16:00',
                    'status' => 'on_duty',
                    'remarks' => 'Bulk OPD block',
                ],
            ],
        ])
        ->assertRedirect();

    expect(DoctorDutySchedule::query()->where('doctor_id', $doctor->id)->count())->toBe(3);

    $this->actingAs($medicalStaff)
        ->get(route('doctor-duty-schedules.index'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('doctor-duty-schedules/index')
                ->has('schedules', 3)
        );
});

it('creates recurring weekly duty schedules and supports doctor availability filtering', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $startDate = now()->startOfWeek()->toDateString();
    $endDate = now()->endOfWeek()->toDateString();

    $this->actingAs($medicalStaff)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'schedule_mode' => 'recurring_weekly',
            'recurring_start_date' => $startDate,
            'recurring_end_date' => $endDate,
            'recurring_weekdays' => ['mon', 'wed', 'fri'],
            'start_time' => '09:00',
            'end_time' => '15:00',
            'status' => 'on_duty',
            'remarks' => 'Recurring clinic block',
        ])
        ->assertRedirect();

    expect(DoctorDutySchedule::query()->where('doctor_id', $doctor->id)->count())->toBeGreaterThanOrEqual(1);

    $firstRecurringDate = now()->startOfWeek()->toDateString();

    $this->actingAs($medicalStaff)
        ->getJson(route('consultations.available-doctors', [
            'scheduled_at' => $firstRecurringDate.' 10:00:00',
        ]))
        ->assertOk()
        ->assertJsonPath('doctors.0.id', $doctor->id);
});

it('rejects overlapping duty schedules for the same doctor and date', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $dutyDate = now()->addDay()->toDateString();

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $dutyDate,
        'start_time' => '08:00',
        'end_time' => '12:00',
        'status' => 'on_duty',
    ]);

    $this->actingAs($medicalStaff)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'schedule_mode' => 'single',
            'duty_date' => $dutyDate,
            'start_time' => '11:00',
            'end_time' => '14:00',
            'status' => 'on_duty',
            'remarks' => 'Conflicting block',
        ])
        ->assertSessionHasErrors('specific_date_entries');
});

it('allows doctors to view their own duty calendar but not the staff scheduler', function () {
    $doctor = User::factory()->doctor()->create();
    $otherDoctor = User::factory()->doctor()->create();
    DoctorDutyRequest::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'pending',
    ]);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => now()->addDay()->toDateString(),
    ]);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $otherDoctor->id,
        'duty_date' => now()->addDay()->toDateString(),
    ]);

    $this->actingAsVerified($doctor)
        ->get(route('doctor-duty-calendar.index'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('doctor-duty-calendar/index')
                ->has('schedules', 1)
                ->has('duty_requests.data', 1)
                ->where('schedules.0.doctor_id', $doctor->id)
                ->where('duty_requests.data.0.doctor_id', $doctor->id)
        );

    $this->actingAs($doctor)
        ->get(route('doctor-duty-schedules.index'))
        ->assertForbidden();

    $this->actingAsVerified($doctor)
        ->post(route('doctor-duty-requests.store'), [
            'request_type' => 'on_leave',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'remarks' => 'Conference',
        ])
        ->assertRedirect();
});

it('prevents staff members from entering the doctor duty calendar', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();

    $this->actingAsVerified($medicalStaff)
        ->get(route('doctor-duty-calendar.index'))
        ->assertForbidden();
});
