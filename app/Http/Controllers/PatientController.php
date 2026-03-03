<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Patient::class);

        $patients = Patient::query()
            ->with(['primaryPhoto'])
            ->when(
                $request->search,
                fn ($q, $search) => $q->where(
                    fn ($q) => $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('contact_number', 'like', "%{$search}%")
                )
            )
            ->when(
                $request->gender,
                fn ($q, $gender) => $q->where('gender', $gender)
            )
            ->latest()
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return Inertia::render('patients/patientList', [
            'patients' => $patients,
            'filters' => [
                'search' => $request->search,
                'gender' => $request->gender,
            ],
        ]);
    }

    public function show(Patient $patient): JsonResponse
    {
        $this->authorize('view', $patient);

        $patient->load([
            'user',
            'registeredBy',
            'primaryPhoto',
            'photos',
            'consultations.doctor',
        ]);

        return response()->json($patient);
    }

    public function store(StorePatientRequest $request): JsonResponse
    {
        $this->authorize('create', Patient::class);

        $patient = Patient::create([
            ...$request->validated(),
            'registered_by' => $request->user()->id,
        ]);

        return response()->json($patient->fresh(), 201);
    }

    public function update(UpdatePatientRequest $request, Patient $patient): JsonResponse
    {
        $this->authorize('update', $patient);

        $patient->update($request->validated());

        return response()->json($patient->fresh());
    }

    public function destroy(Patient $patient): JsonResponse
    {
        $this->authorize('delete', $patient);

        $patient->delete();

        return response()->json(['message' => 'Patient deleted.']);
    }
}
