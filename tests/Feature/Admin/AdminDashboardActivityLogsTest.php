<?php

use App\Models\ActivityLog;
use App\Models\Consultation;
use App\Models\ConsultationFaceVerificationLog;
use App\Models\Patient;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('shows security activity logs and summary on admin dashboard', function () {
    $admin = User::factory()->admin()->create();

    $targetUser = User::factory()->patient()->create();
    $patient = Patient::factory()->create([
        'user_id' => $targetUser->id,
    ]);

    $consultation = Consultation::factory()->create([
        'patient_id' => $patient->id,
    ]);

    ActivityLog::query()->create([
        'user_id' => $targetUser->id,
        'event' => 'failed_login',
        'description' => 'A login attempt failed (invalid credentials).',
        'ip_address' => '127.0.0.1',
        'properties' => ['email' => $targetUser->email, 'severity' => 'warning'],
    ]);

    ActivityLog::query()->create([
        'user_id' => $targetUser->id,
        'event' => 'unusual_access_pattern',
        'description' => 'User accessed from 3 different IP addresses in the last 24 hours.',
        'ip_address' => '10.0.0.7',
        'properties' => ['unique_ip_count_24h' => 3, 'severity' => 'high'],
    ]);

    foreach (range(1, 3) as $_) {
        ConsultationFaceVerificationLog::query()->create([
            'consultation_id' => $consultation->id,
            'user_id' => $targetUser->id,
            'verified_role' => 'patient',
            'matched' => false,
            'face_match_score' => 0.2500,
            'flagged' => true,
            'checked_at' => now()->subMinutes(2),
        ]);
    }

    $response = $this
        ->actingAs($admin)
        ->withSession(['otp_verified' => true])
        ->get(route('admin.dashboard'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('admin_activity_summary.failed_logins_24h', 1)
            ->where('admin_activity_summary.repeated_identity_failures_24h', 1)
            ->where('admin_activity_summary.unusual_access_patterns_24h', 1)
            ->has('admin_activity_logs', 3)
        );

    $events = collect($response->viewData('page')['props']['admin_activity_logs'])
        ->pluck('event_type')
        ->values();

    expect($events)->toContain('failed_login');
    expect($events)->toContain('repeated_identity_check_failure');
    expect($events)->toContain('unusual_access_pattern');
});
