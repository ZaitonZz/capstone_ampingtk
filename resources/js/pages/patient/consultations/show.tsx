import { Head, Link } from '@inertiajs/react';
import { ShieldCheck, Video } from 'lucide-react';
import * as ConsultationConsentController from '@/actions/App/Http/Controllers/ConsultationConsentController';
import * as ConsultationLobbyController from '@/actions/App/Http/Controllers/ConsultationLobbyController';
import * as PatientConsultationController from '@/actions/App/Http/Controllers/PatientConsultationController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Consultation, ConsultationStatus } from '@/types/consultation';

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

interface Props {
    consultation: Consultation;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </span>
            <span className="text-sm">{value ?? '—'}</span>
        </div>
    );
}

export default function PatientConsultationShow({ consultation }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'My Consultations',
            href: PatientConsultationController.index.url(),
        },
        {
            title: `Consultation #${consultation.id}`,
            href: PatientConsultationController.show.url(consultation.id),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Consultation #${consultation.id}`} />

            <div className="mx-auto max-w-3xl p-4 md:p-6">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Consultation #{consultation.id}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            with Dr. {consultation.doctor?.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={
                                STATUS_BADGE_CLASSES[consultation.status]
                            }
                        >
                            {STATUS_LABELS[consultation.status]}
                        </Badge>
                        <Button size="sm" variant="outline" asChild>
                            <Link
                                href={ConsultationConsentController.show.url(
                                    consultation.id,
                                )}
                            >
                                <ShieldCheck className="mr-1 h-4 w-4" />
                                Privacy Notice &amp; Consent
                            </Link>
                        </Button>
                        {consultation.type === 'teleconsultation' && (
                            <Button size="sm" asChild>
                                <Link
                                    href={ConsultationLobbyController.show.url(
                                        consultation.id,
                                    )}
                                >
                                    <Video className="mr-1 h-4 w-4" />
                                    Join
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Details card */}
                <div className="grid grid-cols-2 gap-5 rounded-xl border p-5 md:grid-cols-3">
                    <Field label="Type" value={'Teleconsultation'} />
                    <Field
                        label="Scheduled"
                        value={
                            consultation.scheduled_at
                                ? new Date(
                                      consultation.scheduled_at,
                                  ).toLocaleString()
                                : null
                        }
                    />
                    <Field
                        label="Started"
                        value={
                            consultation.started_at
                                ? new Date(
                                      consultation.started_at,
                                  ).toLocaleString()
                                : null
                        }
                    />
                    <Field
                        label="Ended"
                        value={
                            consultation.ended_at
                                ? new Date(
                                      consultation.ended_at,
                                  ).toLocaleString()
                                : null
                        }
                    />
                    <Field
                        label="Duration"
                        value={
                            consultation.duration_minutes != null
                                ? `${consultation.duration_minutes} min`
                                : null
                        }
                    />
                    <Field
                        label="Doctor Specialty"
                        value={
                            consultation.doctor?.doctor_profile?.specialty ??
                            null
                        }
                    />
                    {consultation.cancellation_reason && (
                        <div className="col-span-full flex flex-col gap-0.5">
                            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                Cancellation Reason
                            </span>
                            <span className="text-sm">
                                {consultation.cancellation_reason}
                            </span>
                        </div>
                    )}
                    {consultation.chief_complaint && (
                        <div className="col-span-full flex flex-col gap-0.5">
                            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                Chief Complaint
                            </span>
                            <p className="text-sm">
                                {consultation.chief_complaint}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
