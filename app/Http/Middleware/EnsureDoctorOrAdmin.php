<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDoctorOrAdmin
{
    /**
     * Only doctors and admins may access clinical editing endpoints.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->isDoctor() && ! $user->isAdmin())) {
            abort(403, 'Access restricted to doctors and administrators.');
        }

        return $next($request);
    }
}
