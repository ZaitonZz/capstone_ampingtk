<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReviewDoctorDutyRequestRequest;
use App\Http\Requests\StoreDoctorDutyRequestRequest;
use App\Models\DoctorDutyRequest;
use App\Services\DoctorDutyRequestService;
use Illuminate\Http\RedirectResponse;

class DoctorDutyRequestController extends Controller
{
    public function store(StoreDoctorDutyRequestRequest $request): RedirectResponse
    {
        $this->authorize('create', DoctorDutyRequest::class);

        DoctorDutyRequest::query()->create([
            'doctor_id' => $request->user()->id,
            'request_type' => $request->validated('request_type'),
            'start_date' => $request->validated('start_date'),
            'end_date' => $request->validated('end_date') ?? $request->validated('start_date'),
            'remarks' => $request->validated('remarks'),
            'status' => DoctorDutyRequest::STATUS_PENDING,
        ]);

        return back()->with('success', 'Duty status request submitted for review.');
    }

    public function review(
        ReviewDoctorDutyRequestRequest $request,
        DoctorDutyRequest $doctorDutyRequest,
        DoctorDutyRequestService $service,
    ): RedirectResponse {
        $this->authorize('review', DoctorDutyRequest::class);

        if ($doctorDutyRequest->status !== DoctorDutyRequest::STATUS_PENDING) {
            return back()->with('error', 'This request has already been reviewed.');
        }

        $decision = $request->validated('decision');

        $doctorDutyRequest->update([
            'status' => $decision,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'reviewer_notes' => $request->validated('reviewer_notes'),
        ]);

        if ($decision === DoctorDutyRequest::STATUS_APPROVED) {
            $service->applyApprovedRequest($doctorDutyRequest->fresh());
        }

        return back()->with('success', sprintf('Duty request %s.', $decision));
    }
}
