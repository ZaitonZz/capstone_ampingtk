<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePatientPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'photo'      => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'is_primary' => ['sometimes', 'boolean'],
            'notes'      => ['nullable', 'string', 'max:500'],
        ];
    }
}
