<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'               => ['sometimes', 'string', 'max:100'],
            'last_name'                => ['sometimes', 'string', 'max:100'],
            'middle_name'              => ['nullable', 'string', 'max:100'],
            'date_of_birth'            => ['sometimes', 'date', 'before:today'],
            'gender'                   => ['sometimes', 'in:male,female,other'],
            'civil_status'             => ['nullable', 'in:single,married,widowed,separated'],
            'contact_number'           => ['nullable', 'string', 'max:30'],
            'email'                    => ['nullable', 'email', 'max:191'],
            'address'                  => ['nullable', 'string'],
            'blood_type'               => ['nullable', 'string', 'max:5'],
            'emergency_contact_name'   => ['nullable', 'string', 'max:191'],
            'emergency_contact_number' => ['nullable', 'string', 'max:30'],
            'known_allergies'          => ['nullable', 'string'],
        ];
    }
}
