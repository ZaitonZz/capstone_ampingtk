import { Head, Link, router } from '@inertiajs/react';
import { Edit, Trash2, CheckCircle, ShieldCheck, Video } from 'lucide-react';
import * as ConsultationConsentController from '@/actions/App/Http/Controllers/ConsultationConsentController';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import * as ConsultationLobbyController from '@/actions/App/Http/Controllers/ConsultationLobbyController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Consultation, ConsultationStatus } from '@/types/consultation';

const MICROCHECK_VARIANT: Record<
    'pending' | 'claimed' | 'completed' | 'expired',
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    pending: 'outline',
    claimed: 'default',
    completed: 'secondary',
    expired: 'destructive',
};

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
    const microchecks = consultation.microchecks ?? [];
    const deepfakeLogs = consultation.deepfake_scan_logs ?? [];

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
                                    Start Consultation
                                </Link>
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

                <div className="mt-4 rounded-xl border p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-base font-semibold">Microchecks</h2>
                        {consultation.avg_microcheck_latency_ms != null && (
                            <span className="text-sm text-muted-foreground">
                                Average latency:{' '}
                                {Math.round(
                                    consultation.avg_microcheck_latency_ms,
                                )}{' '}
                                ms
                            </span>
                        )}
                    </div>

                    {microchecks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No microchecks recorded yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-left">
                                    <tr>
                                        <th className="px-2 py-2 font-medium">
                                            Status
                                        </th>
                                        <th className="px-2 py-2 font-medium">
                                            Scheduled
                                        </th>
                                        <th className="px-2 py-2 font-medium">
                                            Completed
                                        </th>
                                        <th className="px-2 py-2 font-medium">
                                            Latency
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {microchecks.map((check) => (
                                        <tr key={check.id}>
                                            <td className="px-2 py-2">
                                                <Badge
                                                    variant={
                                                        MICROCHECK_VARIANT[
                                                            check.status
                                                        ]
                                                    }
                                                >
                                                    {check.status
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        check.status.slice(1)}
                                                </Badge>
                                            </td>
                                            <td className="px-2 py-2 text-muted-foreground">
                                                {new Date(
                                                    check.scheduled_at,
                                                ).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 text-muted-foreground">
                                                {check.completed_at
                                                    ? new Date(
                                                          check.completed_at,
                                                      ).toLocaleString()
                                                    : '—'}
                                            </td>
                                            <td className="px-2 py-2 text-muted-foreground">
                                                {check.latency_ms != null
                                                    ? `${check.latency_ms} ms`
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-4 rounded-xl border p-4">
                    <h2 className="mb-3 text-base font-semibold">
                        Deepfake Scan Logs
                    </h2>

                    {deepfakeLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No deepfake scan logs recorded yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-left">
                                    <tr>
                                        <th className="px-2 py-2 font-medium">
                                            Scanned
                                        </th>
                                        <th className="px-2 py-2 font-medium">
                                            Result
                                        </th>
                                        <th className="px-2 py-2 font-medium">
                                            Confidence
                                        </th>
                                        <th className="px-2 py-2 font-medium">
                                            User ID
                                        </th>
                                        <th className="px-2 py-2 font-medium">
                                            Role
                                        </th>
                                        <th className="px-2 py-2 font-medium">
                                            Microcheck
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {deepfakeLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-2 py-2 text-muted-foreground">
                                                {log.scanned_at
                                                    ? new Date(
                                                          log.scanned_at,
                                                      ).toLocaleString()
                                                    : '—'}
                                            </td>
                                            <td className="px-2 py-2">
                                                <Badge
                                                    variant={
                                                        log.result === 'fake'
                                                            ? 'destructive'
                                                            : log.result ===
                                                                'real'
                                                              ? 'secondary'
                                                              : 'outline'
                                                    }
                                                >
                                                    {log.result}
                                                </Badge>
                                            </td>
                                            <td className="px-2 py-2 text-muted-foreground">
                                                {log.confidence_score != null
                                                    ? `${Math.round(log.confidence_score * 100)}%`
                                                    : '—'}
                                            </td>
                                            <td className="px-2 py-2 text-muted-foreground">
                                                {log.user_id ?? '—'}
                                            </td>
                                            <td className="px-2 py-2 text-muted-foreground">
                                                {log.verified_role ?? '—'}
                                            </td>
                                            <td className="px-2 py-2 text-muted-foreground">
                                                {log.microcheck_id ?? '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
