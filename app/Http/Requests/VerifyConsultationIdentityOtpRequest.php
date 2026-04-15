<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyConsultationIdentityOtpRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $otpLength = max(4, (int) config('auth_otp.otp.length', 6));

        return [
            'otp_code' => ['required', 'string', 'regex:/^\\d{'.$otpLength.'}$/'],
        ];
    }

    public function messages(): array
    {
        $otpLength = max(4, (int) config('auth_otp.otp.length', 6));

        return [
            'otp_code.required' => 'Verification code is required.',
            'otp_code.regex' => sprintf('Verification code must be exactly %d digits.', $otpLength),
        ];
    }
}
