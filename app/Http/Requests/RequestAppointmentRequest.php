<?php

namespace App\Http\Requests;

use App\Services\DoctorDutyAvailabilityService;
use Illuminate\Foundation\Http\FormRequest;
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
            'type' => ['required', 'in:teleconsultation'],
            'chief_complaint' => ['required', 'string', 'max:1000'],
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

            if (! app(DoctorDutyAvailabilityService::class)->isDoctorAvailableAt($doctorId, $scheduledAt)) {
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
