<?php

namespace App\Http\Controllers;

use App\Http\Requests\VerifyConsultationIdentityOtpRequest;
use App\Models\Consultation;
use App\Services\ConsultationIdentityVerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ConsultationIdentityVerificationController extends Controller
{
    public function __construct(
        private ConsultationIdentityVerificationService $identityVerificationService,
    ) {}

    public function verify(
        VerifyConsultationIdentityOtpRequest $request,
        Consultation $consultation,
    ): RedirectResponse {
        $this->authorize('view', $consultation);

        $user = $request->user();

        if ($user === null) {
            abort(403);
        }

        $result = $this->identityVerificationService->verifyForConsultation(
            consultation: $consultation,
            actor: $user,
            otpCode: $request->validated('otp_code'),
        );

        if ($result['status'] === 'verified') {
            return back()->with('success', $result['message']);
        }

        if ($result['status'] === 'invalid_otp') {
            throw ValidationException::withMessages([
                'otp_code' => $result['message'],
            ]);
        }

        return back()->with('error', $result['message']);
    }

    public function resend(Request $request, Consultation $consultation): RedirectResponse
    {
        $this->authorize('view', $consultation);

        $user = $request->user();

        if ($user === null) {
            abort(403);
        }

        $result = $this->identityVerificationService->resendForConsultation(
            consultation: $consultation,
            actor: $user,
        );

        if ($result['status'] === 'sent') {
            return back()->with('success', $result['message']);
        }

        return back()->with('error', $result['message']);
    }
}
