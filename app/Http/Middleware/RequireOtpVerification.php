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
        if (! (bool) config('auth_otp.enabled', true)) {
            return $next($request);
        }

        // If user is authenticated but OTP not verified
        if (auth()->check() && ! session('otp_verified')) {
            // Redirect to OTP verification page
            // OTP initialization happens in the route handler, not here
            return redirect()->route('verify-otp');
        }

        return $next($request);
    }
}
