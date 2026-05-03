import { Head, useForm, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { PatientSummary, DoctorSummary } from '@/types/consultation';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Consultations', href: ConsultationController.index.url() },
    { title: 'New Consultation', href: ConsultationController.create.url() },
];

interface Props {
    patients: PatientSummary[];
    doctors: DoctorSummary[];
    scheduled_at?: string;
}

export default function ConsultationCreate({
    patients,
    doctors,
    scheduled_at = '',
}: Props) {
    const [availableDoctors, setAvailableDoctors] =
        useState<DoctorSummary[]>(doctors);

    const { data, setData, post, processing, errors } = useForm({
        patient_id: '',
        doctor_id: '',
        type: 'teleconsultation' as 'teleconsultation',
        status: 'pending',
        chief_complaint: '',
        scheduled_at,
    });

    const handleScheduledAtChange = (value: string) => {
        setData('scheduled_at', value);
        if (!value) {
            setAvailableDoctors([]);
            setData('doctor_id', '');
        }
    };

    useEffect(() => {
        if (!data.scheduled_at) {
            return;
        }

        const controller = new AbortController();
        let isMounted = true;

        fetch(
            `/consultations/available-doctors?scheduled_at=${encodeURIComponent(data.scheduled_at)}`,
            {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            },
        )
            .then(async (response) => {
                if (!isMounted) return;
                if (!response.ok) {
                    return;
                }

                const payload = (await response.json()) as {
                    doctors?: DoctorSummary[];
                };
                const nextDoctors = payload.doctors ?? [];
                setAvailableDoctors(nextDoctors);

                if (
                    data.doctor_id &&
                    !nextDoctors.some(
                        (doctor) => String(doctor.id) === data.doctor_id,
                    )
                ) {
                    setData('doctor_id', '');
                }
            })
            .catch(() => {
                if (isMounted) {
                    setAvailableDoctors([]);
                }
            });

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [data.scheduled_at, data.doctor_id, setData]);

    function submit(e: FormEvent) {
        e.preventDefault();
        post(ConsultationController.store.url(), {
            onError: () => {
                toast.error('Please fix the errors and try again.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Consultation" />

            <div className="mx-auto max-w-2xl p-4 md:p-6">
                <h1 className="mb-6 text-2xl font-semibold">
                    New Consultation
                </h1>

                <form onSubmit={submit} className="flex flex-col gap-5">
                    {/* Patient */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="patient_id">Patient</Label>
                        <select
                            id="patient_id"
                            value={data.patient_id}
                            onChange={(e) =>
                                setData('patient_id', e.target.value)
                            }
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                        >
                            <option value="">Select patient…</option>
                            {patients.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.full_name ??
                                        `${p.last_name}, ${p.first_name}`}
                                </option>
                            ))}
                        </select>
                        {errors.patient_id && (
                            <p className="text-sm text-destructive">
                                {errors.patient_id}
                            </p>
                        )}
                    </div>

                    {/* Doctor */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="doctor_id">Doctor</Label>
                        <select
                            id="doctor_id"
                            value={data.doctor_id}
                            onChange={(e) =>
                                setData('doctor_id', e.target.value)
                            }
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                            disabled={!data.scheduled_at}
                        >
                            <option value="">
                                {data.scheduled_at
                                    ? 'Select doctor on duty...'
                                    : 'Select schedule first...'}
                            </option>
                            {availableDoctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                    {d.doctor_profile?.specialty
                                        ? ` — ${d.doctor_profile.specialty}`
                                        : ''}
                                </option>
                            ))}
                        </select>
                        {data.scheduled_at && availableDoctors.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No doctors are on duty for the selected schedule.
                            </p>
                        )}
                        {errors.doctor_id && (
                            <p className="text-sm text-destructive">
                                {errors.doctor_id}
                            </p>
                        )}
                    </div>

                    {/* Type */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="type">Type</Label>
                        <select
                            id="type"
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value as 'teleconsultation')}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                        >
                            <option value="teleconsultation">Teleconsultation</option>
                        </select>
                        {errors.type && (
                            <p className="text-sm text-destructive">
                                {errors.type}
                            </p>
                        )}
                    </div>

                    {/* Scheduled At */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="scheduled_at">
                            Scheduled Date & Time
                        </Label>
                        <Input
                            id="scheduled_at"
                            type="datetime-local"
                            value={data.scheduled_at}
                            onChange={(e) =>
                                handleScheduledAtChange(e.target.value)
                            }
                        />
                        {errors.scheduled_at && (
                            <p className="text-sm text-destructive">
                                {errors.scheduled_at}
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
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
                            placeholder="Describe the patient's main concern…"
                        />
                        {errors.chief_complaint && (
                            <p className="text-sm text-destructive">
                                {errors.chief_complaint}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving…' : 'Schedule Consultation'}
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={ConsultationController.index.url()}>
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
