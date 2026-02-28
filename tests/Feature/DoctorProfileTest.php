<?php

use App\Models\DoctorProfile;
use App\Models\User;

it('redirects guests to login', function () {
    $this->get(route('doctor.profile.show'))->assertRedirect(route('login'));
});

it('returns 204 when the doctor has no profile yet', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->getJson(route('doctor.profile.show'))
        ->assertNoContent();
});

it('creates a doctor profile on first upsert', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('doctor.profile.upsert'), [
            'specialty' => 'Cardiology',
            'license_number' => 'LIC-001234',
            'clinic_name' => 'Heart Clinic',
            'phone' => '+639171234567',
        ])
        ->assertCreated()
        ->assertJsonFragment(['specialty' => 'Cardiology']);

    $this->assertDatabaseHas('doctor_profiles', [
        'user_id' => $doctor->id,
        'specialty' => 'Cardiology',
        'license_number' => 'LIC-001234',
    ]);
});

it('updates an existing profile on second upsert without creating a duplicate', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)->postJson(route('doctor.profile.upsert'), [
        'specialty' => 'Cardiology',
        'license_number' => 'LIC-001234',
    ]);

    $this->actingAs($doctor)
        ->postJson(route('doctor.profile.upsert'), [
            'specialty' => 'Neurology',
            'license_number' => 'LIC-001234',
        ])
        ->assertOk()
        ->assertJsonFragment(['specialty' => 'Neurology']);

    $this->assertDatabaseCount('doctor_profiles', 1);
    $this->assertDatabaseHas('doctor_profiles', [
        'user_id' => $doctor->id,
        'specialty' => 'Neurology',
    ]);
});

it('returns 422 when specialty and license_number are missing', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('doctor.profile.upsert'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['specialty', 'license_number']);
});

it('returns the profile on show after upsert', function () {
    $doctor = User::factory()->doctor()->create();
    DoctorProfile::factory()->create([
        'user_id' => $doctor->id,
        'specialty' => 'Pediatrics',
    ]);

    $this->actingAs($doctor)
        ->getJson(route('doctor.profile.show'))
        ->assertOk()
        ->assertJsonFragment(['specialty' => 'Pediatrics']);
});
