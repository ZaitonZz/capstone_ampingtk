<?php

use App\Http\Controllers\ConsultationController;
use App\Http\Controllers\DeepfakeScanLogController;
use App\Http\Controllers\DoctorProfileController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientNoteController;
use App\Http\Controllers\PatientPhotoController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\VitalSignController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'medical.staff'])->group(function () {

    // ── Patients ──────────────────────────────────────────────────────────────
    Route::apiResource('patients', PatientController::class);

    Route::prefix('patients/{patient}')->name('patients.')->group(function () {
        Route::apiResource('photos', PatientPhotoController::class)
            ->only(['index', 'store', 'destroy']);
    });

    // ── Consultations ─────────────────────────────────────────────────────────
    // Extra named routes MUST be declared before Route::resource to prevent
    // 'calendar' and 'approve' being swallowed by the {consultation} wildcard.
    Route::get('consultations/calendar', [ConsultationController::class, 'calendar'])->name('consultations.calendar');
    Route::patch('consultations/{consultation}/approve', [ConsultationController::class, 'approve'])->name('consultations.approve');
    Route::resource('consultations', ConsultationController::class);

    Route::prefix('consultations/{consultation}')->name('consultations.')->group(function () {

        // SOAP Notes (one per consultation, upsert via store)
        Route::get('note', [PatientNoteController::class, 'show'])->name('note.show');
        Route::post('note', [PatientNoteController::class, 'store'])->name('note.store');
        Route::patch('note', [PatientNoteController::class, 'update'])->name('note.update');

        // Vital Signs (one set per consultation, upsert via store)
        Route::get('vitals', [VitalSignController::class, 'show'])->name('vitals.show');
        Route::post('vitals', [VitalSignController::class, 'store'])->name('vitals.store');

        // Prescriptions (many per consultation)
        Route::apiResource('prescriptions', PrescriptionController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        // Deepfake Scan Logs
        Route::get('deepfake-scans', [DeepfakeScanLogController::class, 'index'])->name('deepfake-scans.index');
        Route::post('deepfake-scans', [DeepfakeScanLogController::class, 'store'])->name('deepfake-scans.store');
        Route::get('deepfake-scans/{log}', [DeepfakeScanLogController::class, 'show'])->name('deepfake-scans.show');
        Route::patch('deepfake-scans/{log}', [DeepfakeScanLogController::class, 'update'])->name('deepfake-scans.update');
    });

    // ── Doctor Profile ────────────────────────────────────────────────────────
    Route::get('doctor/profile', [DoctorProfileController::class, 'show'])->name('doctor.profile.show');
    Route::post('doctor/profile', [DoctorProfileController::class, 'upsert'])->name('doctor.profile.upsert');
});
