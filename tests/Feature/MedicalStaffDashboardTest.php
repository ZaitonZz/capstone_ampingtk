<?php

use App\Models\User;

it('renders the medical staff dashboard for medical staff accounts', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();

    $this->actingAsVerified($medicalStaff)
        ->get(route('medicalstaff.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('medicalstaff/dashboard'));
});

it('forbids doctor accounts from medical staff dashboard', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($doctor)
        ->get(route('medicalstaff.dashboard'))
        ->assertForbidden();
});
