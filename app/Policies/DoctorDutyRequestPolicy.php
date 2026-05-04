<?php

namespace App\Policies;

use App\Models\DoctorDutyRequest;
use App\Models\User;

class DoctorDutyRequestPolicy
{
    public function create(User $user): bool
    {
        return $user->isDoctor();
    }

    public function review(User $user): bool
    {
        return $user->isAdmin() || $user->isMedicalStaff();
    }

    public function view(User $user, DoctorDutyRequest $doctorDutyRequest): bool
    {
        return $user->isAdmin()
            || $user->isMedicalStaff()
            || (int) $doctorDutyRequest->doctor_id === (int) $user->id;
    }
}
