<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'doctor_id' => [
                'sometimes',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', 'doctor')),
            ],
            'type' => ['sometimes', 'in:in_person,teleconsultation'],
            'status' => ['sometimes', 'in:pending,scheduled,ongoing,paused,completed,cancelled,no_show'],
            'chief_complaint' => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'started_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'deepfake_verified' => ['nullable', 'boolean'],
            'cancellation_reason' => ['nullable', 'string'],
        ];
    }
}
