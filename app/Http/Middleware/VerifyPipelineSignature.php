<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyPipelineSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = trim((string) config('services.pipeline.secret', ''));

        if ($secret === '') {
            abort(503, 'Pipeline integration is not configured.');
        }

        $signature = $request->header('X-Pipeline-Signature', '');

        if (! str_starts_with($signature, 'sha256=')) {
            abort(401, 'Missing or malformed pipeline signature.');
        }

        $provided = substr($signature, 7);
        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        if (! hash_equals($expected, $provided)) {
            abort(401, 'Invalid pipeline signature.');
        }

        return $next($request);
    }
}
