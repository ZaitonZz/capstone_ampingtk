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

        if ($request->boolean('preview')) {
            return response()->json($this->leaveResponsePayload($consultation, false, [
                'requires_confirmation' => $this->shouldConfirmEndForAll($consultation, $isConsultationDoctor),
                'message' => 'Leaving now will end the consultation for both doctor and patient. Continue?',
            ]));
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

        if ($isConsultationDoctor && $request->boolean('end_for_all')) {
            return $this->endConsultationForEveryone($consultation);
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

        return $this->finalizeAfterLastHumanParticipantLeaves($consultation);
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
            'redirect_url' => $this->consultationIndexUrlForUser(),
        ];
    }

    private function consultationIndexUrlForUser(): string
    {
        return $this->requestingUserRole() === 'patient'
            ? route('patient.consultations.index')
            : route('consultations.index');
    }

    private function requestingUserRole(): ?string
    {
        return request()->user()?->role;
    }

    private function shouldConfirmEndForAll(Consultation $consultation, bool $isConsultationDoctor): bool
    {
        if (! $isConsultationDoctor || ! $this->hasProvisionedLiveKitRoom($consultation)) {
            return false;
        }

        try {
            $presence = $this->consultationRoomPresence($consultation);
        } catch (RuntimeException $exception) {
            report($exception);

            return false;
        }

        return $presence['patient_present'];
    }

    /**
     * @return array{doctor_present: bool, patient_present: bool}
     */
    private function consultationRoomPresence(Consultation $consultation): array
    {
        $participants = $this->liveKitService->listParticipants($consultation);
        $consultation->loadMissing('patient');
        $patientUserId = $consultation->patient?->user_id;
        $doctorUserId = $consultation->doctor_id;

        $doctorPresent = false;
        $patientPresent = false;

        foreach ($participants as $participant) {
            $identity = (string) ($participant['identity'] ?? '');
            $metadata = $this->decodeParticipantMetadata($participant['metadata']);

            if (($metadata['audit_mode'] ?? false) === true) {
                continue;
            }

            if ($doctorUserId !== null && $this->liveKitService->participantIdentityMatchesUser($identity, (int) $doctorUserId)) {
                $doctorPresent = true;
            }

            if ($patientUserId !== null && $this->liveKitService->participantIdentityMatchesUser($identity, (int) $patientUserId)) {
                $patientPresent = true;
            }
        }

        return [
            'doctor_present' => $doctorPresent,
            'patient_present' => $patientPresent,
        ];
    }

    private function endConsultationForEveryone(Consultation $consultation): JsonResponse
    {
        try {
            $this->liveKitService->deleteRoom($consultation);
        } catch (RuntimeException $exception) {
            report($exception);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();
        }

        $consultation->forceFill([
            'status' => Consultation::STATUS_COMPLETED,
            'ended_at' => $consultation->ended_at ?? now(),
            'cancellation_reason' => null,
            'livekit_room_status' => 'ended',
            'livekit_ended_at' => now(),
            'livekit_last_activity_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Consultation ended for both participants.',
            'status' => Consultation::STATUS_COMPLETED,
            'cancelled' => false,
            'ended_for_all' => true,
            'redirect_url' => $this->consultationIndexUrlForUser(),
        ]);
    }

    private function finalizeAfterLastHumanParticipantLeaves(Consultation $consultation): JsonResponse
    {
        $shouldComplete = $consultation->livekit_doctor_joined_at !== null
            && $consultation->livekit_patient_joined_at !== null;

        try {
            $this->liveKitService->deleteRoom($consultation);
        } catch (RuntimeException $exception) {
            report($exception);

            $consultation->forceFill([
                'livekit_last_error' => $exception->getMessage(),
            ])->save();
        }

        $consultation->forceFill([
            'status' => $shouldComplete ? Consultation::STATUS_COMPLETED : Consultation::STATUS_CANCELLED,
            'ended_at' => $consultation->ended_at ?? now(),
            'cancellation_reason' => $shouldComplete ? null : 'patient_no_show',
            'livekit_room_status' => 'ended',
            'livekit_ended_at' => now(),
            'livekit_last_activity_at' => now(),
        ])->save();

        return response()->json([
            'message' => $shouldComplete
                ? 'Consultation completed because the live session had already taken place.'
                : 'Consultation cancelled because the patient never joined the LiveKit room.',
            'status' => $consultation->status,
            'cancelled' => $shouldComplete === false,
            'redirect_url' => $this->consultationIndexUrlForUser(),
        ]);
    }

    private function hasHumanConsultationParticipantInRoom(Consultation $consultation): bool
    {
        $participants = $this->liveKitService->listParticipants($consultation);
        $consultation->loadMissing('patient');
        $patientUserId = $consultation->patient?->user_id;
        $doctorUserId = $consultation->doctor_id;

        foreach ($participants as $participant) {
            if ($doctorUserId !== null && $this->liveKitService->participantIdentityMatchesUser($participant['identity'], (int) $doctorUserId)) {
                return true;
            }

            if ($patientUserId !== null && $this->liveKitService->participantIdentityMatchesUser($participant['identity'], (int) $patientUserId)) {
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
