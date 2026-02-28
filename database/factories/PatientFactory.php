<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Patient>
 */
class PatientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'                  => null,
            'registered_by'            => User::factory()->doctor(),
            'first_name'               => fake()->firstName(),
            'last_name'                => fake()->lastName(),
            'middle_name'              => fake()->optional(0.5)->firstName(),
            'date_of_birth'            => fake()->dateTimeBetween('-80 years', '-1 year')->format('Y-m-d'),
            'gender'                   => fake()->randomElement(['male', 'female', 'other']),
            'civil_status'             => fake()->randomElement(['single', 'married', 'widowed', 'separated']),
            'contact_number'           => fake()->phoneNumber(),
            'email'                    => fake()->optional(0.7)->safeEmail(),
            'address'                  => fake()->address(),
            'blood_type'               => fake()->optional(0.8)->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
            'emergency_contact_name'   => fake()->name(),
            'emergency_contact_number' => fake()->phoneNumber(),
            'known_allergies'          => fake()->optional(0.3)->words(3, true),
        ];
    }

    /** Patient has a linked user account */
    public function withUserAccount(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => User::factory()->patient(),
        ]);
    }
}
