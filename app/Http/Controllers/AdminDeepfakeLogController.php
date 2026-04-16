<?php

namespace App\Http\Controllers;

use App\Models\DeepfakeScanLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDeepfakeLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $resultFilter = $request->query('result');
        $resultFilter = in_array($resultFilter, ['real', 'fake', 'inconclusive'], true) ? $resultFilter : null;
        $flaggedFilter = $request->query('flagged');
        $flaggedFilter = in_array($flaggedFilter, ['flagged', 'unflagged'], true) ? $flaggedFilter : null;

        $deepfakeLogs = DeepfakeScanLog::query()
            ->with([
                'consultation.patient:id,user_id,first_name,last_name',
                'consultation.doctor:id,name',
                'microcheck:id,consultation_id,target_role,status,scheduled_at,completed_at',
                'detectedUser:id,name',
                'reviewer:id,name',
            ])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    if (is_numeric($search)) {
                        $subQuery
                            ->orWhereKey((int) $search)
                            ->orWhere('consultation_id', (int) $search)
                            ->orWhere('microcheck_id', (int) $search)
                            ->orWhere('frame_number', (int) $search);
                    }

                    $subQuery
                        ->orWhere('model_version', 'like', "%{$search}%")
                        ->orWhere('verified_role', 'like', "%{$search}%")
                        ->orWhereHas('consultation.patient', function ($patientQuery) use ($search): void {
                            $patientQuery->where(function ($nameQuery) use ($search): void {
                                $nameQuery
                                    ->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%");
                            });
                        })
                        ->orWhereHas('consultation.doctor', fn ($doctorQuery) => $doctorQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('detectedUser', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('reviewer', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('microcheck', fn ($microcheckQuery) => $microcheckQuery->where('cycle_key', 'like', "%{$search}%"));
                });
            })
            ->when(
                in_array($resultFilter, ['real', 'fake', 'inconclusive'], true),
                fn ($query) => $query->where('result', $resultFilter)
            )
            ->when(
                $flaggedFilter === 'flagged',
                fn ($query) => $query->where('flagged', true)
            )
            ->when(
                $flaggedFilter === 'unflagged',
                fn ($query) => $query->where('flagged', false)
            )
            ->latest('scanned_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/deepfake-logs', [
            'deepfakeLogs' => $deepfakeLogs,
            'filters' => [
                'search' => $request->query('search'),
                'result' => $resultFilter,
                'flagged' => $flaggedFilter,
            ],
            'options' => [
                'results' => ['real', 'fake', 'inconclusive'],
                'flagged_states' => ['flagged', 'unflagged'],
            ],
        ]);
    }
}
