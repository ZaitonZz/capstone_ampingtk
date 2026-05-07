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

        $startParam = $request->query('start');
        $endParam = $request->query('end');

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
                'duty_date' => $schedule->duty_date?->toDateString(),
                'start_time' => substr((string) $schedule->start_time, 0, 5),
                'end_time' => substr((string) $schedule->end_time, 0, 5),
                'status' => $schedule->status,
                'remarks' => $schedule->remarks,
            ])
            ->values();

        $dutyRequests = DoctorDutyRequest::query()
            ->where('doctor_id', $user->id)
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(fn (DoctorDutyRequest $request): array => [
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
            ])
            ->values();

        return Inertia::render('doctor-duty-calendar/index', [
            'schedules' => $schedules,
            'duty_requests' => $dutyRequests,
            'pending_duty_requests' => $dutyRequests
                ->where('status', DoctorDutyRequest::STATUS_PENDING)
                ->values(),
            'filters' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
        ]);
    }
}