import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, Plus, Check } from 'lucide-react';
import type { FormEvent} from 'react';
import { useState } from 'react';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type {
    PaginatedConsultations,
    ConsultationStatus,
} from '@/types/consultation';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Consultations', href: ConsultationController.index.url() },
];

const STATUS_LABELS: Record<ConsultationStatus, string> = {
    pending: 'Pending',
    scheduled: 'Scheduled',
    ongoing: 'Ongoing',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
};

const STATUS_VARIANT: Record<
    ConsultationStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    pending: 'outline',
    scheduled: 'default',
    ongoing: 'secondary',
    completed: 'secondary',
    cancelled: 'destructive',
    no_show: 'destructive',
};

interface Filters {
    search?: string;
    status?: string;
    type?: string;
}

interface Props {
    consultations: PaginatedConsultations;
    filters: Filters;
}

export default function ConsultationsIndex({ consultations, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [type, setType] = useState(filters.type ?? '');

    function applyFilters(e: FormEvent) {
        e.preventDefault();
        router.get(
            ConsultationController.index.url(),
            { search, status, type },
            { preserveScroll: true, replace: true },
        );
    }

    function handleApprove(id: number) {
        router.patch(
            ConsultationController.approve.url(id),
            {},
            { preserveScroll: true },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Consultations" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold">Consultations</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={ConsultationController.calendar.url()}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                Open Calendar
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={ConsultationController.create.url()}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Consultation
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <form onSubmit={applyFilters} className="flex flex-wrap gap-3">
                    <Input
                        placeholder="Search patient…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-52"
                    />
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
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
                                    Patient
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
                            {consultations.data.map((c) => (
                                <tr key={c.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3 font-medium">
                                        {c.patient?.full_name ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 capitalize">
                                        {c.type === 'in_person'
                                            ? 'In Person'
                                            : 'Teleconsultation'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={STATUS_VARIANT[c.status]}
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
                                                    href={ConsultationController.show.url(
                                                        c.id,
                                                    )}
                                                >
                                                    View
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={ConsultationController.edit.url(
                                                        c.id,
                                                    )}
                                                >
                                                    Edit
                                                </Link>
                                            </Button>
                                            {c.status === 'pending' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleApprove(c.id)
                                                    }
                                                    className="text-green-600 hover:text-green-700"
                                                >
                                                    <Check className="mr-1 h-3 w-3" />
                                                    Approve
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
