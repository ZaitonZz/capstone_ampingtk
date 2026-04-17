import { Head, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
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
import * as AdminMicrocheckLogsRoute from '@/routes/admin/microcheck-logs';
import type { BreadcrumbItem } from '@/types';

type MicrocheckStatus = 'pending' | 'claimed' | 'completed' | 'expired';
type MicrocheckTargetRole = 'patient' | 'doctor';

type MicrocheckLogItem = {
    id: number;
    consultation_id: number;
    cycle_key: string | null;
    target_role: MicrocheckTargetRole | null;
    status: MicrocheckStatus;
    scheduled_at: string;
    claimed_at: string | null;
    completed_at: string | null;
    expires_at: string | null;
    latency_ms: number | null;
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
    microcheckLogs: PaginatedData<MicrocheckLogItem>;
    filters: {
        search?: string | null;
        status?: MicrocheckStatus | null;
        target_role?: MicrocheckTargetRole | null;
    };
    options: {
        statuses: MicrocheckStatus[];
        target_roles: MicrocheckTargetRole[];
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminDashboard(),
    },
    {
        title: 'Microcheck Logs',
        href: AdminMicrocheckLogsRoute.index(),
    },
];

const STATUS_VARIANT: Record<MicrocheckStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    claimed: 'outline',
    completed: 'default',
    expired: 'destructive',
};

const STATUS_LABEL: Record<MicrocheckStatus, string> = {
    pending: 'Pending',
    claimed: 'Claimed',
    completed: 'Completed',
    expired: 'Expired',
};

const ROLE_LABEL: Record<MicrocheckTargetRole, string> = {
    patient: 'Patient',
    doctor: 'Doctor',
};

function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString();
}

function formatLatency(value: number | null): string {
    if (value === null) {
        return '—';
    }

    if (value < 1000) {
        return `${value} ms`;
    }

    return `${(value / 1000).toFixed(1)} s`;
}

function displayPersonName(person?: { first_name: string; last_name: string } | null): string {
    if (!person) {
        return '—';
    }

    return `${person.first_name} ${person.last_name}`.trim();
}

export default function AdminMicrocheckLogs({
    microcheckLogs,
    filters,
    options,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [roleFilter, setRoleFilter] = useState(filters.target_role ?? 'all');

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            AdminMicrocheckLogsRoute.index(),
            {
                search: search || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                target_role: roleFilter !== 'all' ? roleFilter : undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function handlePageChange(page: number) {
        router.get(
            AdminMicrocheckLogsRoute.index(),
            {
                page,
                search: search || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                target_role: roleFilter !== 'all' ? roleFilter : undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Microcheck Logs" />

            <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Microcheck Logs</h1>
                    <p className="text-sm text-muted-foreground">
                        Audit trail of consultation microcheck claims, statuses, and latency.
                    </p>
                </div>

                <form onSubmit={applyFilters} className="rounded-xl border p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="search" className="mb-2 block">
                                Search
                            </Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="pl-9"
                                    placeholder="Log, consultation, patient, doctor, or cycle key"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="status_filter" className="mb-2 block">
                                Status
                            </Label>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) =>
                                    setStatusFilter(value as MicrocheckStatus | 'all')
                                }
                            >
                                <SelectTrigger id="status_filter">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {options.statuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {STATUS_LABEL[status]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="role_filter" className="mb-2 block">
                                Target Role
                            </Label>
                            <Select
                                value={roleFilter}
                                onValueChange={(value) =>
                                    setRoleFilter(value as MicrocheckTargetRole | 'all')
                                }
                            >
                                <SelectTrigger id="role_filter">
                                    <SelectValue placeholder="All roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All roles</SelectItem>
                                    {options.target_roles.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {ROLE_LABEL[role]}
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
                    {microcheckLogs.data.length === 0 ? (
                        <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                            <span>No microcheck logs match this filter.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">ID</th>
                                        <th className="px-3 py-2 font-medium">Consultation / Cycle</th>
                                        <th className="px-3 py-2 font-medium">Patient</th>
                                        <th className="px-3 py-2 font-medium">Doctor</th>
                                        <th className="px-3 py-2 font-medium">Target Role</th>
                                        <th className="px-3 py-2 font-medium">Status</th>
                                        <th className="px-3 py-2 font-medium">Latency</th>
                                        <th className="px-3 py-2 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {microcheckLogs.data.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                #{log.id}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                <div className="space-y-1">
                                                    <div>Consultation #{log.consultation_id}</div>
                                                    <div className="text-xs text-muted-foreground/80">
                                                        Cycle {log.cycle_key ?? '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {displayPersonName(log.consultation?.patient)}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {log.consultation?.doctor?.name ?? '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {log.target_role ? (
                                                    <Badge variant="outline">
                                                        {ROLE_LABEL[log.target_role]}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant={STATUS_VARIANT[log.status]}>
                                                    {STATUS_LABEL[log.status]}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {formatLatency(log.latency_ms)}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {formatDateTime(log.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {microcheckLogs.total > 0 && microcheckLogs.from !== null && microcheckLogs.to !== null && (
                    <Pagination
                        currentPage={microcheckLogs.current_page}
                        lastPage={microcheckLogs.last_page}
                        from={microcheckLogs.from}
                        to={microcheckLogs.to}
                        total={microcheckLogs.total}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </AppLayout>
    );
}