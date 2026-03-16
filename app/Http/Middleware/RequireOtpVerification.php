<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireOtpVerification
{
    /**
     * Handle an incoming request.
     *
     * If user is authenticated but hasn't verified OTP,
     * redirect to OTP verification page.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // If user is authenticated but OTP not verified
        if (auth()->check() && !session('otp_verified')) {
            // Set OTP code in session if not already set (development mode)
            if (!session('otp_code')) {
                session(['otp_code' => '123456']);
                session(['otp_generated_at' => now()->timestamp]);
                logger('OTP test code initialized: 123456');
            }

            // Redirect to OTP verification page
            return redirect()->route('verify-otp');
        }

        return $next($request);
    }
}
