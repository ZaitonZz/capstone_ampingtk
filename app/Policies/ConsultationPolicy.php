<?php

namespace App\Policies;

use App\Models\Consultation;
use App\Models\User;

class ConsultationPolicy
{
    /**
     * Medical staff can view consultations list.
     * Patients can view if they have access to specific consultations.
     */
    public function viewAny(User $user): bool
    {
        return $user->isDoctor() || $user->isNurse() || $user->isAdmin() || $user->isPatient();
    }

    /**
     * - Admins can view all consultations
     * - Doctors can view their own consultations
     * - Nurses can view all consultations (to assist with patient care)
     * - Patients can view their own consultations
     */
    public function view(User $user, Consultation $consultation): bool
    {
        // Admin has full access
        if ($user->isAdmin()) {
            return true;
        }

        // Doctor can view their own consultations
        if ($user->isDoctor() && $consultation->doctor_id === $user->id) {
            return true;
        }

        // Nurses can view all consultations (to assist with patient care)
        if ($user->isNurse()) {
            return true;
        }

        // Patients can view their own consultations
        if ($user->isPatient()) {
            $patientProfile = $user->patientProfile;

            return $patientProfile && $consultation->patient_id === $patientProfile->id;
        }

        return false;
    }

    /**
     * Only doctors and admins can create consultations
     */
    public function create(User $user): bool
    {
        return $user->isDoctor() || $user->isAdmin();
    }

    /**
     * Doctors and admins can update consultations.
     * Nurses can update consultation notes and vitals (handled in separate policies).
     */
    public function update(User $user, Consultation $consultation): bool
    {
        return $user->isAdmin() || ($user->isDoctor() && $consultation->doctor_id === $user->id);
    }

    /**
     * Only admins and the assigned doctor can delete consultations
     */
    public function delete(User $user, Consultation $consultation): bool
    {
        return $user->isAdmin() || ($user->isDoctor() && $consultation->doctor_id === $user->id);
    }

    /**
     * Only doctors can approve consultations
     */
    public function approve(User $user, Consultation $consultation): bool
    {
        return $user->isDoctor() || $user->isAdmin();
    }
}
