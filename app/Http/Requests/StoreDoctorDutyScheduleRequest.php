<?php

namespace App\Http\Requests;

use App\Models\DoctorDutySchedule;
use App\Services\DoctorDutyScheduleService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreDoctorDutyScheduleRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $mode = (string) $this->input('schedule_mode', DoctorDutyScheduleService::MODE_SINGLE);

        if ($mode !== DoctorDutyScheduleService::MODE_MULTIPLE_DATES) {
            $this->merge(['duty_dates' => null]);
        }

        if ($mode !== DoctorDutyScheduleService::MODE_RECURRING_WEEKLY) {
            $this->merge([
                'recurring_start_date' => null,
                'recurring_end_date' => null,
                'recurring_weekdays' => null,
            ]);
        }

        if ($mode !== DoctorDutyScheduleService::MODE_SINGLE) {
            $this->merge(['duty_date' => null]);
        }
    }

    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && ($user->isAdmin() || $user->isMedicalStaff());
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['required', Rule::exists('users', 'id')->where('role', 'doctor')],
            'schedule_mode' => ['required', Rule::in(DoctorDutyScheduleService::MODES)],
            'duty_date' => ['required_if:schedule_mode,'.DoctorDutyScheduleService::MODE_SINGLE, 'nullable', 'date'],
            'duty_dates' => ['required_if:schedule_mode,'.DoctorDutyScheduleService::MODE_MULTIPLE_DATES, 'nullable', 'array', 'min:1'],
            'duty_dates.*' => ['date'],
            'recurring_start_date' => ['required_if:schedule_mode,'.DoctorDutyScheduleService::MODE_RECURRING_WEEKLY, 'nullable', 'date'],
            'recurring_end_date' => ['required_if:schedule_mode,'.DoctorDutyScheduleService::MODE_RECURRING_WEEKLY, 'nullable', 'date', 'after_or_equal:recurring_start_date'],
            'recurring_weekdays' => ['required_if:schedule_mode,'.DoctorDutyScheduleService::MODE_RECURRING_WEEKLY, 'nullable', 'array', 'min:1'],
            'recurring_weekdays.*' => ['in:mon,tue,wed,thu,fri,sat,sun'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'status' => ['required', Rule::in(DoctorDutySchedule::STATUSES)],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $service = app(DoctorDutyScheduleService::class);
            $entries = $service->expandEntries($this->all());

            if ($entries === []) {
                $validator->errors()->add('schedule_mode', 'Please select at least one valid duty date to create.');

                return;
            }

            $conflicts = $service->validateEntries($entries);

            foreach ($conflicts as $conflict) {
                $validator->errors()->add('duty_dates', $conflict);
            }
        });
    }
}
