<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientTodayScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_with_today_schedule_is_highlighted(): void
    {
        $doctor = User::factory()->create();
        $patientWithSchedule = Patient::factory()->create();
        $patientWithoutSchedule = Patient::factory()->create();

        // Create a consultation for today
        Consultation::factory()->create([
            'patient_id' => $patientWithSchedule->id,
            'doctor_id' => $doctor->id,
            'scheduled_at' => now()->addHours(2),
            'status' => 'pending',
        ]);

        // Load with the same query used in PatientController
        $today = now()->startOfDay();
        $tomorrow = now()->addDay()->startOfDay();

        $patientWithScheduleLoaded = Patient::with([
            'consultations' => fn ($q) => $q->whereBetween('scheduled_at', [$today, $tomorrow])
                ->where('status', '!=', 'cancelled')
                ->where('status', '!=', 'no_show')
                ->orderBy('scheduled_at'),
        ])->find($patientWithSchedule->id);

        $patientWithoutScheduleLoaded = Patient::with([
            'consultations' => fn ($q) => $q->whereBetween('scheduled_at', [$today, $tomorrow])
                ->where('status', '!=', 'cancelled')
                ->where('status', '!=', 'no_show')
                ->orderBy('scheduled_at'),
        ])->find($patientWithoutSchedule->id);

        // Verify has_today_schedule is set correctly
        $this->assertTrue($patientWithScheduleLoaded->has_today_schedule);
        $this->assertFalse($patientWithoutScheduleLoaded->has_today_schedule);

        // Verify consultations are loaded
        $this->assertCount(1, $patientWithScheduleLoaded->consultations);
        $this->assertCount(0, $patientWithoutScheduleLoaded->consultations);
    }

    public function test_cancelled_and_no_show_consultations_are_excluded(): void
    {
        $doctor = User::factory()->create();
        $patient = Patient::factory()->create();

        // Create cancelled consultation for today
        Consultation::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'scheduled_at' => now()->addHours(1),
            'status' => 'cancelled',
        ]);

        // Create no_show consultation for today
        Consultation::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'scheduled_at' => now()->addHours(2),
            'status' => 'no_show',
        ]);

        $today = now()->startOfDay();
        $tomorrow = now()->addDay()->startOfDay();

        $patientLoaded = Patient::with([
            'consultations' => fn ($q) => $q->whereBetween('scheduled_at', [$today, $tomorrow])
                ->where('status', '!=', 'cancelled')
                ->where('status', '!=', 'no_show')
                ->orderBy('scheduled_at'),
        ])->find($patient->id);

        // Should not have today's schedule since all are cancelled/no_show
        $this->assertFalse($patientLoaded->has_today_schedule);
        $this->assertCount(0, $patientLoaded->consultations);
    }

    public function test_patient_controller_returns_consultation_data(): void
    {
        $doctor = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $patient = Patient::factory()->create();

        // Create a consultation for today
        Consultation::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'scheduled_at' => now()->addHours(2),
            'status' => 'pending',
        ]);

        // Get the patient list endpoint - route is under /staff/patients
        $response = $this->actingAs($admin)->getJson('/staff/patients?per_page=50');

        $response->assertStatus(200);

        $patients = $response->json('data');
        $patientData = collect($patients)->firstWhere('id', $patient->id);

        // Verify the response includes has_today_schedule and consultations
        $this->assertNotNull($patientData);
        $this->assertTrue($patientData['has_today_schedule']);
        $this->assertIsArray($patientData['consultations']);
        $this->assertCount(1, $patientData['consultations']);
        $this->assertEquals('pending', $patientData['consultations'][0]['status']);
    }
}
