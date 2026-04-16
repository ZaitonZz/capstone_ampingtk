<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        $requiresDoctorProfile = fn (): bool => $this->input('role') === 'doctor';

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'role' => ['required', 'string', 'in:admin,doctor,medicalstaff,patient'],
            'status' => ['required', 'string', 'in:active,inactive,suspended'],
            'doctor_profile' => [Rule::requiredIf($requiresDoctorProfile), 'array'],
            'doctor_profile.specialty' => [
                Rule::requiredIf($requiresDoctorProfile),
                'string',
                'max:191',
            ],
            'doctor_profile.license_number' => [
                Rule::requiredIf($requiresDoctorProfile),
                'string',
                'max:191',
                Rule::unique('doctor_profiles', 'license_number'),
            ],
            'doctor_profile.clinic_name' => ['nullable', 'string', 'max:191'],
            'doctor_profile.clinic_address' => ['nullable', 'string'],
            'doctor_profile.phone' => ['nullable', 'string', 'max:30'],
            'doctor_profile.bio' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'doctor_profile.required' => 'Doctor profile details are required when role is doctor.',
            'doctor_profile.specialty.required' => 'Specialty is required when role is doctor.',
            'doctor_profile.license_number.required' => 'License number is required when role is doctor.',
        ];
    }
}
