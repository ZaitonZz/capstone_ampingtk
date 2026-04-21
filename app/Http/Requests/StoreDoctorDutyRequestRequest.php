<?php

namespace App\Http\Requests;

use App\Models\DoctorDutyRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDoctorDutyRequestRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $startDate = $this->input('start_date');

        if (blank($startDate)) {
            $startDate = now()->toDateString();
        }

        $this->merge([
            'start_date' => $startDate,
            'end_date' => $this->filled('end_date') ? $this->input('end_date') : $startDate,
        ]);
    }

    public function authorize(): bool
    {
        return $this->user()?->isDoctor() ?? false;
    }

    public function rules(): array
    {
        return [
            'request_type' => ['required', Rule::in(DoctorDutyRequest::TYPES)],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
