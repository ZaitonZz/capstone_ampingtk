<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Services\ConsultationDeepfakeDetectionService;
use App\Services\LiveKitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

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
            abort(403, 'Medical staff can schedule consultations but cannot join consultation sessions.');
        }

        $isConsultationDoctor = $consultation->doctor_id === $user->id;
        $isConsultationPatient = $consultation->patient()->where('user_id', $user->id)->exists();
        $isAdminAudit = $user->isAdmin() && ! $isConsultationDoctor && ! $isConsultationPatient;

        if (! $isConsultationDoctor && ! $isConsultationPatient && ! $isAdminAudit) {
            abort(403);
        }

        if (in_array($consultation->status, Consultation::TERMINAL_STATUSES, true)) {
            return response()->json([
                'status' => $consultation->status,
                'cancelled' => false,
                'redirect_url' => route('consultations.lobby.show', $consultation),
            ]);
        }

        $hasProvisionedRoom = $this->hasProvisionedLiveKitRoom($consultation);

        if (! $isAdminAudit && $hasProvisionedRoom) {
            try {
                $this->liveKitService->removeParticipantFromConsultation($consultation, $user);
            } catch (Throwable $exception) {
                report($exception);

                $consultation->forceFill([
                    'livekit_last_error' => $exception->getMessage(),
                ])->save();
            }
        }

        $cancelled = false;
        $consultation = $consultation->fresh();
        $hasProvisionedRoom = $this->hasProvisionedLiveKitRoom($consultation);

        if (
            ! $isAdminAudit
            && $hasProvisionedRoom
            && in_array($consultation->status, Consultation::LIVEKIT_ELIGIBLE_STATUSES, true)
            && ! $this->hasHumanConsultationParticipantInRoom($consultation)
        ) {
            try {
                $this->liveKitService->deleteRoom($consultation);
            } catch (Throwable $exception) {
                report($exception);

                $consultation->forceFill([
                    'livekit_last_error' => $exception->getMessage(),
                ])->save();
            }

            $consultation->forceFill([
                'status' => Consultation::STATUS_CANCELLED,
                'ended_at' => now(),
                'cancellation_reason' => 'Consultation cancelled because the last participant left the call.',
            ])->save();

            $cancelled = true;
            $consultation = $consultation->fresh();
        }

        return response()->json([
            'status' => $consultation->status,
            'cancelled' => $cancelled,
            'redirect_url' => route('consultations.lobby.show', $consultation),
        ]);
    }

    private function hasProvisionedLiveKitRoom(Consultation $consultation): bool
    {
        return $consultation->livekit_room_name !== null
            && $consultation->livekit_room_status === 'room_ready';
    }

    private function hasHumanConsultationParticipantInRoom(Consultation $consultation): bool
    {
        try {
            $participants = $this->liveKitService->listParticipants($consultation);
        } catch (Throwable $exception) {
            report($exception);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();

            return true;
        }

        $patientUserId = $consultation->patient()->value('user_id');
        $doctorUserId = $consultation->doctor_id;

        foreach ($participants as $participant) {
            if ($this->participantRepresentsUser($participant['identity'], $doctorUserId)) {
                return true;
            }

            if ($patientUserId !== null && $this->participantRepresentsUser($participant['identity'], (int) $patientUserId)) {
                return true;
            }

            $metadata = $this->decodeParticipantMetadata($participant['metadata']);

            if (($metadata['role'] ?? null) === 'doctor' || ($metadata['role'] ?? null) === 'patient') {
                return true;
            }
        }

        return false;
    }

    private function participantRepresentsUser(string $identity, int $userId): bool
    {
        return $identity === sprintf('user-%d', $userId) || $identity === (string) $userId;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeParticipantMetadata(?string $metadata): array
    {
        if ($metadata === null) {
            return [];
        }

        $decoded = json_decode($metadata, true);

        return is_array($decoded) ? $decoded : [];
    }
}
