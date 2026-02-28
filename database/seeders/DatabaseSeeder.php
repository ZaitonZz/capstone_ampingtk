<?php

namespace Database\Seeders;

use App\Models\Patient;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create a test doctor account
        $doctor = User::factory()->doctor()->create([
            'name' => 'Dr. Test Doctor',
            'email' => 'doctor@example.com',
        ]);

        // Create a test admin account
        User::factory()->admin()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);

        // Create 50 patients registered by the test doctor
        Patient::factory(50)->create([
            'registered_by' => $doctor->id,
        ]);
    }
}
