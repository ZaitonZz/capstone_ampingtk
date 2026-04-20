<?php

namespace App\Http\Controllers;

use App\Http\Requests\CancelConsultationRequest;
use App\Http\Requests\RescheduleConsultationRequest;
use App\Http\Requests\StoreConsultationRequest;
use App\Http\Requests\UpdateConsultationRequest;
use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ConsultationController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Consultation::class);

        $isDoctor = $request->user()->isDoctor();

        $consultations = Consultation::query()
            ->with(['patient', 'doctor', 'preferredDoctor', 'latestMicrocheck'])
            ->withMin([
                'microchecks as next_microcheck_due_at' => fn ($q) => $q->where('status', 'pending'),
            ], 'scheduled_at')
            ->withAvg([
                'microchecks as avg_microcheck_latency_ms' => fn ($q) => $q->where('status', 'completed'),
            ], 'latency_ms')
            ->when(
                ! $request->user()->isAdmin() && ! $request->user()->isMedicalStaff(),
                fn ($q) => $q->where('doctor_id', $request->user()->id)
            )
            ->when($request->patient_id, fn ($q, $id) => $q->where('patient_id', $id))
            ->when($request->doctor_id, fn ($q, $id) => $q->where('doctor_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->search, fn ($q, $search) => $q->whereHas('patient', fn ($p) => $p->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")))
            ->orderByDesc('scheduled_at')
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return Inertia::render('consultations/index', [
            'consultations' => $consultations,
            'filters' => $request->only(['search', 'status', 'type', 'patient_id', 'doctor_id']),
            'doctor_daily_schedule' => $isDoctor
                ? Consultation::query()
                    ->with(['patient:id,first_name,last_name', 'doctor:id,name'])
                    ->where('doctor_id', $request->user()->id)
                    ->whereDate('scheduled_at', today())
                    ->orderBy('scheduled_at')
                    ->get(['id', 'patient_id', 'doctor_id', 'type', 'status', 'scheduled_at', 'chief_complaint'])
                : [],
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Consultation::class);

        $referenceAt = $request->filled('scheduled_at')
            ? Carbon::parse((string) $request->query('scheduled_at'))
            : now();

        return Inertia::render('consultations/create', [
            'patients' => Patient::query()->orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'doctors' => $this->onDutyDoctorQuery($referenceAt)->get(['id', 'name']),
            'scheduled_at' => $request->query('scheduled_at', ''),
        ]);
    }

    public function store(StoreConsultationRequest $request): RedirectResponse
    {
        $this->authorize('create', Consultation::class);

        $data = $request->validated();
        $scheduleAt = filled($data['scheduled_at'] ?? null)
            ? Carbon::parse((string) $data['scheduled_at'])
            : now();

        if (! $this->doctorIsOnDutyForSchedule((int) $data['doctor_id'], $scheduleAt)) {
            throw ValidationException::withMessages([
                'doctor_id' => 'Selected doctor is not on duty for the requested schedule.',
            ]);
        }

        if (($data['type'] ?? 'in_person') === 'teleconsultation') {
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

        $consultation->load([
            'patient',
            'doctor.doctorProfile',
            'preferredDoctor.doctorProfile',
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

        return Inertia::render('consultations/show', [
            'consultation' => $consultation,
        ]);
    }

    public function edit(Consultation $consultation): Response
    {
        $this->authorize('update', $consultation);

        $referenceAt = $consultation->scheduled_at ?? now();

        return Inertia::render('consultations/edit', [
            'consultation' => $consultation->load(['patient', 'doctor', 'preferredDoctor']),
            'patients' => Patient::query()->orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'doctors' => $this->onDutyDoctorQuery($referenceAt)->get(['id', 'name']),
        ]);
    }

    public function update(UpdateConsultationRequest $request, Consultation $consultation): RedirectResponse
    {
        $this->authorize('update', $consultation);

        $data = $request->validated();
        $selectedDoctorId = (int) ($data['doctor_id'] ?? $consultation->doctor_id);
        $scheduleAt = filled($data['scheduled_at'] ?? null)
            ? Carbon::parse((string) $data['scheduled_at'])
            : ($consultation->scheduled_at ?? now());

        if (! $this->doctorIsOnDutyForSchedule($selectedDoctorId, $scheduleAt)) {
            throw ValidationException::withMessages([
                'doctor_id' => 'Selected doctor is not on duty for the requested schedule.',
            ]);
        }

        $consultation->update($data);

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

        $referenceAt = now();

        $consultations = Consultation::query()
            ->with(['patient', 'doctor'])
            ->when(
                ! $request->user()->isAdmin() && ! $request->user()->isMedicalStaff(),
                fn ($q) => $q->where('doctor_id', $request->user()->id)
            )
            ->whereNotNull('scheduled_at')
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
                    'consultation_id' => $c->id,
                ],
            ]);

        return Inertia::render('consultations/calendar', [
            'events' => $consultations,
            'doctors' => $this->onDutyDoctorQuery($referenceAt)->get(['id', 'name']),
            'patients' => Patient::query()->orderBy('last_name')->get(['id', 'first_name', 'last_name']),
        ]);
    }

    public function approve(Consultation $consultation): RedirectResponse
    {
        $this->authorize('update', $consultation);

        abort_unless($consultation->status === 'pending', 422, 'Only pending consultations can be approved.');

        $consultation->update(['status' => 'scheduled']);

        return back()->with('success', 'Appointment approved and scheduled.');
    }

    public function reschedule(RescheduleConsultationRequest $request, Consultation $consultation): RedirectResponse
    {
        $this->authorize('update', $consultation);

        $scheduleAt = Carbon::parse((string) $request->validated('scheduled_at'));

        if (! $this->doctorIsOnDutyForSchedule((int) $consultation->doctor_id, $scheduleAt)) {
            throw ValidationException::withMessages([
                'scheduled_at' => 'The assigned doctor is not on duty for this schedule. Please reassign first.',
            ]);
        }

        abort_unless(
            in_array($consultation->status, ['pending', 'scheduled'], true),
            422,
            'Only pending or scheduled consultations can be rescheduled.'
        );

        $consultation->update([
            'scheduled_at' => $scheduleAt,
        ]);

        return back()->with('success', 'Consultation schedule updated.');
    }

    public function cancel(CancelConsultationRequest $request, Consultation $consultation): RedirectResponse
    {
        $this->authorize('update', $consultation);

        abort_unless(
            in_array($consultation->status, ['pending', 'scheduled'], true),
            422,
            'Only pending or scheduled consultations can be cancelled.'
        );

        $consultation->update([
            'status' => 'cancelled',
            'cancellation_reason' => $request->validated('cancellation_reason'),
        ]);

        return back()->with('success', 'Consultation cancelled.');
    }

    private function onDutyDoctorQuery(CarbonInterface $referenceAt): Builder
    {
        $dayStart = $referenceAt->copy()->startOfDay();
        $dayEnd = $referenceAt->copy()->endOfDay();
        $weekStart = $referenceAt->copy()->startOfWeek();
        $weekEnd = $referenceAt->copy()->endOfWeek();
        $activeDutyStatuses = ['pending', 'scheduled', 'ongoing', 'paused'];

        return User::query()
            ->where('role', 'doctor')
            ->with('doctorProfile')
            ->withExists([
                'consultations as on_duty_today' => fn ($q) => $q
                    ->whereIn('status', $activeDutyStatuses)
                    ->whereBetween('scheduled_at', [$dayStart, $dayEnd]),
                'consultations as on_duty_this_week' => fn ($q) => $q
                    ->whereIn('status', $activeDutyStatuses)
                    ->whereBetween('scheduled_at', [$weekStart, $weekEnd]),
            ])
            ->orderBy('name');
    }

    private function doctorIsOnDutyForSchedule(int $doctorId, CarbonInterface $scheduleAt): bool
    {
        return $this->onDutyDoctorQuery($scheduleAt)
            ->whereKey($doctorId)
            ->exists();
    }
}
