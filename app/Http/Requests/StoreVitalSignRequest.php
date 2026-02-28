<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVitalSignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'temperature'              => ['nullable', 'numeric', 'between:30,45'],
            'blood_pressure_systolic'  => ['nullable', 'integer', 'between:50,300'],
            'blood_pressure_diastolic' => ['nullable', 'integer', 'between:30,200'],
            'heart_rate'               => ['nullable', 'integer', 'between:20,300'],
            'respiratory_rate'         => ['nullable', 'integer', 'between:5,60'],
            'oxygen_saturation'        => ['nullable', 'numeric', 'between:50,100'],
            'weight'                   => ['nullable', 'numeric', 'between:0.5,500'],
            'height'                   => ['nullable', 'numeric', 'between:20,300'],
        ];
    }
}
