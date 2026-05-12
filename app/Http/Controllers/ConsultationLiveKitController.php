<?php

namespace App\Http\Controllers;

use App\Concerns\InteractsWithLiveKitParticipants;
use App\Models\Consultation;
use App\Models\ConsultationConsent;
use App\Services\ConsultationDeepfakeDetectionService;
use App\Services\LiveKitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ConsultationLiveKitController extends Controller
{
    use InteractsWithLiveKitParticipants;

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

        $leaveForAll = $request->boolean('leave_for_all');

        // Only doctors can use leave_for_all to end the consultation for everyone.
        // Patients can disconnect (leave without leave_for_all), but cannot end the session for all.
        if ($isConsultationPatient && $leaveForAll) {
            abort(403, 'Patients cannot end the consultation for all participants. The doctor has the authority to end sessions.');
        }

        if ($isConsultationDoctor) {
            try {
                $participantsBeforeLeave = $this->liveKitService->listParticipants($consultation);
            } catch (RuntimeException $exception) {
                report($exception);

                $consultation->forceFill([
                    'livekit_last_error' => $exception->getMessage(),
                ])->save();

                return response()->json($this->leaveResponsePayload($consultation, false, [
                    'message' => 'Unable to confirm whether the patient is still in the LiveKit room.',
                ]), 503);
            }

            if ($this->hasPatientParticipantInRoom($consultation, $participantsBeforeLeave)) {
                if (! $leaveForAll) {
                    return response()->json($this->leaveResponsePayload($consultation, false, [
                        'message' => 'The patient is still in the call. Confirm Leave for all to end the session for both participants.',
                        'requires_leave_for_all_confirmation' => true,
                    ]), 409);
                }

                return $this->completeConsultationForAll($consultation);
            }
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

            return response()->json($this->leaveResponsePayload($consultation, false, [
                'message' => 'Participant left, but the LiveKit room could not be terminated.',
            ]), 502);
        }

        $terminalStatus = $this->statusWhenRoomEmpties($consultation, $isConsultationDoctor);
        $message = $terminalStatus === Consultation::STATUS_NO_SHOW
            ? 'Consultation marked no-show because the patient never joined before the doctor left.'
            : 'Consultation cancelled because all participants left the LiveKit room.';

        $consultation->forceFill([
            'status' => $terminalStatus,
            'ended_at' => now(),
            'cancellation_reason' => $message,
        ])->save();

        return response()->json([
            'message' => $message,
            'status' => $terminalStatus,
            'cancelled' => $terminalStatus === Consultation::STATUS_CANCELLED,
            'no_show' => $terminalStatus === Consultation::STATUS_NO_SHOW,
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

    private function completeConsultationForAll(Consultation $consultation): JsonResponse
    {
        // Mark the consultation as completed first - the doctor's explicit action to end
        // the session should complete it regardless of room cleanup success
        $consultation->forceFill([
            'status' => Consultation::STATUS_COMPLETED,
            'ended_at' => $consultation->ended_at ?? now(),
            'cancellation_reason' => null,
        ])->save();

        // Attempt to delete the room as a best-effort cleanup operation.
        // If deletion fails, we still want to return success to the frontend since
        // the consultation has been successfully marked as completed in the business logic.
        try {
            $this->liveKitService->deleteRoom($consultation);
        } catch (RuntimeException $exception) {
            report($exception);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();

            // Even if room deletion fails, the consultation is already marked as COMPLETED,
            // so we return success to allow the frontend to proceed with redirects
        }

        return response()->json([
            'message' => 'Consultation completed and the LiveKit room was ended for all participants.',
            'status' => Consultation::STATUS_COMPLETED,
            'completed' => true,
            'cancelled' => false,
            'redirect_url' => route('consultations.lobby.show', $consultation),
        ]);
    }

    /**
     * @param  array<int, array{identity: string, metadata: ?string}>  $participants
     */
    private function hasPatientParticipantInRoom(Consultation $consultation, array $participants): bool
    {
        $patientUserId = $consultation->patient()->value('user_id');

        foreach ($participants as $participant) {
            if ($patientUserId !== null && $this->participantRepresentsUser($participant['identity'], (int) $patientUserId)) {
                return true;
            }

            $metadata = $this->decodeParticipantMetadata($participant['metadata']);

            if (($metadata['role'] ?? null) === 'patient') {
                return true;
            }
        }

        return false;
    }

    private function statusWhenRoomEmpties(Consultation $consultation, bool $isConsultationDoctor): string
    {
        if ($isConsultationDoctor && $consultation->livekit_patient_joined_at === null) {
            return Consultation::STATUS_NO_SHOW;
        }

        return Consultation::STATUS_CANCELLED;
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
}
