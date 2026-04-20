<?php

namespace Database\Factories;

use App\Models\DoctorDutyRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DoctorDutyRequest>
 */
class DoctorDutyRequestFactory extends Factory
{
    protected $model = DoctorDutyRequest::class;

    public function definition(): array
    {
        $startDate = now()->addDays(2)->toDateString();

        return [
            'doctor_id' => User::factory()->doctor(),
            'request_type' => DoctorDutyRequest::TYPE_ON_LEAVE,
            'start_date' => $startDate,
            'end_date' => $startDate,
            'remarks' => fake()->sentence(),
            'status' => DoctorDutyRequest::STATUS_PENDING,
            'reviewed_by' => null,
            'reviewed_at' => null,
            'reviewer_notes' => null,
        ];
    }
}
