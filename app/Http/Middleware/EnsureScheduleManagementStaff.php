<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureScheduleManagementStaff
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->isAdmin() && ! $user->isMedicalStaff())) {
            abort(403, 'Access restricted to schedule management staff.');
        }

        return $next($request);
    }
}