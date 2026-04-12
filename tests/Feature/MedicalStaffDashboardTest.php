<?php

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;

it('renders the medical staff dashboard for medical staff accounts', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();

    Patient::factory()->create([
        'user_id' => null,
        'registered_by' => $doctor->id,
    ]);

    Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'pending',
        'scheduled_at' => now(),
    ]);

    $this->actingAsVerified($medicalStaff)
        ->get(route('medicalstaff.dashboard'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('medicalstaff/dashboard')
                ->has('metrics')
                ->has('pending_consultations')
                ->has('pending_consultations.0.reschedule_url')
                ->has('pending_consultations.0.cancel_url')
                ->has('recent_registrations')
                ->where('metrics.pending_consultations', 1)
        );
});

it('forbids doctor accounts from medical staff dashboard', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($doctor)
        ->get(route('medicalstaff.dashboard'))
        ->assertForbidden();
});
