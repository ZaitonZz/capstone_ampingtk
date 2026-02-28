<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'                => ['sometimes', 'in:in_person,teleconsultation'],
            'status'              => ['sometimes', 'in:scheduled,ongoing,completed,cancelled,no_show'],
            'chief_complaint'     => ['nullable', 'string'],
            'scheduled_at'        => ['nullable', 'date'],
            'started_at'          => ['nullable', 'date'],
            'ended_at'            => ['nullable', 'date', 'after_or_equal:started_at'],
            'deepfake_verified'   => ['nullable', 'boolean'],
            'cancellation_reason' => ['nullable', 'string'],
        ];
    }
}
