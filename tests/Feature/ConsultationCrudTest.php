<?php

use App\Models\Consultation;
use App\Models\DeepfakeEscalation;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

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

it('medical staff create form only shows doctors on duty', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $onDutyDoctor = User::factory()->doctor()->create();
    $offDutyDoctor = User::factory()->doctor()->create();

    Consultation::factory()->create([
        'doctor_id' => $onDutyDoctor->id,
        'status' => 'scheduled',
        'scheduled_at' => now()->addHour(),
    ]);

    $this->actingAs($medicalStaff)
        ->get(route('consultations.create'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/create')
                ->has('doctors', 1)
                ->where('doctors.0.id', $onDutyDoctor->id)
        );

    expect($offDutyDoctor->id)->not->toBe($onDutyDoctor->id);
});

it('medical staff can view patient preferred doctor request during scheduling', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $assignedDoctor = User::factory()->doctor()->create();
    $preferredDoctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $assignedDoctor->id,
        'preferred_doctor_id' => $preferredDoctor->id,
    ]);

    $this->actingAs($medicalStaff)
        ->get(route('consultations.show', $consultation))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('consultations/show')
                ->where('consultation.preferred_doctor.id', $preferredDoctor->id)
        );
});

// ── Approve ───────────────────────────────────────────────────────────────────

it('approves a pending consultation and transitions it to scheduled', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'pending',
    ]);

    $this->actingAs($medicalStaff)
        ->patch(route('consultations.approve', $consultation))
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('scheduled');
});

it('cannot approve a consultation that is not pending', function () {
    $medicalStaff = User::factory()->medicalStaff()->create();
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'scheduled',
    ]);

    $this->actingAs($medicalStaff)
        ->patch(route('consultations.approve', $consultation))
        ->assertStatus(422);
});

it('flagged participant can verify OTP and resume a paused consultation', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();

    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'paused',
        'status_before_pause' => 'ongoing',
        'identity_verification_target_user_id' => $patientUser->id,
        'identity_verification_target_role' => 'patient',
        'identity_verification_started_at' => now(),
        'identity_verification_expires_at' => now()->addMinutes(5),
        'identity_verification_attempts' => 0,
        'identity_verification_resend_available_at' => now()->addSeconds(30),
    ]);

    $consultation->patient->update(['user_id' => $patientUser->id]);

    $escalation = DeepfakeEscalation::factory()->create([
        'consultation_id' => $consultation->id,
        'triggered_by_user_id' => $patientUser->id,
        'triggered_role' => 'patient',
        'type' => DeepfakeEscalation::TYPE_OTP_VERIFICATION,
        'status' => DeepfakeEscalation::STATUS_OPEN,
    ]);

    $expiresAt = now()->addMinutes(5);

    Cache::put("consultation:identity_verification:{$consultation->id}", [
        'otp_hash' => Hash::make('123456'),
        'target_user_id' => $patientUser->id,
        'target_role' => 'patient',
        'attempts' => 0,
        'max_attempts' => 5,
        'resend_count' => 0,
        'max_resends' => 3,
        'expires_at' => $expiresAt->toIso8601String(),
        'resend_available_at' => now()->addSeconds(30)->toIso8601String(),
    ], $expiresAt);

    $this->actingAs($patientUser)
        ->post(route('consultations.identity-verification.verify', $consultation), [
            'otp_code' => '123456',
        ])
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('ongoing');
    expect($consultation->fresh()->identity_verification_target_user_id)->toBeNull();
    expect($escalation->fresh()->status)->toBe(DeepfakeEscalation::STATUS_RESOLVED);
    expect($escalation->fresh()->decision)->toBe('continue');
});

it('exhausting OTP attempts cancels the paused consultation', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();

    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'paused',
        'status_before_pause' => 'ongoing',
        'identity_verification_target_user_id' => $patientUser->id,
        'identity_verification_target_role' => 'patient',
        'identity_verification_started_at' => now(),
        'identity_verification_expires_at' => now()->addMinutes(5),
        'identity_verification_attempts' => 0,
        'identity_verification_resend_available_at' => now()->addSeconds(30),
    ]);

    $consultation->patient->update(['user_id' => $patientUser->id]);

    $escalation = DeepfakeEscalation::factory()->create([
        'consultation_id' => $consultation->id,
        'triggered_by_user_id' => $patientUser->id,
        'triggered_role' => 'patient',
        'type' => DeepfakeEscalation::TYPE_OTP_VERIFICATION,
        'status' => DeepfakeEscalation::STATUS_OPEN,
    ]);

    $expiresAt = now()->addMinutes(5);

    Cache::put("consultation:identity_verification:{$consultation->id}", [
        'otp_hash' => Hash::make('654321'),
        'target_user_id' => $patientUser->id,
        'target_role' => 'patient',
        'attempts' => 0,
        'max_attempts' => 1,
        'resend_count' => 0,
        'max_resends' => 3,
        'expires_at' => $expiresAt->toIso8601String(),
        'resend_available_at' => now()->addSeconds(30)->toIso8601String(),
    ], $expiresAt);

    $this->actingAs($patientUser)
        ->post(route('consultations.identity-verification.verify', $consultation), [
            'otp_code' => '000000',
        ])
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('cancelled');
    expect($consultation->fresh()->cancellation_reason)->toBe('Identity verification failed after maximum OTP attempts.');
    expect($escalation->fresh()->status)->toBe(DeepfakeEscalation::STATUS_RESOLVED);
    expect($escalation->fresh()->decision)->toBe('cancel');
});

it('validates consultation OTP code using configured OTP length', function () {
    config()->set('auth_otp.otp.length', 8);

    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();

    $consultation = Consultation::factory()->create([
        'doctor_id' => $doctor->id,
        'status' => 'paused',
        'status_before_pause' => 'ongoing',
        'identity_verification_target_user_id' => $patientUser->id,
        'identity_verification_target_role' => 'patient',
        'identity_verification_started_at' => now(),
        'identity_verification_expires_at' => now()->addMinutes(5),
        'identity_verification_attempts' => 0,
        'identity_verification_resend_available_at' => now()->addSeconds(30),
    ]);

    $consultation->patient->update(['user_id' => $patientUser->id]);

    $this->actingAs($patientUser)
        ->post(route('consultations.identity-verification.verify', $consultation), [
            'otp_code' => '123456',
        ])
        ->assertSessionHasErrors(['otp_code']);
});

it('assigned doctor can manually override paused identity verification', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'status' => 'paused',
        'status_before_pause' => 'ongoing',
        'identity_verification_target_user_id' => $patientUser->id,
        'identity_verification_target_role' => 'patient',
        'identity_verification_started_at' => now(),
        'identity_verification_expires_at' => now()->addMinutes(5),
        'identity_verification_attempts' => 1,
        'identity_verification_resend_available_at' => now()->addSeconds(30),
    ]);

    $consultation->patient->update(['user_id' => $patientUser->id]);

    $escalation = DeepfakeEscalation::factory()->create([
        'consultation_id' => $consultation->id,
        'triggered_by_user_id' => $patientUser->id,
        'triggered_role' => 'patient',
        'type' => DeepfakeEscalation::TYPE_OTP_VERIFICATION,
        'status' => DeepfakeEscalation::STATUS_OPEN,
    ]);

    $expiresAt = now()->addMinutes(5);

    Cache::put("consultation:identity_verification:{$consultation->id}", [
        'otp_hash' => Hash::make('123456'),
        'target_user_id' => $patientUser->id,
        'target_role' => 'patient',
        'attempts' => 1,
        'max_attempts' => 5,
        'resend_count' => 0,
        'max_resends' => 3,
        'expires_at' => $expiresAt->toIso8601String(),
        'resend_available_at' => now()->addSeconds(30)->toIso8601String(),
    ], $expiresAt);

    $this->actingAs($doctor)
        ->post(route('consultations.identity-verification.override', $consultation))
        ->assertRedirect();

    expect($consultation->fresh()->status)->toBe('ongoing');
    expect($consultation->fresh()->identity_verification_target_user_id)->toBeNull();
    expect($consultation->fresh()->identity_verification_attempts)->toBe(0);
    expect($escalation->fresh()->status)->toBe(DeepfakeEscalation::STATUS_RESOLVED);
    expect($escalation->fresh()->decision)->toBe('continue');
    expect(Cache::get("consultation:identity_verification:{$consultation->id}"))->toBeNull();
});

it('non-doctor cannot manually override paused identity verification', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();

    $consultation = Consultation::factory()->teleconsultation()->create([
        'doctor_id' => $doctor->id,
        'identity_verification_target_user_id' => $patientUser->id,
        'identity_verification_target_role' => 'patient',
        'status' => 'paused',
        'status_before_pause' => 'ongoing',
        'identity_verification_started_at' => now(),
        'identity_verification_expires_at' => now()->addMinutes(5),
        'identity_verification_resend_available_at' => now()->addSeconds(30),
    ]);

    $consultation->patient->update(['user_id' => $patientUser->id]);

    $this->actingAs($patientUser)
        ->post(route('consultations.identity-verification.override', $consultation))
        ->assertForbidden();
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
            'preferred_doctor_id' => $doctor->id,
            'type' => 'in_person',
            'chief_complaint' => 'Routine check-up',
            'scheduled_at' => now()->addDays(3)->toDateTimeString(),
        ])
        ->assertRedirect();

    $consultation = Consultation::where('patient_id', $patient->id)->first();
    expect($consultation)->not->toBeNull();
    expect($consultation->status)->toBe('pending');
    expect($consultation->doctor_id)->toBe($doctor->id);
    expect($consultation->preferred_doctor_id)->toBe($doctor->id);
});

it('patient appointment request requires a future scheduled_at', function () {
    $user = User::factory()->patient()->create();
    Patient::factory()->create(['user_id' => $user->id, 'registered_by' => $user->id]);
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($user)
        ->post(route('patient.consultations.request'), [
            'preferred_doctor_id' => $doctor->id,
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
