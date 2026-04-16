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
        $statusFilter = $request->query('status');
        $targetRoleFilter = $request->query('target_role');

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
                in_array($statusFilter, ['pending', 'claimed', 'completed', 'expired'], true),
                fn ($query) => $query->where('status', $statusFilter)
            )
            ->when(
                in_array($targetRoleFilter, ['patient', 'doctor'], true),
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
                'statuses' => ['pending', 'claimed', 'completed', 'expired'],
                'target_roles' => ['patient', 'doctor'],
            ],
        ]);
    }
}
