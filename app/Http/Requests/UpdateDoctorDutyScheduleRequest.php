<?php

namespace App\Http\Requests;

use App\Models\DoctorDutySchedule;
use App\Services\DoctorDutyScheduleService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateDoctorDutyScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && ($user->isAdmin() || $user->isMedicalStaff());
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['required', Rule::exists('users', 'id')->where('role', 'doctor')],
            'duty_date' => ['required', 'date'],
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

            $schedule = $this->route('doctorDutySchedule');

            if (! $schedule instanceof DoctorDutySchedule) {
                return;
            }

            $service = app(DoctorDutyScheduleService::class);
            $entries = $service->expandEntries([
                'doctor_id' => $this->input('doctor_id', $schedule->doctor_id),
                'schedule_mode' => DoctorDutyScheduleService::MODE_SINGLE,
                'duty_date' => $this->input('duty_date', $schedule->duty_date?->toDateString()),
                'start_time' => $this->input('start_time', substr((string) $schedule->start_time, 0, 5)),
                'end_time' => $this->input('end_time', substr((string) $schedule->end_time, 0, 5)),
                'status' => $this->input('status', $schedule->status),
                'remarks' => $this->input('remarks', $schedule->remarks),
            ]);

            $conflicts = $service->validateEntries($entries, $schedule->id);

            foreach ($conflicts as $conflict) {
                $validator->errors()->add('duty_date', $conflict);
            }
        });
    }
}
