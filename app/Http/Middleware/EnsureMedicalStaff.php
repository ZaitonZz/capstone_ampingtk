<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMedicalStaff
{
    /**
     * Only doctors and admins may access the EMR API.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->isDoctor() && ! $user->isAdmin())) {
            abort(403, 'Access restricted to medical staff.');
        }

        return $next($request);
    }
}
