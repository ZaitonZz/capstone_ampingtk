<?php

namespace App\Http\Requests;

use App\Models\DoctorDutyRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDoctorDutyRequestRequest extends FormRequest
{
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
