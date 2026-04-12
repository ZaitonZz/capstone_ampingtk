<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CancelConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cancellation_reason' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'cancellation_reason.required' => 'Please provide a cancellation reason.',
        ];
    }
}
