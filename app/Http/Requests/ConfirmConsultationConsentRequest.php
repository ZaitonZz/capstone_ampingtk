<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmConsultationConsentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'read_privacy_notice' => ['required', 'accepted'],
            'agree_identity_guard' => ['required', 'accepted'],
            'agree_liveness_check' => ['required', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'read_privacy_notice.required' => 'You must confirm that you have read and understood the Privacy Notice.',
            'read_privacy_notice.accepted' => 'You must confirm that you have read and understood the Privacy Notice.',
            'agree_identity_guard.required' => 'You must agree to Identity Guard verification checks.',
            'agree_identity_guard.accepted' => 'You must agree to Identity Guard verification checks.',
            'agree_liveness_check.required' => 'You must consent to liveness/security checks.',
            'agree_liveness_check.accepted' => 'You must consent to liveness/security checks.',
        ];
    }
}
