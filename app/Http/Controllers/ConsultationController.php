<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreConsultationRequest;
use App\Http\Requests\UpdateConsultationRequest;
use App\Models\Consultation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ConsultationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Consultation::class);

        $consultations = Consultation::query()
            ->with(['patient', 'doctor'])
            ->when(! $request->user()->isAdmin(), fn ($q) => $q->where('doctor_id', $request->user()->id))
            ->when($request->patient_id, fn ($q, $id) => $q->where('patient_id', $id))
            ->when($request->doctor_id, fn ($q, $id) => $q->where('doctor_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->orderByDesc('scheduled_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json($consultations);
    }

    public function show(Consultation $consultation): JsonResponse
    {
        $this->authorize('view', $consultation);

        $consultation->load([
            'patient',
            'doctor.doctorProfile',
            'note',
            'vitalSigns',
            'prescriptions',
            'deepfakeScanLogs',
        ]);

        return response()->json($consultation);
    }

    public function store(StoreConsultationRequest $request): JsonResponse
    {
        $this->authorize('create', Consultation::class);

        $data = $request->validated();

        // Generate a unique session token for teleconsultations
        if (($data['type'] ?? 'in_person') === 'teleconsultation') {
            $data['session_token'] = Str::uuid()->toString();
        }

        $consultation = Consultation::create($data);

        return response()->json($consultation->fresh(['patient', 'doctor']), 201);
    }

    public function update(UpdateConsultationRequest $request, Consultation $consultation): JsonResponse
    {
        $this->authorize('update', $consultation);

        $consultation->update($request->validated());

        return response()->json($consultation->fresh(['patient', 'doctor']));
    }

    public function destroy(Consultation $consultation): JsonResponse
    {
        $this->authorize('delete', $consultation);

        $consultation->delete();

        return response()->json(['message' => 'Consultation removed.']);
    }
}
