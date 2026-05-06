<?php

namespace App\Http\Requests;

use App\Services\DoctorDutyAvailabilityService;
use App\Models\DoctorDutySchedule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RequestAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['required', Rule::exists('users', 'id')->where('role', 'doctor')],
            'type' => ['required', 'in:in_person,teleconsultation'],
            'chief_complaint' => ['nullable', 'string', 'max:1000'],
            'scheduled_at' => ['required', 'date', 'after:now'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $doctorId = (int) $this->input('doctor_id');
            $scheduledAt = (string) $this->input('scheduled_at');

            $availabilityService = app(DoctorDutyAvailabilityService::class);

            $isAvailableAtTime = $availabilityService->isDoctorAvailableAt($doctorId, $scheduledAt);

            // Allow if doctor is available at the exact time, or has a duty schedule on that date
            $scheduledDate = Carbon::parse($scheduledAt)->toDateString();
            $hasScheduleOnDate = DoctorDutySchedule::query()
                ->where('doctor_id', $doctorId)
                ->whereDate('duty_date', $scheduledDate)
                ->exists();

            if (! $isAvailableAtTime && ! $hasScheduleOnDate) {
                $validator->errors()->add('doctor_id', 'Selected doctor is not on duty for the specified appointment schedule.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'scheduled_at.after' => 'The appointment date must be in the future.',
        ];
    }
}
