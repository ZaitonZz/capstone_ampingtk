<?php

namespace App\Http\Controllers;

use App\Models\ConsultationFaceVerificationLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDeepfakeVerificationController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $allowedStatuses = ['matched', 'mismatch'];
        $allowedRoles = ['patient', 'doctor'];
        $allowedFlaggedStates = ['flagged', 'unflagged'];

        $rawStatusFilter = $request->query('status');
        $rawRoleFilter = $request->query('verified_role');
        $rawFlaggedFilter = $request->query('flagged');

        $statusFilter = in_array($rawStatusFilter, $allowedStatuses, true) ? $rawStatusFilter : null;
        $roleFilter = in_array($rawRoleFilter, $allowedRoles, true) ? $rawRoleFilter : null;
        $flaggedFilter = in_array($rawFlaggedFilter, $allowedFlaggedStates, true) ? $rawFlaggedFilter : null;

        $deepfakeVerificationLogs = ConsultationFaceVerificationLog::query()
            ->with([
                'consultation.patient:id,user_id,first_name,last_name',
                'consultation.doctor:id,name',
                'user:id,name',
            ])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    if (is_numeric($search)) {
                        $subQuery
                            ->orWhereKey((int) $search)
                            ->orWhere('consultation_id', (int) $search)
                            ->orWhere('user_id', (int) $search);
                    }

                    $subQuery
                        ->orWhere('verified_role', 'like', "%{$search}%")
                        ->orWhereHas('consultation.patient', function ($patientQuery) use ($search): void {
                            $patientQuery->where(function ($nameQuery) use ($search): void {
                                $nameQuery
                                    ->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%");
                            });
                        })
                        ->orWhereHas('consultation.doctor', fn ($doctorQuery) => $doctorQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when(
                $statusFilter === 'matched',
                fn ($query) => $query->where('matched', true)
            )
            ->when(
                $statusFilter === 'mismatch',
                fn ($query) => $query->where('matched', false)
            )
            ->when(
                $roleFilter !== null,
                fn ($query) => $query->where('verified_role', $roleFilter)
            )
            ->when(
                $flaggedFilter === 'flagged',
                fn ($query) => $query->where('flagged', true)
            )
            ->when(
                $flaggedFilter === 'unflagged',
                fn ($query) => $query->where('flagged', false)
            )
            ->orderByDesc('checked_at')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/deepfake-verifications', [
            'deepfakeVerificationLogs' => $deepfakeVerificationLogs,
            'filters' => [
                'search' => $request->query('search'),
                'status' => $statusFilter,
                'verified_role' => $roleFilter,
                'flagged' => $flaggedFilter,
            ],
            'options' => [
                'statuses' => $allowedStatuses,
                'verified_roles' => $allowedRoles,
                'flagged_states' => $allowedFlaggedStates,
            ],
        ]);
    }
}
