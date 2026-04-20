<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Services\LiveKitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultationLiveKitController extends Controller
{
    public function __construct(private LiveKitService $liveKitService) {}

    public function connect(Request $request, Consultation $consultation): JsonResponse
    {
        $this->authorize('view', $consultation);

        if ($consultation->type !== 'teleconsultation') {
            abort(404);
        }

        if (! (bool) config('services.livekit.enabled', false)) {
            return response()->json([
                'message' => 'LiveKit integration is currently disabled.',
            ], 503);
        }

        $user = $request->user();

        if ($user === null) {
            abort(403);
        }

        if ($user->isMedicalStaff()) {
            abort(403, 'Medical staff can schedule consultations but cannot join consultation sessions.');
        }

        if (in_array($consultation->status, ['cancelled', 'completed', 'no_show'], true)) {
            return response()->json([
                'message' => 'This consultation is no longer active.',
            ], 409);
        }

        $isPausedForIdentityVerification = $consultation->status === 'paused';
        $isVerificationTarget =
            $consultation->identity_verification_target_user_id !== null
            && $consultation->identity_verification_target_user_id === $user->id;

        if ($isPausedForIdentityVerification) {
            $verificationTargetRole = $consultation->identity_verification_target_role ?? 'participant';

            return response()->json([
                'message' => $isVerificationTarget
                    ? 'Consultation is paused. Verify your identity in the lobby before rejoining.'
                    : sprintf('Consultation is paused while the %s completes identity verification.', $verificationTargetRole),
                'status' => 'paused',
                'requires_identity_verification' => $isVerificationTarget,
                'verification_target_role' => $verificationTargetRole,
            ], 423);
        }

        $isConsultationDoctor = $consultation->doctor_id === $user->id;
        $isConsultationPatient = $consultation->patient()->where('user_id', $user->id)->exists();
        $isAdminAudit = $user->isAdmin() && ! $isConsultationDoctor && ! $isConsultationPatient;

        if (! $isConsultationDoctor && ! $isConsultationPatient && ! $isAdminAudit) {
            abort(403);
        }

        if (! $isAdminAudit) {
            $hasConfirmedConsent = ConsultationConsent::query()
                ->where('consultation_id', $consultation->id)
                ->where('user_id', $user->id)
                ->where('consent_confirmed', true)
                ->exists();

            if (! $hasConfirmedConsent) {
                return response()->json([
                    'message' => 'Consent must be confirmed before joining the teleconsultation room.',
                ], 422);
            }
        }

        $consultation = $this->liveKitService->ensureRoomForConsultation($consultation);

        $consultation->forceFill([
            'livekit_last_activity_at' => now(),
        ])->save();

        $participantToken = $this->liveKitService->issueParticipantToken($consultation, $user, $isAdminAudit);

        return response()->json([
            'room_name' => $consultation->livekit_room_name,
            'room_status' => $consultation->livekit_room_status,
            'participant_token' => $participantToken,
            'ws_url' => config('services.livekit.ws_url'),
            'role' => $isAdminAudit ? 'admin_audit' : $user->role,
        ]);
    }
}
