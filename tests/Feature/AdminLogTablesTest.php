<?php

use App\Models\Consultation;
use App\Models\ConsultationMicrocheck;
use App\Models\DeepfakeScanLog;
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
