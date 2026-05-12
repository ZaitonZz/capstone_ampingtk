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
        $isAdminAudit = $user->isAdmin() && ! $isConsultationDoctor && ! $isConsultationPatient;

        if (! $isConsultationDoctor && ! $isConsultationPatient && ! $isAdminAudit) {
            abort(403);
        }

        if (in_array($consultation->status, Consultation::TERMINAL_STATUSES, true)) {
            return response()->json($this->leaveResponsePayload($consultation, false));
        }

        if (! $this->hasProvisionedLiveKitRoom($consultation)) {
            return response()->json($this->leaveResponsePayload($consultation, false, [
                'message' => 'No provisioned LiveKit room exists for this consultation.',
            ]));
        }

        if ($isAdminAudit) {
            return response()->json($this->leaveResponsePayload($consultation, false, [
                'message' => 'Admin audit participant left the LiveKit room.',
            ]));
        }

        try {
            $this->liveKitService->removeParticipantFromConsultation($consultation, $user);
        } catch (RuntimeException $exception) {
            report($exception);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();

            return response()->json($this->leaveResponsePayload($consultation, false, [
                'message' => 'Participant leave was accepted, but LiveKit removal could not be confirmed.',
            ]), 202);
        }

        try {
            $hasRemainingHumanParticipant = $this->hasHumanConsultationParticipantInRoom($consultation);
        } catch (RuntimeException $exception) {
            report($exception);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();

            return response()->json($this->leaveResponsePayload($consultation, false, [
                'message' => 'Participant left, but room cleanup could not be confirmed.',
            ]), 202);
        }

        if ($hasRemainingHumanParticipant) {
            return response()->json($this->leaveResponsePayload($consultation, false, [
                'message' => 'Participant left the LiveKit room.',
            ]));
        }

        try {
            $this->liveKitService->deleteRoom($consultation);
        } catch (RuntimeException $exception) {
            report($exception);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();
        }

        $consultation->forceFill([
            'status' => Consultation::STATUS_CANCELLED,
            'ended_at' => now(),
            'cancellation_reason' => 'Consultation cancelled because all participants left the LiveKit room.',
        ])->save();

        return response()->json([
            'message' => 'Consultation cancelled because all participants left the LiveKit room.',
            'status' => Consultation::STATUS_CANCELLED,
            'cancelled' => true,
            'redirect_url' => route('consultations.lobby.show', $consultation),
        ]);
    }

    private function hasProvisionedLiveKitRoom(Consultation $consultation): bool
    {
        return (bool) config('services.livekit.enabled', false)
            && $consultation->livekit_room_name !== null
            && $consultation->livekit_room_status === 'room_ready';
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function leaveResponsePayload(Consultation $consultation, bool $cancelled, array $extra = []): array
    {
        return [
            ...$extra,
            'status' => $consultation->status,
            'cancelled' => $cancelled,
            'redirect_url' => route('consultations.lobby.show', $consultation),
        ];
    }

    private function hasHumanConsultationParticipantInRoom(Consultation $consultation): bool
    {
        $participants = $this->liveKitService->listParticipants($consultation);
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

            if (($metadata['audit_mode'] ?? false) === true) {
                continue;
            }

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
