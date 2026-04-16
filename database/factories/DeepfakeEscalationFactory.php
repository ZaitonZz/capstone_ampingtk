<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\DeepfakeEscalation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DeepfakeEscalation>
 */
class DeepfakeEscalationFactory extends Factory
{
    protected $model = DeepfakeEscalation::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'consultation_id' => Consultation::factory(),
            'triggered_by_user_id' => User::factory(),
            'triggered_role' => 'doctor',
            'type' => DeepfakeEscalation::TYPE_ADMIN_ALERT,
            'streak_count' => 5,
            'status' => DeepfakeEscalation::STATUS_OPEN,
            'decision' => null,
            'resolved_by' => null,
            'resolved_at' => null,
            'notes' => null,
        ];
    }

    public function doctorAlert(): static
    {
        return $this->state(fn (array $attributes) => [
            'triggered_role' => 'doctor',
            'type' => DeepfakeEscalation::TYPE_ADMIN_ALERT,
        ]);
    }

    public function patientDecision(): static
    {
        return $this->state(fn (array $attributes) => [
            'triggered_role' => 'patient',
            'type' => DeepfakeEscalation::TYPE_DOCTOR_DECISION,
        ]);
    }

    public function resolved(string $decision = 'continue'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => DeepfakeEscalation::STATUS_RESOLVED,
            'decision' => $decision,
            'resolved_by' => User::factory(),
            'resolved_at' => now(),
        ]);
    }
}
