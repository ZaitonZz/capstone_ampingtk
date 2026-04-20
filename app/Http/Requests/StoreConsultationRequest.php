<?php

namespace App\Http\Requests;

use App\Services\DoctorDutyAvailabilityService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['required', Rule::exists('users', 'id')->where('role', 'doctor')],
            'type' => ['required', 'in:in_person,teleconsultation'],
            'status' => ['sometimes', 'in:pending,scheduled,ongoing,paused,completed,cancelled,no_show'],
            'chief_complaint' => ['nullable', 'string'],
            'scheduled_at' => ['required', 'date'],
            'cancellation_reason' => ['nullable', 'string'],
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
}
