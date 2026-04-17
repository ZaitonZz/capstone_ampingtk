<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $typeFilter = trim($request->string('type')->toString());
        $dateFilter = trim($request->string('date')->toString());

        $logs = ActivityLog::query()
            ->with(['actor:id,name,email'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('event', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('actor', function ($actorQuery) use ($search): void {
                            $actorQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->when($typeFilter !== '', fn ($query) => $query->where('event', $typeFilter))
            ->when(
                preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFilter) === 1,
                fn ($query) => $query->whereDate('created_at', $dateFilter)
            )
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/activity-logs', [
            'logs' => $logs,
            'filters' => [
                'search' => $search !== '' ? $search : null,
                'type' => $typeFilter !== '' ? $typeFilter : null,
                'date' => $dateFilter !== '' ? $dateFilter : null,
            ],
            'options' => [
                'types' => cache()->remember('activity_log_event_types', now()->addMinutes(10), function () {
                    return ActivityLog::query()
                        ->select('event')
                        ->distinct()
                        ->orderBy('event')
                        ->pluck('event');
                }),
            ],
        ]);
    }
}
