<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Consultation>
 */
class ConsultationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'patient_id'     => Patient::factory(),
            'doctor_id'      => User::factory()->doctor(),
            'type'           => 'in_person',
            'status'         => 'scheduled',
            'chief_complaint' => fake()->sentence(),
            'scheduled_at'   => now()->addDay(),
            'started_at'     => null,
            'ended_at'       => null,
            'session_token'  => null,
            'deepfake_verified' => null,
            'cancellation_reason' => null,
        ];
    }

    public function teleconsultation(): static
    {
        return $this->state(fn (array $attributes) => [
            'type'          => 'teleconsultation',
            'session_token' => \Illuminate\Support\Str::uuid()->toString(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status'     => 'completed',
            'started_at' => now()->subHour(),
            'ended_at'   => now()->subMinutes(10),
        ]);
    }

    public function ongoing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status'     => 'ongoing',
            'started_at' => now()->subMinutes(20),
        ]);
    }
}
