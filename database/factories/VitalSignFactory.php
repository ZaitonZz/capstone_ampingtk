<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VitalSign>
 */
class VitalSignFactory extends Factory
{
    public function definition(): array
    {
        $weight = fake()->randomFloat(2, 40, 120);   // kg
        $height = fake()->randomFloat(2, 140, 200);  // cm

        return [
            'consultation_id'          => Consultation::factory(),
            'patient_id'               => fn (array $attrs) => Consultation::find($attrs['consultation_id'])->patient_id,
            'recorded_by'              => User::factory()->doctor(),
            'temperature'              => fake()->randomFloat(2, 36.0, 37.5),
            'blood_pressure_systolic'  => fake()->numberBetween(100, 140),
            'blood_pressure_diastolic' => fake()->numberBetween(60, 90),
            'heart_rate'               => fake()->numberBetween(60, 100),
            'respiratory_rate'         => fake()->numberBetween(12, 20),
            'oxygen_saturation'        => fake()->randomFloat(2, 95, 100),
            'weight'                   => $weight,
            'height'                   => $height,
            'bmi'                      => null, // auto-computed by model saving hook
        ];
    }
}
