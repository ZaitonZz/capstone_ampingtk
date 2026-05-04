<?php

namespace App\Http\Controllers;

use App\Http\Requests\CancelConsultationRequest;
use App\Http\Requests\RescheduleConsultationRequest;
use App\Http\Requests\StoreConsultationRequest;
use App\Http\Requests\UpdateConsultationRequest;
use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;
use App\Services\DoctorDutyAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ConsultationController extends Controller
{
    private function doctorAvailableForApproval(Consultation $consultation): bool
    {
        if ($consultation->doctor_id === null || $consultation->scheduled_at === null) {
            return false;
        }

        return app(DoctorDutyAvailabilityService::class)->isDoctorAvailableAt(
            (int) $consultation->doctor_id,
            $consultation->scheduled_at->toDateTimeString(),
        );
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Consultation::class);

        $user = $request->user();
        $isDoctor = $user->isDoctor();
        $isDoctorDailyView = false;
        $canManageSchedule = $user->isMedicalStaff();

        $consultations = Consultation::query()
            ->with(['patient', 'doctor', 'latestMicrocheck'])
            ->withMin([
                'microchecks as next_microcheck_due_at' => fn ($q) => $q->where('status', 'pending'),
            ], 'scheduled_at')
            ->withAvg([
                'microchecks as avg_microcheck_latency_ms' => fn ($q) => $q->where('status', 'completed'),
            ], 'latency_ms')
            ->when(
                $isDoctor,
                fn ($q) => $q->where('doctor_id', $user->id)
            )
            ->when($request->patient_id, fn ($q, $id) => $q->where('patient_id', $id))
            ->when($request->doctor_id, fn ($q, $id) => $q->where('doctor_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->search, fn ($q, $search) => $q->whereHas('patient', fn ($p) => $p->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")))
            ->orderByDesc('scheduled_at')
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        $consultations->getCollection()->transform(function (Consultation $consultation) {
            $consultation->setAttribute(
                'doctor_available_for_approval',
                $this->doctorAvailableForApproval($consultation),
            );

            return $consultation;
        });

        return Inertia::render('consultations/index', [
            'consultations' => $consultations,
            'filters' => $request->only(['search', 'status', 'type', 'patient_id', 'doctor_id']),
            'can_manage_schedule' => $canManageSchedule,
            'is_doctor_daily_view' => $isDoctorDailyView,
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Consultation::class);

        $scheduledAt = (string) $request->query('scheduled_at', '');
        $availableDoctors = $scheduledAt !== ''
            ? app(DoctorDutyAvailabilityService::class)->availableDoctors($scheduledAt)
            : collect();

        return Inertia::render('consultations/create', [
            'patients' => Patient::query()->orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'doctors' => $availableDoctors,
            'scheduled_at' => $scheduledAt,
        ]);
    }

    public function store(StoreConsultationRequest $request): RedirectResponse
    {
        $this->authorize('create', Consultation::class);

        $data = $request->validated();

        if (($data['type'] ?? 'teleconsultation') === 'teleconsultation') {
            $data['session_token'] = Str::uuid()->toString();
        }

        $consultation = Consultation::create($data);

        $returnTo = $request->query('_return_to');

        if ($returnTo === 'calendar') {
            return redirect()->route('consultations.calendar')
                ->with('success', 'Consultation scheduled.');
        }

        return redirect()->route('consultations.index')
            ->with('success', 'Consultation scheduled.');
    }

    public function show(Consultation $consultation): Response
    {
        $this->authorize('view', $consultation);

        $user = request()->user();
        $canManageSchedule = $user?->isMedicalStaff() ?? false;
        $canJoinSession = $consultation->type === 'teleconsultation'
            && $user !== null
            && ! $user->isMedicalStaff()
            && ($user->isAdmin() || $consultation->doctor_id === $user->id);

        $consultation->load([
            'patient',
            'doctor.doctorProfile',
            'note',
            'vitalSigns',
            'prescriptions',
            'deepfakeScanLogs' => fn ($q) => $q->with('detectedUser:id,name')->latest('scanned_at')->limit(50),
            'deepfakeEscalations' => fn ($q) => $q
                ->with([
                    'triggeredBy:id,name',
                    'resolver:id,name',
                ])
                ->latest('created_at')
                ->limit(20),
            'microchecks' => fn ($q) => $q->latest('scheduled_at')->limit(50),
        ]);

        $consultation->setAttribute(
            'doctor_available_for_approval',
            $this->doctorAvailableForApproval($consultation),
        );

        return Inertia::render('consultations/show', [
            'consultation' => $consultation,
            'permissions' => [
                'can_manage_schedule' => $canManageSchedule,
                'can_join_session' => $canJoinSession,
            ],
        ]);
    }

    public function edit(Consultation $consultation): Response
    {
        $this->authorize('update', $consultation);

        $scheduledAt = $consultation->scheduled_at?->toDateTimeString();
        $availableDoctors = $scheduledAt !== null
            ? app(DoctorDutyAvailabilityService::class)->availableDoctors($scheduledAt)
            : collect();

        return Inertia::render('consultations/edit', [
            'consultation' => $consultation->load(['patient', 'doctor']),
            'patients' => Patient::query()->orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'doctors' => $availableDoctors,
        ]);
    }

    public function update(UpdateConsultationRequest $request, Consultation $consultation): RedirectResponse
    {
        $this->authorize('update', $consultation);

        $consultation->update($request->validated());

        return redirect()->route('consultations.show', $consultation)
            ->with('success', 'Consultation updated.');
    }

    public function destroy(Consultation $consultation): RedirectResponse
    {
        $this->authorize('delete', $consultation);

        $consultation->delete();

        return redirect()->route('consultations.index')
            ->with('success', 'Consultation removed.');
    }

    public function calendar(Request $request): Response
    {
        $this->authorize('viewAny', Consultation::class);

        $user = $request->user();
        $isDoctor = $user->isDoctor();
        $canManageSchedule = $user->isMedicalStaff();

        $rangeStart = $request->query('start');
        $rangeEnd = $request->query('end');

        $calendarRangeStart = $rangeStart && $rangeEnd
            ? Carbon::parse($rangeStart)
            : now()->startOfMonth()->subWeek();

        $calendarRangeEnd = $rangeStart && $rangeEnd
            ? Carbon::parse($rangeEnd)
            : now()->endOfMonth()->addWeek();

        $consultations = Consultation::query()
            ->with(['patient', 'doctor'])
            ->when(
                $isDoctor,
                fn ($q) => $q
                    ->where('doctor_id', $user->id)
                    ->where('status', 'scheduled')
            )
            ->whereNotNull('scheduled_at')
            ->whereBetween('scheduled_at', [$calendarRangeStart, $calendarRangeEnd])
            ->get()
            ->map(fn (Consultation $c) => [
                'id' => $c->id,
                'title' => $c->patient->full_name ?? 'Unknown Patient',
                'start' => $c->scheduled_at?->toIso8601String(),
                'end' => $c->ended_at?->toIso8601String(),
                'extendedProps' => [
                    'status' => $c->status,
                    'type' => $c->type,
                    'chief_complaint' => $c->chief_complaint,
                    'doctor_name' => $c->doctor?->name,
                    'doctor_available_for_approval' => $this->doctorAvailableForApproval($c),
                    'consultation_id' => $c->id,
                ],
            ]);

        return Inertia::render('consultations/calendar', [
            'events' => $consultations,
            'doctors' => $canManageSchedule
                ? []
                : [],
            'patients' => $canManageSchedule
                ? Patient::query()->orderBy('last_name')->get(['id', 'first_name', 'last_name'])
                : [],
            'can_manage_schedule' => $canManageSchedule,
            'is_doctor_daily_view' => $isDoctor,
        ]);
    }

    public function availableDoctors(Request $request, DoctorDutyAvailabilityService $availabilityService): JsonResponse
    {
        $this->authorize('create', Consultation::class);

        $validated = $request->validate([
            'scheduled_at' => ['required', 'date'],
        ]);

        $doctors = $availabilityService->availableDoctors($validated['scheduled_at'])
            ->map(fn (User $doctor) => [
                'id' => $doctor->id,
                'name' => $doctor->name,
                'doctor_profile' => $doctor->doctorProfile
                    ? ['specialty' => $doctor->doctorProfile->specialty]
                    : null,
            ])
            ->values();

        return response()->json([
            'doctors' => $doctors,
        ]);
    }

    public function approve(Consultation $consultation): RedirectResponse
    {
        $this->authorize('update', $consultation);

        abort_unless($consultation->status === Consultation::STATUS_PENDING, 422, 'Only pending consultations can be approved.');

        // Ensure the assigned doctor is on duty for the scheduled time.
        $scheduledAt = $consultation->scheduled_at?->toDateTimeString();
        $doctorId = $consultation->doctor_id;

        if ($doctorId === null || $scheduledAt === null) {
            return redirect()
                ->route('consultations.show', $consultation)
                ->with('error', 'Consultation must have a scheduled time and assigned doctor before approval.');
        }

        if (! app(\App\Services\DoctorDutyAvailabilityService::class)->isDoctorAvailableAt($doctorId, $scheduledAt)) {
            return redirect()
                ->route('consultations.show', $consultation)
                ->with('error', 'Selected doctor is not on duty for the scheduled appointment. Change the assigned doctor before approving.');
        }

        $consultation->update(['status' => Consultation::STATUS_SCHEDULED]);

        return redirect()
            ->route('consultations.show', $consultation)
            ->with('success', 'Appointment approved and scheduled.');
    }

    public function reschedule(RescheduleConsultationRequest $request, Consultation $consultation): RedirectResponse
    {
        $this->authorize('update', $consultation);

        abort_unless(
            in_array($consultation->status, Consultation::RESCHEDULABLE_STATUSES, true),
            422,
            'Only pending or scheduled consultations can be rescheduled.'
        );

        $consultation->update([
            'scheduled_at' => $request->validated('scheduled_at'),
        ]);

        return back()->with('success', 'Consultation schedule updated.');
    }

    public function cancel(CancelConsultationRequest $request, Consultation $consultation): RedirectResponse
    {
        $this->authorize('update', $consultation);

        abort_unless(
            in_array($consultation->status, Consultation::RESCHEDULABLE_STATUSES, true),
            422,
            'Only pending or scheduled consultations can be cancelled.'
        );

        $consultation->update([
            'status' => Consultation::STATUS_CANCELLED,
            'cancellation_reason' => $request->validated('cancellation_reason'),
        ]);

        return back()->with('success', 'Consultation cancelled.');
    }
}
