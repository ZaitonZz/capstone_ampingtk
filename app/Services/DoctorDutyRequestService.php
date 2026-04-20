<?php

namespace App\Services;

use App\Models\DoctorDutyRequest;
use App\Models\DoctorDutySchedule;
use Illuminate\Support\Carbon;

class DoctorDutyRequestService
{
    public function applyApprovedRequest(DoctorDutyRequest $request): void
    {
        $statusToApply = (string) $request->request_type;
        $startDate = Carbon::parse($request->start_date)->startOfDay();
        $endDate = Carbon::parse($request->end_date ?? $request->start_date)->startOfDay();

        $currentDate = $startDate->copy();

        while ($currentDate->lessThanOrEqualTo($endDate)) {
            $dateString = $currentDate->toDateString();

            $existingSchedules = DoctorDutySchedule::query()
                ->where('doctor_id', $request->doctor_id)
                ->whereDate('duty_date', $dateString)
                ->get();

            if ($existingSchedules->isEmpty()) {
                DoctorDutySchedule::query()->create([
                    'doctor_id' => $request->doctor_id,
                    'duty_date' => $dateString,
                    'start_time' => '00:00:00',
                    'end_time' => '23:59:59',
                    'status' => $statusToApply,
                    'remarks' => $request->remarks,
                ]);
            } else {
                foreach ($existingSchedules as $schedule) {
                    $schedule->update([
                        'status' => $statusToApply,
                        'remarks' => $request->remarks ?: $schedule->remarks,
                    ]);
                }
            }

            $currentDate->addDay();
        }
    }
}
