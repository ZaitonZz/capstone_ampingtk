<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdminUserRequest;
use App\Http\Requests\UpdateAdminUserRequest;
use App\Mail\AdminUserTemporaryPasswordMail;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AdminUserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->with(['doctorProfile:id,user_id,specialty,license_number,clinic_name,clinic_address,phone,bio'])
            ->when(
                $request->string('search')->toString(),
                fn ($query, $search) => $query->where(
                    fn ($subQuery) => $subQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                )
            )
            ->when(
                in_array($request->query('role'), ['admin', 'doctor', 'medicalstaff', 'patient'], true),
                fn ($query) => $query->where('role', $request->query('role'))
            )
            ->when(
                in_array($request->query('status'), ['active', 'inactive', 'suspended'], true),
                fn ($query) => $query->where('status', $request->query('status'))
            )
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/users', [
            'users' => $users,
            'filters' => [
                'search' => $request->query('search'),
                'role' => $request->query('role'),
                'status' => $request->query('status'),
            ],
            'options' => [
                'roles' => ['admin', 'doctor', 'medicalstaff', 'patient'],
                'statuses' => ['active', 'inactive', 'suspended'],
            ],
        ]);
    }

    public function store(StoreAdminUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $temporaryPassword = Str::password(16);

        $user = DB::transaction(function () use ($validated, $temporaryPassword): User {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $temporaryPassword,
                'role' => $validated['role'],
                'status' => $validated['status'],
                'must_change_password' => true,
            ]);

            $user->forceFill([
                'email_verified_at' => now(),
            ])->save();

            $this->syncDoctorProfile($user, $validated);

            return $user;
        });

        try {
            Mail::send(new AdminUserTemporaryPasswordMail(
                recipientName: $user->name,
                recipientEmail: $user->email,
                role: $this->displayRole($user->role),
                temporaryPassword: $temporaryPassword,
            ));
        } catch (Throwable $exception) {
            report($exception);

            return back()->with('error', 'User account was created, but temporary credentials email failed to send. Please trigger a password reset manually.');
        }

        return back()->with('success', 'User account created successfully. Temporary credentials were emailed.');
    }

    public function update(UpdateAdminUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        $this->enforceSelfGuardrails($request->user(), $user, $validated);

        DB::transaction(function () use ($user, $validated): void {
            $user->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'role' => $validated['role'],
                'status' => $validated['status'],
            ]);

            $this->syncDoctorProfile($user, $validated);
        });

        return back()->with('success', 'User account updated successfully.');
    }

    private function syncDoctorProfile(User $user, array $validated): void
    {
        if (($validated['role'] ?? null) !== 'doctor') {
            return;
        }

        $doctorProfile = $validated['doctor_profile'] ?? [];

        $user->doctorProfile()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'specialty' => $doctorProfile['specialty'],
                'license_number' => $doctorProfile['license_number'],
                'clinic_name' => $doctorProfile['clinic_name'] ?? null,
                'clinic_address' => $doctorProfile['clinic_address'] ?? null,
                'phone' => $doctorProfile['phone'] ?? null,
                'bio' => $doctorProfile['bio'] ?? null,
            ]
        );
    }

    private function enforceSelfGuardrails(User $actor, User $target, array $validated): void
    {
        if ($actor->id !== $target->id) {
            return;
        }

        if (($validated['role'] ?? null) !== 'admin') {
            throw ValidationException::withMessages([
                'role' => 'Administrators cannot remove their own admin role.',
            ]);
        }

        if (($validated['status'] ?? null) !== 'active') {
            throw ValidationException::withMessages([
                'status' => 'Administrators cannot set their own account to inactive or suspended.',
            ]);
        }
    }

    private function displayRole(string $role): string
    {
        return match ($role) {
            'medicalstaff' => 'Medical Staff',
            'admin' => 'Admin',
            'doctor' => 'Doctor',
            'patient' => 'Patient',
            default => 'User',
        };
    }
}
