<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMedicalStaff
{
    /**
     * Only clinical staff accounts may access the EMR API.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isClinicalStaff()) {
            abort(403, 'Access restricted to clinical staff.');
        }

        return $next($request);
    }
}
