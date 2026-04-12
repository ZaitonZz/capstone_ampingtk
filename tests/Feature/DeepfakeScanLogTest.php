<?php

use App\Models\Consultation;
use App\Models\DeepfakeScanLog;
use App\Models\User;

it('redirects guests to login', function () {
    $consultation = Consultation::factory()->create();

    $this->get(route('consultations.deepfake-scans.index', $consultation))
        ->assertRedirect(route('login'));
});

it('returns all scan logs for a consultation', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    DeepfakeScanLog::factory(3)->create(['consultation_id' => $consultation->id]);

    $this->actingAs($doctor)
        ->getJson(route('consultations.deepfake-scans.index', $consultation))
        ->assertOk()
        ->assertJsonCount(3);
});

it('filters scan logs by flagged=true', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    DeepfakeScanLog::factory()->fake()->create(['consultation_id' => $consultation->id]);
    DeepfakeScanLog::factory()->real()->create(['consultation_id' => $consultation->id]);

    $response = $this->actingAs($doctor)
        ->getJson(route('consultations.deepfake-scans.index', [$consultation, 'flagged' => 'true']))
        ->assertOk();

    expect($response->json())->toHaveCount(1);
    expect($response->json('0.flagged'))->toBeTrue();
});

it('filters scan logs by result', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    DeepfakeScanLog::factory()->fake()->create(['consultation_id' => $consultation->id]);
    DeepfakeScanLog::factory()->real()->create(['consultation_id' => $consultation->id]);

    $response = $this->actingAs($doctor)
        ->getJson(route('consultations.deepfake-scans.index', [$consultation, 'result' => 'fake']))
        ->assertOk();

    expect($response->json())->toHaveCount(1);
    expect($response->json('0.result'))->toBe('fake');
});

it('creates a deepfake scan log', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.deepfake-scans.store', $consultation), [
            'consultation_id' => $consultation->id,
            'result' => 'real',
            'confidence_score' => 0.9423,
            'model_version' => 'v2.0',
        ])
        ->assertCreated()
        ->assertJsonFragment(['result' => 'real']);

    $this->assertDatabaseHas('deepfake_scan_logs', [
        'consultation_id' => $consultation->id,
        'result' => 'real',
    ]);
});

it('stores detected user and role attribution on deepfake scan logs', function () {
    $doctor = User::factory()->doctor()->create();
    $patientUser = User::factory()->patient()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);
    $consultation->patient->update(['user_id' => $patientUser->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.deepfake-scans.store', $consultation), [
            'consultation_id' => $consultation->id,
            'user_id' => $patientUser->id,
            'verified_role' => 'patient',
            'result' => 'real',
            'confidence_score' => 0.8844,
            'model_version' => 'v2.1',
        ])
        ->assertCreated()
        ->assertJsonFragment([
            'user_id' => $patientUser->id,
            'verified_role' => 'patient',
        ]);

    $this->assertDatabaseHas('deepfake_scan_logs', [
        'consultation_id' => $consultation->id,
        'user_id' => $patientUser->id,
        'verified_role' => 'patient',
    ]);
});

it('sets consultation deepfake_verified to false when a fake scan is stored', function () {
    $doctor = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->postJson(route('consultations.deepfake-scans.store', $consultation), [
            'consultation_id' => $consultation->id,
            'result' => 'fake',
            'confidence_score' => 0.9501,
        ])
        ->assertCreated();

    expect($consultation->fresh()->deepfake_verified)->toBeFalse();
});

it('reviewer can mark a scan log as flagged with notes', function () {
    $reviewer = User::factory()->doctor()->create();
    $consultation = Consultation::factory()->create(['doctor_id' => $reviewer->id]);
    $log = DeepfakeScanLog::factory()->create(['consultation_id' => $consultation->id]);

    $this->actingAs($reviewer)
        ->patchJson(route('consultations.deepfake-scans.update', [$consultation, $log]), [
            'flagged' => true,
            'reviewer_notes' => 'Confirmed deepfake — synthetic face detected.',
        ])
        ->assertOk()
        ->assertJsonFragment(['flagged' => true]);

    $updated = $log->fresh();
    expect($updated->reviewed_by)->toBe($reviewer->id);
    expect($updated->reviewed_at)->not->toBeNull();
    expect($updated->reviewer_notes)->toBe('Confirmed deepfake — synthetic face detected.');
});
