<?php

use App\Models\Consultation;
use App\Models\DoctorDutySchedule;
use App\Models\Patient;
use App\Models\User;

it('allows a patient to see their own consultations index', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);

    Consultation::factory(3)->create(['patient_id' => $patient->id]);
    Consultation::factory(2)->create(); // other

    $this->actingAsVerified($user)
        ->get(route('patient.consultations.index'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/index')
                ->has('consultations.data', 3)
        );
});

it('allows a patient to view a specific consultation', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);
    $consultation = Consultation::factory()->create(['patient_id' => $patient->id]);

    $this->actingAsVerified($user)
        ->get(route('patient.consultations.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/show')
                ->where('consultation.id', $consultation->id)
        );
});

it('filters consultations by status', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);

    Consultation::factory(2)->create(['patient_id' => $patient->id, 'status' => 'pending']);
    Consultation::factory(3)->create(['patient_id' => $patient->id, 'status' => 'completed']);

    $this->actingAsVerified($user)
        ->get(route('patient.consultations.index', ['status' => 'pending']))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/index')
                ->has('consultations.data', 2)
                ->where('filters.status', 'pending')
        );
});

it('filters consultations by type', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);

    Consultation::factory(2)->create(['patient_id' => $patient->id, 'type' => 'teleconsultation']);
    Consultation::factory()->teleconsultation()->create(['patient_id' => $patient->id]);

    $this->actingAsVerified($user)
        ->get(route('patient.consultations.index', ['type' => 'teleconsultation']))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/index')
                ->has('consultations.data', 3)
                ->where('filters.type', 'teleconsultation')
        );
});

it('preserves filters in pagination links', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);

    Consultation::factory(5)->create(['patient_id' => $patient->id, 'status' => 'scheduled']);

    $this->actingAsVerified($user)
        ->get(route('patient.consultations.index', ['status' => 'scheduled', 'per_page' => 2]))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/index')
                ->has('consultations.data', 2)
                ->where('consultations.last_page', 3)
                ->where('filters.status', 'scheduled')
        );
});

it('prevents a patient from viewing another patient\'s consultation', function () {
    $user = User::factory()->patient()->create();
    Patient::factory()->create(['user_id' => $user->id]);
    $otherConsultation = Consultation::factory()->create();

    $this->actingAsVerified($user)
        ->get(route('patient.consultations.show', $otherConsultation))
        ->assertForbidden();
});

it('returns only on-duty doctors for patient schedule selection', function () {
    $user = User::factory()->patient()->create();
    Patient::factory()->create(['user_id' => $user->id]);
    $onDutyDoctor = User::factory()->doctor()->create();
    User::factory()->doctor()->create();
    $scheduledAt = now()->addDays(3)->setHour(9)->setMinute(0)->setSecond(0);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $onDutyDoctor->id,
        'duty_date' => $scheduledAt->toDateString(),
        'start_time' => '08:00',
        'end_time' => '12:00',
        'status' => 'on_duty',
    ]);

    $this->actingAsVerified($user)
        ->getJson(route('patient.consultations.available-doctors', [
            'scheduled_at' => $scheduledAt->toDateTimeString(),
        ]))
        ->assertOk()
        ->assertJsonPath('doctors.0.id', $onDutyDoctor->id)
        ->assertJsonCount(1, 'doctors');
});

it('rejects patient appointment request when preferred doctor is off duty', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id]);
    $doctor = User::factory()->doctor()->create();
    $scheduledAt = now()->addDays(2)->setHour(16)->setMinute(0)->setSecond(0);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $scheduledAt->toDateString(),
        'start_time' => '08:00',
        'end_time' => '12:00',
        'status' => 'on_duty',
    ]);

    $this->actingAsVerified($user)
        ->post(route('patient.consultations.request'), [
            'doctor_id' => $doctor->id,
            'type' => 'teleconsultation',
            'chief_complaint' => 'Routine check-up',
            'scheduled_at' => $scheduledAt->toDateTimeString(),
        ])
        ->assertSessionHasErrors('doctor_id');

    expect(Consultation::where('patient_id', $patient->id)->exists())->toBeFalse();
});
