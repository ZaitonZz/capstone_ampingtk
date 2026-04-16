<?php

use App\Http\Middleware\EnsureActiveUserStatus;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureDoctor;
use App\Http\Middleware\EnsureDoctorOrAdmin;
use App\Http\Middleware\EnsureMedicalStaff;
use App\Http\Middleware\EnsurePasswordChangeRequired;
use App\Http\Middleware\EnsurePatient;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireOtpVerification;
use App\Http\Middleware\VerifyPipelineSignature;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->validateCsrfTokens(except: [
            'livekit/webhook',
            'internal/pipeline/*',
            'api/frame-results',
        ]);

        $middleware->alias([
            'medical.staff' => EnsureMedicalStaff::class,
            'patient' => EnsurePatient::class,
            'doctor' => EnsureDoctor::class,
            'admin' => EnsureAdmin::class,
            'doctor.or.admin' => EnsureDoctorOrAdmin::class,
            'require-otp' => RequireOtpVerification::class,
            'pipeline.internal' => VerifyPipelineSignature::class,
            'active.user' => EnsureActiveUserStatus::class,
            'password.change.required' => EnsurePasswordChangeRequired::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            EnsureActiveUserStatus::class,
            EnsurePasswordChangeRequired::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
