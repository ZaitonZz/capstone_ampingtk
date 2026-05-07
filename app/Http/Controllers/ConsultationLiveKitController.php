<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Services\ConsultationDeepfakeDetectionService;
use App\Services\LiveKitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ConsultationLiveKitController extends Controller
{
    public function __construct(
        private LiveKitService $liveKitService,
        private ConsultationDeepfakeDetectionService $deepfakeDetectionService,
    ) {}

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

        if (in_array($consultation->status, Consultation::TERMINAL_STATUSES, true)) {
            return response()->json([
                'message' => $this->deepfakeDetectionService->isNoFaceCancellation($consultation)
                    ? $this->deepfakeDetectionService->noFaceCancellationMessage()
                    : 'This consultation is no longer active.',
            ], 409);
        }

        $isPausedForIdentityVerification = $consultation->status === Consultation::STATUS_PAUSED;
        $isVerificationTarget =
            $consultation->identity_verification_target_user_id !== null
            && $consultation->identity_verification_target_user_id === $user->id;

        if ($isPausedForIdentityVerification) {
            $verificationTargetRole = $consultation->identity_verification_target_role ?? 'participant';

            return response()->json([
                'message' => $isVerificationTarget
                    ? 'Consultation is paused. Verify your identity in the lobby before rejoining.'
                    : sprintf('Consultation is paused while the %s completes identity verification.', $verificationTargetRole),
                'status' => Consultation::STATUS_PAUSED,
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
        $consultation = $this->deepfakeDetectionService->enforceNoFaceOrCancel($consultation);

        if ($this->deepfakeDetectionService->isNoFaceCancellation($consultation)) {
            return response()->json([
                'message' => $this->deepfakeDetectionService->noFaceCancellationMessage(),
                'status' => Consultation::STATUS_CANCELLED,
            ], 409);
        }

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

    public function leave(Request $request, Consultation $consultation): JsonResponse
    {
        $this->authorize('view', $consultation);

        if ($consultation->type !== 'teleconsultation') {
            abort(404);
        }

        $user = $request->user();

        if ($user === null) {
            abort(403);
        }

        if ($user->isMedicalStaff()) {
            abort(403, 'Medical staff can schedule consultations but cannot leave consultation sessions.');
        }

        $isConsultationDoctor = $consultation->doctor_id === $user->id;
        $isConsultationPatient = $consultation->patient()->where('user_id', $user->id)->exists();

        if (! $isConsultationDoctor && ! $isConsultationPatient) {
            abort(403);
        }

        if (! $this->hasProvisionedLiveKitRoom($consultation)) {
            return response()->json([
                'message' => 'No provisioned LiveKit room exists for this consultation.',
                'status' => $consultation->status,
                'cancelled' => false,
            ]);
        }

        $this->liveKitService->removeParticipantFromConsultation($consultation, $user);

        try {
            $participantCounts = $this->liveKitService->activeRoomParticipantCounts([
                $consultation->livekit_room_name,
            ]);
        } catch (RuntimeException) {
            return response()->json([
                'message' => 'Participant left, but room cleanup could not be confirmed.',
                'status' => $consultation->status,
                'cancelled' => false,
            ], 202);
        }

        $remainingParticipantCount = $participantCounts[$consultation->livekit_room_name] ?? 0;

        if ($remainingParticipantCount > 0 || in_array($consultation->status, Consultation::TERMINAL_STATUSES, true)) {
            return response()->json([
                'message' => 'Participant left the LiveKit room.',
                'status' => $consultation->status,
                'cancelled' => false,
            ]);
        }

        $this->liveKitService->deleteRoom($consultation);

        $consultation->forceFill([
            'status' => Consultation::STATUS_CANCELLED,
            'ended_at' => now(),
            'cancellation_reason' => 'Consultation cancelled because all participants left the LiveKit room.',
        ])->save();

        return response()->json([
            'message' => 'Consultation cancelled because all participants left the LiveKit room.',
            'status' => Consultation::STATUS_CANCELLED,
            'cancelled' => true,
        ]);
    }

    private function hasProvisionedLiveKitRoom(Consultation $consultation): bool
    {
        return (bool) config('services.livekit.enabled', false)
            && $consultation->livekit_room_name !== null
            && $consultation->livekit_room_status === 'room_ready';
    }
}
