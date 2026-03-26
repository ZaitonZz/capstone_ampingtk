<?php

namespace App\Http\Controllers;

use App\Mail\OtpMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OtpVerificationController extends Controller
{
    /**
     * Show OTP verification page for pending email/password login.
     */
    public function show(): \Illuminate\Http\RedirectResponse|\Inertia\Response
    {
        $pendingLoginToken = session('pending_login_token');

        if (! $pendingLoginToken) {
            return redirect()->route('login');
        }

        $cacheKey = $this->getPendingLoginCacheKey($pendingLoginToken);
        $pendingLoginState = Cache::get($cacheKey);

        if (! $pendingLoginState) {
            session()->forget('pending_login_token');

            return redirect()->route('login');
        }

        $expiresIn = max(0, now()->diffInSeconds($pendingLoginState['expires_at'], false));
        $resendAvailableIn = max(0, now()->diffInSeconds($pendingLoginState['resend_available_at'], false));

        return inertia('auth/otp-verification', [
            'maskedEmail' => $this->maskEmail($pendingLoginState['user_email']),
            'expiresIn' => $expiresIn,
            'resendAvailableIn' => $resendAvailableIn,
        ]);
    }

    /**
     * Start the email-password login flow.
     *
     * Validates email and password, then initiates OTP verification.
     * User is NOT fully authenticated yet.
     */
    public function startEmailLogin(Request $request): JsonResponse
    {
        // Rate limiting for login start attempts
        $throttleKey = 'otp-login-start:'.$request->ip();
        $maxAttempts = config('auth_otp.rate_limit.login_start_per_minute', 5);

        if (RateLimiter::tooManyAttempts($throttleKey, $maxAttempts)) {
            throw ValidationException::withMessages([
                'email' => 'Too many login attempts. Please try again later.',
            ]);
        }

        // Validate email and password fields
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        RateLimiter::hit($throttleKey);

        // Find user by email
        $user = \App\Models\User::where('email', $validated['email'])->first();

        // Validate credentials
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid email or password.',
            ]);
        }

        if (! $this->isOtpEnabled()) {
            Auth::login($user, $request->boolean('remember'));
            $request->session()->regenerate();
            session(['otp_verified' => true]);

            $redirectUrl = match ($user->role) {
                'doctor' => route('doctor.dashboard'),
                'patient' => route('patient.dashboard'),
                'medicalstaff' => route('medicalstaff.dashboard'),
                'admin' => route('admin.dashboard'),
                default => route('dashboard'),
            };

            return response()->json([
                'success' => true,
                'requires_otp' => false,
                'redirect_url' => $redirectUrl,
                'message' => 'Login successful.',
            ]);
        }

        // Generate OTP and pending login token
        $otp = $this->generateOtp();
        $pendingLoginToken = Str::uuid()->toString();

        // Hash OTP before storing
        $otpHash = Hash::make($otp);

        // Create pending login state
        $ttlSeconds = intval(config('auth_otp.otp.ttl', 300));
        $pendingLoginState = [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'otp_hash' => $otpHash,
            'created_at' => now()->toIso8601String(),
            'expires_at' => now()->addSeconds($ttlSeconds)->toIso8601String(),
            'attempts' => 0,
            'max_attempts' => intval(config('auth_otp.otp.max_attempts', 5)),
            'resend_available_at' => now()->toIso8601String(),
            'resend_count' => 0,
            'max_resends' => intval(config('auth_otp.otp.max_resends', 3)),
            'remember' => $request->boolean('remember'),
        ];

        // Store pending login state in cache
        $cacheKey = $this->getPendingLoginCacheKey($pendingLoginToken);
        Cache::put($cacheKey, $pendingLoginState, now()->addSeconds($ttlSeconds));

        // Store pending login token in session
        session(['pending_login_token' => $pendingLoginToken]);

        // Send OTP email
        try {
            Mail::send(new OtpMail(
                userEmail: $user->email,
                otp: $otp,
                expiryMinutes: intval(config('auth_otp.otp.ttl', 300) / 60),
            ));

            logger("OTP sent to {$user->email}");
        } catch (\Throwable $e) {
            logger()->error('Failed to send OTP email', [
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            // Clear the pending login state on email failure
            Cache::forget($cacheKey);
            session()->forget('pending_login_token');

            throw ValidationException::withMessages([
                'email' => 'Failed to send verification code. Please try again.',
            ]);
        }

        return response()->json([
            'success' => true,
            'requires_otp' => true,
            'redirect_url' => route('auth.verify-otp'),
            'message' => 'Verification code sent to your email.',
            'masked_email' => $this->maskEmail($user->email),
            'expires_in' => config('auth_otp.otp.ttl', 300),
        ]);
    }

    /**
     * Ensure OTP is generated/sent for authenticated users.
     * Redirects to verification page.
     */
    public function ensureOtp(Request $request): \Illuminate\Http\RedirectResponse
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        if (! $this->isOtpEnabled()) {
            session(['otp_verified' => true]);

            return redirect()->route('dashboard');
        }

        // If OTP cycle already active, redirect to input page
        if (session('pending_login_token')) {
            return redirect()->route('auth.verify-otp');
        }

        // Generate OTP
        $otp = $this->generateOtp();
        $pendingLoginToken = Str::uuid()->toString();
        $otpHash = Hash::make($otp);
        $ttlSeconds = intval(config('auth_otp.otp.ttl', 300));

        $pendingLoginState = [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'otp_hash' => $otpHash,
            'created_at' => now()->toIso8601String(),
            'expires_at' => now()->addSeconds($ttlSeconds)->toIso8601String(),
            'attempts' => 0,
            'max_attempts' => intval(config('auth_otp.otp.max_attempts', 5)),
            'resend_available_at' => now()->toIso8601String(),
            'resend_count' => 0,
            'max_resends' => intval(config('auth_otp.otp.max_resends', 3)),
            'remember' => auth()->viaRemember(), // Preserve remember status
        ];

        // Store state
        $cacheKey = $this->getPendingLoginCacheKey($pendingLoginToken);
        Cache::put($cacheKey, $pendingLoginState, now()->addSeconds($ttlSeconds));
        session(['pending_login_token' => $pendingLoginToken]);

        // Send Email
        try {
            Mail::send(new OtpMail(
                userEmail: $user->email,
                otp: $otp,
                expiryMinutes: intval(config('auth_otp.otp.ttl', 300) / 60),
            ));

            logger("OTP sent to {$user->email} (ensureOtp)");
        } catch (\Throwable $e) {
            logger()->error('Failed to send OTP email (ensureOtp)', [
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            Cache::forget($cacheKey);
            session()->forget('pending_login_token');

            return redirect()->route('dashboard')->with('error', 'Failed to send OTP email.');
        }

        return redirect()->route('auth.verify-otp');
    }

    /**
     * Verify the OTP code submitted by the user.
     */
    public function verify(Request $request): JsonResponse
    {
        // Validate OTP code format
        $validated = $request->validate([
            'otp_code' => 'required|string|regex:/^\d{6}$/',
        ], [
            'otp_code.required' => 'Verification code is required',
            'otp_code.regex' => 'Verification code must be exactly 6 digits',
        ]);

        // Get pending login token from session
        $pendingLoginToken = session('pending_login_token');

        if (! $pendingLoginToken) {
            throw ValidationException::withMessages([
                'otp_code' => 'No pending login found. Please try logging in again.',
            ]);
        }

        // Load pending login state from cache
        $cacheKey = $this->getPendingLoginCacheKey($pendingLoginToken);
        $pendingLoginState = Cache::get($cacheKey);

        if (! $pendingLoginState) {
            session()->forget('pending_login_token');
            throw ValidationException::withMessages([
                'otp_code' => 'Verification code has expired. Please try logging in again.',
            ]);
        }

        // Rate limiting for OTP verification attempts
        $throttleKey = 'otp-verify:'.$pendingLoginState['user_id'].':'.$request->ip();
        $maxAttempts = config('auth_otp.rate_limit.verify_per_minute', 5);

        if (RateLimiter::tooManyAttempts($throttleKey, $maxAttempts)) {
            throw ValidationException::withMessages([
                'otp_code' => 'Too many verification attempts. Please try again later.',
            ]);
        }

        // Check if OTP has expired
        if (now()->isAfter($pendingLoginState['expires_at'])) {
            RateLimiter::hit($throttleKey);
            Cache::forget($cacheKey);
            session()->forget('pending_login_token');
            throw ValidationException::withMessages([
                'otp_code' => 'Verification code has expired. Please request a new code.',
            ]);
        }

        // Check if max attempts exceeded
        if ($pendingLoginState['attempts'] >= intval($pendingLoginState['max_attempts'])) {
            RateLimiter::hit($throttleKey);
            Cache::forget($cacheKey);
            session()->forget('pending_login_token');
            throw ValidationException::withMessages([
                'otp_code' => 'Too many incorrect attempts. Please try logging in again.',
            ]);
        }

        // Compare OTP using Hash::check for secure comparison
        if (! Hash::check($validated['otp_code'], $pendingLoginState['otp_hash'])) {
            $pendingLoginState['attempts']++;
            $ttlSeconds = intval(config('auth_otp.otp.ttl', 300));
            Cache::put($cacheKey, $pendingLoginState, now()->addSeconds($ttlSeconds));
            RateLimiter::hit($throttleKey);

            throw ValidationException::withMessages([
                'otp_code' => 'Invalid verification code.',
            ]);
        }

        // OTP is valid - authenticate the user
        RateLimiter::clear($throttleKey);

        $user = \App\Models\User::findOrFail($pendingLoginState['user_id']);

        // Fully authenticate the user
        Auth::login($user, $pendingLoginState['remember']);

        // Regenerate session to prevent session fixation
        $request->session()->regenerate();

        // Mark user as OTP verified in session
        session(['otp_verified' => true]);

        // Clear pending login data
        Cache::forget($cacheKey);
        session()->forget('pending_login_token');

        // Determine redirect URL based on user role
        $redirectUrl = match ($user->role) {
            'doctor' => route('doctor.dashboard'),
            'patient' => route('patient.dashboard'),
            'admin' => route('admin.dashboard'),
            default => route('dashboard'),
        };

        return response()->json([
            'success' => true,
            'redirect_url' => $redirectUrl,
            'message' => 'OTP verified successfully. Logging you in...',
        ]);
    }

    /**
     * Resend OTP to user's email.
     */
    public function resend(Request $request): JsonResponse
    {
        // Get pending login token from session
        $pendingLoginToken = session('pending_login_token');

        if (! $pendingLoginToken) {
            throw ValidationException::withMessages([
                'message' => 'No pending login found. Please try logging in again.',
            ]);
        }

        // Load pending login state from cache
        $cacheKey = $this->getPendingLoginCacheKey($pendingLoginToken);
        $pendingLoginState = Cache::get($cacheKey);

        if (! $pendingLoginState) {
            session()->forget('pending_login_token');
            throw ValidationException::withMessages([
                'message' => 'Verification code has expired. Please try logging in again.',
            ]);
        }

        // Rate limiting for resend attempts
        $throttleKey = 'otp-resend:'.$pendingLoginState['user_id'].':'.$request->ip();
        $maxResends = config('auth_otp.rate_limit.resend_per_minute', 3);

        if (RateLimiter::tooManyAttempts($throttleKey, $maxResends)) {
            throw ValidationException::withMessages([
                'message' => 'Too many resend attempts. Please try again later.',
            ]);
        }

        // Check resend cooldown (server-side)
        if (now()->isBefore($pendingLoginState['resend_available_at'])) {
            $secondsRemaining = now()->diffInSeconds($pendingLoginState['resend_available_at'], false);

            return response()->json([
                'message' => 'Please wait before requesting a new code.',
                'resend_available_in' => max(0, $secondsRemaining),
            ], 422);
        }

        // Check if max resends exceeded
        if ($pendingLoginState['resend_count'] >= $pendingLoginState['max_resends']) {
            throw ValidationException::withMessages([
                'message' => 'Maximum resend attempts reached. Please try logging in again.',
            ]);
        }

        // Generate a new OTP
        $otp = $this->generateOtp();
        $otpHash = Hash::make($otp);

        // Update pending login state
        $ttlSeconds = intval(config('auth_otp.otp.ttl', 300));
        $resendCooldownSeconds = intval(config('auth_otp.otp.resend_cooldown', 60));
        $pendingLoginState['otp_hash'] = $otpHash;
        $pendingLoginState['created_at'] = now()->toIso8601String();
        $pendingLoginState['expires_at'] = now()->addSeconds($ttlSeconds)->toIso8601String();
        $pendingLoginState['attempts'] = 0; // Reset attempts on resend
        $pendingLoginState['resend_count']++;
        $pendingLoginState['resend_available_at'] = now()->addSeconds($resendCooldownSeconds)->toIso8601String();

        // Store updated state
        Cache::put($cacheKey, $pendingLoginState, now()->addSeconds($ttlSeconds));

        // Send OTP email
        try {
            Mail::send(new OtpMail(
                userEmail: $pendingLoginState['user_email'],
                otp: $otp,
                expiryMinutes: intval(config('auth_otp.otp.ttl', 300) / 60),
            ));

            logger("OTP resent to {$pendingLoginState['user_email']}");

            RateLimiter::hit($throttleKey);
        } catch (\Throwable $e) {
            logger()->error('Failed to resend OTP email', [
                'email' => $pendingLoginState['user_email'],
                'error' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'message' => 'Failed to resend verification code. Please try again.',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'New verification code sent to your email.',
            'resend_available_in' => config('auth_otp.otp.resend_cooldown', 60),
            'expires_in' => config('auth_otp.otp.ttl', 300),
        ]);
    }

    /**
     * Cancel OTP verification and return to login page.
     */
    public function cancel(Request $request): JsonResponse
    {
        // Get and clear pending login token
        $pendingLoginToken = session('pending_login_token');

        if ($pendingLoginToken) {
            $cacheKey = $this->getPendingLoginCacheKey($pendingLoginToken);
            Cache::forget($cacheKey);
        }

        session()->forget('pending_login_token');

        return response()->json([
            'success' => true,
            'redirect_url' => route('login'),
        ]);
    }

    /**
     * Generate a random 6-digit OTP.
     */
    private function generateOtp(): string
    {
        $length = config('auth_otp.otp.length', 6);

        return str_pad((string) random_int(0, pow(10, $length) - 1), $length, '0', STR_PAD_LEFT);
    }

    /**
     * Get cache key for pending login state.
     */
    private function getPendingLoginCacheKey(string $token): string
    {
        $prefix = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:');

        return $prefix.$token;
    }

    /**
     * Mask email for display purposes (e.g., user@example.com => u***@example.com).
     */
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return $email;
        }

        $localPart = $parts[0];
        $domain = $parts[1];

        // Show first character and hide the rest with asterisks
        $masked = substr($localPart, 0, 1).str_repeat('*', max(1, strlen($localPart) - 1));

        return $masked.'@'.$domain;
    }

    private function isOtpEnabled(): bool
    {
        return (bool) config('auth_otp.enabled', true);
    }
}
