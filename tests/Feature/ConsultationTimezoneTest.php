<?php

use App\Models\Consultation;
use App\Models\DoctorDutySchedule;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function (): void {
    config(['app.timezone' => 'Asia/Manila']);
    date_default_timezone_set('Asia/Manila');
});

it('stores datetime-local consultation schedules as Manila clinic time', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $medicalStaff->id]);

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => '2026-05-10',
        'start_time' => '08:00',
        'end_time' => '17:00',
        'status' => DoctorDutySchedule::STATUS_ON_DUTY,
    ]);

    $this->actingAs($medicalStaff)
        ->post(route('consultations.store'), [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'type' => 'teleconsultation',
            'chief_complaint' => 'Timezone check',
            'scheduled_at' => '2026-05-10T10:00',
        ])
        ->assertRedirect();

    $consultation = Consultation::query()
        ->where('patient_id', $patient->id)
        ->firstOrFail();

    expect($consultation->scheduled_at->timezoneName)->toBe('Asia/Manila')
        ->and($consultation->scheduled_at->format('Y-m-d H:i:s'))->toBe('2026-05-10 10:00:00')
        ->and($consultation->scheduled_at->toIso8601String())->toBe('2026-05-10T10:00:00+08:00');
});

it('checks doctor duty availability against the selected Manila wall time', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();

    DoctorDutySchedule::factory()->create([
        'doctor_id' => $doctor->id,
        'duty_date' => '2026-05-10',
        'start_time' => '09:30',
        'end_time' => '10:30',
        'status' => DoctorDutySchedule::STATUS_ON_DUTY,
    ]);

    $this->actingAs($medicalStaff)
        ->getJson(route('consultations.available-doctors', [
            'scheduled_at' => '2026-05-10T10:00',
        ]))
        ->assertOk()
        ->assertJsonPath('doctors.0.id', $doctor->id);
});

it('validates appointment requests against Manila local now', function () {
    Carbon::setTestNow(Carbon::parse('2026-05-10 09:00:00', 'Asia/Manila'));

    $patientUser = User::factory()->patient()->create();
    Patient::factory()->create([
        'user_id' => $patientUser->id,
        'registered_by' => $patientUser->id,
    ]);
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($patientUser)
        ->post(route('patient.consultations.request'), [
            'doctor_id' => $doctor->id,
            'type' => 'teleconsultation',
            'chief_complaint' => 'Future local request',
            'scheduled_at' => '2026-05-10T09:30',
        ])
        ->assertRedirect()
        ->assertSessionDoesntHaveErrors(['scheduled_at']);

    $this->actingAsVerified($patientUser)
        ->post(route('patient.consultations.request'), [
            'doctor_id' => $doctor->id,
            'type' => 'teleconsultation',
            'chief_complaint' => 'Past local request',
            'scheduled_at' => '2026-05-10T08:30',
        ])
        ->assertSessionHasErrors(['scheduled_at']);

    Carbon::setTestNow();
});
