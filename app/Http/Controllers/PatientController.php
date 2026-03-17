<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    public function index(Request $request): Response|JsonResponse
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

        // Return JSON for API/test requests
        if ($request->expectsJson()) {
            return response()->json($patients);
        }

        // Return Inertia for browser requests
        return Inertia::render('patients/patientList', [
            'patients' => $patients,
            'filters' => [
                'search' => $request->search,
                'gender' => $request->gender,
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Patient::class);

        return Inertia::render('staff/patients/create');
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

    public function store(StorePatientRequest $request): JsonResponse|RedirectResponse
    {
        $this->authorize('create', Patient::class);

        $validated = $request->validated();

        $profilePhotoPath = null;
        if ($request->hasFile('profile_photo')) {
            $profilePhotoPath = $request->file('profile_photo')->store('patients', 'public');
        }

        // Auto-generate user account if email is provided and no user_id
        $userId = null;
        if (($validated['email'] ?? null) && ! ($validated['user_id'] ?? null)) {
            $userId = $this->createPatientUser(
                $validated['first_name'],
                $validated['last_name'],
                $validated['email']
            );
        }

        $phone = $validated['phone'] ?? null;

        $patientData = [
            ...$validated,
            'user_id' => $userId,
            'contact_number' => $validated['contact_number'] ?? $phone,
            'profile_photo_path' => $profilePhotoPath,
            'gender' => $validated['gender'] ?? 'other',
            'registered_by' => $request->user()->id,
        ];

        unset($patientData['profile_photo']);

        $patient = Patient::create($patientData);

        // Return JSON for API requests, redirect for browser requests
        if ($request->expectsJson()) {
            return response()->json($patient->fresh(), 201);
        }

        return redirect()->route('patients.index')
            ->with('success', 'Patient created successfully. User account auto-generated.');
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

    /**
     * Auto-create a user account for a newly registered patient.
     *
     * @return int User ID
     */
    protected function createPatientUser(string $firstName, string $lastName, string $email): int
    {
        $user = User::create([
            'name' => trim("{$firstName} {$lastName}"),
            'email' => $email,
            'password' => bcrypt('password'),
            'role' => 'patient',
        ]);

        return $user->id;
    }
}
