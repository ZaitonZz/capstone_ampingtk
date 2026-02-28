<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePatientNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subjective' => ['nullable', 'string'],
            'objective'  => ['nullable', 'string'],
            'assessment' => ['nullable', 'string'],
            'plan'       => ['nullable', 'string'],
        ];
    }
}
