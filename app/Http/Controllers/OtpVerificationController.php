<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class OtpVerificationController extends Controller
{
    /**
     * Verify the OTP code submitted by the user
     *
     * Development mode: Uses fixed OTP "123456" generated and stored in session via resend()
     */
    public function verify(Request $request)
    {
        // Validate the OTP code format
        $validated = $request->validate([
            'otp_code' => 'required|string|regex:/^\d{6}$/',
        ], [
            'otp_code.required' => 'Verification code is required',
            'otp_code.regex' => 'Verification code must be exactly 6 digits',
        ]);

        // Rate limiting for OTP verification attempts
        $throttleKey = 'otp-verify:' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            throw ValidationException::withMessages([
                'otp_code' => 'Too many verification attempts. Please try again later.',
            ]);
        }

        // Get OTP from session
        $storedOtp = session('otp_code');

        // Check if OTP is missing (expired or invalid)
        if (is_null($storedOtp)) {
            RateLimiter::hit($throttleKey);
            throw ValidationException::withMessages([
                'otp_code' => 'Verification code has expired or is invalid. Please request a new code.',
            ]);
        }

        // Compare OTP codes
        if ($storedOtp !== $validated['otp_code']) {
            RateLimiter::hit($throttleKey);
            throw ValidationException::withMessages([
                'otp_code' => 'Invalid verification code.',
            ]);
        }

        // OTP is valid - clear rate limiter and session
        RateLimiter::clear($throttleKey);
        session()->forget('otp_code');

        // Mark user as OTP verified
        session(['otp_verified' => true]);

        // Get authenticated user's role and determine redirect URL
        $user = auth()->user();
        $redirectUrl = match ($user->role) {
            'doctor' => route('doctor.dashboard'),
            'patient' => route('patient.dashboard'),
            'admin' => route('admin.dashboard'),
            default => route('dashboard'),
        };

        // Return JSON response with redirect URL for fetch-based navigation
        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'redirect_url' => $redirectUrl,
                'message' => 'OTP verified successfully',
            ]);
        }

        // Fallback to redirect for traditional form submissions
        return redirect($redirectUrl);
    }

    /**
     * Resend OTP code to user's email or phone
     *
     * Development mode: Generates fixed OTP "123456" and stores in session
     */
    public function resend(Request $request)
    {
        // Rate limiting for resend attempts
        $throttleKey = 'otp-resend:' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            throw ValidationException::withMessages([
                'message' => 'Too many resend attempts. Please try again in a few minutes.',
            ]);
        }

        // Development mode: Use fixed OTP for testing
        $otp = '123456';

        // Store OTP in session for verification
        session(['otp_code' => $otp]);

        // Store OTP generation timestamp for timer persistence
        session(['otp_generated_at' => now()->timestamp]);

        // Log OTP for development/debugging
        logger('OTP test code: ' . $otp);

        // Increment rate limiter on successful resend
        RateLimiter::hit($throttleKey);

        return response()->json([
            'message' => 'Verification code sent successfully.',
            'otp_generated_at' => now()->timestamp,
        ]);
    }
}
