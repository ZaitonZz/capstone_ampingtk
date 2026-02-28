<?php

namespace App\Http\Requests;

use App\Models\DoctorProfile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertDoctorProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $existingProfileId = DoctorProfile::where('user_id', $this->user()->id)->value('id');

        return [
            'specialty' => ['required', 'string', 'max:191'],
            'license_number' => [
                'required',
                'string',
                'max:191',
                Rule::unique('doctor_profiles', 'license_number')
                    ->ignore($existingProfileId),
            ],
            'clinic_name' => ['nullable', 'string', 'max:191'],
            'clinic_address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:30'],
            'bio' => ['nullable', 'string'],
        ];
    }
}
