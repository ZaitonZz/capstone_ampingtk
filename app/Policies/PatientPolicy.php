<?php

namespace App\Policies;

use App\Models\Patient;
use App\Models\User;

class PatientPolicy
{
    /**
     * Any medical staff member may manage patients.
     * Patient-role accounts are blocked at the route group by EnsureMedicalStaff.
     */
    private function isMedicalStaff(User $user): bool
    {
        return $user->isDoctor() || $user->isAdmin();
    }

    public function viewAny(User $user): bool
    {
        return $this->isMedicalStaff($user);
    }

    public function view(User $user, Patient $patient): bool
    {
        return $this->isMedicalStaff($user);
    }

    public function create(User $user): bool
    {
        return $this->isMedicalStaff($user);
    }

    public function update(User $user, Patient $patient): bool
    {
        return $this->isMedicalStaff($user);
    }

    public function delete(User $user, Patient $patient): bool
    {
        return $this->isMedicalStaff($user);
    }
}
