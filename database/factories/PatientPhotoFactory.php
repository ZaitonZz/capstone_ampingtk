<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PatientPhoto>
 */
class PatientPhotoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'uploaded_by' => User::factory()->doctor(),
            'file_path' => 'patients/1/photos/test.jpg',
            'disk' => 'local',
            'is_primary' => false,
            'notes' => fake()->optional(0.3)->sentence(),
        ];
    }

    public function primary(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_primary' => true,
        ]);
    }
}
