<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RequestAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['required', 'exists:users,id'],
            'type' => ['required', 'in:in_person,teleconsultation'],
            'chief_complaint' => ['nullable', 'string', 'max:1000'],
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
