import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BreadcrumbItem } from '@/types';
import type { Consultation, ConsultationStatus } from '@/types/consultation';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import { Edit, Trash2, CheckCircle } from 'lucide-react';

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

export default function ConsultationShow({ consultation }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Consultations', href: ConsultationController.index.url() },
        {
            title: consultation.patient?.full_name ?? `#${consultation.id}`,
            href: ConsultationController.show.url(consultation.id),
        },
    ];

    function handleDelete() {
        if (confirm('Are you sure you want to remove this consultation?')) {
            router.delete(ConsultationController.destroy.url(consultation.id));
        }
    }

    function handleApprove() {
        router.patch(ConsultationController.approve.url(consultation.id));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head
                title={`Consultation — ${consultation.patient?.full_name ?? `#${consultation.id}`}`}
            />

            <div className="mx-auto max-w-3xl p-4 md:p-6">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {consultation.patient?.full_name ??
                                `Consultation #${consultation.id}`}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            with Dr. {consultation.doctor?.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[consultation.status]}>
                            {STATUS_LABELS[consultation.status]}
                        </Badge>
                        {consultation.status === 'pending' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleApprove}
                                className="text-green-600 hover:text-green-700"
                            >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Approve
                            </Button>
                        )}
                        <Button size="sm" variant="outline" asChild>
                            <Link
                                href={ConsultationController.edit.url(
                                    consultation.id,
                                )}
                            >
                                <Edit className="mr-1 h-4 w-4" />
                                Edit
                            </Link>
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Details card */}
                <div className="grid grid-cols-2 gap-5 rounded-xl border p-5 md:grid-cols-3">
                    <Field
                        label="Type"
                        value={
                            consultation.type === 'in_person'
                                ? 'In Person'
                                : 'Teleconsultation'
                        }
                    />
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
                        label="Deepfake Verified"
                        value={
                            consultation.deepfake_verified == null
                                ? null
                                : consultation.deepfake_verified
                                  ? 'Yes'
                                  : 'No'
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

                {/* Teleconsultation token */}
                {consultation.session_token && (
                    <div className="mt-4 rounded-xl border border-dashed p-4">
                        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Session Token
                        </span>
                        <p className="mt-1 font-mono text-sm break-all">
                            {consultation.session_token}
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
