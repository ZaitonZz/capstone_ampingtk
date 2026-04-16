<?php

namespace App\Http\Controllers;

use App\Models\DeepfakeEscalation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDeepfakeAlertController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->query('status');

        $alerts = DeepfakeEscalation::query()
            ->where('type', DeepfakeEscalation::TYPE_ADMIN_ALERT)
            ->when(
                in_array($statusFilter, [DeepfakeEscalation::STATUS_OPEN, DeepfakeEscalation::STATUS_RESOLVED], true),
                fn ($query) => $query->where('status', $statusFilter)
            )
            ->with([
                'consultation.patient:id,first_name,last_name',
                'consultation.doctor:id,name',
                'triggeredBy:id,name',
                'resolver:id,name',
            ])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/deepfake-alerts', [
            'alerts' => $alerts,
            'filters' => [
                'status' => $statusFilter,
            ],
        ]);
    }

    public function resolve(Request $request, DeepfakeEscalation $escalation): RedirectResponse
    {
        abort_unless($escalation->type === DeepfakeEscalation::TYPE_ADMIN_ALERT, 404);

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($escalation->status === DeepfakeEscalation::STATUS_RESOLVED) {
            return back()->with('success', 'Alert is already resolved.');
        }

        $escalation->update([
            'status' => DeepfakeEscalation::STATUS_RESOLVED,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
            'notes' => $validated['notes'] ?? $escalation->notes,
        ]);

        return back()->with('success', 'Alert resolved.');
    }
}
