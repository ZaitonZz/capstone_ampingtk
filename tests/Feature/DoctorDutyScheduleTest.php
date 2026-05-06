<?php

use App\Models\DoctorDutySchedule;
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

it('creates duty schedules for multiple selected dates', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $dates = [
        now()->startOfWeek()->addDay()->toDateString(),
        now()->startOfWeek()->addDays(2)->toDateString(),
        now()->startOfWeek()->addDays(4)->toDateString(),
    ];

    $this->actingAs($medicalStaff)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'schedule_mode' => 'multiple_dates',
            'duty_dates' => $dates,
            'start_time' => '08:00',
            'end_time' => '16:00',
            'status' => 'on_duty',
            'remarks' => 'Bulk OPD block',
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
        ->assertSessionHasErrors('duty_dates');
});

it('allows doctors to view duty calendar but not manage schedules', function () {
    $doctor = User::factory()->doctor()->create();
    $otherDoctor = User::factory()->doctor()->create();

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => now()->addDay()->toDateString(),
    ]);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $otherDoctor->id,
        'duty_date' => now()->addDay()->toDateString(),
    ]);

    $this->actingAs($doctor)
        ->get(route('doctor-duty-schedules.index'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('doctor-duty-schedules/index')
                ->where('can_manage_schedule', false)
                ->has('schedules', 1)
        );

    $this->actingAs($doctor)
        ->post(route('doctor-duty-schedules.store'), [
            'doctor_id' => $doctor->id,
            'duty_date' => now()->addDay()->toDateString(),
            'start_time' => '08:00',
            'end_time' => '12:00',
            'status' => 'on_duty',
        ])
        ->assertForbidden();
});
