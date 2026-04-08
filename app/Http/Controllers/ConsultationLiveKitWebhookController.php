<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class ConsultationLiveKitWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $rawBody = $request->getContent();

        $authHeader = $request->header('Authorization', '');
        $token = str_starts_with($authHeader, 'Bearer ') ? substr($authHeader, 7) : $authHeader;

        if (! $this->verifyWebhookToken($token, $rawBody)) {
            Log::warning('LiveKit webhook: invalid or missing signature.', [
                'ip' => $request->ip(),
            ]);

            abort(401, 'Invalid webhook signature.');
        }

        /** @var array<string,mixed> $event */
        $event = json_decode($rawBody, true) ?? [];
        $eventType = (string) ($event['event'] ?? '');
        $roomName = (string) ($event['room']['name'] ?? '');

        if ($roomName === '') {
            return response()->noContent();
        }

        $consultation = Consultation::query()
            ->where('livekit_room_name', $roomName)
            ->first();

        if ($consultation === null) {
            return response()->noContent();
        }

        match ($eventType) {
            'participant_joined' => $consultation->forceFill([
                'status' => in_array($consultation->status, ['pending', 'scheduled'], true) ? 'ongoing' : $consultation->status,
                'started_at' => $consultation->started_at ?? now(),
                'livekit_last_activity_at' => now(),
            ])->save(),
            'participant_left' => $consultation->forceFill([
                'livekit_last_activity_at' => now(),
            ])->save(),
            'room_finished' => $consultation->forceFill([
                'status' => $consultation->status === 'ongoing' ? 'completed' : $consultation->status,
                'ended_at' => $consultation->ended_at ?? now(),
                'livekit_room_status' => 'ended',
                'livekit_ended_at' => now(),
                'livekit_last_activity_at' => now(),
            ])->save(),
            default => null,
        };

        return response()->noContent();
    }

    /**
     * Verify the webhook JWT signature and body hash.
     *
     * LiveKit signs webhooks with a JWT whose payload includes a `sha256` field
     * equal to the SHA-256 hex digest of the raw request body.
     */
    private function verifyWebhookToken(string $token, string $rawBody): bool
    {
        $apiSecret = trim((string) config('services.livekit.api_secret', ''));

        if ($apiSecret === '' || $token === '') {
            return false;
        }

        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return false;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        /**
         * 1. Verify HS256 signature.
         */
        $expectedSig = hash_hmac('sha256', $encodedHeader.'.'.$encodedPayload, $apiSecret, true);
        $providedSig = $this->base64UrlDecode($encodedSignature);

        if ($expectedSig === false || $providedSig === false) {
            return false;
        }

        if (! hash_equals($expectedSig, $providedSig)) {
            return false;
        }

        /**
         * 2. Verify body hash from JWT payload.
         */
        $payloadJson = $this->base64UrlDecode($encodedPayload);

        if ($payloadJson === false) {
            return false;
        }

        $payload = json_decode($payloadJson, true);

        if (! is_array($payload)) {
            return false;
        }

        $claimedHash = $payload['sha256'] ?? null;

        if (! is_string($claimedHash) || $claimedHash === '') {
            return false;
        }

        return hash_equals($claimedHash, hash('sha256', $rawBody));
    }

    private function base64UrlDecode(string $input): string|false
    {
        $paddingNeeded = strlen($input) % 4;

        if ($paddingNeeded !== 0) {
            $input .= str_repeat('=', 4 - $paddingNeeded);
        }

        return base64_decode(strtr($input, '-_', '+/'), true);
    }
}
