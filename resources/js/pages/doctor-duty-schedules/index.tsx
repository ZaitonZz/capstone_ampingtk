import type { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, CalendarPlus, ClipboardCheck, Clock3, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type DutyStatus = 'on_duty' | 'off_duty' | 'absent' | 'on_leave';
type ScheduleMode = 'single' | 'multiple_dates' | 'recurring_weekly';
type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type DutyRequestType = 'absent' | 'on_leave';
type DutyRequestStatus = 'pending' | 'approved' | 'rejected';

interface DoctorOption {
    id: number;
    name: string;
}

interface DutySchedule {
    id: number;
    doctor_id: number;
    doctor_name: string | null;
    duty_date: string;
    start_time: string;
    end_time: string;
    status: DutyStatus;
    remarks: string | null;
}

interface DutyEvent {
    id: number;
    title: string;
    start: string;
    end: string;
    extendedProps: DutySchedule;
}

interface Props {
    schedules: DutySchedule[];
    events: DutyEvent[];
    doctors: DoctorOption[];
    can_manage_schedule: boolean;
    can_submit_duty_requests: boolean;
    can_review_duty_requests: boolean;
    duty_requests: DutyRequest[];
    pending_duty_requests: DutyRequest[];
}

interface DutyRequest {
    id: number;
    doctor_id: number;
    doctor_name: string | null;
    request_type: DutyRequestType;
    start_date: string;
    end_date: string;
    remarks: string | null;
    status: DutyRequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    reviewer_notes: string | null;
    created_at: string;
}

const STATUS_LABELS: Record<DutyStatus, string> = {
    on_duty: 'On Duty',
    off_duty: 'Off Duty',
    absent: 'Absent',
    on_leave: 'On Leave',
};

const STATUS_COLORS: Record<DutyStatus, string> = {
    on_duty: '#16a34a',
    off_duty: '#6b7280',
    absent: '#dc2626',
    on_leave: '#f59e0b',
};

const STATUS_BADGE_CLASSES: Record<DutyStatus, string> = {
    on_duty: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    off_duty: 'border-slate-300 bg-slate-100 text-slate-700',
    absent: 'border-rose-200 bg-rose-50 text-rose-700',
    on_leave: 'border-amber-200 bg-amber-50 text-amber-700',
};

const MODE_LABELS: Record<ScheduleMode, string> = {
    single: 'Single Date',
    multiple_dates: 'Multiple Dates',
    recurring_weekly: 'Recurring Weekly',
};

const WEEKDAY_LABELS: Record<Weekday, string> = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
};

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const REQUEST_TYPE_LABELS: Record<DutyRequestType, string> = {
    absent: 'Absent',
    on_leave: 'Leave',
};

const REQUEST_STATUS_LABELS: Record<DutyRequestStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
};

const REQUEST_STATUS_BADGE_CLASSES: Record<DutyRequestStatus, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Doctor Duty Calendar', href: '/doctor-duty-schedules' },
];

export default function DoctorDutySchedulesIndex({
    schedules,
    events,
    doctors,
    can_manage_schedule,
    can_submit_duty_requests,
    can_review_duty_requests,
    duty_requests,
    pending_duty_requests,
}: Props) {
    const [selectedSchedule, setSelectedSchedule] = useState<DutySchedule | null>(
        null,
    );
    const [draftDutyDate, setDraftDutyDate] = useState('');
    const [reviewerNotes, setReviewerNotes] = useState<Record<number, string>>({});

    const createForm = useForm({
        doctor_id: '',
        schedule_mode: 'single' as ScheduleMode,
        duty_date: '',
        duty_dates: [] as string[],
        recurring_start_date: '',
        recurring_end_date: '',
        recurring_weekdays: ['mon'] as Weekday[],
        start_time: '08:00',
        end_time: '17:00',
        status: 'on_duty' as DutyStatus,
        remarks: '',
    });

    const editForm = useForm({
        doctor_id: '',
        duty_date: '',
        start_time: '08:00',
        end_time: '17:00',
        status: 'on_duty' as DutyStatus,
        remarks: '',
    });

    const dutyRequestForm = useForm({
        request_type: 'on_leave' as DutyRequestType,
        start_date: '',
        end_date: '',
        remarks: '',
    });

    const calendarEvents = useMemo(
        () =>
            events.map((event) => ({
                ...event,
                id: String(event.id),
                backgroundColor: STATUS_COLORS[event.extendedProps.status],
                borderColor: STATUS_COLORS[event.extendedProps.status],
                textColor: '#ffffff',
            })),
        [events],
    );

    const dashboardStats = useMemo(
        () => [
            {
                label: 'Total Duty Entries',
                value: schedules.length,
                icon: CalendarDays,
            },
            {
                label: 'On Duty',
                value: schedules.filter((schedule) => schedule.status === 'on_duty').length,
                icon: Clock3,
            },
            {
                label: 'Pending Requests',
                value: pending_duty_requests.length,
                icon: ShieldCheck,
            },
        ],
        [pending_duty_requests.length, schedules],
    );

    const hasBothRequestPanels = can_submit_duty_requests && can_review_duty_requests;

    function resetCreateForm() {
        createForm.reset();
        setDraftDutyDate('');
        createForm.setData('schedule_mode', 'single');
        createForm.setData('recurring_weekdays', ['mon']);
        createForm.setData('start_time', '08:00');
        createForm.setData('end_time', '17:00');
    }

    function setScheduleMode(mode: ScheduleMode) {
        createForm.setData('schedule_mode', mode);

        if (mode === 'single') {
            createForm.setData('duty_dates', []);
            createForm.setData('recurring_start_date', '');
            createForm.setData('recurring_end_date', '');
            setDraftDutyDate('');
        }

        if (mode === 'multiple_dates') {
            createForm.setData('duty_date', '');
            createForm.setData('recurring_start_date', '');
            createForm.setData('recurring_end_date', '');
            createForm.setData('recurring_weekdays', ['mon']);
            setDraftDutyDate('');
        }

        if (mode === 'recurring_weekly') {
            createForm.setData('duty_date', '');
            createForm.setData('duty_dates', []);
            setDraftDutyDate('');
        }
    }

    function handleCreateSubmit(e: FormEvent) {
        e.preventDefault();

        createForm.post('/doctor-duty-schedules', {
            onSuccess: () => {
                resetCreateForm();
                toast.success('Duty schedule saved.');
            },
        });
    }

    function openEdit(schedule: DutySchedule) {
        setSelectedSchedule(schedule);
        editForm.setData({
            doctor_id: String(schedule.doctor_id),
            duty_date: schedule.duty_date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            status: schedule.status,
            remarks: schedule.remarks ?? '',
        });
    }

    function handleEditSubmit(e: FormEvent) {
        e.preventDefault();

        if (!selectedSchedule) {
            return;
        }

        editForm.patch(`/doctor-duty-schedules/${selectedSchedule.id}`, {
            onSuccess: () => {
                setSelectedSchedule(null);
                toast.success('Duty schedule updated.');
            },
        });
    }

    function handleDelete(scheduleId: number) {
        if (!confirm('Delete this duty schedule?')) {
            return;
        }

        router.delete(`/doctor-duty-schedules/${scheduleId}`, {
            onSuccess: () => toast.success('Duty schedule deleted.'),
        });
    }

    function addDutyDate(date: string) {
        if (!date) {
            return;
        }

        const normalizedDate = date.slice(0, 10);
        const currentDates = createForm.data.duty_dates;

        createForm.setData(
            'duty_dates',
            currentDates.includes(normalizedDate)
                ? currentDates
                : [...currentDates, normalizedDate].sort(),
        );
        setDraftDutyDate('');
    }

    function removeDutyDate(date: string) {
        createForm.setData(
            'duty_dates',
            createForm.data.duty_dates.filter((value) => value !== date),
        );
    }

    function handleDateClick(info: DateClickArg) {
        if (!can_manage_schedule || createForm.data.schedule_mode !== 'multiple_dates') {
            return;
        }

        const clickedDate = [
            info.date.getFullYear(),
            String(info.date.getMonth() + 1).padStart(2, '0'),
            String(info.date.getDate()).padStart(2, '0'),
        ].join('-');

        addDutyDate(clickedDate);
    }

    function handleEventClick(info: EventClickArg) {
        openEdit(info.event.extendedProps as DutySchedule);
    }

    function setRecurringWeekdays(nextWeekdays: string[]) {
        createForm.setData('recurring_weekdays', nextWeekdays as Weekday[]);
    }

    function handleDutyRequestSubmit(e: FormEvent) {
        e.preventDefault();

        dutyRequestForm.post('/doctor-duty-requests', {
            preserveScroll: true,
            onSuccess: () => {
                dutyRequestForm.reset();
                dutyRequestForm.setData('request_type', 'on_leave');
                toast.success('Duty request submitted.');
            },
            onError: () => {
                toast.error('Unable to submit request. Check the highlighted fields.');
            },
        });
    }

    function reviewDutyRequest(requestId: number, decision: 'approved' | 'rejected') {
        router.patch(
            `/doctor-duty-requests/${requestId}/review`,
            {
                decision,
                reviewer_notes: reviewerNotes[requestId] ?? '',
            },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Request ${decision}.`),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Doctor Duty Calendar" />

            <div className="mx-auto w-full max-w-[1380px] space-y-6 p-4 md:p-6">
                <section className="rounded-2xl border border-emerald-100/70 bg-gradient-to-r from-emerald-50/80 via-background to-green-50/70 p-5 shadow-sm md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Doctor Duty Calendar
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Coordinate duty coverage, weekly recurring schedules, and leave requests in one dashboard.
                            </p>
                        </div>

                        <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[520px]">
                            {dashboardStats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-xl border border-emerald-100 bg-background/80 px-3 py-2.5 shadow-sm"
                                >
                                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        <stat.icon className="h-3.5 w-3.5 text-emerald-600" />
                                        {stat.label}
                                    </div>
                                    <p className="mt-1 text-xl font-semibold text-foreground">
                                        {stat.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">Duty Calendar</h2>
                            <p className="text-sm text-muted-foreground">
                                Primary schedule view. Click an event to edit an existing duty entry.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(STATUS_COLORS) as DutyStatus[]).map((status) => (
                                <span
                                    key={status}
                                    className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                >
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: STATUS_COLORS[status] }}
                                    />
                                    {STATUS_LABELS[status]}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-background p-2 shadow-inner sm:p-3">
                        <div className="doctor-duty-calendar [&_.fc]:text-sm [&_.fc-button]:capitalize [&_.fc-button]:shadow-none [&_.fc-button]:ring-0 [&_.fc-button-primary]:border-emerald-500 [&_.fc-button-primary]:bg-emerald-600 [&_.fc-button-primary]:text-white [&_.fc-button-primary:hover]:bg-emerald-700 [&_.fc-col-header-cell-cushion]:py-2 [&_.fc-event]:rounded-md [&_.fc-event]:border-0 [&_.fc-event]:px-1 [&_.fc-event]:font-medium [&_.fc-scrollgrid]:rounded-lg [&_.fc-scrollgrid]:border-border [&_.fc-timegrid-slot]:h-12">
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="timeGridWeek"
                                allDaySlot={false}
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                                }}
                                slotMinTime="06:00:00"
                                slotMaxTime="20:00:00"
                                slotDuration="01:00:00"
                                events={calendarEvents}
                                eventClick={handleEventClick}
                                dateClick={handleDateClick}
                                height={460}
                            />
                        </div>
                    </div>

                    {can_manage_schedule && createForm.data.schedule_mode === 'multiple_dates' && (
                        <p className="mt-3 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            Tip: while in multiple dates mode, click dates on the calendar to add them instantly.
                        </p>
                    )}
                </section>

                {can_manage_schedule && (
                    <section className="grid gap-4 xl:grid-cols-2">
                        <form
                            onSubmit={handleCreateSubmit}
                            className="rounded-2xl border bg-card p-4 shadow-sm md:p-5"
                        >
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-lg font-semibold">Add Duty Schedule</h2>
                                    <p className="text-xs text-muted-foreground">
                                        Create single, multiple-date, or recurring weekly duty entries.
                                    </p>
                                </div>
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                    {MODE_LABELS[createForm.data.schedule_mode]}
                                </Badge>
                            </div>

                            <div className="grid gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="doctor_id" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Doctor
                                    </Label>
                                    <select
                                        id="doctor_id"
                                        value={createForm.data.doctor_id}
                                        onChange={(e) =>
                                            createForm.setData(
                                                'doctor_id',
                                                e.target.value,
                                            )
                                        }
                                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                    >
                                        <option value="">Select doctor...</option>
                                        {doctors.map((doctor) => (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctor.name}
                                            </option>
                                        ))}
                                    </select>
                                    {createForm.errors.doctor_id && (
                                        <p className="text-sm text-destructive">
                                            {createForm.errors.doctor_id}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Scheduling Mode
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/30 p-1.5 sm:grid-cols-3">
                                        {(Object.keys(MODE_LABELS) as ScheduleMode[]).map(
                                            (mode) => (
                                                <Button
                                                    key={mode}
                                                    type="button"
                                                    size="sm"
                                                    variant={
                                                        createForm.data.schedule_mode === mode
                                                            ? 'default'
                                                            : 'ghost'
                                                    }
                                                    className={
                                                        createForm.data.schedule_mode === mode
                                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                            : 'text-muted-foreground hover:bg-background'
                                                    }
                                                    onClick={() => setScheduleMode(mode)}
                                                >
                                                    {MODE_LABELS[mode]}
                                                </Button>
                                            ),
                                        )}
                                    </div>
                                </div>

                                {createForm.data.schedule_mode === 'single' && (
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="duty_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Duty Date
                                        </Label>
                                        <Input
                                            id="duty_date"
                                            type="date"
                                            className="h-10 rounded-lg"
                                            value={createForm.data.duty_date}
                                            onChange={(e) =>
                                                createForm.setData(
                                                    'duty_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {createForm.errors.duty_date && (
                                            <p className="text-sm text-destructive">
                                                {createForm.errors.duty_date}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {createForm.data.schedule_mode === 'multiple_dates' && (
                                    <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
                                        <div className="flex flex-wrap items-end gap-2">
                                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                <Label htmlFor="draft_duty_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Add Date
                                                </Label>
                                                <Input
                                                    id="draft_duty_date"
                                                    type="date"
                                                    className="h-10 rounded-lg"
                                                    value={draftDutyDate}
                                                    onChange={(e) =>
                                                        setDraftDutyDate(e.target.value)
                                                    }
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10"
                                                onClick={() => addDutyDate(draftDutyDate)}
                                            >
                                                <CalendarPlus className="mr-2 h-4 w-4" />
                                                Add Date
                                            </Button>
                                        </div>

                                        <div className="rounded-lg border bg-background p-3">
                                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Selected Dates
                                            </div>
                                            {createForm.data.duty_dates.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {createForm.data.duty_dates.map((date) => (
                                                        <span
                                                            key={date}
                                                            className="inline-flex items-center gap-2 rounded-full border bg-muted/20 px-3 py-1 text-sm"
                                                        >
                                                            {date}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeDutyDate(date)}
                                                                className="text-muted-foreground hover:text-foreground"
                                                                aria-label={`Remove ${date}`}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    Add one or more dates. Clicking a date on the calendar also adds it here.
                                                </p>
                                            )}
                                        </div>

                                        {createForm.errors.duty_dates && (
                                            <p className="text-sm text-destructive">
                                                {createForm.errors.duty_dates}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {createForm.data.schedule_mode === 'recurring_weekly' && (
                                    <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="recurring_start_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Start Date
                                                </Label>
                                                <Input
                                                    id="recurring_start_date"
                                                    type="date"
                                                    className="h-10 rounded-lg"
                                                    value={createForm.data.recurring_start_date}
                                                    onChange={(e) =>
                                                        createForm.setData(
                                                            'recurring_start_date',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="recurring_end_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    End Date
                                                </Label>
                                                <Input
                                                    id="recurring_end_date"
                                                    type="date"
                                                    className="h-10 rounded-lg"
                                                    value={createForm.data.recurring_end_date}
                                                    onChange={(e) =>
                                                        createForm.setData(
                                                            'recurring_end_date',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weekdays</Label>
                                            <ToggleGroup
                                                type="multiple"
                                                value={createForm.data.recurring_weekdays}
                                                onValueChange={(value) =>
                                                    setRecurringWeekdays(value)
                                                }
                                                className="flex flex-wrap justify-start gap-2"
                                            >
                                                {WEEKDAYS.map((weekday) => (
                                                    <ToggleGroupItem
                                                        key={weekday}
                                                        value={weekday}
                                                        variant="outline"
                                                        size="sm"
                                                        className="min-w-12 rounded-md border-border/80 bg-background data-[state=on]:border-emerald-600 data-[state=on]:bg-emerald-600 data-[state=on]:text-white"
                                                    >
                                                        {WEEKDAY_LABELS[weekday]}
                                                    </ToggleGroupItem>
                                                ))}
                                            </ToggleGroup>
                                            <p className="text-xs text-muted-foreground">
                                                Select one or more weekdays within the date range.
                                            </p>
                                        </div>
                                        {(createForm.errors.recurring_start_date ||
                                            createForm.errors.recurring_end_date ||
                                            createForm.errors.recurring_weekdays) && (
                                                <p className="text-sm text-destructive">
                                                    {createForm.errors.recurring_start_date ||
                                                        createForm.errors.recurring_end_date ||
                                                        createForm.errors.recurring_weekdays}
                                                </p>
                                            )}
                                    </div>
                                )}

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="start_time" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Start Time
                                        </Label>
                                        <Input
                                            id="start_time"
                                            type="time"
                                            className="h-10 rounded-lg"
                                            value={createForm.data.start_time}
                                            onChange={(e) =>
                                                createForm.setData(
                                                    'start_time',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="end_time" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            End Time
                                        </Label>
                                        <Input
                                            id="end_time"
                                            type="time"
                                            className="h-10 rounded-lg"
                                            value={createForm.data.end_time}
                                            onChange={(e) =>
                                                createForm.setData(
                                                    'end_time',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                {(createForm.errors.start_time || createForm.errors.end_time) && (
                                    <p className="text-sm text-destructive">
                                        {createForm.errors.start_time ||
                                            createForm.errors.end_time}
                                    </p>
                                )}

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Status
                                        </Label>
                                        <select
                                            id="status"
                                            value={createForm.data.status}
                                            onChange={(e) =>
                                                createForm.setData(
                                                    'status',
                                                    e.target.value as DutyStatus,
                                                )
                                            }
                                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                        >
                                            {(Object.keys(STATUS_LABELS) as DutyStatus[]).map(
                                                (status) => (
                                                    <option key={status} value={status}>
                                                        {STATUS_LABELS[status]}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        {createForm.errors.status && (
                                            <p className="text-sm text-destructive">
                                                {createForm.errors.status}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="remarks" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Remarks
                                        </Label>
                                        <textarea
                                            id="remarks"
                                            value={createForm.data.remarks}
                                            onChange={(e) =>
                                                createForm.setData('remarks', e.target.value)
                                            }
                                            rows={2}
                                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                            placeholder="Optional notes for this duty schedule"
                                        />
                                    </div>
                                </div>

                                {createForm.errors.schedule_mode && (
                                    <p className="text-sm text-destructive">
                                        {createForm.errors.schedule_mode}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2 border-t pt-3">
                                    <Button type="submit" disabled={createForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                        {createForm.processing
                                            ? 'Saving...'
                                            : 'Save Duty Schedule'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => resetCreateForm()}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </form>

                        <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                            <h2 className="mb-1 text-lg font-semibold">Edit Duty Schedule</h2>
                            <p className="mb-4 text-xs text-muted-foreground">
                                Select any event in the calendar or row in the table to edit details here.
                            </p>

                            {selectedSchedule ? (
                                <form
                                    onSubmit={handleEditSubmit}
                                    className="grid gap-3"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="edit_doctor_id" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Doctor
                                        </Label>
                                        <select
                                            id="edit_doctor_id"
                                            value={editForm.data.doctor_id}
                                            onChange={(e) =>
                                                editForm.setData(
                                                    'doctor_id',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                        >
                                            <option value="">Select doctor...</option>
                                            {doctors.map((doctor) => (
                                                <option
                                                    key={doctor.id}
                                                    value={doctor.id}
                                                >
                                                    {doctor.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <Input
                                            type="date"
                                            className="h-10 rounded-lg"
                                            value={editForm.data.duty_date}
                                            onChange={(e) =>
                                                editForm.setData(
                                                    'duty_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <Input
                                            type="time"
                                            className="h-10 rounded-lg"
                                            value={editForm.data.start_time}
                                            onChange={(e) =>
                                                editForm.setData(
                                                    'start_time',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <Input
                                            type="time"
                                            className="h-10 rounded-lg"
                                            value={editForm.data.end_time}
                                            onChange={(e) =>
                                                editForm.setData(
                                                    'end_time',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>

                                    <select
                                        value={editForm.data.status}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'status',
                                                e.target.value as DutyStatus,
                                            )
                                        }
                                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                    >
                                        {(Object.keys(STATUS_LABELS) as DutyStatus[]).map(
                                            (status) => (
                                                <option key={status} value={status}>
                                                    {STATUS_LABELS[status]}
                                                </option>
                                            ),
                                        )}
                                    </select>

                                    <textarea
                                        value={editForm.data.remarks}
                                        onChange={(e) =>
                                            editForm.setData('remarks', e.target.value)
                                        }
                                        rows={2}
                                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                        placeholder="Optional remarks"
                                    />

                                    {(editForm.errors.doctor_id ||
                                        editForm.errors.duty_date ||
                                        editForm.errors.start_time ||
                                        editForm.errors.end_time ||
                                        editForm.errors.status) && (
                                            <p className="text-sm text-destructive">
                                                {editForm.errors.doctor_id ||
                                                    editForm.errors.duty_date ||
                                                    editForm.errors.start_time ||
                                                    editForm.errors.end_time ||
                                                    editForm.errors.status}
                                            </p>
                                        )}

                                    <div className="flex flex-wrap gap-2 border-t pt-3">
                                        <Button
                                            type="submit"
                                            disabled={editForm.processing}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {editForm.processing
                                                ? 'Saving...'
                                                : 'Update'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                handleDelete(selectedSchedule.id)
                                            }
                                        >
                                            Delete
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setSelectedSchedule(null)}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-5 text-center">
                                    <ClipboardCheck className="h-8 w-8 text-emerald-600" />
                                    <p className="mt-3 text-sm font-medium text-foreground">
                                        No schedule selected
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Click an event in the calendar or use Edit in the schedule list below.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {(can_submit_duty_requests || can_review_duty_requests) && (
                    <section className={hasBothRequestPanels ? 'grid gap-4 xl:grid-cols-2' : 'grid gap-4'}>
                        {can_submit_duty_requests && (
                            <div className="w-full rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                                <h2 className="text-lg font-semibold">Request Leave / Absence</h2>
                                <p className="mb-4 text-xs text-muted-foreground">
                                    Quick request flow for leave and absence. End date defaults to start date if blank.
                                </p>

                                <form onSubmit={handleDutyRequestSubmit} className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="request_type" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request Type</Label>
                                        <select
                                            id="request_type"
                                            value={dutyRequestForm.data.request_type}
                                            onChange={(e) =>
                                                dutyRequestForm.setData('request_type', e.target.value as DutyRequestType)
                                            }
                                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                        >
                                            <option value="on_leave">Leave</option>
                                            <option value="absent">Absent</option>
                                        </select>
                                        {dutyRequestForm.errors.request_type && (
                                            <p className="text-sm text-destructive">
                                                {dutyRequestForm.errors.request_type}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="start_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Date</Label>
                                        <Input
                                            id="start_date"
                                            type="date"
                                            className="h-10 rounded-lg"
                                            value={dutyRequestForm.data.start_date}
                                            onChange={(e) => dutyRequestForm.setData('start_date', e.target.value)}
                                        />
                                        {dutyRequestForm.errors.start_date && (
                                            <p className="text-sm text-destructive">
                                                {dutyRequestForm.errors.start_date}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="end_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End Date (optional)</Label>
                                        <Input
                                            id="end_date"
                                            type="date"
                                            className="h-10 rounded-lg"
                                            value={dutyRequestForm.data.end_date}
                                            onChange={(e) => dutyRequestForm.setData('end_date', e.target.value)}
                                        />
                                        {dutyRequestForm.errors.end_date && (
                                            <p className="text-sm text-destructive">
                                                {dutyRequestForm.errors.end_date}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                                        <Label htmlFor="request_remarks" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason / Remarks</Label>
                                        <textarea
                                            id="request_remarks"
                                            rows={3}
                                            value={dutyRequestForm.data.remarks}
                                            onChange={(e) => dutyRequestForm.setData('remarks', e.target.value)}
                                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                            placeholder="Add reason for leave or absence request"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <Button type="submit" disabled={dutyRequestForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                            {dutyRequestForm.processing ? 'Submitting...' : 'Submit Request'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {can_review_duty_requests && (
                            <div className="w-full rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                                <h2 className="mb-3 text-lg font-semibold">Pending Leave / Absence Requests</h2>

                                {pending_duty_requests.length === 0 ? (
                                    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center">
                                        <p className="text-sm font-medium">No pending requests</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Incoming requests will appear here for review.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pending_duty_requests.map((request) => (
                                            <div key={request.id} className="rounded-xl border bg-background p-3.5 shadow-sm">
                                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="font-medium">
                                                        {request.doctor_name} - {REQUEST_TYPE_LABELS[request.request_type]}
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={REQUEST_STATUS_BADGE_CLASSES[request.status]}
                                                    >
                                                        {REQUEST_STATUS_LABELS[request.status]}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {request.start_date} to {request.end_date}
                                                </p>
                                                {request.remarks && (
                                                    <p className="mt-2 text-sm">{request.remarks}</p>
                                                )}
                                                <div className="mt-3 grid gap-2">
                                                    <Input
                                                        placeholder="Reviewer notes (optional)"
                                                        value={reviewerNotes[request.id] ?? ''}
                                                        onChange={(e) =>
                                                            setReviewerNotes((current) => ({
                                                                ...current,
                                                                [request.id]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-700"
                                                            onClick={() => reviewDutyRequest(request.id, 'approved')}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => reviewDutyRequest(request.id, 'rejected')}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {(can_submit_duty_requests || can_review_duty_requests) && (
                    <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <h2 className="mb-3 text-lg font-semibold">Duty Request History</h2>
                        {duty_requests.length === 0 ? (
                            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                                No duty requests recorded yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full min-w-[760px] text-sm">
                                    <thead className="bg-muted/40">
                                        <tr className="text-left text-muted-foreground">
                                            <th className="px-3 py-2.5">Doctor</th>
                                            <th className="px-3 py-2.5">Type</th>
                                            <th className="px-3 py-2.5">Date Range</th>
                                            <th className="px-3 py-2.5">Status</th>
                                            <th className="px-3 py-2.5">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {duty_requests.map((request) => (
                                            <tr key={request.id} className="border-t align-top hover:bg-muted/20">
                                                <td className="px-3 py-2.5">{request.doctor_name}</td>
                                                <td className="px-3 py-2.5">{REQUEST_TYPE_LABELS[request.request_type]}</td>
                                                <td className="px-3 py-2.5">{request.start_date} - {request.end_date}</td>
                                                <td className="px-3 py-2.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={REQUEST_STATUS_BADGE_CLASSES[request.status]}
                                                    >
                                                        {REQUEST_STATUS_LABELS[request.status]}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2.5">{request.remarks || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                    <h2 className="mb-3 text-lg font-semibold">Duty Schedule List</h2>
                    {schedules.length === 0 ? (
                        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                            No duty schedules in the selected range.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead className="bg-muted/40">
                                    <tr className="text-left text-muted-foreground">
                                        <th className="px-3 py-2.5">Doctor</th>
                                        <th className="px-3 py-2.5">Date</th>
                                        <th className="px-3 py-2.5">Time</th>
                                        <th className="px-3 py-2.5">Status</th>
                                        <th className="px-3 py-2.5">Remarks</th>
                                        {can_manage_schedule && (
                                            <th className="px-3 py-2.5 text-right">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedules.map((schedule) => (
                                        <tr key={schedule.id} className="border-t align-top hover:bg-muted/20">
                                            <td className="px-3 py-2.5 font-medium">{schedule.doctor_name}</td>
                                            <td className="px-3 py-2.5">{schedule.duty_date}</td>
                                            <td className="px-3 py-2.5">
                                                {schedule.start_time} - {schedule.end_time}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <Badge
                                                    variant="outline"
                                                    className={STATUS_BADGE_CLASSES[schedule.status]}
                                                >
                                                    {STATUS_LABELS[schedule.status]}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {schedule.remarks || '-'}
                                            </td>
                                            {can_manage_schedule && (
                                                <td className="px-3 py-2.5 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEdit(schedule)}
                                                    >
                                                        Edit
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

            </div>
        </AppLayout>
    );
}
