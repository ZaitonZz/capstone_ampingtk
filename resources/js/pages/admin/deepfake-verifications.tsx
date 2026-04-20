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
import * as AdminDeepfakeVerificationsRoute from '@/routes/admin/deepfake-verifications';
import type { BreadcrumbItem } from '@/types';

type VerificationStatus = 'matched' | 'mismatch';
type VerifiedRole = 'patient' | 'doctor';
type FlaggedState = 'flagged' | 'unflagged';

type DeepfakeVerificationItem = {
    id: number;
    consultation_id: number;
    user_id: number | null;
    verified_role: VerifiedRole | null;
    matched: boolean;
    face_match_score: number | string;
    flagged: boolean;
    checked_at: string | null;
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
    user?: {
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
    deepfakeVerificationLogs: PaginatedData<DeepfakeVerificationItem>;
    filters: {
        search?: string | null;
        status?: VerificationStatus | null;
        verified_role?: VerifiedRole | null;
        flagged?: FlaggedState | null;
    };
    options: {
        statuses: VerificationStatus[];
        verified_roles: VerifiedRole[];
        flagged_states: FlaggedState[];
    };
};

const STATUS_LABEL: Record<VerificationStatus, string> = {
    matched: 'Matched',
    mismatch: 'Mismatch',
};

const ROLE_LABEL: Record<VerifiedRole, string> = {
    patient: 'Patient',
    doctor: 'Doctor',
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminDashboard(),
    },
    {
        title: 'Deepfake Verification',
        href: AdminDeepfakeVerificationsRoute.index(),
    },
];

function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString();
}

function formatScore(value: number | string): string {
    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) {
        return '—';
    }

    return `${(parsedValue * 100).toFixed(1)}%`;
}

function displayPersonName(person?: { first_name: string; last_name: string } | null): string {
    if (!person) {
        return '—';
    }

    return `${person.first_name} ${person.last_name}`.trim();
}

export default function AdminDeepfakeVerifications({
    deepfakeVerificationLogs,
    filters,
    options,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [roleFilter, setRoleFilter] = useState(filters.verified_role ?? 'all');
    const [flaggedFilter, setFlaggedFilter] = useState(filters.flagged ?? 'all');

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            AdminDeepfakeVerificationsRoute.index(),
            {
                search: search || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                verified_role: roleFilter !== 'all' ? roleFilter : undefined,
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
            AdminDeepfakeVerificationsRoute.index(),
            {
                page,
                search: search || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                verified_role: roleFilter !== 'all' ? roleFilter : undefined,
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
            <Head title="Deepfake Verification" />

            <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Deepfake Verification</h1>
                    <p className="text-sm text-muted-foreground">
                        Face verification outcomes, confidence score, and risk decisions per consultation.
                    </p>
                </div>

                <form onSubmit={applyFilters} className="rounded-xl border p-4">
                    <div className="grid gap-3 md:grid-cols-5">
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
                                placeholder="Record, consultation, patient, doctor, or user"
                            />
                        </div>

                        <div>
                            <Label htmlFor="status_filter" className="mb-2 block">
                                Result
                            </Label>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) =>
                                    setStatusFilter(value as VerificationStatus | 'all')
                                }
                            >
                                <SelectTrigger id="status_filter">
                                    <SelectValue placeholder="All results" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All results</SelectItem>
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
                                Verified Role
                            </Label>
                            <Select
                                value={roleFilter}
                                onValueChange={(value) =>
                                    setRoleFilter(value as VerifiedRole | 'all')
                                }
                            >
                                <SelectTrigger id="role_filter">
                                    <SelectValue placeholder="All roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All roles</SelectItem>
                                    {options.verified_roles.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {ROLE_LABEL[role]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="flagged_filter" className="mb-2 block">
                                Risk
                            </Label>
                            <Select
                                value={flaggedFilter}
                                onValueChange={(value) =>
                                    setFlaggedFilter(value as FlaggedState | 'all')
                                }
                            >
                                <SelectTrigger id="flagged_filter">
                                    <SelectValue placeholder="All risk levels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All risk levels</SelectItem>
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
                    {deepfakeVerificationLogs.data.length === 0 ? (
                        <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                            <span>No deepfake verification records match this filter.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">ID</th>
                                        <th className="px-3 py-2 font-medium">Consultation</th>
                                        <th className="px-3 py-2 font-medium">Patient</th>
                                        <th className="px-3 py-2 font-medium">Verified User</th>
                                        <th className="px-3 py-2 font-medium">Role</th>
                                        <th className="px-3 py-2 font-medium">Result</th>
                                        <th className="px-3 py-2 font-medium">Score</th>
                                        <th className="px-3 py-2 font-medium">Risk</th>
                                        <th className="px-3 py-2 font-medium">Checked</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {deepfakeVerificationLogs.data.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                #{log.id}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                Consultation #{log.consultation_id}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {displayPersonName(log.consultation?.patient)}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {log.user?.name ?? '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {log.verified_role ? (
                                                    <Badge variant="outline">
                                                        {ROLE_LABEL[log.verified_role]}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant={log.matched ? 'secondary' : 'destructive'}>
                                                    {log.matched ? STATUS_LABEL.matched : STATUS_LABEL.mismatch}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {formatScore(log.face_match_score)}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant={log.flagged ? 'destructive' : 'secondary'}>
                                                    {log.flagged ? 'Flagged' : 'Clear'}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                <div className="space-y-1">
                                                    <div>{formatDateTime(log.checked_at)}</div>
                                                    <div className="text-xs text-muted-foreground/80">
                                                        Created {formatDateTime(log.created_at)}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {deepfakeVerificationLogs.total > 0 && deepfakeVerificationLogs.from !== null && deepfakeVerificationLogs.to !== null && (
                    <Pagination
                        currentPage={deepfakeVerificationLogs.current_page}
                        lastPage={deepfakeVerificationLogs.last_page}
                        from={deepfakeVerificationLogs.from}
                        to={deepfakeVerificationLogs.to}
                        total={deepfakeVerificationLogs.total}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </AppLayout>
    );
}
