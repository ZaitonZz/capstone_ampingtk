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
        // Only seed test accounts in development
        if (! app()->environment('local', 'development')) {
            return;
        }

        // Create or find test doctor account (idempotent)
        $doctor = User::firstOrCreate(
            ['email' => 'doctor@example.com'],
            [
                'name' => 'Dr. Test Doctor',
                'password' => bcrypt('password'),
                'role' => 'doctor',
            ]
        );

        // Create or find test admin account (idempotent)
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
                'role' => 'admin',
            ]
        );

        // Create 50 patients registered by the test doctor (only if none exist)
        if (Patient::where('registered_by', $doctor->id)->count() === 0) {
            Patient::factory(50)->create([
                'registered_by' => $doctor->id,
            ]);
        }
    }
}
