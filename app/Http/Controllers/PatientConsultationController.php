<?php

namespace App\Http\Controllers;

use App\Http\Requests\RequestAppointmentRequest;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PatientConsultationController extends Controller
{
    public function index(Request $request): Response
    {
        $patient = $request->user()->patientProfile;

        abort_unless($patient !== null, 403, 'Patient profile not found.');

        $consultations = Consultation::query()
            ->with(['doctor'])
            ->where('patient_id', $patient->id)
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->orderByDesc('scheduled_at')
            ->paginate($request->integer('per_page', 15))
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
            'doctor.doctorProfile',
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
            'doctors' => User::query()
                ->where('role', 'doctor')
                ->with(['doctorProfile' => fn ($q) => $q->select('user_id', 'specialty')])
                ->orderBy('name')
                ->get(['id', 'name']),
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
