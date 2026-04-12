import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ClipboardList,
    ContactRound,
    UserRoundCog,
} from 'lucide-react';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface DashboardMetrics {
    pending_consultations: number;
    todays_consultations: number;
    patients_without_account: number;
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

interface PageProps {
    metrics: DashboardMetrics;
    pending_consultations: PendingConsultation[];
    recent_registrations: RecentRegistration[];
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Medical Staff Dashboard',
        href: '/medicalstaff/dashboard',
    },
];

export default function MedicalStaffDashboardPage() {
    const { metrics, pending_consultations, recent_registrations } =
        usePage<PageProps>().props;

    function approveConsultation(consultationId: number) {
        router.patch(ConsultationController.approve.url(consultationId), {}, {
            preserveScroll: true,
        });
    }

    function rescheduleConsultation(consultation: PendingConsultation) {
        const suggestedDate = consultation.scheduled_at
            ? new Date(consultation.scheduled_at)
                  .toISOString()
                  .slice(0, 16)
            : '';

        const input = window.prompt(
            'Enter new schedule (YYYY-MM-DDTHH:mm)',
            suggestedDate,
        );

        if (!input) {
            return;
        }

        router.patch(
            consultation.reschedule_url,
            { scheduled_at: input },
            { preserveScroll: true },
        );
    }

    function cancelConsultation(consultation: PendingConsultation) {
        const reason = window.prompt('Cancellation reason');

        if (!reason) {
            return;
        }

        router.patch(
            consultation.cancel_url,
            { cancellation_reason: reason },
            { preserveScroll: true },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Medical Staff Dashboard" />

            <div className="space-y-6 p-4 md:p-6">
                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Medical Staff Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Registration, scheduling, and care coordination workspace.
                    </p>
                </section>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Pending Consultations
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                            {metrics.pending_consultations}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Today's Consultations
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                            {metrics.todays_consultations}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Patients Without Login
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                            {metrics.patients_without_account}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <ClipboardList className="h-4 w-4" />
                            Patient Registry
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Register new patients and maintain demographics.
                        </p>
                        <Button asChild className="mt-4 w-full">
                            <Link href="/staff/patients/create">Register Patient</Link>
                        </Button>
                        <Button asChild variant="outline" className="mt-2 w-full">
                            <Link href="/staff/patients">Open Patient List</Link>
                        </Button>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <ContactRound className="h-4 w-4" />
                            Consultation Desk
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Manage scheduling and pending consultation approvals.
                        </p>
                        <Button asChild className="mt-4 w-full">
                            <Link href="/consultations">Open Consultations</Link>
                        </Button>
                        <Button asChild variant="outline" className="mt-2 w-full">
                            <Link href="/consultations/calendar">Open Calendar</Link>
                        </Button>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <CalendarDays className="h-4 w-4" />
                            Care Coordination
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Monitor today's load and prioritize pending operations.
                        </p>
                        <Button asChild variant="outline" className="mt-4 w-full">
                            <Link href={ConsultationController.calendar.url()}>
                                View Workload Calendar
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                            <UserRoundCog className="h-4 w-4" />
                            Pending Consultation Approvals
                        </div>

                        <div className="space-y-2">
                            {pending_consultations.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No pending consultations.
                                </p>
                            )}

                            {pending_consultations.map((consultation) => (
                                <div
                                    key={consultation.id}
                                    className="rounded-xl border p-3"
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

                                    <div className="mt-3 flex gap-2">
                                        <Button
                                            size="sm"
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
                                            onClick={() =>
                                                rescheduleConsultation(
                                                    consultation,
                                                )
                                            }
                                        >
                                            Reschedule
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                cancelConsultation(consultation)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button size="sm" variant="outline" asChild>
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
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                            <ClipboardList className="h-4 w-4" />
                            Recent Patient Registrations
                        </div>

                        <div className="space-y-2">
                            {recent_registrations.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No recent patient registrations.
                                </p>
                            )}

                            {recent_registrations.map((patient) => (
                                <div key={patient.id} className="rounded-xl border p-3">
                                    <p className="text-sm font-medium">{patient.name}</p>
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
                </div>
            </div>
        </AppLayout>
    );
}
