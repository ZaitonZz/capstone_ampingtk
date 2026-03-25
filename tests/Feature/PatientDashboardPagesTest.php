<?php

use App\Models\Consultation;
use App\Models\DeepfakeScanLog;
use App\Models\Patient;
use App\Models\PatientPhoto;
use App\Models\User;

it('renders the patient dashboard with identity guard data', function () {
    $patientUser = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $patientUser->id]);

    $consultation = Consultation::factory()
        ->teleconsultation()
        ->create([
            'patient_id' => $patient->id,
            'doctor_id' => User::factory()->doctor()->create()->id,
            'status' => 'scheduled',
            'scheduled_at' => now()->addMinutes(30),
        ]);

    PatientPhoto::factory()->primary()->create([
        'patient_id' => $patient->id,
        'uploaded_by' => $consultation->doctor_id,
    ]);

    DeepfakeScanLog::factory()->real()->create([
        'consultation_id' => $consultation->id,
    ]);

    $this->actingAsVerified($patientUser)
        ->get(route('patient.dashboard'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/dashboard')
                ->has('identity_guard')
                ->has('upcoming_appointment')
                ->has('recent_consultations')
                ->has('notifications'),
        );
});

it('renders the patient consultation lobby page', function () {
    $patientUser = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
    $consultation = Consultation::factory()->teleconsultation()->create([
        'patient_id' => $patient->id,
        'doctor_id' => User::factory()->doctor()->create()->id,
        'status' => 'scheduled',
    ]);

    PatientPhoto::factory()->primary()->create([
        'patient_id' => $patient->id,
        'uploaded_by' => User::factory()->doctor()->create()->id,
    ]);

    $this->actingAsVerified($patientUser)
        ->get(route('patient.lobby'))
        ->assertRedirect(route('consultations.lobby.show', $consultation));
});

it('renders the patient profile page with face enrollment fields', function () {
    $patientUser = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $patientUser->id]);

    PatientPhoto::factory()->primary()->create([
        'patient_id' => $patient->id,
        'uploaded_by' => User::factory()->doctor()->create()->id,
    ]);

    $this->actingAsVerified($patientUser)
        ->get(route('patient.profile'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/profile')
                ->has('face_enrollment_status')
                ->has('face_enrollment_last_updated'),
        );
});
