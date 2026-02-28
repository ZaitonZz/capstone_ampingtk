<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDeepfakeScanLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'result' => ['required', 'in:real,fake,inconclusive'],
            'confidence_score' => ['nullable', 'numeric', 'between:0,1'],
            'frame_path' => ['nullable', 'string', 'max:500'],
            'frame_number' => ['nullable', 'integer', 'min:0'],
            'model_version' => ['nullable', 'string', 'max:50'],
            'flagged' => ['sometimes', 'boolean'],
            'scanned_at' => ['nullable', 'date'],
        ];
    }
}
