<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DoctorProfile>
 */
class DoctorProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'        => User::factory()->doctor(),
            'specialty'      => fake()->randomElement([
                'Internal Medicine', 'Pediatrics', 'Cardiology',
                'Dermatology', 'Neurology', 'Oncology', 'Psychiatry',
                'Radiology', 'Surgery', 'Obstetrics & Gynecology',
            ]),
            'license_number' => fake()->unique()->numerify('LIC-######'),
            'clinic_name'    => fake()->optional(0.7)->company(),
            'clinic_address' => fake()->optional(0.7)->address(),
            'phone'          => fake()->optional(0.8)->phoneNumber(),
            'bio'            => fake()->optional(0.5)->paragraph(),
        ];
    }
}
