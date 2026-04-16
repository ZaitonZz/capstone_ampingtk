<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class AdminActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $typeFilter = trim($request->string('type')->toString());
        $dateFilter = trim($request->string('date')->toString());

        if (! Schema::hasTable('activity_logs')) {
            $logs = new LengthAwarePaginator(
                items: [],
                total: 0,
                perPage: 15,
                currentPage: max(1, $request->integer('page', 1)),
                options: [
                    'path' => $request->url(),
                    'query' => $request->query(),
                ]
            );

            return Inertia::render('admin/activity-logs', [
                'logs' => $logs,
                'filters' => [
                    'search' => $search !== '' ? $search : null,
                    'type' => $typeFilter !== '' ? $typeFilter : null,
                    'date' => $dateFilter !== '' ? $dateFilter : null,
                ],
                'options' => [
                    'types' => [],
                ],
            ]);
        }

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
                'types' => ActivityLog::query()
                    ->select('event')
                    ->distinct()
                    ->orderBy('event')
                    ->pluck('event'),
            ],
        ]);
    }
}
