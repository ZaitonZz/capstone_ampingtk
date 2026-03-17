<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFaceMatchResultRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'consultation_id' => ['required', 'integer', 'exists:consultations,id,deleted_at,NULL'],
            'matched' => ['required', 'boolean'],
            'face_match_score' => ['required', 'numeric', 'between:0,1'],
            'flagged' => ['sometimes', 'boolean'],
        ];
    }
}
