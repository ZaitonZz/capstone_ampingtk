<?php

use App\Http\Controllers\ConsultationConsentController;
use App\Http\Controllers\ConsultationLiveKitController;
use App\Http\Controllers\ConsultationLiveKitWebhookController;
use App\Http\Controllers\ConsultationLobbyController;
use App\Http\Controllers\ConsultationSessionController;
use App\Http\Controllers\PatientConsultationController;
use App\Http\Controllers\PipelineRoomsController;
use App\Http\Controllers\PipelineScanResultController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::middleware(['auth'])->group(function () {
    Route::prefix('consultations/{consultation}')->name('consultations.')->group(function () {
        Route::get('consent', [ConsultationConsentController::class, 'show'])->name('consent.show');
        Route::post('consent', [ConsultationConsentController::class, 'store'])->name('consent.store');
        Route::get('lobby', [ConsultationLobbyController::class, 'show'])->name('lobby.show');
        Route::get('session', [ConsultationSessionController::class, 'show'])->name('session.show');
        Route::post('livekit/connect', [ConsultationLiveKitController::class, 'connect'])->name('livekit.connect');
    });
});

// ── Patient-facing routes ─────────────────────────────────────────────────────
Route::middleware(['auth', 'patient'])->group(function () {
    Route::get('patient/consultations/calendar', [PatientConsultationController::class, 'calendar'])
        ->name('patient.consultations.calendar');
    Route::post('patient/consultations/request', [PatientConsultationController::class, 'store'])
        ->name('patient.consultations.request');
});

// ── LiveKit server-to-server webhook (CSRF-exempt, signature-verified) ────────
Route::post('livekit/webhook', [ConsultationLiveKitWebhookController::class, 'handle'])
    ->name('livekit.webhook');

// ── Internal pipeline API (CSRF-exempt, HMAC signature-verified) ─────────────
Route::prefix('internal/pipeline')
    ->name('pipeline.')
    ->middleware('pipeline.internal')
    ->group(function () {
        Route::get('rooms', [PipelineRoomsController::class, 'index'])->name('rooms');
        Route::post('scan-results', [PipelineScanResultController::class, 'store'])->name('scan-results.store');
    });

// ── Agent Testing Endpoints ──────────────────────────────────────────
Route::post('api/frame-results', [\App\Http\Controllers\AgentTestController::class, 'storeResult'])->name('agent.store-result');
Route::get('test-agent-verify', [\App\Http\Controllers\AgentTestController::class, 'verifyPage'])->name('agent.verify');

require __DIR__.'/settings.php';
require __DIR__.'/emr.php';
