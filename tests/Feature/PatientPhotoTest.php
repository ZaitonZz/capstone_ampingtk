<?php

use App\Models\Patient;
use App\Models\PatientPhoto;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('redirects guests to login on photos index', function () {
    $patient = Patient::factory()->create();

    $this->get(route('patients.photos.index', $patient))->assertRedirect(route('login'));
});

it('returns all photos for a patient', function () {
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);
    PatientPhoto::factory(2)->create([
        'patient_id' => $patient->id,
        'uploaded_by' => $doctor->id,
    ]);

    $this->actingAs($doctor)
        ->getJson(route('patients.photos.index', $patient))
        ->assertOk()
        ->assertJsonCount(2);
});

it('uploads a photo and stores it on disk', function () {
    Storage::fake('local');
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);
    $file = UploadedFile::fake()->image('avatar.jpg');

    $this->actingAs($doctor)
        ->postJson(route('patients.photos.store', $patient), [
            'photo' => $file,
            'is_primary' => false,
        ])
        ->assertCreated()
        ->assertJsonStructure(['id', 'file_path', 'is_primary']);

    $this->assertDatabaseCount('patient_photos', 1);
    Storage::disk('local')->assertExists(
        PatientPhoto::first()->file_path
    );
});

it('marks previous primary photos as non-primary when uploading a new primary photo', function () {
    Storage::fake('local');
    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);

    // Existing primary
    $existing = PatientPhoto::factory()->primary()->create([
        'patient_id' => $patient->id,
        'uploaded_by' => $doctor->id,
        'file_path' => "patients/{$patient->id}/photos/old.jpg",
    ]);

    $this->actingAs($doctor)
        ->postJson(route('patients.photos.store', $patient), [
            'photo' => UploadedFile::fake()->image('new.jpg'),
            'is_primary' => true,
        ])
        ->assertCreated();

    expect($existing->fresh()->is_primary)->toBeFalse();
});

it('soft-deletes a photo and removes the file from storage', function () {
    Storage::fake('local');
    Storage::disk('local')->put('patients/1/photos/test.jpg', 'fake-content');

    $doctor = User::factory()->doctor()->create();
    $patient = Patient::factory()->create(['registered_by' => $doctor->id]);
    $photo = PatientPhoto::factory()->create([
        'patient_id' => $patient->id,
        'uploaded_by' => $doctor->id,
        'file_path' => 'patients/1/photos/test.jpg',
        'disk' => 'local',
    ]);

    $this->actingAs($doctor)
        ->deleteJson(route('patients.photos.destroy', [$patient, $photo]))
        ->assertOk()
        ->assertJsonFragment(['message' => 'Photo removed.']);

    expect(PatientPhoto::find($photo->id))->toBeNull();
    Storage::disk('local')->assertMissing('patients/1/photos/test.jpg');
});

it('returns 404 when destroying a photo belonging to another patient', function () {
    $doctor = User::factory()->doctor()->create();
    $patient1 = Patient::factory()->create(['registered_by' => $doctor->id]);
    $patient2 = Patient::factory()->create(['registered_by' => $doctor->id]);
    $photo = PatientPhoto::factory()->create([
        'patient_id' => $patient2->id,
        'uploaded_by' => $doctor->id,
    ]);

    $this->actingAs($doctor)
        ->deleteJson(route('patients.photos.destroy', [$patient1, $photo]))
        ->assertNotFound();
});
