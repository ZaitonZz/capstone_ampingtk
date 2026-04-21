import type { DateClickArg, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarPlus, X } from 'lucide-react';
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

const REQUEST_STATUS_VARIANT: Record<
    DutyRequestStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    pending: 'outline',
    approved: 'secondary',
    rejected: 'destructive',
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
                backgroundColor: STATUS_COLORS[event.extendedProps.status],
                borderColor: STATUS_COLORS[event.extendedProps.status],
                textColor: '#ffffff',
            })),
        [events],
    );

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

        dutyRequestForm
            .transform((data) => ({
                ...data,
                end_date: data.end_date || data.start_date,
            }))
            .post('/doctor-duty-requests', {
                onSuccess: () => {
                    dutyRequestForm.reset();
                    dutyRequestForm.setData('request_type', 'on_leave');
                    dutyRequestForm.transform((data) => data);
                    toast.success('Duty request submitted.');
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

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Doctor Duty Calendar
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage individual duty entries or bulk-generate schedules.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                    {(Object.keys(STATUS_COLORS) as DutyStatus[]).map((status) => (
                        <span key={status} className="flex items-center gap-1.5">
                            <span
                                className="inline-block h-3 w-3 rounded-sm"
                                style={{ backgroundColor: STATUS_COLORS[status] }}
                            />
                            {STATUS_LABELS[status]}
                        </span>
                    ))}
                </div>

                <div className="rounded-xl border bg-background p-4">
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
                    {can_manage_schedule && createForm.data.schedule_mode === 'multiple_dates' && (
                        <p className="mt-3 text-sm text-muted-foreground">
                            Click dates on the calendar to add them to the selected dates list.
                        </p>
                    )}
                </div>

                {can_submit_duty_requests && (
                    <div className="rounded-xl border bg-gradient-to-r from-sky-50 via-background to-cyan-50 p-4">
                        <h2 className="mb-4 text-lg font-semibold">
                            Request Leave / Absence
                        </h2>
                        <p className="mb-4 text-xs text-muted-foreground">
                            Quick request: choose type, set start date, and submit. End date defaults to start date when left blank.
                        </p>

                        <form onSubmit={handleDutyRequestSubmit} className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="request_type">Request Type</Label>
                                <select
                                    id="request_type"
                                    value={dutyRequestForm.data.request_type}
                                    onChange={(e) =>
                                        dutyRequestForm.setData('request_type', e.target.value as DutyRequestType)
                                    }
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
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
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
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
                                <Label htmlFor="end_date">End Date (optional)</Label>
                                <Input
                                    id="end_date"
                                    type="date"
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
                                <Label htmlFor="request_remarks">Reason / Remarks</Label>
                                <textarea
                                    id="request_remarks"
                                    rows={3}
                                    value={dutyRequestForm.data.remarks}
                                    onChange={(e) => dutyRequestForm.setData('remarks', e.target.value)}
                                    className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    placeholder="Add reason for leave or absence request"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <Button type="submit" disabled={dutyRequestForm.processing}>
                                    {dutyRequestForm.processing ? 'Submitting...' : 'Submit Request'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {can_review_duty_requests && (
                    <div className="rounded-xl border bg-background p-4">
                        <h2 className="mb-4 text-lg font-semibold">Pending Leave / Absence Requests</h2>

                        {pending_duty_requests.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending requests.</p>
                        ) : (
                            <div className="space-y-3">
                                {pending_duty_requests.map((request) => (
                                    <div key={request.id} className="rounded-lg border p-3">
                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                            <div className="font-medium">
                                                {request.doctor_name} - {REQUEST_TYPE_LABELS[request.request_type]}
                                            </div>
                                            <Badge variant={REQUEST_STATUS_VARIANT[request.status]}>
                                                {request.status}
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

                {(can_submit_duty_requests || can_review_duty_requests) && (
                    <div className="rounded-xl border bg-background p-4">
                        <h2 className="mb-3 text-lg font-semibold">Duty Request History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="py-2">Doctor</th>
                                        <th className="py-2">Type</th>
                                        <th className="py-2">Date Range</th>
                                        <th className="py-2">Status</th>
                                        <th className="py-2">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duty_requests.map((request) => (
                                        <tr key={request.id} className="border-b">
                                            <td className="py-2">{request.doctor_name}</td>
                                            <td className="py-2">{REQUEST_TYPE_LABELS[request.request_type]}</td>
                                            <td className="py-2">{request.start_date} - {request.end_date}</td>
                                            <td className="py-2">
                                                <Badge variant={REQUEST_STATUS_VARIANT[request.status]}>
                                                    {request.status}
                                                </Badge>
                                            </td>
                                            <td className="py-2">{request.remarks || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {can_manage_schedule && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <form
                            onSubmit={handleCreateSubmit}
                            className="rounded-xl border bg-background p-4"
                        >
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <h2 className="text-lg font-semibold">
                                    Add Duty Schedule
                                </h2>
                                <Badge variant="outline">
                                    {MODE_LABELS[createForm.data.schedule_mode]}
                                </Badge>
                            </div>

                            <div className="grid gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="doctor_id">Doctor</Label>
                                    <select
                                        id="doctor_id"
                                        value={createForm.data.doctor_id}
                                        onChange={(e) =>
                                            createForm.setData(
                                                'doctor_id',
                                                e.target.value,
                                            )
                                        }
                                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
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
                                    <Label>Scheduling Mode</Label>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        {(Object.keys(MODE_LABELS) as ScheduleMode[]).map(
                                            (mode) => (
                                                <Button
                                                    key={mode}
                                                    type="button"
                                                    variant={
                                                        createForm.data.schedule_mode === mode
                                                            ? 'default'
                                                            : 'outline'
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
                                        <Label htmlFor="duty_date">Duty Date</Label>
                                        <Input
                                            id="duty_date"
                                            type="date"
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
                                    <div className="grid gap-3">
                                        <div className="flex flex-wrap items-end gap-2">
                                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                <Label htmlFor="draft_duty_date">
                                                    Add Date
                                                </Label>
                                                <Input
                                                    id="draft_duty_date"
                                                    type="date"
                                                    value={draftDutyDate}
                                                    onChange={(e) =>
                                                        setDraftDutyDate(e.target.value)
                                                    }
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => addDutyDate(draftDutyDate)}
                                            >
                                                <CalendarPlus className="mr-2 h-4 w-4" />
                                                Add Date
                                            </Button>
                                        </div>

                                        <div className="rounded-lg border bg-muted/30 p-3">
                                            <div className="mb-2 text-sm font-medium">
                                                Selected Dates
                                            </div>
                                            {createForm.data.duty_dates.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {createForm.data.duty_dates.map((date) => (
                                                        <span
                                                            key={date}
                                                            className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm"
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
                                    <div className="grid gap-3">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="recurring_start_date">
                                                    Start Date
                                                </Label>
                                                <Input
                                                    id="recurring_start_date"
                                                    type="date"
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
                                                <Label htmlFor="recurring_end_date">
                                                    End Date
                                                </Label>
                                                <Input
                                                    id="recurring_end_date"
                                                    type="date"
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
                                            <Label>Weekdays</Label>
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
                                                        className="min-w-12 rounded-md"
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
                                        <Label htmlFor="start_time">Start Time</Label>
                                        <Input
                                            id="start_time"
                                            type="time"
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
                                        <Label htmlFor="end_time">End Time</Label>
                                        <Input
                                            id="end_time"
                                            type="time"
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

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        value={createForm.data.status}
                                        onChange={(e) =>
                                            createForm.setData(
                                                'status',
                                                e.target.value as DutyStatus,
                                            )
                                        }
                                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
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
                                    <Label htmlFor="remarks">Remarks</Label>
                                    <textarea
                                        id="remarks"
                                        value={createForm.data.remarks}
                                        onChange={(e) =>
                                            createForm.setData('remarks', e.target.value)
                                        }
                                        rows={3}
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                        placeholder="Optional notes for this duty schedule"
                                    />
                                </div>

                                {createForm.errors.schedule_mode && (
                                    <p className="text-sm text-destructive">
                                        {createForm.errors.schedule_mode}
                                    </p>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <Button type="submit" disabled={createForm.processing}>
                                        {createForm.processing
                                            ? 'Saving...'
                                            : 'Save Duty Schedule'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => resetCreateForm()}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </form>

                        <div className="rounded-xl border bg-background p-4">
                            <h2 className="mb-4 text-lg font-semibold">
                                {selectedSchedule
                                    ? 'Edit Duty Schedule'
                                    : 'Select a schedule to edit'}
                            </h2>

                            {selectedSchedule ? (
                                <form
                                    onSubmit={handleEditSubmit}
                                    className="grid gap-3"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="edit_doctor_id">Doctor</Label>
                                        <select
                                            id="edit_doctor_id"
                                            value={editForm.data.doctor_id}
                                            onChange={(e) =>
                                                editForm.setData(
                                                    'doctor_id',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
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
                                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
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
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
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

                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            disabled={editForm.processing}
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
                                <p className="text-sm text-muted-foreground">
                                    Click an event in the calendar or choose a row below.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="rounded-xl border bg-background p-4">
                    <h2 className="mb-3 text-lg font-semibold">Duty Schedule List</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="py-2">Doctor</th>
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Time</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Remarks</th>
                                    {can_manage_schedule && (
                                        <th className="py-2 text-right">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map((schedule) => (
                                    <tr key={schedule.id} className="border-b">
                                        <td className="py-2">{schedule.doctor_name}</td>
                                        <td className="py-2">{schedule.duty_date}</td>
                                        <td className="py-2">
                                            {schedule.start_time} - {schedule.end_time}
                                        </td>
                                        <td className="py-2">
                                            <Badge variant="outline">
                                                {STATUS_LABELS[schedule.status]}
                                            </Badge>
                                        </td>
                                        <td className="py-2">
                                            {schedule.remarks || '-'}
                                        </td>
                                        {can_manage_schedule && (
                                            <td className="py-2 text-right">
                                                <Button
                                                    variant="ghost"
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
                </div>
            </div>
        </AppLayout>
    );
}
