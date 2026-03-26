<?php

namespace Database\Seeders;

use App\Models\DoctorProfile;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ── Admin ─────────────────────────────────────────────────────────────
        User::factory()->admin()->create([
            'name' => 'Admin User',
            'email' => 'admin@clinic.test',
            'password' => Hash::make('password'),
        ]);

        // ── Medical Staff (non-doctor EMR account) ──────────────────────────
        User::factory()->medicalStaff()->create([
            'name' => 'Medical Staff User',
            'email' => 'medicalstaff@clinic.test',
            'password' => Hash::make('password'),
        ]);

        // ── Doctors (with profiles) ───────────────────────────────────────────
        $doctorData = [
            [
                'name' => 'Dr. Maria Santos',
                'email' => 'dr.santos@clinic.test',
                'specialty' => 'Internal Medicine',
                'license_number' => 'LIC-001001',
                'clinic_name' => 'Santos Medical Clinic',
                'phone' => '0917-555-0001',
                'bio' => 'Board-certified internist with over 15 years of clinical experience.',
            ],
            [
                'name' => 'Dr. Jose Reyes',
                'email' => 'dr.reyes@clinic.test',
                'specialty' => 'Pediatrics',
                'license_number' => 'LIC-001002',
                'clinic_name' => 'Reyes Pediatric Care',
                'phone' => '0917-555-0002',
                'bio' => 'Dedicated pediatrician specializing in childhood development and preventive care.',
            ],
            [
                'name' => 'Dr. Ana Lim',
                'email' => 'dr.lim@clinic.test',
                'specialty' => 'Dermatology',
                'license_number' => 'LIC-001003',
                'clinic_name' => 'Lim Skin & Wellness',
                'phone' => '0917-555-0003',
                'bio' => 'Specialist in medical and cosmetic dermatology.',
            ],
        ];

        foreach ($doctorData as $data) {
            $doctor = User::factory()->doctor()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make('password'),
            ]);

            DoctorProfile::create([
                'user_id' => $doctor->id,
                'specialty' => $data['specialty'],
                'license_number' => $data['license_number'],
                'clinic_name' => $data['clinic_name'],
                'clinic_address' => fake()->address(),
                'phone' => $data['phone'],
                'bio' => $data['bio'],
            ]);
        }

        // ── Patients with linked user accounts (can log in) ───────────────────
        $patientUsers = [
            [
                'name' => 'Juan dela Cruz',
                'email' => 'juan@patient.test',
                'first_name' => 'Juan',
                'last_name' => 'dela Cruz',
            ],
            [
                'name' => 'Maria Clara Reyes',
                'email' => 'maria@patient.test',
                'first_name' => 'Maria Clara',
                'last_name' => 'Reyes',
            ],
        ];

        $registrar = User::where('role', 'doctor')->first();

        foreach ($patientUsers as $data) {
            $user = User::factory()->patient()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make('password'),
            ]);

            Patient::factory()->create([
                'user_id' => $user->id,
                'registered_by' => $registrar->id,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
            ]);
        }

        // ── Walk-in patients (no user account) ────────────────────────────────
        Patient::factory(8)->create([
            'user_id' => null,
            'registered_by' => $registrar->id,
        ]);
    }
}
