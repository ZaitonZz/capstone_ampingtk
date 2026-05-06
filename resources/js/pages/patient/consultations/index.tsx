import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import * as PatientConsultationController from '@/actions/App/Http/Controllers/PatientConsultationController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type {
    PaginatedConsultations,
    ConsultationStatus,
} from '@/types/consultation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'My Consultations',
        href: PatientConsultationController.index.url(),
    },
];

const STATUS_LABELS: Record<ConsultationStatus, string> = {
    pending: 'Pending',
    scheduled: 'Scheduled',
    ongoing: 'Ongoing',
    paused: 'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
};

const STATUS_BADGE_CLASSES: Record<ConsultationStatus, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
    ongoing: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    paused: 'border-orange-200 bg-orange-50 text-orange-700',
    completed: 'border-slate-300 bg-slate-100 text-slate-700',
    cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
    no_show: 'border-red-200 bg-red-50 text-red-700',
};

interface Filters {
    status?: string;
    type?: string;
}

interface Props {
    consultations: PaginatedConsultations;
    filters: Filters;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isScheduledForToday(scheduledAt: string | null): boolean {
    if (!scheduledAt) return false;
    const scheduledTime = new Date(scheduledAt).getTime();
    if (Number.isNaN(scheduledTime)) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTomorrow = startOfToday + ONE_DAY_MS;

    return scheduledTime >= startOfToday && scheduledTime < startOfTomorrow;
}

export default function PatientConsultationsIndex({
    consultations,
    filters,
}: Props) {
    const [status, setStatus] = useState(filters.status ?? '');
    const [type, setType] = useState(filters.type ?? '');

    function applyFilters(e: FormEvent) {
        e.preventDefault();
        router.get(
            PatientConsultationController.index.url(),
            { status, type },
            { preserveScroll: true, replace: true },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Consultations" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold">My Consultations</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link
                                href={PatientConsultationController.calendar.url()}
                            >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                Open Calendar
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <form onSubmit={applyFilters} className="flex flex-wrap gap-3">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        aria-label="Filter by status"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                    >
                        <option value="">All statuses</option>
                        {(
                            Object.keys(STATUS_LABELS) as ConsultationStatus[]
                        ).map((s) => (
                            <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                            </option>
                        ))}
                    </select>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        aria-label="Filter by type"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                    >
                        <option value="">All types</option>
                        <option value="in_person">In Person</option>
                        <option value="teleconsultation">
                            Teleconsultation
                        </option>
                    </select>
                    <Button type="submit" variant="secondary" size="sm">
                        Filter
                    </Button>
                </form>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">
                                    Doctor
                                </th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Scheduled
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Chief Complaint
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {consultations.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        No consultations found.
                                    </td>
                                </tr>
                            )}
                            {consultations.data.map((c) => {
                                const isFinalStatus =
                                    c.status === 'completed' ||
                                    c.status === 'cancelled' ||
                                    c.status === 'no_show';
                                const isToday = !isFinalStatus && isScheduledForToday(c.scheduled_at ?? null);

                                return (
                                <tr
                                    key={c.id}
                                    className={
                                        isToday
                                            ? 'border-l-4 border-l-blue-500 bg-blue-50/60 hover:bg-blue-100/70 dark:border-l-blue-400 dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
                                            : 'hover:bg-muted/30'
                                    }
                                >
                                    <td className="px-4 py-3 font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>Dr. {c.doctor?.name ?? '—'}</span>
                                            {isToday && (
                                                <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                                                    Today
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 capitalize">
                                        {c.type === 'in_person'
                                            ? 'In Person'
                                            : 'Teleconsultation'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant="outline"
                                            className={STATUS_BADGE_CLASSES[c.status]}
                                        >
                                            {STATUS_LABELS[c.status]}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {c.scheduled_at
                                            ? new Date(
                                                c.scheduled_at,
                                            ).toLocaleString()
                                            : '—'}
                                    </td>
                                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                                        {c.chief_complaint ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={PatientConsultationController.show.url(
                                                        c.id,
                                                    )}
                                                >
                                                    View
                                                </Link>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {consultations.last_page > 1 && (
                    <div className="flex items-center justify-center gap-1">
                        {consultations.links.map((link, i) => (
                            <Button
                                key={i}
                                variant={link.active ? 'default' : 'ghost'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.get(
                                        link.url,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
