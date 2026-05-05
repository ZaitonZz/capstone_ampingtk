import { Head, Link, router } from '@inertiajs/react';
import { Filter, History } from 'lucide-react';
import type { FormEvent} from 'react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { dashboard as adminDashboard } from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';
import * as AdminActivityLogsRoute from '@/routes/admin/activity-logs';

type ActivityLogItem = {
    id: number;
    event: string;
    description: string | null;
    subject_type: string | null;
    subject_id: number | null;
    ip_address: string | null;
    created_at: string;
    actor?: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
};

type Props = {
    logs: PaginatedData<ActivityLogItem>;
    filters: {
        search?: string | null;
        type?: string | null;
        date?: string | null;
    };
    options: {
        types: string[];
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminDashboard(),
    },
    {
        title: 'Activity Logs',
        href: AdminActivityLogsRoute.index(),
    },
];

function eventBadgeVariant(event: string): 'default' | 'secondary' | 'destructive' {
    if (event.includes('failed') || event.includes('denied') || event.includes('deleted')) {
        return 'destructive';
    }

    if (event.startsWith('auth.')) {
        return 'secondary';
    }
    return 'default';
}

function formatSubject(subjectType: string | null, subjectId: number | null): string {
    if (!subjectType || !subjectId) {
        return '—';
    }

    const segments = subjectType.split('\\');
    const modelName = segments[segments.length - 1] ?? subjectType;

    return `${modelName} #${subjectId}`;
}

export default function AdminActivityLogs({ logs, filters, options }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [typeFilter, setTypeFilter] = useState(filters.type ?? 'all');
    const [dateFilter, setDateFilter] = useState(filters.date ?? '');

    const hasActiveFilters = useMemo(
        () => search !== '' || typeFilter !== 'all' || dateFilter !== '',
        [search, typeFilter, dateFilter],
    );

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            AdminActivityLogsRoute.index(),
            {
                search: search || undefined,
                type: typeFilter !== 'all' ? typeFilter : undefined,
                date: dateFilter || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Logs" />

            <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold">Activity Logs</h1>
                    <p className="text-sm text-muted-foreground">
                        Review recent admin-relevant system activity and audit trail entries.
                    </p>
                </div>

                <form onSubmit={applyFilters} className="rounded-xl border p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="search" className="mb-2 block">
                                Search
                            </Label>
                            <Input
                                id="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Actor, event, or description"
                            />
                        </div>

                        <div>
                            <Label htmlFor="type_filter" className="mb-2 block">
                                Event Type
                            </Label>
                            <select
                                id="type_filter"
                                value={typeFilter}
                                onChange={(event) => setTypeFilter(event.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="all">All types</option>
                                {options.types.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="date_filter" className="mb-2 block">
                                Date
                            </Label>
                            <Input
                                id="date_filter"
                                type="date"
                                value={dateFilter}
                                onChange={(event) => setDateFilter(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                        {hasActiveFilters ? (
                            <Button asChild variant="outline" size="sm">
                                <Link href={AdminActivityLogsRoute.index()}>Clear</Link>
                            </Button>
                        ) : null}
                        <Button type="submit" variant="secondary" size="sm">
                            <Filter className="mr-1 h-4 w-4" />
                            Apply Filters
                        </Button>
                    </div>
                </form>

                <div className="rounded-xl border">
                    {logs.data.length === 0 ? (
                        <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                            <History className="h-5 w-5" />
                            <span>No activity logs match the current filters.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">ID</th>
                                        <th className="px-3 py-2 font-medium">Actor</th>
                                        <th className="px-3 py-2 font-medium">Event</th>
                                        <th className="px-3 py-2 font-medium">Description</th>
                                        <th className="px-3 py-2 font-medium">Target</th>
                                        <th className="px-3 py-2 font-medium">IP Address</th>
                                        <th className="px-3 py-2 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {logs.data.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-3 py-2 text-muted-foreground">#{log.id}</td>
                                            <td className="px-3 py-2">
                                                {log.actor ? (
                                                    <div>
                                                        <div className="font-medium">{log.actor.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {log.actor.email}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">System</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant={eventBadgeVariant(log.event)}>
                                                    {log.event}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {log.description || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {formatSubject(log.subject_type, log.subject_id)}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {log.ip_address || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {logs.last_page > 1 ? (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                        {logs.links.map((link, index) => (
                            <Button
                                key={`${link.label}-${index}`}
                                variant={link.active ? 'default' : 'ghost'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.get(link.url, {}, { preserveScroll: true })
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </AppLayout>
    );
}
