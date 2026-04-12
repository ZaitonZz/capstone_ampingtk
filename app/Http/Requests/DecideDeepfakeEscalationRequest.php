<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DecideDeepfakeEscalationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isClinicalStaff() ?? false;
    }

    public function rules(): array
    {
        return [
            'escalation_id' => ['required', 'integer', 'exists:deepfake_escalations,id'],
            'decision' => ['required', 'string', 'in:continue,cancel'],
            'cancellation_reason' => ['nullable', 'string', 'required_if:decision,cancel', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'cancellation_reason.required_if' => 'A cancellation reason is required when cancelling a consultation.',
        ];
    }
}
