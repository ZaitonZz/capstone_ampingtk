<?php

namespace Database\Factories;

use App\Models\Consultation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ConsultationMicrocheck>
 */
class ConsultationMicrocheckFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'consultation_id' => Consultation::factory(),
            'status' => 'pending',
            'scheduled_at' => now()->subSeconds(5),
            'claimed_at' => null,
            'completed_at' => null,
            'expires_at' => now()->addSeconds(40),
            'latency_ms' => null,
        ];
    }

    public function claimed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'claimed',
            'claimed_at' => now()->subSeconds(2),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'claimed_at' => now()->subSeconds(4),
            'completed_at' => now()->subSecond(),
            'latency_ms' => 2500,
        ]);
    }
}
