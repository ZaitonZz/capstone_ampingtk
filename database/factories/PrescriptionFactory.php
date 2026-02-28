<?php

namespace Database\Factories;

use App\Models\Consultation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Prescription>
 */
class PrescriptionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'consultation_id' => Consultation::factory(),
            'patient_id'      => fn (array $attrs) => Consultation::find($attrs['consultation_id'])->patient_id,
            'doctor_id'       => fn (array $attrs) => Consultation::find($attrs['consultation_id'])->doctor_id,
            'medication_name' => fake()->randomElement(['Amoxicillin', 'Paracetamol', 'Ibuprofen', 'Metformin', 'Amlodipine', 'Losartan']),
            'dosage'          => fake()->randomElement(['500mg', '250mg', '10mg', '5mg', '1g']),
            'frequency'       => fake()->randomElement(['Once daily', 'Twice daily', 'Three times daily', 'Every 8 hours']),
            'duration'        => fake()->randomElement(['3 days', '5 days', '7 days', '1 month']),
            'route'           => fake()->randomElement(['oral', 'IV', 'topical', 'subcutaneous']),
            'instructions'    => fake()->optional(0.5)->sentence(),
        ];
    }
}
