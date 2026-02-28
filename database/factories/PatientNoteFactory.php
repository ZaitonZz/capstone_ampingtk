<?php

namespace Database\Factories;

use App\Models\Consultation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PatientNote>
 */
class PatientNoteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'consultation_id' => Consultation::factory(),
            'patient_id'      => fn (array $attrs) => Consultation::find($attrs['consultation_id'])->patient_id,
            'doctor_id'       => fn (array $attrs) => Consultation::find($attrs['consultation_id'])->doctor_id,
            'subjective'      => fake()->paragraph(),
            'objective'       => fake()->paragraph(),
            'assessment'      => fake()->sentence(),
            'plan'            => fake()->paragraph(),
        ];
    }
}
