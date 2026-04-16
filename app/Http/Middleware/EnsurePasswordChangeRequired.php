<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChangeRequired
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->requiresPasswordChange()) {
            return $next($request);
        }

        if ($request->routeIs('user-password.edit', 'user-password.update', 'logout', 'logout-otp')) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Password change required before continuing.',
                'redirect_url' => route('user-password.edit'),
            ], 423);
        }

        return redirect()
            ->route('user-password.edit')
            ->with('error', 'You must update your password before continuing.');
    }
}
