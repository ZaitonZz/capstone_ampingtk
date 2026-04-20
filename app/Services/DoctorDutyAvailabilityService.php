<?php

namespace App\Services;

use App\Models\DoctorDutySchedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class DoctorDutyAvailabilityService
{
    public function availableDoctors(string $scheduledAt): Collection
    {
        $parsedSchedule = Carbon::parse($scheduledAt);

        return User::query()
            ->where('role', 'doctor')
            ->with('doctorProfile')
            ->whereHas('dutySchedules', fn ($query) => $query->availableAt($parsedSchedule))
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    public function isDoctorAvailableAt(int $doctorId, string $scheduledAt): bool
    {
        $parsedSchedule = Carbon::parse($scheduledAt);

        return DoctorDutySchedule::query()
            ->where('doctor_id', $doctorId)
            ->availableAt($parsedSchedule)
            ->exists();
    }
}
