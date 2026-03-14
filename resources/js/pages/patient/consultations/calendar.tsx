import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { Head } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import { X, CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import * as PatientConsultationController from '@/actions/App/Http/Controllers/PatientConsultationController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type {
    CalendarEvent,
    ConsultationStatus,
    DoctorSummary,
} from '@/types/consultation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'My Appointments',
        href: PatientConsultationController.calendar.url(),
    },
];

const STATUS_LABELS: Record<ConsultationStatus, string> = {
    pending: 'Pending Review',
    scheduled: 'Confirmed',
    ongoing: 'In Progress',
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

const STATUS_COLORS: Record<ConsultationStatus, string> = {
    pending: '#f59e0b',
    scheduled: '#3b82f6',
    ongoing: '#10b981',
    completed: '#6b7280',
    cancelled: '#ef4444',
    no_show: '#dc2626',
};

interface SelectedEvent {
    title: string;
    status: ConsultationStatus;
    type: string;
    chief_complaint: string | null;
    specialty: string | null;
    start: string;
}

interface Props {
    events: CalendarEvent[];
    doctors: DoctorSummary[];
}

export default function PatientConsultationCalendar({
    events,
    doctors,
}: Props) {
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(
        null,
    );

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

    const { data, setData, post, processing, errors, reset } = useForm({
        doctor_id: '',
        type: 'in_person' as 'in_person' | 'teleconsultation',
        chief_complaint: '',
        scheduled_at: '',
    });

    function openRequestModal(date?: string) {
        setData('scheduled_at', date ?? '');
        setIsRequestModalOpen(true);
    }

    function handleDateClick(info: DateClickArg) {
        const dt =
            info.dateStr.length === 10
                ? `${info.dateStr}T09:00`
                : info.dateStr.slice(0, 16);
        openRequestModal(dt);
    }

    function handleEventClick(info: any) {
        const props = info.event
            .extendedProps as CalendarEvent['extendedProps'];
        setSelectedEvent({
            title: info.event.title,
            status: props.status,
            type: props.type,
            chief_complaint: props.chief_complaint,
            specialty: props.specialty ?? null,
            start: info.event.startStr,
        });
    }

    function submitRequest(e: FormEvent) {
        e.preventDefault();
        post(PatientConsultationController.store.url(), {
            onSuccess: () => {
                reset();
                setIsRequestModalOpen(false);
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Appointments" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold">My Appointments</h1>
                    <Button onClick={() => openRequestModal()}>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Request Appointment
                    </Button>
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
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth',
                        }}
                        events={calendarEvents}
                        dateClick={handleDateClick}
                        eventClick={(info) => handleEventClick(info)}
                        height="auto"
                        nowIndicator
                    />
                </div>
            </div>

            {/* Event detail panel */}
            {selectedEvent && (
                <div className="fixed right-6 bottom-6 z-40 w-72 rounded-xl border bg-background p-4 shadow-lg">
                    <div className="mb-2 flex items-start justify-between">
                        <h3 className="font-semibold">Appointment Details</h3>
                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">
                                Doctor:{' '}
                            </span>
                            {selectedEvent.title}
                            {selectedEvent.specialty &&
                                ` (${selectedEvent.specialty})`}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                                Status:
                            </span>
                            <Badge
                                variant={STATUS_VARIANT[selectedEvent.status]}
                            >
                                {STATUS_LABELS[selectedEvent.status]}
                            </Badge>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Type:{' '}
                            </span>
                            {selectedEvent.type === 'in_person'
                                ? 'In Person'
                                : 'Teleconsultation'}
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Date:{' '}
                            </span>
                            {new Date(selectedEvent.start).toLocaleString()}
                        </div>
                        {selectedEvent.chief_complaint && (
                            <div>
                                <span className="text-muted-foreground">
                                    Complaint:{' '}
                                </span>
                                {selectedEvent.chief_complaint}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Request appointment modal */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsRequestModalOpen(false)}
                    />
                    <div className="relative z-10 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                Request an Appointment
                            </h2>
                            <button
                                onClick={() => setIsRequestModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={submitRequest}
                            className="flex flex-col gap-4"
                        >
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
                                >
                                    <option value="">Select doctor…</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                            {d.doctor_profile?.specialty
                                                ? ` — ${d.doctor_profile.specialty}`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.doctor_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.doctor_id}
                                    </p>
                                )}
                            </div>

                            {/* Type */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="req_type">
                                    Consultation Type
                                </Label>
                                <select
                                    id="req_type"
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

                            {/* Preferred Date */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="scheduled_at">
                                    Preferred Date & Time
                                </Label>
                                <Input
                                    id="scheduled_at"
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

                            {/* Complaint */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="req_complaint">
                                    Chief Complaint{' '}
                                    <span className="text-muted-foreground">
                                        (optional)
                                    </span>
                                </Label>
                                <textarea
                                    id="req_complaint"
                                    value={data.chief_complaint}
                                    onChange={(e) =>
                                        setData(
                                            'chief_complaint',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                    className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    placeholder="Briefly describe your concern..."
                                />
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Your request will be reviewed by the medical
                                staff and confirmed shortly.
                            </p>

                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1"
                                >
                                    {processing
                                        ? 'Submitting..'
                                        : 'Submit Request'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsRequestModalOpen(false)}
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
