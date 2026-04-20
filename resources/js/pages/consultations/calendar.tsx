import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { List, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type {
    CalendarEvent,
    ConsultationStatus,
    PatientSummary,
    DoctorSummary,
} from '@/types/consultation';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Consultations', href: ConsultationController.index.url() },
    { title: 'Calendar', href: ConsultationController.calendar.url() },
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

const STATUS_VARIANT: Record<
    ConsultationStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    pending: 'outline',
    scheduled: 'default',
    ongoing: 'secondary',
    paused: 'outline',
    completed: 'secondary',
    cancelled: 'destructive',
    no_show: 'destructive',
};

const STATUS_COLORS: Record<ConsultationStatus, string> = {
    pending: '#f59e0b',
    scheduled: '#3b82f6',
    ongoing: '#10b981',
    paused: '#f97316',
    completed: '#6b7280',
    cancelled: '#ef4444',
    no_show: '#dc2626',
};

interface SelectedEvent {
    id: number;
    title: string;
    status: ConsultationStatus;
    type: string;
    chief_complaint: string | null;
    doctor_name: string | null;
    start: string;
}

interface Props {
    events: CalendarEvent[];
    doctors: DoctorSummary[];
    patients: PatientSummary[];
}

function dutyLabel(doctor: DoctorSummary): string {
    if (doctor.on_duty_today) {
        return 'On Duty Today';
    }

    if (doctor.on_duty_this_week) {
        return 'On Duty This Week';
    }

    return 'Off Duty';
}

export default function ConsultationsCalendar({
    events,
    doctors,
    patients,
}: Props) {
    const role = usePage().props.auth.user.role as string;
    const canManageSchedules = role === 'medicalstaff';
    const [selected, setSelected] = useState<SelectedEvent | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        patient_id: '',
        doctor_id: '',
        type: 'in_person' as 'in_person' | 'teleconsultation',
        status: 'scheduled',
        chief_complaint: '',
        scheduled_at: '',
    });

    function openCreateModal(scheduledAt = '') {
        reset();
        setData('scheduled_at', scheduledAt);
        setIsCreateOpen(true);
    }

    function handleCreateSubmit(e: FormEvent) {
        e.preventDefault();
        post(
            ConsultationController.store.url({
                query: { _return_to: 'calendar' },
            }),
            {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    reset();
                },
                onError: () => {
                    toast.error('Please fix the errors and try again.');
                },
            },
        );
    }

    // Map events to FullCalendar format with colors
    const calendarEvents = events.map((e) => ({
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end ?? undefined,
        backgroundColor: STATUS_COLORS[e.extendedProps.status],
        borderColor: STATUS_COLORS[e.extendedProps.status],
        textColor: '#ffffff',
        extendedProps: e.extendedProps,
    }));

    function handleEventClick(info: EventClickArg) {
        const props = info.event
            .extendedProps as CalendarEvent['extendedProps'];
        setSelected({
            id: props.consultation_id,
            title: info.event.title,
            status: props.status,
            type: props.type,
            chief_complaint: props.chief_complaint,
            doctor_name: props.doctor_name ?? null,
            start: info.event.startStr,
        });
        setIsDialogOpen(true);
    }

    function handleDateSelect(info: DateSelectArg) {
        const d = new Date(info.startStr);
        const dt =
            [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, '0'),
                String(d.getDate()).padStart(2, '0'),
            ].join('-') +
            'T' +
            [
                String(d.getHours()).padStart(2, '0'),
                String(d.getMinutes()).padStart(2, '0'),
            ].join(':');
        openCreateModal(dt);
    }

    function handleApprove(id: number) {
        router.patch(
            ConsultationController.approve.url(id),
            {},
            {
                onSuccess: () => setIsDialogOpen(false),
                onError: () => toast.error('Failed to approve consultation.'),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Consultation Calendar" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold">Calendar</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={ConsultationController.index.url()}>
                                <List className="mr-2 h-4 w-4" />
                                All Consultations
                            </Link>
                        </Button>
                        {canManageSchedules && (
                            <Button onClick={() => openCreateModal()}>
                                + New Consultation
                            </Button>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-sm">
                    {(Object.keys(STATUS_COLORS) as ConsultationStatus[]).map(
                        (s) => (
                            <span key={s} className="flex items-center gap-1.5">
                                <span
                                    className="inline-block h-3 w-3 rounded-sm"
                                    style={{
                                        backgroundColor: STATUS_COLORS[s],
                                    }}
                                />
                                {STATUS_LABELS[s]}
                            </span>
                        ),
                    )}
                </div>

                {/* Calendar */}
                <div className="rounded-xl border bg-background p-4">
                    <FullCalendar
                        plugins={[
                            dayGridPlugin,
                            timeGridPlugin,
                            interactionPlugin,
                        ]}
                        initialView="timeGridWeek"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay',
                        }}
                        events={calendarEvents}
                        selectable={canManageSchedules}
                        select={handleDateSelect}
                        eventClick={handleEventClick}
                        height="auto"
                        nowIndicator
                    />
                </div>
            </div>

            {/* Event detail dialog */}
            {isDialogOpen && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsDialogOpen(false)}
                    />
                    <div className="relative z-10 w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg">
                        <div className="mb-4 flex items-start justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    {selected.title}
                                </h2>
                                {selected.doctor_name && (
                                    <p className="text-sm text-muted-foreground">
                                        Dr. {selected.doctor_name}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setIsDialogOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                    Status:
                                </span>
                                <Badge
                                    variant={STATUS_VARIANT[selected.status]}
                                >
                                    {STATUS_LABELS[selected.status]}
                                </Badge>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Type:{' '}
                                </span>
                                {selected.type === 'in_person'
                                    ? 'In Person'
                                    : 'Teleconsultation'}
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Scheduled:{' '}
                                </span>
                                {new Date(selected.start).toLocaleString()}
                            </div>
                            {selected.chief_complaint && (
                                <div>
                                    <span className="text-muted-foreground">
                                        Chief Complaint:{' '}
                                    </span>
                                    {selected.chief_complaint}
                                </div>
                            )}
                        </div>

                        <div className="mt-5 flex gap-2">
                            <Button size="sm" asChild>
                                <Link
                                    href={ConsultationController.show.url(
                                        selected.id,
                                    )}
                                >
                                    View Details
                                </Link>
                            </Button>
                            {canManageSchedules && (
                                <Button size="sm" variant="outline" asChild>
                                    <Link
                                        href={ConsultationController.edit.url(
                                            selected.id,
                                        )}
                                    >
                                        Edit
                                    </Link>
                                </Button>
                            )}
                            {canManageSchedules && selected.status === 'pending' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => handleApprove(selected.id)}
                                >
                                    Approve
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Consultation modal */}
            {canManageSchedules && isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsCreateOpen(false)}
                    />
                    <div className="relative z-10 w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                New Consultation
                            </h2>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleCreateSubmit}
                            className="flex flex-col gap-4"
                        >
                            {/* Patient */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="modal_patient_id">
                                    Patient
                                </Label>
                                <select
                                    id="modal_patient_id"
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
                                <Label htmlFor="modal_doctor_id">
                                    Select Doctor on Duty
                                </Label>
                                <select
                                    id="modal_doctor_id"
                                    value={data.doctor_id}
                                    onChange={(e) =>
                                        setData('doctor_id', e.target.value)
                                    }
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                                >
                                    <option value="">
                                        Select doctor on duty…
                                    </option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                            {d.doctor_profile?.specialty
                                                ? ` — ${d.doctor_profile.specialty}`
                                                : ''}
                                            {` (${dutyLabel(d)})`}
                                        </option>
                                    ))}
                                </select>
                                {doctors.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No doctors are currently on duty in this schedule window.
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
                                <Label htmlFor="modal_type">Type</Label>
                                <select
                                    id="modal_type"
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
                                {errors.type && (
                                    <p className="text-sm text-destructive">
                                        {errors.type}
                                    </p>
                                )}
                            </div>

                            {/* Scheduled At */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="modal_scheduled_at">
                                    Scheduled Date &amp; Time
                                </Label>
                                <Input
                                    id="modal_scheduled_at"
                                    type="datetime-local"
                                    value={data.scheduled_at}
                                    onChange={(e) =>
                                        setData('scheduled_at', e.target.value)
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
                                <Label htmlFor="modal_chief_complaint">
                                    Chief Complaint
                                </Label>
                                <textarea
                                    id="modal_chief_complaint"
                                    value={data.chief_complaint}
                                    onChange={(e) =>
                                        setData(
                                            'chief_complaint',
                                            e.target.value,
                                        )
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

                            <div className="flex gap-3 pt-1">
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? 'Saving…'
                                        : 'Schedule Consultation'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsCreateOpen(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
