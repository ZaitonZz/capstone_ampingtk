<?php

use App\Http\Controllers\ConsultationController;
use App\Http\Controllers\DeepfakeScanLogController;
use App\Http\Controllers\DoctorDutyRequestController;
use App\Http\Controllers\DoctorDutyScheduleController;
use App\Http\Controllers\DoctorPhotoController;
use App\Http\Controllers\DoctorProfileController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientNoteController;
use App\Http\Controllers\PatientPhotoController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\VitalSignController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'medical.staff'])->group(function () {

    // ── Patients ──────────────────────────────────────────────────────────────
    Route::prefix('staff')->group(function () {
        Route::get('patients', [PatientController::class, 'index'])->name('patients.index');
        Route::get('patients/create', [PatientController::class, 'create'])->name('patients.create');
        Route::post('patients', [PatientController::class, 'store'])->name('patients.store');
        Route::get('patients/{patient}', [PatientController::class, 'show'])->name('patients.show');
        Route::patch('patients/{patient}', [PatientController::class, 'update'])->name('patients.update');
        Route::delete('patients/{patient}', [PatientController::class, 'destroy'])->name('patients.destroy');

        Route::prefix('patients/{patient}')->name('patients.')->group(function () {
            Route::apiResource('photos', PatientPhotoController::class)
                ->only(['index', 'store', 'destroy']);
        });
    });

    // ── Consultations ─────────────────────────────────────────────────────────
    // Extra named routes MUST be declared before Route::resource to prevent
    // 'calendar' and 'approve' being swallowed by the {consultation} wildcard.
    Route::get('consultations/calendar', [ConsultationController::class, 'calendar'])->name('consultations.calendar');
    Route::get('consultations/available-doctors', [ConsultationController::class, 'availableDoctors'])->name('consultations.available-doctors');
    Route::patch('consultations/{consultation}/approve', [ConsultationController::class, 'approve'])->name('consultations.approve');
    Route::patch('consultations/{consultation}/reschedule', [ConsultationController::class, 'reschedule'])->name('consultations.reschedule');
    Route::patch('consultations/{consultation}/cancel', [ConsultationController::class, 'cancel'])->name('consultations.cancel');
    Route::resource('consultations', ConsultationController::class);

    Route::get('doctor-duty-schedules', [DoctorDutyScheduleController::class, 'index'])->name('doctor-duty-schedules.index');
    Route::post('doctor-duty-schedules', [DoctorDutyScheduleController::class, 'store'])->name('doctor-duty-schedules.store');
    Route::patch('doctor-duty-schedules/{doctorDutySchedule}', [DoctorDutyScheduleController::class, 'update'])->name('doctor-duty-schedules.update');
    Route::delete('doctor-duty-schedules/{doctorDutySchedule}', [DoctorDutyScheduleController::class, 'destroy'])->name('doctor-duty-schedules.destroy');
    Route::post('doctor-duty-requests', [DoctorDutyRequestController::class, 'store'])->name('doctor-duty-requests.store');
    Route::patch('doctor-duty-requests/{doctorDutyRequest}/review', [DoctorDutyRequestController::class, 'review'])->name('doctor-duty-requests.review');

    Route::prefix('consultations/{consultation}')->name('consultations.')->scopeBindings()->group(function () {
        Route::middleware('doctor.or.admin')->group(function () {
            // SOAP Notes (one per consultation, upsert via store)
            Route::get('note', [PatientNoteController::class, 'show'])->name('note.show');
            Route::post('note', [PatientNoteController::class, 'store'])->name('note.store');
            Route::patch('note', [PatientNoteController::class, 'update'])->name('note.update');

            // Vital Signs (one set per consultation, upsert via store)
            Route::get('vitals', [VitalSignController::class, 'show'])->name('vitals.show');
            Route::post('vitals', [VitalSignController::class, 'store'])->name('vitals.store');

            // Prescriptions (many per consultation)
            Route::apiResource('prescriptions', PrescriptionController::class)
                ->scoped()
                ->only(['index', 'store', 'update', 'destroy']);
        });

        // Deepfake Scan Logs
        Route::get('deepfake-scans', [DeepfakeScanLogController::class, 'index'])->name('deepfake-scans.index');
        Route::post('deepfake-scans', [DeepfakeScanLogController::class, 'store'])->name('deepfake-scans.store');
        Route::get('deepfake-scans/{deepfakeScanLog}', [DeepfakeScanLogController::class, 'show'])->name('deepfake-scans.show');
        Route::patch('deepfake-scans/{deepfakeScanLog}', [DeepfakeScanLogController::class, 'update'])->name('deepfake-scans.update');
    });

    // ── Doctor Profile (Doctor/Admin only) ───────────────────────────────────
    Route::middleware('doctor.or.admin')->group(function () {
        Route::get('doctor/profile', [DoctorProfileController::class, 'show'])->name('doctor.profile.show');
        Route::post('doctor/profile', [DoctorProfileController::class, 'upsert'])->name('doctor.profile.upsert');
        Route::post('doctor/profile/photo', [DoctorPhotoController::class, 'store'])->name('doctor.profile.photo.store');
    });
});
