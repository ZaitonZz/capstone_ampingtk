<?php

namespace App\Http\Requests;

use App\Services\DoctorDutyAvailabilityService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RescheduleConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isMedicalStaff() ?? false;
    }

    public function rules(): array
    {
        return [
            'scheduled_at' => ['required', 'date', 'after:now'],
        ];
    }

    public function messages(): array
    {
        return [
            'scheduled_at.required' => 'Please provide a new schedule date and time.',
            'scheduled_at.after' => 'The new schedule must be in the future.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $consultation = $this->route('consultation');
            $scheduledAt = (string) $this->input('scheduled_at');

            if ($consultation === null) {
                return;
            }

            if (! app(DoctorDutyAvailabilityService::class)->isDoctorAvailableAt((int) $consultation->doctor_id, $scheduledAt)) {
                $validator->errors()->add('scheduled_at', 'The assigned doctor is not on duty for the selected schedule.');
            }
        });
    }
}
