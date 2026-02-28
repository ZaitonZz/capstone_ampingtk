<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewDeepfakeScanLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'flagged'         => ['sometimes', 'boolean'],
            'reviewer_notes'  => ['nullable', 'string'],
        ];
    }
}
