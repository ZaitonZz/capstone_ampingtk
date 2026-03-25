<?php

use App\Models\DoctorPhoto;
use App\Models\DoctorProfile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('redirects guests to login', function () {
    $this->get(route('doctor.profile.show'))->assertRedirect(route('login'));
});

it('returns 204 when the doctor has no profile yet', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->getJson(route('doctor.profile.show'))
        ->assertNoContent();
});

it('creates a doctor profile on first upsert', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('doctor.profile.upsert'), [
            'specialty' => 'Cardiology',
            'license_number' => 'LIC-001234',
            'clinic_name' => 'Heart Clinic',
            'phone' => '+639171234567',
        ])
        ->assertCreated()
        ->assertJsonFragment(['specialty' => 'Cardiology']);

    $this->assertDatabaseHas('doctor_profiles', [
        'user_id' => $doctor->id,
        'specialty' => 'Cardiology',
        'license_number' => 'LIC-001234',
    ]);
});

it('updates an existing profile on second upsert without creating a duplicate', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)->postJson(route('doctor.profile.upsert'), [
        'specialty' => 'Cardiology',
        'license_number' => 'LIC-001234',
    ]);

    $this->actingAs($doctor)
        ->postJson(route('doctor.profile.upsert'), [
            'specialty' => 'Neurology',
            'license_number' => 'LIC-001234',
        ])
        ->assertOk()
        ->assertJsonFragment(['specialty' => 'Neurology']);

    $this->assertDatabaseCount('doctor_profiles', 1);
    $this->assertDatabaseHas('doctor_profiles', [
        'user_id' => $doctor->id,
        'specialty' => 'Neurology',
    ]);
});

it('returns 422 when specialty and license_number are missing', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('doctor.profile.upsert'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['specialty', 'license_number']);
});

it('returns the profile on show after upsert', function () {
    $doctor = User::factory()->doctor()->create();
    DoctorProfile::factory()->create([
        'user_id' => $doctor->id,
        'specialty' => 'Pediatrics',
    ]);

    $this->actingAs($doctor)
        ->getJson(route('doctor.profile.show'))
        ->assertOk()
        ->assertJsonFragment(['specialty' => 'Pediatrics']);
});

it('allows a doctor to upload a profile photo', function () {
    Storage::fake('public');
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('doctor.profile.photo.store'), [
            'photo' => UploadedFile::fake()->image('doctor.jpg'),
        ])
        ->assertCreated()
        ->assertJsonStructure(['id', 'file_path', 'is_primary', 'avatar_url']);

    $photo = DoctorPhoto::query()->first();

    expect($photo)->not->toBeNull();
    expect($photo->user_id)->toBe($doctor->id);
    expect($photo->uploaded_by)->toBe($doctor->id);
    expect($photo->is_primary)->toBeTrue();

    Storage::disk('public')->assertExists($photo->file_path);
});

it('marks older doctor photos as non-primary when uploading a new photo', function () {
    Storage::fake('public');
    $doctor = User::factory()->doctor()->create();

    $firstResponse = $this->actingAs($doctor)
        ->postJson(route('doctor.profile.photo.store'), [
            'photo' => UploadedFile::fake()->image('first.jpg'),
        ])
        ->assertCreated();

    $secondResponse = $this->actingAs($doctor)
        ->postJson(route('doctor.profile.photo.store'), [
            'photo' => UploadedFile::fake()->image('second.jpg'),
        ])
        ->assertCreated();

    $firstId = $firstResponse->json('id');
    $secondId = $secondResponse->json('id');

    expect(DoctorPhoto::query()->find($firstId)?->is_primary)->toBeFalse();
    expect(DoctorPhoto::query()->find($secondId)?->is_primary)->toBeTrue();
});

it('forbids non-doctors from uploading doctor profile photo', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->postJson(route('doctor.profile.photo.store'), [
            'photo' => UploadedFile::fake()->image('admin.jpg'),
        ])
        ->assertForbidden();
});

it('returns validation error when doctor profile photo is missing', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('doctor.profile.photo.store'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['photo']);
});
