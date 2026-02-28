<?php

namespace Database\Factories;

use App\Models\Consultation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DeepfakeScanLog>
 */
class DeepfakeScanLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'consultation_id'  => Consultation::factory(),
            'result'           => fake()->randomElement(['real', 'fake', 'inconclusive']),
            'confidence_score' => fake()->randomFloat(4, 0.0, 1.0),
            'frame_path'       => fake()->optional(0.7)->filePath(),
            'frame_number'     => fake()->optional(0.7)->numberBetween(1, 10000),
            'model_version'    => fake()->optional(0.8)->randomElement(['v1.0', 'v1.2', 'v2.0']),
            'flagged'          => false,
            'reviewed_by'      => null,
            'reviewed_at'      => null,
            'reviewer_notes'   => null,
            'scanned_at'       => now(),
        ];
    }

    public function fake(): static
    {
        return $this->state(fn (array $attributes) => [
            'result'           => 'fake',
            'confidence_score' => fake()->randomFloat(4, 0.8, 1.0),
            'flagged'          => true,
        ]);
    }

    public function real(): static
    {
        return $this->state(fn (array $attributes) => [
            'result'           => 'real',
            'confidence_score' => fake()->randomFloat(4, 0.0, 0.2),
            'flagged'          => false,
        ]);
    }
}
