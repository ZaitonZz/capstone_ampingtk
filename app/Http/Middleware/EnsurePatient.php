<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePatient
{
    /**
     * Only users with the patient role may access patient-facing routes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isPatient()) {
            abort(403, 'Access restricted to patients.');
        }

        return $next($request);
    }
}
