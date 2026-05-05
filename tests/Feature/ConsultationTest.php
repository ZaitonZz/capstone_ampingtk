<?php

use App\Models\Consultation;
use App\Models\DoctorDutySchedule;
use App\Models\Patient;
use App\Models\User;

it('redirects guests to login', function () {
    $this->get(route('consultations.index'))->assertRedirect(route('login'));
});

it('renders only doctor-visible consultations on the index for a doctor', function () {
    $doctor = User::factory()->doctor()->create();
    Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'scheduled',
        'scheduled_at' => now(),
    ]);
    Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'scheduled',
        'scheduled_at' => now()->addDay(),
    ]);
    Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'pending',
        'scheduled_at' => now()->addDay(),
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.index'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/index')
                ->has('consultations.data', 2)
        );
});

it('hides pending consultations from doctor index until medical staff approves', function () {
    $doctor = User::factory()->doctor()->create();
    $medicalStaff = User::factory()->medicalStaff()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => Consultation::STATUS_PENDING,
        'scheduled_at' => now()->addDay()->setHour(10)->setMinute(0)->setSecond(0),
    ]);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $consultation->scheduled_at->toDateString(),
        'start_time' => '08:00',
        'end_time' => '17:00',
        'status' => 'on_duty',
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('consultations.data', 0));

    $this->actingAs($medicalStaff)
        ->patch(route('consultations.approve', $consultation))
        ->assertRedirect();

    $this->actingAs($doctor)
        ->get(route('consultations.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('consultations.data', 1));
});

it('filters consultations by patient_id', function () {
    $doctor = User::factory()->doctor()->create();
    $patient1 = Patient::factory()->create(['registered_by' => $doctor->id]);
    $patient2 = Patient::factory()->create(['registered_by' => $doctor->id]);
    Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patient1->id,
        'scheduled_at' => now(),
    ]);
    Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'patient_id' => $patient2->id,
        'scheduled_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.index', ['patient_id' => $patient1->id]))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/index')
                ->has('consultations.data', 1)
                ->where('consultations.data.0.patient_id', $patient1->id)
        );
});

it('filters consultations by status', function () {
    $doctor = User::factory()->doctor()->create();
    Consultation::factory()->completed()->create([
        'doctor_id' => $doctor->id,
        'scheduled_at' => now(),
    ]);
    Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'scheduled',
        'scheduled_at' => now(),
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.index', ['status' => 'completed']))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/index')
                ->has('consultations.data', 1)
                ->where('consultations.data.0.status', 'completed')
        );
});

it('renders the show page with all related data', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/show')
                ->has('consultation.patient')
                ->has('consultation.doctor')
        );
});

it('creates an in-person consultation as pending and keeps it hidden from doctor until approval', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $medicalStaff->id]);
    $scheduledAt = now()->addDay()->setHour(10)->setMinute(0)->setSecond(0);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $scheduledAt->toDateString(),
        'start_time' => '08:00',
        'end_time' => '17:00',
        'status' => 'on_duty',
    ]);

    $this->actingAs($medicalStaff)
        ->post(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'in_person',
            'chief_complaint' => 'Fever and headache',
            'scheduled_at' => $scheduledAt->toDateTimeString(),
        ])
        ->assertRedirect();

    $consultation = Consultation::query()
        ->where('type', 'in_person')
        ->where('patient_id', $patient->id)
        ->first();

    expect($consultation)->not->toBeNull();
    expect($consultation->status)->toBe(Consultation::STATUS_PENDING);

    $this->actingAs($doctor)
        ->get(route('consultations.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('consultations.data', 0));
});

it('creates a teleconsultation and generates a session_token', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $medicalStaff->id]);
    $scheduledAt = now()->addDay()->setHour(11)->setMinute(0)->setSecond(0);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $scheduledAt->toDateString(),
        'start_time' => '08:00',
        'end_time' => '17:00',
        'status' => 'on_duty',
    ]);

    $this->actingAs($medicalStaff)
        ->post(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'teleconsultation',
            'chief_complaint' => 'Follow-up',
            'scheduled_at' => $scheduledAt->toDateTimeString(),
        ])
        ->assertRedirect();

    $consultation = Consultation::where('type', 'teleconsultation')->where('patient_id', $patient->id)->first();
    expect($consultation)->not->toBeNull();
    expect($consultation->session_token)->not->toBeNull();
});

it('updates consultation status and redirects', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($medicalStaff)
        ->patch(route('consultations.update', $consultation), ['status' => 'completed'])
        ->assertRedirect(route('consultations.show', $consultation));

    expect($consultation->fresh()->status)->toBe('completed');
});

it('soft-deletes a consultation and redirects to index', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($medicalStaff)
        ->delete(route('consultations.destroy', $consultation))
        ->assertRedirect(route('consultations.index'));

    expect(Consultation::find($consultation->id))->toBeNull();
    expect(Consultation::withTrashed()->find($consultation->id))->not->toBeNull();
});

it('forbids doctors from creating consultations', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);
    $scheduledAt = now()->addDay()->setHour(10)->setMinute(0)->setSecond(0);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $scheduledAt->toDateString(),
        'start_time' => '08:00',
        'end_time' => '17:00',
        'status' => 'on_duty',
    ]);

    $this->actingAs($doctor)
        ->get(route('consultations.create'))
        ->assertForbidden();

    $this->actingAs($doctor)
        ->post(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'in_person',
            'chief_complaint' => 'Headache',
            'scheduled_at' => $scheduledAt->toDateTimeString(),
        ])
        ->assertForbidden();
});

it('shows only on-duty doctors for a selected schedule', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $onDutyDoctor = User::factory()->doctor()->create(['name' => 'On Duty Doctor']);
    $offDutyDoctor = User::factory()->doctor()->create(['name' => 'Off Duty Doctor']);
    $scheduledAt = now()->addDays(2)->setHour(9)->setMinute(30)->setSecond(0);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $onDutyDoctor->id,
        'duty_date' => $scheduledAt->toDateString(),
        'start_time' => '08:00',
        'end_time' => '12:00',
        'status' => 'on_duty',
    ]);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $offDutyDoctor->id,
        'duty_date' => $scheduledAt->toDateString(),
        'start_time' => '08:00',
        'end_time' => '12:00',
        'status' => 'on_leave',
    ]);

    $this->actingAs($medicalStaff)
        ->getJson(route('consultations.available-doctors', [
            'scheduled_at' => $scheduledAt->toDateTimeString(),
        ]))
        ->assertOk()
        ->assertJsonPath('doctors.0.id', $onDutyDoctor->id)
        ->assertJsonCount(1, 'doctors');
});

it('rejects consultation creation when doctor is not on duty', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $medicalStaff->id]);
    $scheduledAt = now()->addDay()->setHour(15)->setMinute(0)->setSecond(0);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => $scheduledAt->toDateString(),
        'start_time' => '08:00',
        'end_time' => '12:00',
        'status' => 'on_duty',
    ]);

    $this->actingAs($medicalStaff)
        ->post(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'in_person',
            'scheduled_at' => $scheduledAt->toDateTimeString(),
        ])
        ->assertSessionHasErrors('doctor_id');
});

it('forbids doctors from editing consultation schedules', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.edit', $consultation))
        ->assertForbidden();

    $this->actingAs($doctor)
        ->patch(route('consultations.reschedule', $consultation), [
            'scheduled_at' => now()->addDays(2)->toDateTimeString(),
        ])
        ->assertForbidden();
});
