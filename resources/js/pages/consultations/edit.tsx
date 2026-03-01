import { Head, useForm, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type {
    Consultation,
    PatientSummary,
    DoctorSummary,
    ConsultationStatus,
} from '@/types/consultation';

interface Props {
    consultation: Consultation;
    patients: PatientSummary[];
    doctors: DoctorSummary[];
}

function toDatetimeLocal(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return (
        [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0'),
        ].join('-') +
        'T' +
        [
            String(d.getHours()).padStart(2, '0'),
            String(d.getMinutes()).padStart(2, '0'),
        ].join(':')
    );
}

export default function ConsultationEdit({ consultation }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Consultations', href: ConsultationController.index.url() },
        {
            title: consultation.patient?.full_name ?? `#${consultation.id}`,
            href: ConsultationController.show.url(consultation.id),
        },
        {
            title: 'Edit',
            href: ConsultationController.edit.url(consultation.id),
        },
    ];

    const { data, setData, patch, processing, errors } = useForm({
        type: consultation.type,
        status: consultation.status as ConsultationStatus,
        chief_complaint: consultation.chief_complaint ?? '',
        scheduled_at: toDatetimeLocal(consultation.scheduled_at),
        started_at: toDatetimeLocal(consultation.started_at),
        ended_at: toDatetimeLocal(consultation.ended_at),
        cancellation_reason: consultation.cancellation_reason ?? '',
        deepfake_verified: consultation.deepfake_verified ?? null,
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        patch(ConsultationController.update.url(consultation.id));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Consultation" />

            <div className="mx-auto max-w-2xl p-4 md:p-6">
                <h1 className="mb-6 text-2xl font-semibold">
                    Edit Consultation
                </h1>
                <p className="mb-6 text-sm text-muted-foreground">
                    Patient: <strong>{consultation.patient?.full_name}</strong>{' '}
                    &middot; Doctor:{' '}
                    <strong>{consultation.doctor?.name}</strong>
                </p>

                <form onSubmit={submit} className="flex flex-col gap-5">
                    {/* Type */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="type">Type</Label>
                        <select
                            id="type"
                            value={data.type}
                            onChange={(e) =>
                                setData(
                                    'type',
                                    e.target.value as
                                        | 'in_person'
                                        | 'teleconsultation',
                                )
                            }
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                        >
                            <option value="in_person">In Person</option>
                            <option value="teleconsultation">
                                Teleconsultation
                            </option>
                        </select>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="status">Status</Label>
                        <select
                            id="status"
                            value={data.status}
                            onChange={(e) =>
                                setData(
                                    'status',
                                    e.target.value as ConsultationStatus,
                                )
                            }
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                        >
                            <option value="pending">Pending</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                        </select>
                        {errors.status && (
                            <p className="text-sm text-destructive">
                                {errors.status}
                            </p>
                        )}
                    </div>

                    {/* Scheduled At */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="scheduled_at">Scheduled At</Label>
                        <Input
                            id="scheduled_at"
                            type="datetime-local"
                            value={data.scheduled_at}
                            onChange={(e) =>
                                setData('scheduled_at', e.target.value)
                            }
                        />
                    </div>

                    {/* Started At */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="started_at">Started At</Label>
                        <Input
                            id="started_at"
                            type="datetime-local"
                            value={data.started_at}
                            onChange={(e) =>
                                setData('started_at', e.target.value)
                            }
                        />
                    </div>

                    {/* Ended At */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ended_at">Ended At</Label>
                        <Input
                            id="ended_at"
                            type="datetime-local"
                            value={data.ended_at}
                            onChange={(e) =>
                                setData('ended_at', e.target.value)
                            }
                        />
                        {errors.ended_at && (
                            <p className="text-sm text-destructive">
                                {errors.ended_at}
                            </p>
                        )}
                    </div>

                    {/* Chief Complaint */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="chief_complaint">Chief Complaint</Label>
                        <textarea
                            id="chief_complaint"
                            value={data.chief_complaint}
                            onChange={(e) =>
                                setData('chief_complaint', e.target.value)
                            }
                            rows={3}
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                        />
                    </div>

                    {/* Cancellation Reason */}
                    {(data.status === 'cancelled' ||
                        data.status === 'no_show') && (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cancellation_reason">
                                Cancellation Reason
                            </Label>
                            <textarea
                                id="cancellation_reason"
                                value={data.cancellation_reason}
                                onChange={(e) =>
                                    setData(
                                        'cancellation_reason',
                                        e.target.value,
                                    )
                                }
                                rows={2}
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                            />
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving…' : 'Save Changes'}
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link
                                href={ConsultationController.show.url(
                                    consultation.id,
                                )}
                            >
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
