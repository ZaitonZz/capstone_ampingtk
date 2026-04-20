<?php

namespace Database\Factories;

use App\Models\DoctorDutySchedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DoctorDutySchedule>
 */
class DoctorDutyScheduleFactory extends Factory
{
    protected $model = DoctorDutySchedule::class;

    public function definition(): array
    {
        return [
            'doctor_id' => User::factory()->doctor(),
            'duty_date' => now()->addDay()->toDateString(),
            'start_time' => '08:00',
            'end_time' => '17:00',
            'status' => DoctorDutySchedule::STATUS_ON_DUTY,
            'remarks' => fake()->optional()->sentence(),
        ];
    }
}
