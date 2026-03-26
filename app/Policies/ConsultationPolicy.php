<?php

namespace App\Policies;

use App\Models\Consultation;
use App\Models\User;

class ConsultationPolicy
{
    /**
     * Admins see all consultations; doctors see only their own.
     * The index query is also scoped in ConsultationController@index.
     */
    public function viewAny(User $user): bool
    {
        return $user->isClinicalStaff();
    }

    public function view(User $user, Consultation $consultation): bool
    {
        if ($user->isAdmin() || $user->isMedicalStaff() || $consultation->doctor_id === $user->id) {
            return true;
        }

        return $consultation->patient()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->isClinicalStaff();
    }

    public function update(User $user, Consultation $consultation): bool
    {
        return $user->isAdmin() || $user->isMedicalStaff() || $consultation->doctor_id === $user->id;
    }

    public function delete(User $user, Consultation $consultation): bool
    {
        return $user->isAdmin() || $user->isMedicalStaff() || $consultation->doctor_id === $user->id;
    }
}
