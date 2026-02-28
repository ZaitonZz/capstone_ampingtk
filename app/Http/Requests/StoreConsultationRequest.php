<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'doctor_id' => ['required', 'exists:users,id'],
            'type' => ['required', 'in:in_person,teleconsultation'],
            'status' => ['sometimes', 'in:scheduled,ongoing,completed,cancelled,no_show'],
            'chief_complaint' => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'cancellation_reason' => ['nullable', 'string'],
        ];
    }
}
