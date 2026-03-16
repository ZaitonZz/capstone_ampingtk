<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDoctor
{
    /**
     * Only users with the doctor role may access doctor-facing routes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isDoctor()) {
            abort(403, 'Access restricted to doctors.');
        }

        return $next($request);
    }
}
