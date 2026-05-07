<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesClinicDateTimes;
use App\Models\Consultation;
use App\Services\DoctorDutyAvailabilityService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateConsultationRequest extends FormRequest
{
    use NormalizesClinicDateTimes;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeClinicDateTimes(['scheduled_at', 'started_at', 'ended_at']);
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['sometimes', Rule::exists('users', 'id')->where('role', 'doctor')],
            'type' => ['sometimes', 'in:teleconsultation'],
            'status' => ['sometimes', Rule::in(Consultation::STATUSES)],
            'chief_complaint' => ['sometimes', 'string', 'min:1'],
            'scheduled_at' => ['nullable', 'date'],
            'started_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'deepfake_verified' => ['nullable', 'boolean'],
            'cancellation_reason' => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if (! $this->has('doctor_id') && ! $this->has('scheduled_at')) {
                return;
            }

            $consultation = $this->route('consultation');
            $doctorId = (int) ($this->input('doctor_id') ?? $consultation?->doctor_id ?? 0);
            $scheduledAt = $this->input('scheduled_at')
                ?? $consultation?->scheduled_at?->toDateTimeString();

            if ($doctorId === 0 || $scheduledAt === null) {
                return;
            }

            if (! app(DoctorDutyAvailabilityService::class)->isDoctorAvailableAt($doctorId, (string) $scheduledAt)) {
                $validator->errors()->add('doctor_id', 'Selected doctor is not on duty for the specified appointment schedule.');
            }
        });

        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $consultation = $this->route('consultation');

            if (! $consultation instanceof Consultation) {
                return;
            }

            $nextStatus = $this->input('status', $consultation->status);

            $isMarkingCompleted = $consultation->status !== Consultation::STATUS_COMPLETED
                && $nextStatus === Consultation::STATUS_COMPLETED;

            if (! $isMarkingCompleted) {
                return;
            }

            if ($consultation->hasClinicalDocumentation()) {
                return;
            }

            $message = 'Enter a clinical note or add a prescription before marking the consultation as completed.';

            $validator->errors()->add('status', $message);
        });
    }
}
