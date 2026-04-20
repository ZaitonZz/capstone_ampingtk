<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDoctorDutyScheduleRequest;
use App\Http\Requests\UpdateDoctorDutyScheduleRequest;
use App\Models\DoctorDutyRequest;
use App\Models\DoctorDutySchedule;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\DoctorDutyScheduleService;

class DoctorDutyScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', DoctorDutySchedule::class);

        $user = $request->user();
        $canManage = $user->isAdmin() || $user->isMedicalStaff();

        $start = Carbon::parse($request->query('start', now()->startOfWeek()->toDateString()))->startOfDay();
        $end = Carbon::parse($request->query('end', now()->endOfWeek()->toDateString()))->endOfDay();

        $schedules = DoctorDutySchedule::query()
            ->with('doctor:id,name')
            ->when(! $canManage, fn ($query) => $query->where('doctor_id', $user->id))
            ->when($canManage && $request->filled('doctor_id'), fn ($query) => $query->where('doctor_id', (int) $request->integer('doctor_id')))
            ->whereBetween('duty_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('duty_date')
            ->orderBy('start_time')
            ->get()
            ->map(fn (DoctorDutySchedule $schedule) => [
                'id' => $schedule->id,
                'doctor_id' => $schedule->doctor_id,
                'doctor_name' => $schedule->doctor?->name,
                'duty_date' => $schedule->duty_date?->toDateString(),
                'start_time' => substr((string) $schedule->start_time, 0, 5),
                'end_time' => substr((string) $schedule->end_time, 0, 5),
                'status' => $schedule->status,
                'remarks' => $schedule->remarks,
            ])
            ->values();

        $events = $schedules
            ->map(fn (array $schedule) => [
                'id' => $schedule['id'],
                'title' => sprintf('%s (%s)', $schedule['doctor_name'] ?? 'Doctor', str($schedule['status'])->replace('_', ' ')->title()),
                'start' => sprintf('%sT%s', $schedule['duty_date'], $schedule['start_time']),
                'end' => sprintf('%sT%s', $schedule['duty_date'], $schedule['end_time']),
                'extendedProps' => $schedule,
            ])
            ->values();

        $doctorRequests = DoctorDutyRequest::query()
            ->with(['doctor:id,name', 'reviewer:id,name'])
            ->when(! $canManage, fn ($query) => $query->where('doctor_id', $user->id))
            ->orderByDesc('created_at')
            ->limit($canManage ? 30 : 20)
            ->get()
            ->map(fn (DoctorDutyRequest $request) => [
                'id' => $request->id,
                'doctor_id' => $request->doctor_id,
                'doctor_name' => $request->doctor?->name,
                'request_type' => $request->request_type,
                'start_date' => $request->start_date?->toDateString(),
                'end_date' => $request->end_date?->toDateString(),
                'remarks' => $request->remarks,
                'status' => $request->status,
                'reviewed_by' => $request->reviewer?->name,
                'reviewed_at' => $request->reviewed_at?->toIso8601String(),
                'reviewer_notes' => $request->reviewer_notes,
                'created_at' => $request->created_at?->toIso8601String(),
            ])
            ->values();

        $pendingDoctorRequests = $canManage
            ? $doctorRequests->filter(fn (array $request) => $request['status'] === DoctorDutyRequest::STATUS_PENDING)->values()
            : collect();

        return Inertia::render('doctor-duty-schedules/index', [
            'schedules' => $schedules,
            'events' => $events,
            'can_manage_schedule' => $canManage,
            'can_submit_duty_requests' => $user->isDoctor(),
            'can_review_duty_requests' => $canManage,
            'duty_requests' => $doctorRequests,
            'pending_duty_requests' => $pendingDoctorRequests,
            'filters' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'doctor_id' => $request->query('doctor_id', ''),
            ],
            'doctors' => $canManage
                ? User::query()->where('role', 'doctor')->orderBy('name')->get(['id', 'name'])
                : collect([
                    ['id' => $user->id, 'name' => $user->name],
                ]),
        ]);
    }

    public function store(StoreDoctorDutyScheduleRequest $request, DoctorDutyScheduleService $service): RedirectResponse
    {
        $this->authorize('create', DoctorDutySchedule::class);

        $entries = $service->expandEntries($request->validated());

        DB::transaction(function () use ($entries): void {
            foreach ($entries as $entry) {
                DoctorDutySchedule::query()->create($entry);
            }
        });

        $createdCount = count($entries);
        $message = $createdCount > 1
            ? sprintf('%d doctor duty schedules created.', $createdCount)
            : 'Doctor duty schedule created.';

        return back()->with('success', $message);
    }

    public function update(UpdateDoctorDutyScheduleRequest $request, DoctorDutySchedule $doctorDutySchedule): RedirectResponse
    {
        $this->authorize('update', $doctorDutySchedule);

        $doctorDutySchedule->update($request->validated());

        return back()->with('success', 'Doctor duty schedule updated.');
    }

    public function destroy(DoctorDutySchedule $doctorDutySchedule): RedirectResponse
    {
        $this->authorize('delete', $doctorDutySchedule);

        $doctorDutySchedule->delete();

        return back()->with('success', 'Doctor duty schedule deleted.');
    }
}
