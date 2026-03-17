<?php

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;

// ── Calendar page ─────────────────────────────────────────────────────────────

it('renders the calendar page for medical staff', function () {
    $doctor = User::factory()->doctor()->create();
    Consultation::factory(2)->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.calendar'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/calendar')
                ->has('events')
        );
});

it('admin sees all consultations on the calendar', function () {
    $admin = User::factory()->admin()->create();
    $doctor1 = User::factory()->doctor()->create();
    $doctor2 = User::factory()->doctor()->create();
    Consultation::factory(2)->create(['doctor_id' => $doctor1->id]);
    Consultation::factory(1)->create(['doctor_id' => $doctor2->id]);

    $this->actingAs($admin)
        ->get(route('consultations.calendar'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('events', 3));
});

it('doctor sees only their own consultations on the calendar', function () {
    $doctor = User::factory()->doctor()->create();
    $other = User::factory()->doctor()->create();
    Consultation::factory(2)->create(['doctor_id' => $doctor->id]);
    Consultation::factory(2)->create(['doctor_id' => $other->id]);

    $this->actingAs($doctor)
        ->get(route('consultations.calendar'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('events', 2));
});

// ── Approve ───────────────────────────────────────────────────────────────────

it('approves a pending consultation and transitions it to scheduled', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'pending',
    ]);

    $this->actingAs($doctor)
        ->patch(route('consultations.approve', $consultation))
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('scheduled');
});

it('cannot approve a consultation that is not pending', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'scheduled',
    ]);

    $this->actingAs($doctor)
        ->patch(route('consultations.approve', $consultation))
        ->assertStatus(422);
});

// ── Patient access control ────────────────────────────────────────────────────

it('patient is forbidden from accessing consultations.index', function () {
    $patient = User::factory()->patient()->create();

    $this->actingAs($patient)
        ->get(route('consultations.index'))
        ->assertForbidden();
});

it('patient is forbidden from the medical staff calendar', function () {
    $patient = User::factory()->patient()->create();

    $this->actingAs($patient)
        ->get(route('consultations.calendar'))
        ->assertForbidden();
});

// ── Patient calendar & appointment request ───────────────────────────────────

it('patient can view their own consultation calendar', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id, 'registered_by' => $user->id]);

    $this->actingAsVerified($user)
        ->get(route('patient.consultations.calendar'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('patient/consultations/calendar')
                ->has('events')
        );
});

it('patient can submit an appointment request which creates a pending consultation', function () {
    $user = User::factory()->patient()->create();
    $patient = Patient::factory()->create(['user_id' => $user->id, 'registered_by' => $user->id]);
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($user)
        ->post(route('patient.consultations.request'), [
            'doctor_id' => $doctor->id,
            'type' => 'in_person',
            'chief_complaint' => 'Routine check-up',
            'scheduled_at' => now()->addDays(3)->toDateTimeString(),
        ])
        ->assertRedirect();

    $consultation = Consultation::where('patient_id', $patient->id)->first();
    expect($consultation)->not->toBeNull();
    expect($consultation->status)->toBe('pending');
    expect($consultation->doctor_id)->toBe($doctor->id);
});

it('patient appointment request requires a future scheduled_at', function () {
    $user = User::factory()->patient()->create();
    Patient::factory()->create(['user_id' => $user->id, 'registered_by' => $user->id]);
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($user)
        ->post(route('patient.consultations.request'), [
            'doctor_id' => $doctor->id,
            'type' => 'in_person',
            'scheduled_at' => now()->subDay()->toDateTimeString(),
        ])
        ->assertSessionHasErrors(['scheduled_at']);
});

it('medical staff cannot access the patient appointment request route', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($doctor)
        ->post(route('patient.consultations.request'), [])
        ->assertForbidden();
});
