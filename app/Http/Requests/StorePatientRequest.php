<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['required', 'in:male,female,other'],
            'civil_status' => ['nullable', 'in:single,married,widowed,separated'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'email' => ['required', 'email', 'max:191', 'unique:patients,email', 'unique:users,email'],
            'address' => ['nullable', 'string'],
            'profile_photo' => ['required', 'image'],
            'blood_type' => ['nullable', 'string', 'max:5'],
            'emergency_contact_name' => ['nullable', 'string', 'max:191'],
            'emergency_contact_number' => ['nullable', 'string', 'max:30'],
            'known_allergies' => ['nullable', 'string'],
            // Optional: create a linked user account for the patient
            'user_id' => ['nullable', 'exists:users,id'],
        ];
    }
}
