<?php

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('redirects guests to login', function () {
    $this->get(route('patients.index'))->assertRedirect(route('login'));
});

it('returns paginated patients for authenticated users', function () {
    $doctor = User::factory()->doctor()->create();
    Patient::factory(3)->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->getJson(route('patients.index'))
        ->assertOk()
        ->assertJsonStructure(['data', 'current_page', 'total']);
});

it('filters patients by search query', function () {
    $doctor = User::factory()->doctor()->create();
    Patient::factory()->create(['first_name' => 'Unique', 'last_name' => 'Searchable', 'registered_by' => $doctor->id]);
    Patient::factory()->create(['first_name' => 'Other',  'last_name' => 'Person',    'registered_by' => $doctor->id]);

    $response = $this->actingAs($doctor)
        ->getJson(route('patients.index', ['search' => 'Searchable']))
        ->assertOk();

    $names = collect($response->json('data'))->pluck('last_name');
    expect($names)->toContain('Searchable');
    expect($names)->not->toContain('Person');
});

it('filters patients by gender', function () {
    $doctor = User::factory()->doctor()->create();
    Patient::factory()->create(['first_name' => 'Male', 'last_name' => 'Patient', 'gender' => 'male', 'registered_by' => $doctor->id]);
    Patient::factory()->create(['first_name' => 'Female', 'last_name' => 'Patient', 'gender' => 'female', 'registered_by' => $doctor->id]);
    Patient::factory()->create(['first_name' => 'Other', 'last_name' => 'Patient', 'gender' => 'other', 'registered_by' => $doctor->id]);

    $response = $this->actingAs($doctor)
        ->getJson(route('patients.index', ['gender' => 'female']))
        ->assertOk();

    $genders = collect($response->json('data'))->pluck('gender');
    expect($genders)->each->toBe('female');
    expect($genders)->not->toContain('male');
    expect($genders)->not->toContain('other');
});

it('returns a patient with relationships on show', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);
    Consultation::factory()->create(['patient_id' => $patient->id, 'doctor_id' => $doctor->id]);

    $this->actingAs($doctor)
        ->getJson(route('patients.show', $patient))
        ->assertOk()
        ->assertJsonStructure(['id', 'first_name', 'last_name', 'consultations']);
});

it('stores a new patient and sets registered_by to auth user', function () {
    Storage::fake('public');

    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->post(route('patients.store'), [
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'email' => 'juan@example.com',
            'date_of_birth' => '1990-05-15',
            'gender' => 'male',
            'profile_photo' => UploadedFile::fake()->image('juan.jpg'),
        ], [
            'Accept' => 'application/json',
        ])
        ->assertCreated()
        ->assertJsonFragment(['first_name' => 'Juan']);

    $this->assertDatabaseHas('patients', [
        'first_name' => 'Juan',
        'registered_by' => $doctor->id,
    ]);

    $patient = Patient::query()->where('email', 'juan@example.com')->firstOrFail();

    $this->assertDatabaseHas('patient_photos', [
        'patient_id' => $patient->id,
        'uploaded_by' => $doctor->id,
        'disk' => 'public',
        'is_primary' => true,
    ]);
});

it('returns 422 when required fields are missing on store', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->postJson(route('patients.store'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['first_name', 'last_name', 'gender', 'email', 'profile_photo']);
});

it('auto-generates a user account when patient is created with email', function () {
    Storage::fake('public');

    $doctor = User::factory()->doctor()->create();
    $email = 'newpatient@example.com';

    $this->actingAs($doctor)
        ->post(route('patients.store'), [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => $email,
            'date_of_birth' => '1995-08-20',
            'gender' => 'male',
            'profile_photo' => UploadedFile::fake()->image('john.jpg'),
        ], [
            'Accept' => 'application/json',
        ])
        ->assertCreated();

    // Verify patient was created
    $patient = Patient::where('email', $email)->first();
    expect($patient)->not->toBeNull();

    // Verify user account was auto-generated
    $user = User::where('email', $email)->first();
    expect($user)->not->toBeNull();
    expect($user->role)->toBe('patient');
    expect($user->name)->toBe('John Doe');
    expect($patient->user_id)->toBe($user->id);

    $this->assertDatabaseHas('patient_photos', [
        'patient_id' => $patient->id,
        'uploaded_by' => $doctor->id,
        'disk' => 'public',
        'is_primary' => true,
    ]);
});

it('validates unique email when creating patient', function () {
    $doctor = User::factory()->doctor()->create();
    $existingUser = User::factory()->create(['email' => 'duplicate@example.com']);

    $this->actingAs($doctor)
        ->postJson(route('patients.store'), [
            'first_name' => 'Duplicate',
            'last_name' => 'Email',
            'email' => 'duplicate@example.com',
            'date_of_birth' => '1990-01-01',
            'gender' => 'female',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('renders create patient page for authenticated medical staff', function () {
    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->get(route('patients.create'))
        ->assertOk();
});

it('prevents non-medical staff from viewing create patient page', function () {
    $patient = User::factory()->patient()->create();

    $this->actingAs($patient)
        ->get(route('patients.create'))
        ->assertForbidden();
});

it('requires profile photo to be an image when creating patient', function () {
    Storage::fake('public');

    $doctor = User::factory()->doctor()->create();

    $this->actingAs($doctor)
        ->post(route('patients.store'), [
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'email' => 'juan-nonimage@example.com',
            'date_of_birth' => '1990-05-15',
            'gender' => 'male',
            'profile_photo' => UploadedFile::fake()->create('profile.pdf', 100, 'application/pdf'),
        ], [
            'Accept' => 'application/json',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['profile_photo']);
});

it('updates a patient record', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->patchJson(route('patients.update', $patient), ['first_name' => 'Updated'])
        ->assertOk()
        ->assertJsonFragment(['first_name' => 'Updated']);

    $this->assertDatabaseHas('patients', ['id' => $patient->id, 'first_name' => 'Updated']);
});

it('soft-deletes a patient on destroy', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    $this->actingAs($doctor)
        ->deleteJson(route('patients.destroy', $patient))
        ->assertOk()
        ->assertJsonFragment(['message' => 'Patient deleted.']);

    expect(Patient::find($patient->id))->toBeNull();
    expect(Patient::withTrashed()->find($patient->id))->not->toBeNull();
});
