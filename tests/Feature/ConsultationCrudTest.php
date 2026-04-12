<?php

use App\Models\Consultation;
use App\Models\DeepfakeEscalation;
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

it('medical staff can access consultations index', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctorA = User::factory()->doctor()->create();
    $doctorB = User::factory()->doctor()->create();

    Consultation::factory()->create(['doctor_id' => $doctorA->id]);
    Consultation::factory()->create(['doctor_id' => $doctorB->id]);

    $this->actingAs($medicalStaff)
        ->get(route('consultations.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('consultations.data', 2));
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

it('doctor can continue consultation after patient deepfake escalation decision', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'scheduled',
    ]);

    $escalation = DeepfakeEscalation::factory()->patientDecision()->create([
        'consultation_id' => $consultation->id,
        'triggered_by_user_id' => $consultation->patient?->user_id,
    ]);

    $this->actingAs($doctor)
        ->patch(route('consultations.deepfake-decision', $consultation), [
            'escalation_id' => $escalation->id,
            'decision' => 'continue',
        ])
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('scheduled');
    expect($escalation->fresh()->status)->toBe(DeepfakeEscalation::STATUS_RESOLVED);
    expect($escalation->fresh()->decision)->toBe('continue');
});

it('doctor can cancel consultation after patient deepfake escalation decision', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'scheduled',
    ]);

    $escalation = DeepfakeEscalation::factory()->patientDecision()->create([
        'consultation_id' => $consultation->id,
        'triggered_by_user_id' => $consultation->patient?->user_id,
    ]);

    $this->actingAs($doctor)
        ->patch(route('consultations.deepfake-decision', $consultation), [
            'escalation_id' => $escalation->id,
            'decision' => 'cancel',
            'cancellation_reason' => 'Identity verification failed 5 times.',
        ])
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('cancelled');
    expect($consultation->fresh()->cancellation_reason)->toBe('Identity verification failed 5 times.');
    expect($escalation->fresh()->status)->toBe(DeepfakeEscalation::STATUS_RESOLVED);
    expect($escalation->fresh()->decision)->toBe('cancel');
});

it('admin can view the deepfake alerts page', function () {
    $admin = User::factory()->admin()->create();
    $consultation = Consultation::factory()->create();

    DeepfakeEscalation::factory()->doctorAlert()->create([
        'consultation_id' => $consultation->id,
        'triggered_by_user_id' => $consultation->doctor_id,
    ]);

    $this->actingAsVerified($admin)
        ->get(route('admin.deepfake-alerts.index'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('admin/deepfake-alerts')
                ->has('alerts.data', 1)
        );
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
