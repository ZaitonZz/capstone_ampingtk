<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'doctor_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', 'doctor')),
            ],
            'type' => ['required', 'in:in_person,teleconsultation'],
            'status' => ['sometimes', 'in:pending,scheduled,ongoing,paused,completed,cancelled,no_show'],
            'chief_complaint' => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'cancellation_reason' => ['nullable', 'string'],
        ];
    }
}
