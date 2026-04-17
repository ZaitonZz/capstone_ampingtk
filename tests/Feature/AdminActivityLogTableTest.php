<?php

use App\Models\ActivityLog;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('admin can view the activity logs page', function () {
    $admin = User::factory()->admin()->create();
    ActivityLog::factory()->count(3)->create();

    $this->actingAsVerified($admin)
        ->get(route('admin.activity-logs.index'))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('admin/activity-logs')
                ->has('logs.data')
                ->has('options.types')
        );
});

it('non-admin cannot access activity logs page', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($doctor)
        ->get(route('admin.activity-logs.index'))
        ->assertForbidden();
});

it('activity logs page is paginated', function () {
    $admin = User::factory()->admin()->create();

    ActivityLog::factory()->count(20)->create();

    $this->actingAsVerified($admin)
        ->get(route('admin.activity-logs.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('logs.data', 15));

    $this->actingAsVerified($admin)
        ->get(route('admin.activity-logs.index', ['page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('logs.data', 5));
});

it('activity logs can be filtered by search, type, and date', function () {
    $admin = User::factory()->admin()->create();
    $targetActor = User::factory()->create([
        'name' => 'Nurse Search Target',
        'email' => 'nurse.target@example.com',
    ]);

    ActivityLog::factory()->create([
        'user_id' => $targetActor->id,
        'event' => 'auth.login',
        'description' => 'Target activity entry for filtering',
        'created_at' => now()->subDay(),
        'updated_at' => now()->subDay(),
    ]);

    ActivityLog::factory()->create([
        'event' => 'user.created',
        'description' => 'Non matching description',
    ]);

    $this->actingAsVerified($admin)
        ->get(route('admin.activity-logs.index', [
            'search' => 'Target activity entry',
            'type' => 'auth.login',
            'date' => now()->subDay()->toDateString(),
        ]))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->has('logs.data', 1)
                ->where('logs.data.0.event', 'auth.login')
                ->where('logs.data.0.actor.name', 'Nurse Search Target')
                ->where('filters.search', 'Target activity entry')
                ->where('filters.type', 'auth.login')
        );
});
