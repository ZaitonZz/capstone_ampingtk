<?php

use App\Models\Consultation;
use App\Models\ConsultationFaceVerificationLog;
use App\Models\ConsultationMicrocheck;
use App\Models\DeepfakeScanLog;
use App\Models\Patient;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('admin can view the microcheck logs page with pagination', function () {
    $admin = User::factory()->admin()->create();

    for ($index = 0; $index < 16; $index++) {
        ConsultationMicrocheck::factory()->create([
            'cycle_key' => 'cycle-'.($index + 1),
            'status' => $index === 15 ? 'claimed' : 'completed',
        ]);
    }

    $this->actingAsVerified($admin)
        ->get(route('admin.microcheck-logs.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/microcheck-logs')
            ->has('microcheckLogs.data', 15)
            ->where('microcheckLogs.total', 16)
        );
});

it('admin can filter microcheck logs by search and status', function () {
    $admin = User::factory()->admin()->create();
    $consultation = Consultation::factory()->create();

    ConsultationMicrocheck::factory()->completed()->forPatientRole()->create([
        'consultation_id' => $consultation->id,
        'cycle_key' => 'admin-search-cycle',
    ]);

    ConsultationMicrocheck::factory()->claimed()->forDoctorRole()->create([
        'consultation_id' => $consultation->id,
        'cycle_key' => 'other-cycle',
    ]);

    $this->actingAsVerified($admin)
        ->get(route('admin.microcheck-logs.index', [
            'search' => 'admin-search-cycle',
            'status' => 'completed',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/microcheck-logs')
            ->has('microcheckLogs.data', 1)
            ->where('filters.search', 'admin-search-cycle')
            ->where('filters.status', 'completed')
        );
});

it('admin can view the deepfake logs page with pagination', function () {
    $admin = User::factory()->admin()->create();

    for ($index = 0; $index < 16; $index++) {
        DeepfakeScanLog::factory()->create([
            'model_version' => 'model-'.($index + 1),
            'result' => $index === 15 ? 'fake' : 'real',
            'flagged' => $index === 15,
        ]);
    }

    $this->actingAsVerified($admin)
        ->get(route('admin.deepfake-logs.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/deepfake-logs')
            ->has('deepfakeLogs.data', 15)
            ->where('deepfakeLogs.total', 16)
        );
});

it('admin can filter deepfake logs by result and flag state', function () {
    $admin = User::factory()->admin()->create();
    $consultation = Consultation::factory()->create();

    DeepfakeScanLog::factory()->fake()->create([
        'consultation_id' => $consultation->id,
        'model_version' => 'flagged-model',
        'flagged' => true,
    ]);

    DeepfakeScanLog::factory()->real()->create([
        'consultation_id' => $consultation->id,
        'model_version' => 'clear-model',
        'flagged' => false,
    ]);

    $this->actingAsVerified($admin)
        ->get(route('admin.deepfake-logs.index', [
            'search' => 'flagged-model',
            'result' => 'fake',
            'flagged' => 'flagged',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/deepfake-logs')
            ->has('deepfakeLogs.data', 1)
            ->where('filters.search', 'flagged-model')
            ->where('filters.result', 'fake')
            ->where('filters.flagged', 'flagged')
        );
});

it('admin can view the deepfake verification page with pagination', function () {
    $admin = User::factory()->admin()->create();
    $consultation = Consultation::factory()->create();

    for ($index = 0; $index < 16; $index++) {
        ConsultationFaceVerificationLog::query()->create([
            'consultation_id' => $consultation->id,
            'user_id' => null,
            'verified_role' => $index % 2 === 0 ? 'patient' : 'doctor',
            'matched' => $index === 15 ? false : true,
            'face_match_score' => $index === 15 ? 0.2345 : 0.9142,
            'flagged' => $index === 15,
            'checked_at' => now()->addSeconds($index),
        ]);
    }

    $this->actingAsVerified($admin)
        ->get(route('admin.deepfake-verifications.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/deepfake-verifications')
            ->has('deepfakeVerificationLogs.data', 15)
            ->where('deepfakeVerificationLogs.total', 16)
        );
});

it('admin can filter deepfake verification logs by search and status', function () {
    $admin = User::factory()->admin()->create();

    $consultation = Consultation::factory()->create([
        'patient_id' => Patient::factory()->create([
            'first_name' => 'Veronica',
            'last_name' => 'Guard',
        ])->id,
    ]);

    ConsultationFaceVerificationLog::query()->create([
        'consultation_id' => $consultation->id,
        'user_id' => null,
        'verified_role' => 'patient',
        'matched' => true,
        'face_match_score' => 0.9034,
        'flagged' => false,
        'checked_at' => now()->subMinute(),
    ]);

    ConsultationFaceVerificationLog::query()->create([
        'consultation_id' => $consultation->id,
        'user_id' => null,
        'verified_role' => 'doctor',
        'matched' => false,
        'face_match_score' => 0.2441,
        'flagged' => true,
        'checked_at' => now(),
    ]);

    $this->actingAsVerified($admin)
        ->get(route('admin.deepfake-verifications.index', [
            'search' => 'Veronica',
            'status' => 'matched',
            'flagged' => 'unflagged',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/deepfake-verifications')
            ->has('deepfakeVerificationLogs.data', 1)
            ->where('filters.search', 'Veronica')
            ->where('filters.status', 'matched')
            ->where('filters.flagged', 'unflagged')
        );
});

it('deepfake verification page returns empty state when no records match filters', function () {
    $admin = User::factory()->admin()->create();
    $consultation = Consultation::factory()->create();

    ConsultationFaceVerificationLog::query()->create([
        'consultation_id' => $consultation->id,
        'user_id' => null,
        'verified_role' => 'patient',
        'matched' => true,
        'face_match_score' => 0.8888,
        'flagged' => false,
        'checked_at' => now(),
    ]);

    $this->actingAsVerified($admin)
        ->get(route('admin.deepfake-verifications.index', [
            'search' => 'no-match-value',
            'status' => 'mismatch',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/deepfake-verifications')
            ->has('deepfakeVerificationLogs.data', 0)
        );
});
