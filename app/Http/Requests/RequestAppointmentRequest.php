<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesClinicDateTimes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestAppointmentRequest extends FormRequest
{
    use NormalizesClinicDateTimes;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeClinicDateTimes(['scheduled_at']);
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

    public function messages(): array
    {
        return [
            'scheduled_at.after' => 'The appointment date must be in the future.',
        ];
    }
}
