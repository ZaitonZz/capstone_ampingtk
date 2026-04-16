<?php

use App\Mail\AdminUserTemporaryPasswordMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

it('admin can view the user management page', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->patient()->count(2)->create();

    $this->actingAsVerified($admin)
        ->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users')
            ->has('users.data')
        );
});

it('non-admin cannot access user management page', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAsVerified($doctor)
        ->get(route('admin.users.index'))
        ->assertForbidden();
});

it('admin can create a doctor account and send temporary credentials', function () {
    Mail::fake();

    $admin = User::factory()->admin()->create();

    $payload = [
        'name' => 'Dr. Jamie Bato',
        'email' => 'dr.jamie@example.com',
        'role' => 'doctor',
        'status' => 'active',
        'doctor_profile' => [
            'specialty' => 'Cardiology',
            'license_number' => 'LIC-2026-1001',
            'clinic_name' => 'AMPING Primary Care',
            'clinic_address' => '123 Health Avenue',
            'phone' => '+63-999-1234',
            'bio' => 'Cardiology specialist',
        ],
    ];

    $this->actingAsVerified($admin)
        ->post(route('admin.users.store'), $payload)
        ->assertRedirect();

    $createdUser = User::query()->where('email', 'dr.jamie@example.com')->first();

    expect($createdUser)->not->toBeNull();
    expect($createdUser->role)->toBe('doctor');
    expect($createdUser->status)->toBe('active');
    expect($createdUser->must_change_password)->toBeTrue();
    expect($createdUser->email_verified_at)->not->toBeNull();

    $this->assertDatabaseHas('doctor_profiles', [
        'user_id' => $createdUser->id,
        'specialty' => 'Cardiology',
        'license_number' => 'LIC-2026-1001',
    ]);

    Mail::assertSent(AdminUserTemporaryPasswordMail::class, function (AdminUserTemporaryPasswordMail $mail) use ($createdUser) {
        return $mail->hasTo($createdUser->email);
    });
});

it('requires doctor profile details when creating a doctor account', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAsVerified($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Dr. Missing Profile',
            'email' => 'dr.missing@example.com',
            'role' => 'doctor',
            'status' => 'active',
        ])
        ->assertSessionHasErrors(['doctor_profile']);
});

it('admin can update another users role and status', function () {
    $admin = User::factory()->admin()->create();
    $targetUser = User::factory()->patient()->create([
        'status' => 'active',
    ]);

    $this->actingAsVerified($admin)
        ->patch(route('admin.users.update', $targetUser), [
            'name' => $targetUser->name,
            'email' => $targetUser->email,
            'role' => 'medicalstaff',
            'status' => 'suspended',
        ])
        ->assertRedirect();

    expect($targetUser->fresh()->role)->toBe('medicalstaff');
    expect($targetUser->fresh()->status)->toBe('suspended');
});

it('admin cannot remove their own admin role', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAsVerified($admin)
        ->from(route('admin.users.index'))
        ->patch(route('admin.users.update', $admin), [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'doctor',
            'status' => 'active',
            'doctor_profile' => [
                'specialty' => 'General Medicine',
                'license_number' => 'SELF-DEMOTE-LIC',
                'clinic_name' => null,
                'clinic_address' => null,
                'phone' => null,
                'bio' => null,
            ],
        ])
        ->assertSessionHasErrors(['role']);

    expect($admin->fresh()->role)->toBe('admin');
});

it('admin cannot set their own account to inactive or suspended', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAsVerified($admin)
        ->from(route('admin.users.index'))
        ->patch(route('admin.users.update', $admin), [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'admin',
            'status' => 'inactive',
        ])
        ->assertSessionHasErrors(['status']);

    expect($admin->fresh()->status)->toBe('active');
});
