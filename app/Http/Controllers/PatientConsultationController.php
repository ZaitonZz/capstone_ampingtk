<?php

namespace App\Http\Controllers;

use App\Http\Requests\RequestAppointmentRequest;
use App\Models\Consultation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\DoctorDutyAvailabilityService;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PatientConsultationController extends Controller
{
    public function index(Request $request): Response
    {
        $patient = $request->user()->patientProfile;

        abort_unless($patient !== null, 403, 'Patient profile not found.');

        $perPage = max(1, min(100, $request->integer('per_page', 15)));

        $consultations = Consultation::query()
            ->with(['doctor' => fn ($q) => $q->select('id', 'name')])
            ->where('patient_id', $patient->id)
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->orderByDesc('scheduled_at')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('patient/consultations/index', [
            'consultations' => $consultations,
            'filters' => $request->only(['status', 'type']),
        ]);
    }

    public function show(Consultation $consultation): Response
    {
        $this->authorize('view', $consultation);

        $consultation->load([
            'patient',
            'doctor' => fn ($q) => $q->select('id', 'name')
                ->with(['doctorProfile' => fn ($q) => $q->select('user_id', 'specialty')]),
            'prescriptions',
            'vitalSigns',
        ]);

        return Inertia::render('patient/consultations/show', [
            'consultation' => $consultation,
        ]);
    }

    public function calendar(Request $request): Response
    {
        $patient = $request->user()->patientProfile;

        abort_unless($patient !== null, 403, 'Patient profile not found.');

        $consultations = Consultation::query()
            ->with([
                'doctor' => fn ($q) => $q->select('id', 'name')
                    ->with(['doctorProfile' => fn ($q) => $q->select('user_id', 'specialty')]),
            ])
            ->where('patient_id', $patient->id)
            ->whereNotNull('scheduled_at')
            ->get()
            ->map(fn (Consultation $c) => [
                'id' => $c->id,
                'title' => $c->doctor?->name ?? 'Doctor',
                'start' => $c->scheduled_at?->toIso8601String(),
                'end' => $c->ended_at?->toIso8601String(),
                'extendedProps' => [
                    'consultation_id' => $c->id,
                    'status' => $c->status,
                    'type' => $c->type,
                    'chief_complaint' => $c->chief_complaint,
                    'doctor_name' => $c->doctor?->name,
                    'specialty' => $c->doctor?->doctorProfile?->specialty,
                ],
            ]);

        return Inertia::render('patient/consultations/calendar', [
            'events' => $consultations,
            'doctors' => [],
        ]);
    }

    public function availableDoctors(Request $request, DoctorDutyAvailabilityService $availabilityService): JsonResponse
    {
        $validated = $request->validate([
            'scheduled_at' => ['required', 'date'],
        ]);

        $doctors = $availabilityService->availableDoctors($validated['scheduled_at'])
            ->map(fn ($doctor) => [
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

    public function store(RequestAppointmentRequest $request): RedirectResponse
    {
        $patient = $request->user()->patientProfile;

        abort_unless($patient !== null, 403, 'Patient profile not found.');

        $data = $request->validated();

        $data['patient_id'] = $patient->id;
        $data['status'] = 'pending';

        if ($data['type'] === 'teleconsultation') {
            $data['session_token'] = Str::uuid()->toString();
        }

        Consultation::create($data);

        return back()->with('success', 'Appointment request submitted. You will be notified once it is confirmed.');
    }
}
