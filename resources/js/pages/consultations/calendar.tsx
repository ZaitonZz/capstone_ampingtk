import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import type { BreadcrumbItem } from '@/types';
import type {
    CalendarEvent,
    ConsultationStatus,
    PatientSummary,
    DoctorSummary,
} from '@/types/consultation';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { useState } from 'react';
import { List, X } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Consultations', href: ConsultationController.index.url() },
    { title: 'Calendar', href: ConsultationController.calendar.url() },
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

const STATUS_COLORS: Record<ConsultationStatus, string> = {
    pending: '#f59e0b',
    scheduled: '#3b82f6',
    ongoing: '#10b981',
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

export default function ConsultationsCalendar({
    events,
    doctors,
    patients,
}: Props) {
    const [selected, setSelected] = useState<SelectedEvent | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        // Navigate to create page pre-filling scheduled_at via query string
        const dt = new Date(info.startStr).toISOString().slice(0, 16);
        router.get(
            ConsultationController.create.url({ query: { scheduled_at: dt } }),
        );
    }

    function handleApprove(id: number) {
        router.patch(
            ConsultationController.approve.url(id),
            {},
            {
                onSuccess: () => setIsDialogOpen(false),
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
                        <Button asChild>
                            <Link href={ConsultationController.create.url()}>
                                + New Consultation
                            </Link>
                        </Button>
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
                        selectable
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
                            <Button size="sm" variant="outline" asChild>
                                <Link
                                    href={ConsultationController.edit.url(
                                        selected.id,
                                    )}
                                >
                                    Edit
                                </Link>
                            </Button>
                            {selected.status === 'pending' && (
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
        </AppLayout>
    );
}
