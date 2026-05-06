import { Head, router } from '@inertiajs/react';
import type { FormEvent} from 'react';
import { useState } from 'react';
import Pagination from '@/components/patients/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { dashboard as adminDashboard } from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';
import * as AdminDeepfakeLogsRoute from '@/routes/admin/deepfake-logs';

type DeepfakeResult = 'real' | 'fake' | 'inconclusive';
type FlaggedState = 'flagged' | 'unflagged';

type DeepfakeLogItem = {
    id: number;
    consultation_id: number;
    microcheck_id: number | null;
    user_id: number | null;
    verified_role: string | null;
    result: DeepfakeResult;
    confidence_score: number | null;
    flagged: boolean;
    reviewed_by: number | null;
    reviewed_at: string | null;
    reviewer_notes: string | null;
    scanned_at: string;
    created_at: string;
    consultation?: {
        id: number;
        patient?: {
            first_name: string;
            last_name: string;
        } | null;
        doctor?: {
            name: string;
        } | null;
    } | null;
    microcheck?: {
        id: number;
        target_role: string | null;
        status: string;
        scheduled_at: string;
        completed_at: string | null;
    } | null;
    detectedUser?: {
        id: number;
        name: string;
    } | null;
    reviewer?: {
        id: number;
        name: string;
    } | null;
};

type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    deepfakeLogs: PaginatedData<DeepfakeLogItem>;
    filters: {
        search?: string | null;
        result?: DeepfakeResult | null;
        flagged?: FlaggedState | null;
    };
    options: {
        results: DeepfakeResult[];
        flagged_states: FlaggedState[];
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminDashboard(),
    },
    {
        title: 'Deepfake Logs',
        href: AdminDeepfakeLogsRoute.index(),
    },
];

const RESULT_VARIANT: Record<DeepfakeResult, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    real: 'secondary',
    fake: 'destructive',
    inconclusive: 'outline',
};

const RESULT_LABEL: Record<DeepfakeResult, string> = {
    real: 'Real',
    fake: 'Fake',
    inconclusive: 'Inconclusive',
};

function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString();
}

function formatConfidence(value: number | null): string {
    if (value === null) {
        return '—';
    }

    return `${(value * 100).toFixed(1)}%`;
}

function displayPersonName(person?: { first_name: string; last_name: string } | null): string {
    if (!person) {
        return '—';
    }

    return `${person.first_name} ${person.last_name}`.trim();
}

export default function AdminDeepfakeLogs({
    deepfakeLogs,
    filters,
    options,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [resultFilter, setResultFilter] = useState(filters.result ?? 'all');
    const [flaggedFilter, setFlaggedFilter] = useState(filters.flagged ?? 'all');

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            AdminDeepfakeLogsRoute.index(),
            {
                search: search || undefined,
                result: resultFilter !== 'all' ? resultFilter : undefined,
                flagged: flaggedFilter !== 'all' ? flaggedFilter : undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function handlePageChange(page: number) {
        router.get(
            AdminDeepfakeLogsRoute.index(),
            {
                page,
                search: search || undefined,
                result: resultFilter !== 'all' ? resultFilter : undefined,
                flagged: flaggedFilter !== 'all' ? flaggedFilter : undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Deepfake Logs" />

            <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Deepfake Logs</h1>
                    <p className="text-sm text-muted-foreground">
                        Scan results, confidence scores, review actions, and risk flags.
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
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Log, consultation, microcheck, user, or model version"
                            />
                        </div>

                        <div>
                            <Label htmlFor="result_filter" className="mb-2 block">
                                Result
                            </Label>
                            <Select
                                value={resultFilter}
                                onValueChange={(value) =>
                                    setResultFilter(value as DeepfakeResult | 'all')
                                }
                            >
                                <SelectTrigger id="result_filter">
                                    <SelectValue placeholder="All results" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All results</SelectItem>
                                    {options.results.map((result) => (
                                        <SelectItem key={result} value={result}>
                                            {RESULT_LABEL[result]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="flagged_filter" className="mb-2 block">
                                Flagged
                            </Label>
                            <Select
                                value={flaggedFilter}
                                onValueChange={(value) =>
                                    setFlaggedFilter(value as FlaggedState | 'all')
                                }
                            >
                                <SelectTrigger id="flagged_filter">
                                    <SelectValue placeholder="All flags" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All flags</SelectItem>
                                    {options.flagged_states.map((state) => (
                                        <SelectItem key={state} value={state}>
                                            {state === 'flagged' ? 'Flagged' : 'Unflagged'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                        <Button type="submit">Apply Filters</Button>
                    </div>
                </form>

                <div className="overflow-hidden rounded-xl border">
                    {deepfakeLogs.data.length === 0 ? (
                        <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                            <span>No deepfake logs match this filter.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">ID</th>
                                        <th className="px-3 py-2 font-medium">Consultation / Microcheck</th>
                                        <th className="px-3 py-2 font-medium">Patient</th>
                                        <th className="px-3 py-2 font-medium">Detected User</th>
                                        <th className="px-3 py-2 font-medium">Result</th>
                                        <th className="px-3 py-2 font-medium">Confidence</th>
                                        <th className="px-3 py-2 font-medium">Action / Risk</th>
                                        <th className="px-3 py-2 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {deepfakeLogs.data.map((log) => {
                                        const actionLabel = log.reviewed_at
                                            ? `Reviewed by ${log.reviewer?.name ?? 'Unknown'}`
                                            : log.flagged
                                                ? 'Flagged for review'
                                                : 'Clear';

                                        return (
                                            <tr key={log.id}>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    #{log.id}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    <div className="space-y-1">
                                                        <div>Consultation #{log.consultation_id}</div>
                                                        <div className="text-xs text-muted-foreground/80">
                                                            Microcheck #{log.microcheck_id ?? '—'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {displayPersonName(log.consultation?.patient)}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {log.detectedUser?.name ?? '—'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Badge variant={RESULT_VARIANT[log.result]}>
                                                        {RESULT_LABEL[log.result]}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {formatConfidence(log.confidence_score)}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    <div className="space-y-1">
                                                        <div>{actionLabel}</div>
                                                        <div className="text-xs text-muted-foreground/80">
                                                            {log.reviewer_notes ?? '—'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    <div className="space-y-1">
                                                        <div>{formatDateTime(log.created_at)}</div>
                                                        <div className="text-xs text-muted-foreground/80">
                                                            Scanned {formatDateTime(log.scanned_at)}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {deepfakeLogs.total > 0 && deepfakeLogs.from !== null && deepfakeLogs.to !== null && (
                    <Pagination
                        currentPage={deepfakeLogs.current_page}
                        lastPage={deepfakeLogs.last_page}
                        from={deepfakeLogs.from}
                        to={deepfakeLogs.to}
                        total={deepfakeLogs.total}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </AppLayout>
    );
}