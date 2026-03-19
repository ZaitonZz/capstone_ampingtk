<?php

return [
    /*
    |--------------------------------------------------------------------------
    | OTP Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for email-based one-time password (OTP) authentication flow.
    |
    */

    'otp' => [
        // OTP length in digits
        'length' => env('OTP_LENGTH', 6),

        // OTP validity period in seconds (5 minutes)
        'ttl' => env('OTP_TTL', 300),

        // Maximum number of OTP verification attempts
        'max_attempts' => env('OTP_MAX_ATTEMPTS', 5),

        // Cooldown between OTP resend requests in seconds (60 seconds)
        'resend_cooldown' => env('OTP_RESEND_COOLDOWN', 60),

        // Maximum number of resend attempts per OTP instance
        'max_resends' => env('OTP_MAX_RESENDS', 3),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cache Configuration
    |--------------------------------------------------------------------------
    |
    | Cache driver and settings for storing pending login state and OTP data.
    |
    */

    'cache' => [
        // Cache driver to use (default, file, redis, etc)
        'driver' => env('OTP_CACHE_DRIVER', env('CACHE_DRIVER', 'file')),

        // Cache key prefix for pending login tokens
        'pending_login_prefix' => 'otp:pending_login:',

        // Cache key prefix for OTP verification attempts
        'otp_attempts_prefix' => 'otp:attempts:',

        // Cache key prefix for resend rate limiting
        'resend_limit_prefix' => 'otp:resend_limit:',
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Rate limiting configuration for various OTP operations.
    |
    */

    'rate_limit' => [
        // Max login start attempts per minute (per IP)
        'login_start_per_minute' => env('OTP_LOGIN_START_LIMIT', 5),

        // Max OTP verification attempts per minute (per user)
        'verify_per_minute' => env('OTP_VERIFY_LIMIT', 5),

        // Max resend attempts per minute (per user)
        'resend_per_minute' => env('OTP_RESEND_LIMIT', 3),
    ],

    /*
    |--------------------------------------------------------------------------
    | Email Configuration
    |--------------------------------------------------------------------------
    |
    | Email sender configuration for OTP notifications.
    |
    */

    'email' => [
        // From address for OTP emails
        'from' => env('MAIL_FROM_ADDRESS', 'noreply@ampingtk.local'),

        // From name for OTP emails
        'from_name' => env('MAIL_FROM_NAME', 'AMPING_TK'),

        // Mailable class for OTP emails
        'mailable' => App\Mail\OtpMail::class,
    ],
];
