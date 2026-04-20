<?php

namespace App\Policies;

use App\Models\DoctorDutySchedule;
use App\Models\User;

class DoctorDutySchedulePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isClinicalStaff();
    }

    public function view(User $user, DoctorDutySchedule $doctorDutySchedule): bool
    {
        return $user->isAdmin()
            || $user->isMedicalStaff()
            || ((int) $doctorDutySchedule->doctor_id === (int) $user->id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isMedicalStaff();
    }

    public function update(User $user, DoctorDutySchedule $doctorDutySchedule): bool
    {
        return $user->isAdmin() || $user->isMedicalStaff();
    }

    public function delete(User $user, DoctorDutySchedule $doctorDutySchedule): bool
    {
        return $user->isAdmin() || $user->isMedicalStaff();
    }
}
