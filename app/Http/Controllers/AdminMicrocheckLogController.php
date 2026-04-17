<?php

namespace App\Http\Controllers;

use App\Models\ConsultationMicrocheck;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminMicrocheckLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $allowedStatuses = ['pending', 'claimed', 'completed', 'expired'];
        $allowedTargetRoles = ['patient', 'doctor'];
        $rawStatusFilter = $request->query('status');
        $rawTargetRoleFilter = $request->query('target_role');
        $statusFilter = in_array($rawStatusFilter, $allowedStatuses, true) ? $rawStatusFilter : null;
        $targetRoleFilter = in_array($rawTargetRoleFilter, $allowedTargetRoles, true) ? $rawTargetRoleFilter : null;

        $microcheckLogs = ConsultationMicrocheck::query()
            ->with([
                'consultation.patient:id,user_id,first_name,last_name',
                'consultation.doctor:id,name',
            ])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    if (is_numeric($search)) {
                        $subQuery
                            ->orWhereKey((int) $search)
                            ->orWhere('consultation_id', (int) $search);
                    }

                    $subQuery
                        ->orWhere('cycle_key', 'like', "%{$search}%")
                        ->orWhereHas('consultation.patient', function ($patientQuery) use ($search): void {
                            $patientQuery->where(function ($nameQuery) use ($search): void {
                                $nameQuery
                                    ->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%");
                            });
                        })
                        ->orWhereHas('consultation.doctor', fn ($doctorQuery) => $doctorQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when(
                $statusFilter !== null,
                fn ($query) => $query->where('status', $statusFilter)
            )
            ->when(
                $targetRoleFilter !== null,
                fn ($query) => $query->where('target_role', $targetRoleFilter)
            )
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/microcheck-logs', [
            'microcheckLogs' => $microcheckLogs,
            'filters' => [
                'search' => $request->query('search'),
                'status' => $statusFilter,
                'target_role' => $targetRoleFilter,
            ],
            'options' => [
                'statuses' => $allowedStatuses,
                'target_roles' => $allowedTargetRoles,
            ],
        ]);
    }
}
