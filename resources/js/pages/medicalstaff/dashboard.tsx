import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    CalendarClock,
    CalendarDays,
    ClipboardList,
    ContactRound,
    UserPlus,
    UserRoundCog,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface DashboardMetrics {
    pending_consultations: number;
    todays_consultations: number;
    patients_without_account: number;
    pending_duty_requests: number;
}

interface PendingConsultation {
    id: number;
    patient_name: string;
    doctor_name: string;
    type: 'in_person' | 'teleconsultation';
    scheduled_at: string | null;
    reschedule_url: string;
    cancel_url: string;
}

interface RecentRegistration {
    id: number;
    name: string;
    registered_at: string | null;
    has_account: boolean;
}

interface DutyRequest {
    id: number;
    doctor_name: string;
    request_type: 'absent' | 'on_leave';
    start_date: string | null;
    end_date: string | null;
    remarks: string | null;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: string | null;
    reviewed_at: string | null;
    reviewer_notes: string | null;
    created_at: string | null;
}

interface PageProps {
    metrics: DashboardMetrics;
    pending_consultations: PendingConsultation[];
    recent_registrations: RecentRegistration[];
    duty_requests: DutyRequest[];
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Medical Staff Dashboard',
        href: '/medicalstaff/dashboard',
    },
];

const DUTY_REQUEST_TYPE_LABELS: Record<DutyRequest['request_type'], string> = {
    absent: 'Absent',
    on_leave: 'Leave',
};

const DUTY_REQUEST_STATUS_VARIANT: Record<DutyRequest['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    approved: 'secondary',
    rejected: 'destructive',
};

function toDatetimeLocal(iso: string | null): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);

    return (
        [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
        ].join('-') +
        'T' +
        [
            String(date.getHours()).padStart(2, '0'),
            String(date.getMinutes()).padStart(2, '0'),
        ].join(':')
    );
}

export default function MedicalStaffDashboardPage() {
    const { metrics, pending_consultations, recent_registrations, duty_requests } =
        usePage<PageProps>().props;
    const [rescheduleDrafts, setRescheduleDrafts] = useState<Record<number, string>>({});
    const [cancelReasonDrafts, setCancelReasonDrafts] = useState<Record<number, string>>({});

    function approveConsultation(consultationId: number) {
        router.patch(
            ConsultationController.approve.url(consultationId),
            {},
            {
                preserveScroll: true,
            },
        );
    }

    function rescheduleConsultation(consultation: PendingConsultation) {
        const input =
            rescheduleDrafts[consultation.id] ??
            toDatetimeLocal(consultation.scheduled_at);

        if (!input) {
            toast.error('Enter a new schedule first.');
            return;
        }

        router.patch(
            consultation.reschedule_url,
            { scheduled_at: input },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Consultation rescheduled.');
                    setRescheduleDrafts((current) => ({
                        ...current,
                        [consultation.id]: '',
                    }));
                },
            },
        );
    }

    function cancelConsultation(consultation: PendingConsultation) {
        const reason = cancelReasonDrafts[consultation.id] ?? '';

        if (!reason.trim()) {
            toast.error('Add a cancellation reason first.');
            return;
        }

        router.patch(
            consultation.cancel_url,
            { cancellation_reason: reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Consultation cancelled.');
                    setCancelReasonDrafts((current) => ({
                        ...current,
                        [consultation.id]: '',
                    }));
                },
            },
        );
    }

    function reviewDutyRequest(requestId: number, decision: 'approved' | 'rejected') {
        router.patch(
            `/doctor-duty-requests/${requestId}/review`,
            {
                decision,
                reviewer_notes: '',
            },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Request ${decision}.`),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Medical Staff Dashboard" />

            <div className="mx-auto w-full max-w-[1320px] space-y-6 p-4 md:p-6">
                <section className="rounded-2xl border border-emerald-100/70 bg-gradient-to-r from-emerald-50/80 via-background to-cyan-50/70 p-5 shadow-sm md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Medical Staff Dashboard
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Registration, consultation scheduling, and care coordination workspace.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-background/80 px-3 py-1.5 text-xs font-medium text-emerald-700">
                            <Activity className="h-3.5 w-3.5" />
                            AMPING_TK Operations View
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            <CalendarClock className="h-4 w-4 text-emerald-600" />
                            Pending Consultations
                        </div>
                        <p className="mt-2 text-3xl font-semibold">
                            {metrics.pending_consultations}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            <CalendarDays className="h-4 w-4 text-emerald-600" />
                            Today's Consultations
                        </div>
                        <p className="mt-2 text-3xl font-semibold">
                            {metrics.todays_consultations}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            <UserPlus className="h-4 w-4 text-emerald-600" />
                            Patients Without Login
                        </div>
                        <p className="mt-2 text-3xl font-semibold">
                            {metrics.patients_without_account}
                        </p>
                    </div>
                </div>

                <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">Leave / Absence Requests</h2>
                            <p className="text-sm text-muted-foreground">
                                Review doctor-submitted leave and absence requests here.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            Pending: {metrics.pending_duty_requests}
                        </div>
                    </div>

                    {duty_requests.length === 0 ? (
                        <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                            No leave or absence requests yet.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {duty_requests.map((request) => (
                                <div key={request.id} className="rounded-xl border bg-background p-4 shadow-sm">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {request.doctor_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {DUTY_REQUEST_TYPE_LABELS[request.request_type]} · {request.start_date}
                                                {request.end_date && request.end_date !== request.start_date ? ` to ${request.end_date}` : ''}
                                            </p>
                                        </div>
                                        <Badge variant={DUTY_REQUEST_STATUS_VARIANT[request.status]}>
                                            {request.status}
                                        </Badge>
                                    </div>

                                    {request.remarks && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {request.remarks}
                                        </p>
                                    )}

                                    {request.status === 'pending' ? (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() => reviewDutyRequest(request.id, 'approved')}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => reviewDutyRequest(request.id, 'rejected')}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            Reviewed by {request.reviewed_by ?? 'N/A'}
                                            {request.reviewed_at ? ` on ${new Date(request.reviewed_at).toLocaleString()}` : ''}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <ClipboardList className="h-4 w-4" />
                            Patient Registry
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Register new patients and maintain demographics.
                        </p>
                        <Button asChild className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700">
                            <Link href="/staff/patients/create">
                                Register Patient
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="mt-2 w-full"
                        >
                            <Link href="/staff/patients">
                                Open Patient List
                            </Link>
                        </Button>
                    </div>

                    <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <ContactRound className="h-4 w-4" />
                            Consultation Desk
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Manage scheduling and pending consultation
                            approvals.
                        </p>
                        <Button asChild className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700">
                            <Link href="/consultations">
                                Open Consultations
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="mt-2 w-full"
                        >
                            <Link href="/consultations/calendar">
                                Open Calendar
                            </Link>
                        </Button>
                    </div>

                    <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <CalendarDays className="h-4 w-4" />
                            Care Coordination
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Monitor today's load and prioritize pending
                            operations.
                        </p>
                        <Button
                            asChild
                            variant="outline"
                            className="mt-4 w-full"
                        >
                            <Link href={ConsultationController.calendar.url()}>
                                View Workload Calendar
                            </Link>
                        </Button>
                    </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                            <UserRoundCog className="h-4 w-4" />
                            Pending Consultation Approvals
                        </div>

                        <div className="space-y-2">
                            {pending_consultations.length === 0 && (
                                <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                                    No pending consultations.
                                </div>
                            )}

                            {pending_consultations.map((consultation) => (
                                <div
                                    key={consultation.id}
                                    className="rounded-xl border bg-background p-3.5 shadow-sm"
                                >
                                    <p className="text-sm font-medium">
                                        {consultation.patient_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Doctor: {consultation.doctor_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {consultation.type === 'in_person'
                                            ? 'In Person'
                                            : 'Teleconsultation'}
                                        {' · '}
                                        {consultation.scheduled_at
                                            ? new Date(
                                                consultation.scheduled_at,
                                            ).toLocaleString()
                                            : 'No schedule yet'}
                                    </p>

                                    <div className="mt-3 grid gap-3">
                                        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                                            <div className="grid gap-1">
                                                <Label
                                                    htmlFor={`reschedule-${consultation.id}`}
                                                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                                >
                                                    New Schedule
                                                </Label>
                                                <Input
                                                    id={`reschedule-${consultation.id}`}
                                                    type="datetime-local"
                                                    value={
                                                        rescheduleDrafts[consultation.id] ??
                                                        toDatetimeLocal(consultation.scheduled_at)
                                                    }
                                                    onChange={(e) =>
                                                        setRescheduleDrafts((current) => ({
                                                            ...current,
                                                            [consultation.id]: e.target.value,
                                                        }))
                                                    }
                                                    className="h-10 rounded-lg"
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    rescheduleConsultation(
                                                        consultation,
                                                    )
                                                }
                                            >
                                                Reschedule
                                            </Button>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                                            <div className="grid gap-1">
                                                <Label
                                                    htmlFor={`cancel-${consultation.id}`}
                                                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                                >
                                                    Cancellation Reason
                                                </Label>
                                                <Input
                                                    id={`cancel-${consultation.id}`}
                                                    placeholder="Enter reason"
                                                    value={cancelReasonDrafts[consultation.id] ?? ''}
                                                    onChange={(e) =>
                                                        setCancelReasonDrafts((current) => ({
                                                            ...current,
                                                            [consultation.id]: e.target.value,
                                                        }))
                                                    }
                                                    className="h-10 rounded-lg"
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    cancelConsultation(consultation)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() =>
                                                    approveConsultation(
                                                        consultation.id,
                                                    )
                                                }
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                            >
                                                <Link
                                                    href={ConsultationController.show.url(
                                                        consultation.id,
                                                    )}
                                                >
                                                    View
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                            <ClipboardList className="h-4 w-4" />
                            Recent Patient Registrations
                        </div>

                        <div className="space-y-2">
                            {recent_registrations.length === 0 && (
                                <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                                    No recent patient registrations.
                                </div>
                            )}

                            {recent_registrations.map((patient) => (
                                <div
                                    key={patient.id}
                                    className="rounded-xl border bg-background p-3.5 shadow-sm"
                                >
                                    <p className="text-sm font-medium">
                                        {patient.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Registered:{' '}
                                        {patient.registered_at
                                            ? new Date(
                                                patient.registered_at,
                                            ).toLocaleString()
                                            : '—'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Account:{' '}
                                        {patient.has_account
                                            ? 'Has login account'
                                            : 'Walk-in (no account)'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
