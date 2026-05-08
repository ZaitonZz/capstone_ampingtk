<?php

namespace App\Http\Controllers;

use App\Models\DoctorDutyRequest;
use App\Models\DoctorDutySchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DoctorDutyCalendarController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user?->isDoctor(), 403, 'Access restricted to doctors.');

        $validated = $request->validate([
            'start' => ['nullable', 'date_format:Y-m-d'],
            'end' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $startParam = $validated['start'] ?? null;
        $endParam = $validated['end'] ?? null;

        $start = filled($startParam)
            ? Carbon::parse((string) $startParam)->startOfDay()
            : now()->startOfMonth()->startOfDay();

        $end = filled($endParam)
            ? Carbon::parse((string) $endParam)->endOfDay()
            : now()->endOfMonth()->endOfDay();

        $schedules = DoctorDutySchedule::query()
            ->where('doctor_id', $user->id)
            ->whereBetween('duty_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('duty_date')
            ->orderBy('start_time')
            ->get()
            ->map(fn (DoctorDutySchedule $schedule): array => [
                'id' => $schedule->id,
                'doctor_id' => $schedule->doctor_id,
                'date' => $schedule->duty_date?->toDateString(),
                'start_time' => substr((string) $schedule->start_time, 0, 5),
                'end_time' => substr((string) $schedule->end_time, 0, 5),
                'status' => $schedule->status,
                'remarks' => $schedule->remarks,
            ])
            ->values();

        $mapDutyRequest = fn (DoctorDutyRequest $request): array => [
            'id' => $request->id,
            'doctor_id' => $request->doctor_id,
            'request_type' => $request->request_type,
            'start_date' => $request->start_date?->toDateString(),
            'end_date' => $request->end_date?->toDateString(),
            'remarks' => $request->remarks,
            'status' => $request->status,
            'reviewed_at' => $request->reviewed_at?->toIso8601String(),
            'reviewer_notes' => $request->reviewer_notes,
            'created_at' => $request->created_at?->toIso8601String(),
        ];

        $historyPaginator = DoctorDutyRequest::query()
            ->where('doctor_id', $user->id)
            ->latest('created_at')
            ->paginate(10, ['*'], 'history_page')
            ->withQueryString();

        $pendingPaginator = DoctorDutyRequest::query()
            ->where('doctor_id', $user->id)
            ->where('status', DoctorDutyRequest::STATUS_PENDING)
            ->latest('created_at')
            ->paginate(10, ['*'], 'pending_page')
            ->withQueryString();

        return Inertia::render('doctor-duty-calendar/index', [
            'schedules' => $schedules,
            'duty_requests' => [
                'data' => collect($historyPaginator->items())->map($mapDutyRequest)->values(),
                'meta' => [
                    'current_page' => $historyPaginator->currentPage(),
                    'last_page' => $historyPaginator->lastPage(),
                    'per_page' => $historyPaginator->perPage(),
                    'total' => $historyPaginator->total(),
                ],
            ],
            'pending_duty_requests' => [
                'data' => collect($pendingPaginator->items())->map($mapDutyRequest)->values(),
                'meta' => [
                    'current_page' => $pendingPaginator->currentPage(),
                    'last_page' => $pendingPaginator->lastPage(),
                    'per_page' => $pendingPaginator->perPage(),
                    'total' => $pendingPaginator->total(),
                ],
            ],
            'filters' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
        ]);
    }
}
