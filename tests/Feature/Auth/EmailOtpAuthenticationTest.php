<?php

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    // Use array driver for cache in tests
    config(['cache.default' => 'array']);
    
    // Use fake mail driver
    Mail::fake();
});

describe('Email OTP Authentication', function () {
    describe('Email Login Start', function () {
        it('validates email is required', function () {
            $response = $this->postJson(route('auth.email-login-start'), [
                'password' => 'password',
            ]);

            $response->assertUnprocessable();
            $response->assertJsonValidationErrors('email');
        });

        it('validates password is required', function () {
            $response = $this->postJson(route('auth.email-login-start'), [
                'email' => 'test@example.com',
            ]);

            $response->assertUnprocessable();
            $response->assertJsonValidationErrors('password');
        });

        it('returns error for non-existent email', function () {
            $response = $this->postJson(route('auth.email-login-start'), [
                'email' => 'nonexistent@example.com',
                'password' => 'password',
            ]);

            $response->assertUnprocessable();
            $response->assertJsonValidationErrors('email');
        });

        it('returns error for invalid password', function () {
            $user = User::factory()->create([
                'password' => Hash::make('correct-password'),
            ]);

            $response = $this->postJson(route('auth.email-login-start'), [
                'email' => $user->email,
                'password' => 'wrong-password',
            ]);

            $response->assertUnprocessable();
            $response->assertJsonValidationErrors('email');
        });

        it('creates pending login state and sends OTP email for valid credentials', function () {
            config(['auth_otp.enabled' => true]);

            $user = User::factory()->create([
                'password' => Hash::make('correct-password'),
            ]);

            $response = $this->postJson(route('auth.email-login-start'), [
                'email' => $user->email,
                'password' => 'correct-password',
            ]);

            $response->assertOk();
            $response->assertJsonStructure([
                'success',
                'requires_otp',
                'redirect_url',
                'message',
                'masked_email',
                'expires_in',
            ]);
            $response->assertJson([
                'success' => true,
                'requires_otp' => true,
                'redirect_url' => route('auth.verify-otp'),
            ]);

            // Verify OTP email was sent
            Mail::assertSent(\App\Mail\OtpMail::class, function ($mail) use ($user) {
                return $mail->hasTo($user->email);
            });

            // Verify pending login token is in session
            expect(session('pending_login_token'))->toBeTruthy();

            // Verify pending login state is in cache
            $pendingLoginToken = session('pending_login_token');
            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            $cachedState = Cache::get($cacheKey);

            expect($cachedState)->toBeArray();
            expect($cachedState['user_id'])->toBe($user->id);
            expect($cachedState['user_email'])->toBe($user->email);
            expect($cachedState['attempts'])->toBe(0);
        });

        it('returns role-based dashboard redirect when OTP is disabled', function () {
            config(['auth_otp.enabled' => false]);

            $patient = User::factory()->patient()->create([
                'password' => Hash::make('correct-password'),
            ]);

            $response = $this->postJson(route('auth.email-login-start'), [
                'email' => $patient->email,
                'password' => 'correct-password',
            ]);

            $response->assertOk();
            $response->assertJson([
                'success' => true,
                'requires_otp' => false,
                'redirect_url' => route('patient.dashboard'),
            ]);

            $this->assertAuthenticatedAs($patient);
            expect(session('otp_verified'))->toBeTrue();
            Mail::assertNothingSent();
        });

        it('masks email correctly in response', function () {
            $user = User::factory()->create([
                'email' => 'johndoe@example.com',
                'password' => Hash::make('password'),
            ]);

            $response = $this->postJson(route('auth.email-login-start'), [
                'email' => $user->email,
                'password' => 'password',
            ]);

            $response->assertOk();
            $maskedEmail = $response->json('masked_email');
            
            // Should show first letter and mask the rest
            expect($maskedEmail)->toContain('j******@example.com');
        });

        it('enforces rate limiting on login start', function () {
            $user = User::factory()->create([
                'password' => Hash::make('password'),
            ]);

            $maxAttempts = config('auth_otp.rate_limit.login_start_per_minute', 5);

            // Make max + 1 requests
            for ($i = 0; $i < $maxAttempts; $i++) {
                $this->postJson(route('auth.email-login-start'), [
                    'email' => 'nonexistent' . $i . '@example.com',
                    'password' => 'password',
                ]);
            }

            // Final request should be rate limited
            $response = $this->postJson(route('auth.email-login-start'), [
                'email' => $user->email,
                'password' => 'password',
            ]);

            $response->assertUnprocessable();
        });
    });

    describe('OTP Verification Page', function () {
        it('redirects to login when pending login token is missing', function () {
            $response = $this->get(route('auth.verify-otp'));

            $response->assertRedirect(route('login'));
        });

        it('redirects to login when pending login state is missing from cache', function () {
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $response = $this->withSession([
                'pending_login_token' => $pendingLoginToken,
            ])->get(route('auth.verify-otp'));

            $response->assertRedirect(route('login'));
            $response->assertSessionMissing('pending_login_token');
        });

        it('returns inertia otp verification page with countdown props when pending login is valid', function () {
            $user = User::factory()->create([
                'email' => 'jane@example.com',
            ]);

            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();
            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;

            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make('123456'),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addSeconds(120)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->addSeconds(45)->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $response = $this->withSession([
                'pending_login_token' => $pendingLoginToken,
            ])->get(route('auth.verify-otp'));

            $response->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('auth/otp-verification')
                    ->where('maskedEmail', 'j***@example.com')
                    ->where('expiresIn', fn (int $value) => $value > 0 && $value <= 120)
                    ->where('resendAvailableIn', fn (int $value) => $value >= 0 && $value <= 45)
                );
        });
    });

    describe('OTP Verification', function () {
        it('requires pending login token in session', function () {
            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => '123456',
            ]);

            $response->assertUnprocessable();
        });

        it('validates OTP code format', function () {
            $user = User::factory()->create();
            $this->actingAs($user);

            // Store a pending login token in session
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();
            session(['pending_login_token' => $pendingLoginToken]);

            // Store pending login state in cache
            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make('123456'),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            // Test invalid formats
            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => 'abcdef',  // Letters
            ]);
            $response->assertUnprocessable();

            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => '12345',  // Too short
            ]);
            $response->assertUnprocessable();

            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => '1234567',  // Too long
            ]);
            $response->assertUnprocessable();
        });

        it('verifies correct OTP authenticates user', function () {
            $user = User::factory()->create();

            // Generate OTP and pending login state
            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => $otp,
            ]);

            $response->assertOk();
            $response->assertJsonStructure([
                'success',
                'redirect_url',
                'message',
            ]);

            // Verify user is authenticated
            $this->assertAuthenticatedAs($user);

            // Verify pending login state is cleared
            expect(Cache::has($cacheKey))->toBeFalse();
        });

        it('rejects incorrect OTP and increments attempts', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => '000000',  // Wrong OTP
            ]);

            $response->assertUnprocessable();

            // Verify attempts were incremented
            $updatedState = Cache::get($cacheKey);
            expect($updatedState['attempts'])->toBe(1);
        });

        it('rejects expired OTP', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->subMinutes(10)->toIso8601String(),
                'expires_at' => now()->subMinutes(5)->toIso8601String(),  // Expired 5 minutes ago
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => $otp,
            ]);

            $response->assertUnprocessable();
            $response->assertJsonValidationErrors('otp_code');
        });

        it('rejects OTP after max attempts exceeded', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();
            $maxAttempts = config('auth_otp.otp.max_attempts', 5);

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => $maxAttempts,  // Already at max attempts
                'max_attempts' => $maxAttempts,
                'resend_available_at' => now()->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => $otp,
            ]);

            $response->assertUnprocessable();
        });

        it('enforces rate limiting on verify attempts', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $maxAttempts = config('auth_otp.rate_limit.verify_per_minute', 5);

            // Make max + 1 requests
            for ($i = 0; $i < $maxAttempts; $i++) {
                $this->postJson(route('auth.verify-otp-post'), [
                    'otp_code' => '000000',
                ]);
            }

            // Final request should be rate limited
            $response = $this->postJson(route('auth.verify-otp-post'), [
                'otp_code' => $otp,
            ]);

            $response->assertUnprocessable();
        });
    });

    describe('OTP Resend', function () {
        it('requires pending login token in session', function () {
            $response = $this->postJson(route('auth.resend-otp'));

            $response->assertUnprocessable();
        });

        it('respects resend cooldown', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->addSeconds(30)->toIso8601String(),  // 30 seconds from now
                'resend_count' => 1,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $response = $this->postJson(route('auth.resend-otp'));

            $response->assertUnprocessable();
            $response->assertJson([
                'message' => 'Please wait before requesting a new code.',
            ]);
            // Should include remaining seconds
            expect($response->json('resend_available_in'))->toBeGreaterThan(0);
        });

        it('generates new OTP after cooldown expires', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 2,
                'max_attempts' => 5,
                'resend_available_at' => now()->subSeconds(10)->toIso8601String(),  // Already expired
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $response = $this->postJson(route('auth.resend-otp'));

            $response->assertOk();
            $response->assertJsonStructure([
                'success',
                'message',
                'resend_available_in',
                'expires_in',
            ]);

            // Verify new OTP email was sent
            Mail::assertSent(\App\Mail\OtpMail::class);

            // Verify state was updated
            $updatedState = Cache::get($cacheKey);
            expect($updatedState['resend_count'])->toBe(1);
            expect($updatedState['attempts'])->toBe(0);  // Attempts should reset
        });

        it('enforces max resends limit', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();
            $maxResends = config('auth_otp.otp.max_resends', 3);

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->subSeconds(10)->toIso8601String(),
                'resend_count' => $maxResends,  // Already at max resends
                'max_resends' => $maxResends,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $response = $this->postJson(route('auth.resend-otp'));

            $response->assertUnprocessable();
        });

        it('enforces rate limiting on resend attempts', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->subSeconds(10)->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $maxResends = config('auth_otp.rate_limit.resend_per_minute', 3);

            // Make max + 1 requests
            for ($i = 0; $i < $maxResends; $i++) {
                $this->postJson(route('auth.resend-otp'));
            }

            // Final request should be rate limited
            $response = $this->postJson(route('auth.resend-otp'));

            $response->assertUnprocessable();
        });
    });

    describe('OTP Cancel', function () {
        it('clears pending login state and redirects to login', function () {
            $user = User::factory()->create();

            $otp = '123456';
            $pendingLoginToken = \Illuminate\Support\Str::uuid()->toString();

            $cacheKey = config('auth_otp.cache.pending_login_prefix', 'otp:pending_login:') . $pendingLoginToken;
            Cache::put($cacheKey, [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'otp_hash' => Hash::make($otp),
                'created_at' => now()->toIso8601String(),
                'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'attempts' => 0,
                'max_attempts' => 5,
                'resend_available_at' => now()->toIso8601String(),
                'resend_count' => 0,
                'max_resends' => 3,
                'remember' => false,
            ], now()->addMinutes(5));

            $this->withSession(['pending_login_token' => $pendingLoginToken]);

            $response = $this->postJson(route('auth.cancel-otp'));

            $response->assertOk();
            $response->assertJson([
                'success' => true,
            ]);

            // Verify cache was cleared
            expect(Cache::has($cacheKey))->toBeFalse();

            // Verify session was cleared
            expect(session('pending_login_token'))->toBeNull();
        });
    });
});
