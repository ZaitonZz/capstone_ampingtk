import { Head, router, useForm } from '@inertiajs/react';
import {
    CalendarCheck,
    CalendarDays,
    CalendarPlus,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    Pencil,
    RefreshCcw,
    Send,
    Trash2,
    X,
} from 'lucide-react';
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
type RequestStatus = 'pending' | 'approved' | 'rejected';
type RequestType = 'absent' | 'on_leave';
type ScheduleMode = 'multiple_dates' | 'recurring_weekly';
type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type StatusFilter = 'all' | DutyStatus;

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

interface DutyRequest {
    id: number;
    doctor_id: number;
    doctor_name: string | null;
    request_type: RequestType;
    start_date: string;
    end_date: string;
    remarks: string | null;
    status: RequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    reviewer_notes: string | null;
    created_at: string;
}

interface SpecificDateEntry {
    duty_date: string;
    start_time: string;
    end_time: string;
    status: DutyStatus;
    remarks: string;
}

interface Props {
    schedules: DutySchedule[];
    doctors: DoctorOption[];
    can_manage_schedule: boolean;
    can_submit_duty_requests: boolean;
    can_review_duty_requests: boolean;
    duty_requests: DutyRequest[];
    pending_duty_requests: DutyRequest[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Doctor Duty Calendar', href: '/doctor-duty-schedules' },
];

const DUTY_STATUSES: DutyStatus[] = [
    'on_duty',
    'off_duty',
    'absent',
    'on_leave',
];

const STATUS_LABELS: Record<DutyStatus, string> = {
    on_duty: 'On Duty',
    off_duty: 'Off Duty',
    absent: 'Absent',
    on_leave: 'On Leave',
};

const STATUS_BADGE_CLASSES: Record<DutyStatus, string> = {
    on_duty: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    off_duty: 'border-slate-200 bg-slate-50 text-slate-700',
    absent: 'border-rose-200 bg-rose-50 text-rose-700',
    on_leave: 'border-amber-200 bg-amber-50 text-amber-700',
};

const STATUS_DOT_CLASSES: Record<DutyStatus, string> = {
    on_duty: 'bg-emerald-600',
    off_duty: 'bg-slate-500',
    absent: 'bg-rose-600',
    on_leave: 'bg-amber-500',
};

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    absent: 'Absent',
    on_leave: 'Leave',
};

const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
};

const REQUEST_BADGE_CLASSES: Record<RequestStatus, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

const MODE_LABELS: Record<ScheduleMode, string> = {
    multiple_dates: 'Specific Dates',
    recurring_weekly: 'Recurring Weekly',
};

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const WEEKDAY_LABELS: Record<Weekday, string> = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
};

const DEFAULT_START_TIME = '08:00';
const DEFAULT_END_TIME = '17:00';
const DEFAULT_STATUS: DutyStatus = 'on_duty';
const TABLE_PAGE_SIZE = 10;

function dateKey(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function parseLocalDate(value: string) {
    return new Date(`${value}T00:00:00`);
}

function startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);

    return next;
}

function startOfMonth(date: Date) {
    const next = startOfDay(date);
    next.setDate(1);

    return next;
}

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);

    return next;
}

function addMonths(date: Date, months: number) {
    const next = startOfMonth(date);
    next.setMonth(next.getMonth() + months);

    return next;
}

function startOfCalendarGrid(date: Date) {
    const first = startOfMonth(date);
    return addDays(first, -first.getDay());
}

function getMonthGridDates(date: Date) {
    const gridStart = startOfCalendarGrid(date);

    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function formatDate(value: string) {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(parseLocalDate(value));
}

function formatLongDate(value: string) {
    if (!value) {
        return 'No day selected';
    }

    return new Intl.DateTimeFormat('en', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(parseLocalDate(value));
}

function formatMonthYear(date: Date) {
    return new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatTime(value: string) {
    if (!value) {
        return '';
    }

    const [hour, minute] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);

    return new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function formatTimeRange(start: string, end: string) {
    return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatDateRange(startDate: string, endDate: string) {
    if (!startDate && !endDate) {
        return '';
    }

    if (!endDate || startDate === endDate) {
        return formatDate(startDate);
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatDateTime(value: string | null) {
    if (!value) {
        return 'Not reviewed';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function sortSchedules(items: DutySchedule[]) {
    return [...items].sort((a, b) =>
        [a.duty_date, a.start_time, a.end_time, a.doctor_name ?? '']
            .join('|')
            .localeCompare(
                [
                    b.duty_date,
                    b.start_time,
                    b.end_time,
                    b.doctor_name ?? '',
                ].join('|'),
            ),
    );
}

function buildRecurringPreview(
    startDate: string,
    endDate: string,
    weekdays: Weekday[],
) {
    if (!startDate || !endDate || weekdays.length === 0) {
        return [];
    }

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start > end
    ) {
        return [];
    }

    const weekdayIndexes: Record<Weekday, number> = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
    };
    const selectedWeekdays = new Set(
        weekdays.map((weekday) => weekdayIndexes[weekday]),
    );
    const preview: string[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
        if (selectedWeekdays.has(cursor.getDay())) {
            preview.push(dateKey(cursor));
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return preview;
}

function paginateItems<T>(items: T[], requestedPage: number) {
    const total = items.length;
    const lastPage = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, requestedPage), lastPage);
    const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;
    const rows = items.slice(startIndex, startIndex + TABLE_PAGE_SIZE);

    return {
        rows,
        currentPage,
        lastPage,
        from: total === 0 ? 0 : startIndex + 1,
        to: Math.min(total, startIndex + rows.length),
        total,
    };
}

function getPaginationPages(currentPage: number, lastPage: number) {
    const pageWindow = 5;
    const half = Math.floor(pageWindow / 2);
    const start = Math.max(
        1,
        Math.min(currentPage - half, lastPage - pageWindow + 1),
    );
    const end = Math.min(lastPage, start + pageWindow - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function emptySpecificDateEntry(dutyDate: string): SpecificDateEntry {
    return {
        duty_date: dutyDate,
        start_time: DEFAULT_START_TIME,
        end_time: DEFAULT_END_TIME,
        status: DEFAULT_STATUS,
        remarks: '',
    };
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return <p className="text-sm text-destructive">{message}</p>;
}

function StatusBadge({ status }: { status: DutyStatus }) {
    return (
        <Badge variant="outline" className={STATUS_BADGE_CLASSES[status]}>
            {STATUS_LABELS[status]}
        </Badge>
    );
}

function RequestBadge({ status }: { status: RequestStatus }) {
    return (
        <Badge variant="outline" className={REQUEST_BADGE_CLASSES[status]}>
            {REQUEST_STATUS_LABELS[status]}
        </Badge>
    );
}

function PaginationControls({
    currentPage,
    lastPage,
    from,
    to,
    total,
    onPageChange,
}: {
    currentPage: number;
    lastPage: number;
    from: number;
    to: number;
    total: number;
    onPageChange: (page: number) => void;
}) {
    if (total <= TABLE_PAGE_SIZE) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 border-t bg-muted/20 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
                Showing {from} to {to} of {total}
            </p>
            <div className="flex flex-wrap gap-1.5">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPaginationPages(currentPage, lastPage).map((page) => (
                    <Button
                        key={page}
                        type="button"
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        className={
                            page === currentPage
                                ? 'h-8 w-8 bg-slate-900 p-0 text-white hover:bg-slate-800'
                                : 'h-8 w-8 p-0'
                        }
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </Button>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={currentPage === lastPage}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default function DoctorDutySchedulesIndex({
    schedules,
    doctors,
    can_manage_schedule,
    can_submit_duty_requests,
    can_review_duty_requests,
    duty_requests,
    pending_duty_requests,
}: Props) {
    const today = dateKey(new Date());
    const [visibleDate, setVisibleDate] = useState(() =>
        startOfDay(new Date()),
    );
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [activeScheduleId, setActiveScheduleId] = useState<number | null>(
        null,
    );
    const [draftDate, setDraftDate] = useState('');
    const [scheduleStatusFilter, setScheduleStatusFilter] =
        useState<StatusFilter>('all');
    const [schedulePage, setSchedulePage] = useState(1);
    const [requestPage, setRequestPage] = useState(1);
    const [reviewerNotes, setReviewerNotes] = useState<Record<number, string>>(
        {},
    );
    const [selectedSchedule, setSelectedSchedule] =
        useState<DutySchedule | null>(null);

    const createForm = useForm({
        doctor_id: '',
        schedule_mode: 'multiple_dates' as ScheduleMode,
        specific_date_entries: [] as SpecificDateEntry[],
        recurring_start_date: '',
        recurring_end_date: '',
        recurring_weekdays: ['mon'] as Weekday[],
        start_time: DEFAULT_START_TIME,
        end_time: DEFAULT_END_TIME,
        status: DEFAULT_STATUS,
        remarks: '',
    });

    const editForm = useForm({
        doctor_id: '',
        duty_date: '',
        start_time: DEFAULT_START_TIME,
        end_time: DEFAULT_END_TIME,
        status: DEFAULT_STATUS,
        remarks: '',
    });

    const dutyRequestForm = useForm({
        request_type: 'on_leave' as RequestType,
        start_date: '',
        end_date: '',
        remarks: '',
    });

    const sortedSchedules = useMemo(
        () => sortSchedules(schedules),
        [schedules],
    );

    const schedulesByDate = useMemo(() => {
        const grouped: Record<string, DutySchedule[]> = {};

        sortedSchedules.forEach((schedule) => {
            grouped[schedule.duty_date] = grouped[schedule.duty_date] ?? [];
            grouped[schedule.duty_date].push(schedule);
        });

        return grouped;
    }, [sortedSchedules]);

    const selectedDaySchedules = useMemo(
        () => (selectedDate ? (schedulesByDate[selectedDate] ?? []) : []),
        [schedulesByDate, selectedDate],
    );

    const recurringPreviewDates = useMemo(
        () =>
            buildRecurringPreview(
                createForm.data.recurring_start_date,
                createForm.data.recurring_end_date,
                createForm.data.recurring_weekdays,
            ),
        [
            createForm.data.recurring_end_date,
            createForm.data.recurring_start_date,
            createForm.data.recurring_weekdays,
        ],
    );

    const filteredSchedules = useMemo(
        () =>
            scheduleStatusFilter === 'all'
                ? sortedSchedules
                : sortedSchedules.filter(
                      (schedule) => schedule.status === scheduleStatusFilter,
                  ),
        [scheduleStatusFilter, sortedSchedules],
    );

    const paginatedSchedules = useMemo(
        () => paginateItems(filteredSchedules, schedulePage),
        [filteredSchedules, schedulePage],
    );

    const paginatedRequests = useMemo(
        () => paginateItems(duty_requests, requestPage),
        [duty_requests, requestPage],
    );

    const doctorNameById = useMemo(
        () =>
            doctors.reduce<Record<string, string>>((lookup, doctor) => {
                lookup[String(doctor.id)] = doctor.name;

                return lookup;
            }, {}),
        [doctors],
    );

    const calendarTitle = formatMonthYear(visibleDate);

    const calendarDates = useMemo(
        () => getMonthGridDates(visibleDate),
        [visibleDate],
    );

    const coverageCounts = useMemo(() => {
        const counts = {
            total: schedules.length,
            onDuty: schedules.filter(
                (schedule) => schedule.status === 'on_duty',
            ).length,
            absentOrLeave: schedules.filter((schedule) =>
                ['absent', 'on_leave'].includes(schedule.status),
            ).length,
            doctors: new Set(schedules.map((schedule) => schedule.doctor_id))
                .size,
        };

        return counts;
    }, [schedules]);

    function resetCreateForm() {
        createForm.setData({
            doctor_id: '',
            schedule_mode: 'multiple_dates',
            specific_date_entries: [],
            recurring_start_date: '',
            recurring_end_date: '',
            recurring_weekdays: ['mon'],
            start_time: DEFAULT_START_TIME,
            end_time: DEFAULT_END_TIME,
            status: DEFAULT_STATUS,
            remarks: '',
        });
        setDraftDate('');
    }

    function setScheduleMode(mode: ScheduleMode) {
        createForm.setData('schedule_mode', mode);

        if (mode === 'multiple_dates') {
            createForm.setData('recurring_start_date', '');
            createForm.setData('recurring_end_date', '');
            createForm.setData('recurring_weekdays', ['mon']);
            return;
        }

        createForm.setData('specific_date_entries', []);
        setDraftDate('');
    }

    function addSpecificDate(value: string) {
        if (!value) {
            return;
        }

        const normalized = value.slice(0, 10);

        if (
            createForm.data.specific_date_entries.some(
                (entry) => entry.duty_date === normalized,
            )
        ) {
            toast.info('That date is already in the Specific Dates list.');
            return;
        }

        createForm.setData(
            'specific_date_entries',
            [
                ...createForm.data.specific_date_entries,
                emptySpecificDateEntry(normalized),
            ].sort((a, b) => a.duty_date.localeCompare(b.duty_date)),
        );
        setDraftDate('');
    }

    function removeSpecificDate(index: number) {
        createForm.setData(
            'specific_date_entries',
            createForm.data.specific_date_entries.filter(
                (_, entryIndex) => entryIndex !== index,
            ),
        );
    }

    function updateSpecificDateEntry<K extends keyof SpecificDateEntry>(
        index: number,
        field: K,
        value: SpecificDateEntry[K],
    ) {
        createForm.setData(
            'specific_date_entries',
            createForm.data.specific_date_entries.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, [field]: value } : entry,
            ),
        );
    }

    function selectCalendarDate(value: string, scheduleId?: number) {
        setSelectedDate(value);
        setActiveScheduleId(scheduleId ?? null);

        const parsed = parseLocalDate(value);
        if (!Number.isNaN(parsed.getTime())) {
            setVisibleDate(startOfMonth(parsed));
        }
    }

    function handleCalendarDateClick(value: string) {
        selectCalendarDate(value);
    }

    function handleDutyItemClick(schedule: DutySchedule) {
        selectCalendarDate(schedule.duty_date, schedule.id);
    }

    function openEdit(schedule: DutySchedule) {
        setSelectedSchedule(schedule);
        selectCalendarDate(schedule.duty_date, schedule.id);
        editForm.setData({
            doctor_id: String(schedule.doctor_id),
            duty_date: schedule.duty_date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            status: schedule.status,
            remarks: schedule.remarks ?? '',
        });

        window.setTimeout(() => {
            document
                .getElementById('edit-duty-schedule')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    function goPrevious() {
        setVisibleDate((current) => addMonths(current, -1));
    }

    function goNext() {
        setVisibleDate((current) => addMonths(current, 1));
    }

    function goToday() {
        const current = startOfDay(new Date());
        setVisibleDate(current);
        setSelectedDate(dateKey(current));
        setActiveScheduleId(null);
    }

    function handleCreateSubmit(event: FormEvent) {
        event.preventDefault();

        createForm.transform((data) =>
            data.schedule_mode === 'multiple_dates'
                ? {
                      doctor_id: data.doctor_id,
                      schedule_mode: data.schedule_mode,
                      specific_date_entries: data.specific_date_entries,
                  }
                : {
                      doctor_id: data.doctor_id,
                      schedule_mode: data.schedule_mode,
                      recurring_start_date: data.recurring_start_date,
                      recurring_end_date: data.recurring_end_date,
                      recurring_weekdays: data.recurring_weekdays,
                      start_time: data.start_time,
                      end_time: data.end_time,
                      status: data.status,
                      remarks: data.remarks,
                  },
        );

        createForm.post('/doctor-duty-schedules', {
            preserveScroll: true,
            onSuccess: () => {
                resetCreateForm();
                toast.success('Duty schedule saved.');
            },
            onError: () => {
                toast.error('Unable to save. Check the highlighted fields.');
            },
        });
    }

    function handleEditSubmit(event: FormEvent) {
        event.preventDefault();

        if (!selectedSchedule) {
            return;
        }

        editForm.patch(`/doctor-duty-schedules/${selectedSchedule.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Duty schedule updated.');
            },
            onError: () => {
                toast.error('Unable to update. Check the highlighted fields.');
            },
        });
    }

    function handleDelete(schedule: DutySchedule) {
        if (!confirm('Delete this duty schedule?')) {
            return;
        }

        router.delete(`/doctor-duty-schedules/${schedule.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedSchedule?.id === schedule.id) {
                    setSelectedSchedule(null);
                }
                if (activeScheduleId === schedule.id) {
                    setActiveScheduleId(null);
                }
                toast.success('Duty schedule deleted.');
            },
        });
    }

    function handleDutyRequestSubmit(event: FormEvent) {
        event.preventDefault();

        dutyRequestForm.post('/doctor-duty-requests', {
            preserveScroll: true,
            onSuccess: () => {
                dutyRequestForm.reset();
                dutyRequestForm.setData('request_type', 'on_leave');
                toast.success('Leave / absence request submitted.');
            },
            onError: () => {
                toast.error('Unable to submit request.');
            },
        });
    }

    function reviewDutyRequest(
        requestId: number,
        decision: 'approved' | 'rejected',
    ) {
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

    function handleStatusFilterChange(status: StatusFilter) {
        setScheduleStatusFilter(status);
        setSchedulePage(1);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Doctor Duty Calendar" />

            <div className="mx-auto w-full max-w-[1500px] space-y-7 p-4 md:p-6">
                <section className="space-y-4 border-b pb-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                                <CalendarCheck className="h-3.5 w-3.5" />
                                AMPING_TK clinical coverage
                            </div>
                            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                                Doctor Duty Calendar
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                Scan monthly coverage, inspect one day at a
                                time, and manage duty records when needed.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:min-w-[460px]">
                            <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs text-muted-foreground">
                                    Entries
                                </p>
                                <p className="mt-1 text-xl font-semibold">
                                    {coverageCounts.total}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs text-muted-foreground">
                                    On duty
                                </p>
                                <p className="mt-1 text-xl font-semibold text-emerald-700">
                                    {coverageCounts.onDuty}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs text-muted-foreground">
                                    Leave / absent
                                </p>
                                <p className="mt-1 text-xl font-semibold text-amber-700">
                                    {coverageCounts.absentOrLeave}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs text-muted-foreground">
                                    Doctors
                                </p>
                                <p className="mt-1 text-xl font-semibold">
                                    {coverageCounts.doctors}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold">Duty Calendar</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Monthly overview of dates with existing duty
                            schedules. Select a date to inspect its details
                            below.
                        </p>
                    </div>

                    <div className="rounded-lg border bg-background shadow-sm">
                        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 p-0"
                                    onClick={goPrevious}
                                    aria-label="Previous calendar period"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 p-0"
                                    onClick={goNext}
                                    aria-label="Next calendar period"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-4"
                                    onClick={goToday}
                                >
                                    Today
                                </Button>
                            </div>

                            <div className="flex min-w-0 items-center gap-2 text-lg font-semibold sm:text-xl">
                                <CalendarDays className="h-5 w-5 shrink-0 text-sky-600" />
                                <span className="truncate">
                                    {calendarTitle}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 border-b px-3 py-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2 font-medium text-sky-700">
                                <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
                                Has schedule
                            </span>
                            {DUTY_STATUSES.map((status) => (
                                <span
                                    key={status}
                                    className="inline-flex items-center gap-2"
                                >
                                    <span
                                        className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_CLASSES[status]}`}
                                    />
                                    {STATUS_LABELS[status]}
                                </span>
                            ))}
                        </div>

                        <div className="p-3">
                            <div className="grid grid-cols-7 rounded-t-lg border border-b-0 bg-muted/30 text-center text-xs font-medium text-muted-foreground">
                                {[
                                    'Sun',
                                    'Mon',
                                    'Tue',
                                    'Wed',
                                    'Thu',
                                    'Fri',
                                    'Sat',
                                ].map((weekday) => (
                                    <div key={weekday} className="px-2 py-2">
                                        {weekday}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border bg-background">
                                {calendarDates.map((date) => {
                                    const key = dateKey(date);
                                    const daySchedules =
                                        schedulesByDate[key] ?? [];
                                    const isToday = key === today;
                                    const isSelected = key === selectedDate;
                                    const isOutsideMonth =
                                        date.getMonth() !==
                                        visibleDate.getMonth();
                                    const scheduledStatuses =
                                        DUTY_STATUSES.filter((status) =>
                                            daySchedules.some(
                                                (schedule) =>
                                                    schedule.status === status,
                                            ),
                                        );

                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            aria-pressed={isSelected}
                                            className={`flex min-h-16 flex-col border-r border-b p-1.5 text-left transition hover:bg-sky-50/60 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none sm:min-h-28 sm:p-2 ${
                                                daySchedules.length > 0
                                                    ? 'bg-sky-50/60'
                                                    : 'bg-background'
                                            } ${
                                                isOutsideMonth
                                                    ? 'text-muted-foreground opacity-60'
                                                    : ''
                                            } ${
                                                isSelected
                                                    ? 'relative z-10 bg-sky-100 ring-2 ring-sky-500'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                handleCalendarDateClick(key)
                                            }
                                        >
                                            <span className="flex items-start justify-between gap-2">
                                                <span
                                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold sm:h-8 sm:w-8 ${
                                                        isToday
                                                            ? 'bg-slate-900 text-white'
                                                            : ''
                                                    }`}
                                                >
                                                    {date.getDate()}
                                                </span>
                                                {daySchedules.length > 0 && (
                                                    <span className="rounded-full border border-sky-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 shadow-sm sm:px-2 sm:text-xs">
                                                        {daySchedules.length}
                                                    </span>
                                                )}
                                            </span>

                                            {daySchedules.length > 0 && (
                                                <span className="mt-auto flex flex-wrap items-center gap-1 pt-2 sm:pt-4">
                                                    {scheduledStatuses.map(
                                                        (status) => (
                                                            <span
                                                                key={status}
                                                                className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[status]}`}
                                                                title={
                                                                    STATUS_LABELS[
                                                                        status
                                                                    ]
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {can_manage_schedule && (
                    <section className="space-y-4 border-b pb-7">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Add Duty Schedule
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Create schedules for specific dates or weekly
                                recurring duty blocks.
                            </p>
                        </div>

                        <form
                            onSubmit={handleCreateSubmit}
                            className="rounded-lg border bg-background p-4 shadow-sm"
                        >
                            <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="doctor_id">
                                            Doctor
                                        </Label>
                                        <select
                                            id="doctor_id"
                                            value={createForm.data.doctor_id}
                                            onChange={(event) =>
                                                createForm.setData(
                                                    'doctor_id',
                                                    event.target.value,
                                                )
                                            }
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                                        >
                                            <option value="">
                                                Select doctor...
                                            </option>
                                            {doctors.map((doctor) => (
                                                <option
                                                    key={doctor.id}
                                                    value={doctor.id}
                                                >
                                                    {doctor.name}
                                                </option>
                                            ))}
                                        </select>
                                        <FieldError
                                            message={
                                                createForm.errors.doctor_id
                                            }
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Mode</Label>
                                        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-1">
                                            {(
                                                [
                                                    'multiple_dates',
                                                    'recurring_weekly',
                                                ] as ScheduleMode[]
                                            ).map((mode) => (
                                                <Button
                                                    key={mode}
                                                    type="button"
                                                    size="sm"
                                                    variant={
                                                        createForm.data
                                                            .schedule_mode ===
                                                        mode
                                                            ? 'default'
                                                            : 'ghost'
                                                    }
                                                    className={
                                                        createForm.data
                                                            .schedule_mode ===
                                                        mode
                                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                                            : 'text-muted-foreground hover:bg-background'
                                                    }
                                                    onClick={() =>
                                                        setScheduleMode(mode)
                                                    }
                                                >
                                                    {MODE_LABELS[mode]}
                                                </Button>
                                            ))}
                                        </div>
                                        <FieldError
                                            message={
                                                createForm.errors.schedule_mode
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="min-w-0 space-y-4">
                                    {createForm.data.schedule_mode ===
                                    'multiple_dates' ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                                <div className="min-w-0 flex-1 space-y-1.5">
                                                    <Label htmlFor="draft_date">
                                                        Add specific date
                                                    </Label>
                                                    <Input
                                                        id="draft_date"
                                                        type="date"
                                                        value={draftDate}
                                                        onChange={(event) =>
                                                            setDraftDate(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-10"
                                                    onClick={() =>
                                                        addSpecificDate(
                                                            draftDate,
                                                        )
                                                    }
                                                >
                                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                                    Add date
                                                </Button>
                                            </div>

                                            <div className="overflow-hidden rounded-lg border">
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            Specific Dates
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Each selected date
                                                            keeps its own time
                                                            in, time out,
                                                            status, and remarks.
                                                        </p>
                                                    </div>
                                                    {createForm.data
                                                        .specific_date_entries
                                                        .length > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                createForm.setData(
                                                                    'specific_date_entries',
                                                                    [],
                                                                )
                                                            }
                                                        >
                                                            Clear all
                                                        </Button>
                                                    )}
                                                </div>

                                                {createForm.data
                                                    .specific_date_entries
                                                    .length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full min-w-[860px] text-sm">
                                                            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                                                <tr>
                                                                    <th className="px-3 py-2 font-medium">
                                                                        Date
                                                                    </th>
                                                                    <th className="px-3 py-2 font-medium">
                                                                        Time in
                                                                    </th>
                                                                    <th className="px-3 py-2 font-medium">
                                                                        Time out
                                                                    </th>
                                                                    <th className="px-3 py-2 font-medium">
                                                                        Status
                                                                    </th>
                                                                    <th className="px-3 py-2 font-medium">
                                                                        Remarks
                                                                    </th>
                                                                    <th className="px-3 py-2 text-right font-medium">
                                                                        Remove
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {createForm.data.specific_date_entries.map(
                                                                    (
                                                                        entry,
                                                                        index,
                                                                    ) => (
                                                                        <tr
                                                                            key={
                                                                                entry.duty_date
                                                                            }
                                                                        >
                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                <div className="font-medium">
                                                                                    {formatDate(
                                                                                        entry.duty_date,
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {
                                                                                        entry.duty_date
                                                                                    }
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-3 py-2">
                                                                                <Input
                                                                                    type="time"
                                                                                    value={
                                                                                        entry.start_time
                                                                                    }
                                                                                    className="h-9 w-28"
                                                                                    onChange={(
                                                                                        event,
                                                                                    ) =>
                                                                                        updateSpecificDateEntry(
                                                                                            index,
                                                                                            'start_time',
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </td>
                                                                            <td className="px-3 py-2">
                                                                                <Input
                                                                                    type="time"
                                                                                    value={
                                                                                        entry.end_time
                                                                                    }
                                                                                    className="h-9 w-28"
                                                                                    onChange={(
                                                                                        event,
                                                                                    ) =>
                                                                                        updateSpecificDateEntry(
                                                                                            index,
                                                                                            'end_time',
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </td>
                                                                            <td className="px-3 py-2">
                                                                                <select
                                                                                    value={
                                                                                        entry.status
                                                                                    }
                                                                                    onChange={(
                                                                                        event,
                                                                                    ) =>
                                                                                        updateSpecificDateEntry(
                                                                                            index,
                                                                                            'status',
                                                                                            event
                                                                                                .target
                                                                                                .value as DutyStatus,
                                                                                        )
                                                                                    }
                                                                                    className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
                                                                                >
                                                                                    {DUTY_STATUSES.map(
                                                                                        (
                                                                                            status,
                                                                                        ) => (
                                                                                            <option
                                                                                                key={
                                                                                                    status
                                                                                                }
                                                                                                value={
                                                                                                    status
                                                                                                }
                                                                                            >
                                                                                                {
                                                                                                    STATUS_LABELS[
                                                                                                        status
                                                                                                    ]
                                                                                                }
                                                                                            </option>
                                                                                        ),
                                                                                    )}
                                                                                </select>
                                                                            </td>
                                                                            <td className="px-3 py-2">
                                                                                <Input
                                                                                    value={
                                                                                        entry.remarks
                                                                                    }
                                                                                    placeholder="Optional"
                                                                                    className="h-9 min-w-52"
                                                                                    onChange={(
                                                                                        event,
                                                                                    ) =>
                                                                                        updateSpecificDateEntry(
                                                                                            index,
                                                                                            'remarks',
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right">
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                                                    onClick={() =>
                                                                                        removeSpecificDate(
                                                                                            index,
                                                                                        )
                                                                                    }
                                                                                    aria-label={`Remove ${entry.duty_date}`}
                                                                                >
                                                                                    <X className="h-4 w-4" />
                                                                                </Button>
                                                                            </td>
                                                                        </tr>
                                                                    ),
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                                        Use the date picker
                                                        above to add specific
                                                        duty dates.
                                                    </div>
                                                )}
                                            </div>
                                            <FieldError
                                                message={
                                                    createForm.errors
                                                        .specific_date_entries
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="recurring_start_date">
                                                        Start date
                                                    </Label>
                                                    <Input
                                                        id="recurring_start_date"
                                                        type="date"
                                                        value={
                                                            createForm.data
                                                                .recurring_start_date
                                                        }
                                                        onChange={(event) =>
                                                            createForm.setData(
                                                                'recurring_start_date',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                    <FieldError
                                                        message={
                                                            createForm.errors
                                                                .recurring_start_date
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="recurring_end_date">
                                                        End date
                                                    </Label>
                                                    <Input
                                                        id="recurring_end_date"
                                                        type="date"
                                                        value={
                                                            createForm.data
                                                                .recurring_end_date
                                                        }
                                                        onChange={(event) =>
                                                            createForm.setData(
                                                                'recurring_end_date',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                    <FieldError
                                                        message={
                                                            createForm.errors
                                                                .recurring_end_date
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5 sm:col-span-2">
                                                    <Label>
                                                        Repeat weekly on
                                                    </Label>
                                                    <ToggleGroup
                                                        type="multiple"
                                                        value={
                                                            createForm.data
                                                                .recurring_weekdays
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            createForm.setData(
                                                                'recurring_weekdays',
                                                                value as Weekday[],
                                                            )
                                                        }
                                                        className="flex flex-wrap justify-start gap-2"
                                                    >
                                                        {WEEKDAYS.map(
                                                            (weekday) => (
                                                                <ToggleGroupItem
                                                                    key={
                                                                        weekday
                                                                    }
                                                                    value={
                                                                        weekday
                                                                    }
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="min-w-12 rounded-md bg-background data-[state=on]:border-slate-900 data-[state=on]:bg-slate-900 data-[state=on]:text-white"
                                                                >
                                                                    {
                                                                        WEEKDAY_LABELS[
                                                                            weekday
                                                                        ]
                                                                    }
                                                                </ToggleGroupItem>
                                                            ),
                                                        )}
                                                    </ToggleGroup>
                                                    <FieldError
                                                        message={
                                                            createForm.errors
                                                                .recurring_weekdays
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="start_time">
                                                        Time in
                                                    </Label>
                                                    <Input
                                                        id="start_time"
                                                        type="time"
                                                        value={
                                                            createForm.data
                                                                .start_time
                                                        }
                                                        onChange={(event) =>
                                                            createForm.setData(
                                                                'start_time',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                    <FieldError
                                                        message={
                                                            createForm.errors
                                                                .start_time
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="end_time">
                                                        Time out
                                                    </Label>
                                                    <Input
                                                        id="end_time"
                                                        type="time"
                                                        value={
                                                            createForm.data
                                                                .end_time
                                                        }
                                                        onChange={(event) =>
                                                            createForm.setData(
                                                                'end_time',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                    <FieldError
                                                        message={
                                                            createForm.errors
                                                                .end_time
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="status">
                                                        Status
                                                    </Label>
                                                    <select
                                                        id="status"
                                                        value={
                                                            createForm.data
                                                                .status
                                                        }
                                                        onChange={(event) =>
                                                            createForm.setData(
                                                                'status',
                                                                event.target
                                                                    .value as DutyStatus,
                                                            )
                                                        }
                                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                                                    >
                                                        {DUTY_STATUSES.map(
                                                            (status) => (
                                                                <option
                                                                    key={status}
                                                                    value={
                                                                        status
                                                                    }
                                                                >
                                                                    {
                                                                        STATUS_LABELS[
                                                                            status
                                                                        ]
                                                                    }
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                    <FieldError
                                                        message={
                                                            createForm.errors
                                                                .status
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="remarks">
                                                        Remarks
                                                    </Label>
                                                    <textarea
                                                        id="remarks"
                                                        value={
                                                            createForm.data
                                                                .remarks
                                                        }
                                                        rows={2}
                                                        onChange={(event) =>
                                                            createForm.setData(
                                                                'remarks',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                            </div>

                                            <div className="rounded-lg border bg-muted/20 p-3">
                                                <p className="text-sm font-medium">
                                                    Recurring Preview
                                                </p>
                                                <div className="mt-3 space-y-2 text-sm">
                                                    <div className="flex justify-between gap-3">
                                                        <span className="text-muted-foreground">
                                                            Doctor
                                                        </span>
                                                        <span className="text-right font-medium">
                                                            {doctorNameById[
                                                                createForm.data
                                                                    .doctor_id
                                                            ] ??
                                                                'Select doctor'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between gap-3">
                                                        <span className="text-muted-foreground">
                                                            Entries
                                                        </span>
                                                        <span className="font-medium">
                                                            {
                                                                recurringPreviewDates.length
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between gap-3">
                                                        <span className="text-muted-foreground">
                                                            Time
                                                        </span>
                                                        <span className="font-medium">
                                                            {formatTimeRange(
                                                                createForm.data
                                                                    .start_time,
                                                                createForm.data
                                                                    .end_time,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                                                    {recurringPreviewDates
                                                        .slice(0, 30)
                                                        .map((date) => (
                                                            <span
                                                                key={date}
                                                                className="rounded-md border bg-background px-2 py-1 text-xs"
                                                            >
                                                                {formatDate(
                                                                    date,
                                                                )}
                                                            </span>
                                                        ))}
                                                    {recurringPreviewDates.length >
                                                        30 && (
                                                        <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                                                            +
                                                            {recurringPreviewDates.length -
                                                                30}{' '}
                                                            more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 border-t pt-4">
                                        <Button
                                            type="submit"
                                            disabled={createForm.processing}
                                            className="bg-slate-900 hover:bg-slate-800"
                                        >
                                            <CalendarPlus className="mr-2 h-4 w-4" />
                                            {createForm.processing
                                                ? 'Saving...'
                                                : 'Save Duty Schedule'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={resetCreateForm}
                                        >
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Reset
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </section>
                )}

                <section className="space-y-4 border-b pb-7">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Selected Day Details
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {selectedDate
                                    ? formatLongDate(selectedDate)
                                    : 'Choose a date from the calendar to inspect duty coverage.'}
                            </p>
                        </div>
                        {selectedDate && (
                            <Badge
                                variant="outline"
                                className="w-fit border-sky-200 bg-sky-50 text-sky-700"
                            >
                                {selectedDaySchedules.length} schedule
                                {selectedDaySchedules.length === 1 ? '' : 's'}
                            </Badge>
                        )}
                    </div>

                    {!selectedDate ? (
                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center">
                            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
                            <p className="mt-3 text-sm font-medium">
                                No day selected
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Select any date in the Duty Calendar to view the
                                doctors scheduled for that day.
                            </p>
                        </div>
                    ) : selectedDaySchedules.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-3 py-2.5 font-medium">
                                                Doctor name
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Time in / out
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Status
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Remarks
                                            </th>
                                            {can_manage_schedule && (
                                                <th className="px-3 py-2.5 text-right font-medium">
                                                    Edit action
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {selectedDaySchedules.map(
                                            (schedule) => (
                                                <tr
                                                    key={schedule.id}
                                                    className={
                                                        activeScheduleId ===
                                                        schedule.id
                                                            ? 'bg-sky-50/50'
                                                            : ''
                                                    }
                                                >
                                                    <td className="px-3 py-3 font-medium">
                                                        <button
                                                            type="button"
                                                            className="inline-flex max-w-[260px] items-center gap-2 text-left hover:text-sky-700"
                                                            onClick={() =>
                                                                handleDutyItemClick(
                                                                    schedule,
                                                                )
                                                            }
                                                        >
                                                            <span
                                                                className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_CLASSES[schedule.status]}`}
                                                            />
                                                            <span className="truncate">
                                                                {schedule.doctor_name ??
                                                                    'Doctor'}
                                                            </span>
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className="inline-flex items-center gap-2">
                                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                                            {formatTimeRange(
                                                                schedule.start_time,
                                                                schedule.end_time,
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <StatusBadge
                                                            status={
                                                                schedule.status
                                                            }
                                                        />
                                                    </td>
                                                    <td className="max-w-[360px] px-3 py-3 text-muted-foreground">
                                                        <span className="line-clamp-2">
                                                            {schedule.remarks ||
                                                                'No remarks'}
                                                        </span>
                                                    </td>
                                                    {can_manage_schedule && (
                                                        <td className="px-3 py-3 text-right">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    openEdit(
                                                                        schedule,
                                                                    )
                                                                }
                                                            >
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </Button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                            No duty schedules for this day.
                        </div>
                    )}
                </section>

                {can_manage_schedule && selectedSchedule && (
                    <section
                        id="edit-duty-schedule"
                        className="space-y-4 border-b pb-7"
                    >
                        <div>
                            <h2 className="text-xl font-semibold">
                                Edit Duty Schedule
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Update the selected duty date, time, status, and
                                remarks.
                            </p>
                        </div>

                        <form
                            onSubmit={handleEditSubmit}
                            className="rounded-lg border bg-background p-4 shadow-sm"
                        >
                            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">
                                        {selectedSchedule.doctor_name ??
                                            'Doctor'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Editing schedule #{selectedSchedule.id}
                                    </p>
                                </div>
                                <StatusBadge status={selectedSchedule.status} />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_duty_date">Date</Label>
                                    <Input
                                        id="edit_duty_date"
                                        type="date"
                                        value={editForm.data.duty_date}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'duty_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <FieldError
                                        message={editForm.errors.duty_date}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_start_time">
                                        Time in
                                    </Label>
                                    <Input
                                        id="edit_start_time"
                                        type="time"
                                        value={editForm.data.start_time}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'start_time',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <FieldError
                                        message={editForm.errors.start_time}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_end_time">
                                        Time out
                                    </Label>
                                    <Input
                                        id="edit_end_time"
                                        type="time"
                                        value={editForm.data.end_time}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'end_time',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <FieldError
                                        message={editForm.errors.end_time}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_status">Status</Label>
                                    <select
                                        id="edit_status"
                                        value={editForm.data.status}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'status',
                                                event.target
                                                    .value as DutyStatus,
                                            )
                                        }
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                                    >
                                        {DUTY_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {STATUS_LABELS[status]}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={editForm.errors.status}
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
                                    <Label htmlFor="edit_remarks">
                                        Remarks
                                    </Label>
                                    <textarea
                                        id="edit_remarks"
                                        value={editForm.data.remarks}
                                        rows={2}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'remarks',
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                        placeholder="Optional remarks"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="bg-slate-900 hover:bg-slate-800"
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    {editForm.processing
                                        ? 'Updating...'
                                        : 'Update Schedule'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        handleDelete(selectedSchedule)
                                    }
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setSelectedSchedule(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </section>
                )}

                <section className="space-y-4 border-b pb-7">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Duty Schedule List
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Paginated schedule records with a status filter.
                            </p>
                        </div>
                        <div className="flex flex-col gap-1.5 sm:w-64">
                            <Label htmlFor="schedule_status_filter">
                                Filter by status
                            </Label>
                            <div className="relative">
                                <Filter className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <select
                                    id="schedule_status_filter"
                                    value={scheduleStatusFilter}
                                    onChange={(event) =>
                                        handleStatusFilterChange(
                                            event.target.value as StatusFilter,
                                        )
                                    }
                                    className="h-10 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm shadow-sm"
                                >
                                    <option value="all">All statuses</option>
                                    {DUTY_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                            {STATUS_LABELS[status]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {filteredSchedules.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px] text-sm">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-3 py-2.5 font-medium">
                                                Date
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Doctor
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Time in
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Time out
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Status
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Remarks
                                            </th>
                                            {can_manage_schedule && (
                                                <th className="px-3 py-2.5 text-right font-medium">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {paginatedSchedules.rows.map(
                                            (schedule) => (
                                                <tr
                                                    key={schedule.id}
                                                    className="align-top hover:bg-muted/20"
                                                >
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            className="text-left font-medium hover:text-sky-700"
                                                            onClick={() =>
                                                                selectCalendarDate(
                                                                    schedule.duty_date,
                                                                    schedule.id,
                                                                )
                                                            }
                                                        >
                                                            {formatDate(
                                                                schedule.duty_date,
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-3 font-medium">
                                                        {schedule.doctor_name ??
                                                            'Doctor'}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {formatTime(
                                                            schedule.start_time,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {formatTime(
                                                            schedule.end_time,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <StatusBadge
                                                            status={
                                                                schedule.status
                                                            }
                                                        />
                                                    </td>
                                                    <td className="max-w-[360px] px-3 py-3 text-muted-foreground">
                                                        <span className="line-clamp-2">
                                                            {schedule.remarks ||
                                                                'No remarks'}
                                                        </span>
                                                    </td>
                                                    {can_manage_schedule && (
                                                        <td className="px-3 py-3 text-right">
                                                            <div className="inline-flex gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            schedule,
                                                                        )
                                                                    }
                                                                    aria-label={`Edit ${schedule.doctor_name ?? 'schedule'}`}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            schedule,
                                                                        )
                                                                    }
                                                                    aria-label={`Delete ${schedule.doctor_name ?? 'schedule'}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls
                                currentPage={paginatedSchedules.currentPage}
                                lastPage={paginatedSchedules.lastPage}
                                from={paginatedSchedules.from}
                                to={paginatedSchedules.to}
                                total={paginatedSchedules.total}
                                onPageChange={setSchedulePage}
                            />
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                            No duty schedules match the selected status.
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Leave / Absence Requests
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Review and track leave or absence requests
                                submitted by doctors.
                            </p>
                        </div>
                        <Badge
                            variant="outline"
                            className="w-fit border-amber-200 bg-amber-50 text-amber-700"
                        >
                            {pending_duty_requests.length} pending
                        </Badge>
                    </div>

                    {can_submit_duty_requests && (
                        <form
                            onSubmit={handleDutyRequestSubmit}
                            className="rounded-lg border bg-background p-4 shadow-sm"
                        >
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="request_type">
                                        Request type
                                    </Label>
                                    <select
                                        id="request_type"
                                        value={
                                            dutyRequestForm.data.request_type
                                        }
                                        onChange={(event) =>
                                            dutyRequestForm.setData(
                                                'request_type',
                                                event.target
                                                    .value as RequestType,
                                            )
                                        }
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                                    >
                                        <option value="on_leave">Leave</option>
                                        <option value="absent">Absent</option>
                                    </select>
                                    <FieldError
                                        message={
                                            dutyRequestForm.errors.request_type
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="request_start_date">
                                        Start date
                                    </Label>
                                    <Input
                                        id="request_start_date"
                                        type="date"
                                        value={dutyRequestForm.data.start_date}
                                        onChange={(event) =>
                                            dutyRequestForm.setData(
                                                'start_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <FieldError
                                        message={
                                            dutyRequestForm.errors.start_date
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="request_end_date">
                                        End date
                                    </Label>
                                    <Input
                                        id="request_end_date"
                                        type="date"
                                        value={dutyRequestForm.data.end_date}
                                        onChange={(event) =>
                                            dutyRequestForm.setData(
                                                'end_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <FieldError
                                        message={
                                            dutyRequestForm.errors.end_date
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-4">
                                    <Label htmlFor="request_remarks">
                                        Remarks
                                    </Label>
                                    <textarea
                                        id="request_remarks"
                                        value={dutyRequestForm.data.remarks}
                                        rows={2}
                                        onChange={(event) =>
                                            dutyRequestForm.setData(
                                                'remarks',
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                        placeholder="Reason for leave or absence"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 border-t pt-4">
                                <Button
                                    type="submit"
                                    disabled={dutyRequestForm.processing}
                                    className="bg-slate-900 hover:bg-slate-800"
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    {dutyRequestForm.processing
                                        ? 'Submitting...'
                                        : 'Submit Request'}
                                </Button>
                            </div>
                        </form>
                    )}

                    {duty_requests.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1120px] text-sm">
                                    <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-3 py-2.5 font-medium">
                                                Doctor
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Type
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Date range
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Status
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Submitted
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Reviewed
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Remarks
                                            </th>
                                            {can_review_duty_requests && (
                                                <th className="px-3 py-2.5 font-medium">
                                                    Review action
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {paginatedRequests.rows.map(
                                            (request) => (
                                                <tr
                                                    key={request.id}
                                                    className="align-top hover:bg-muted/20"
                                                >
                                                    <td className="px-3 py-3 font-medium">
                                                        {request.doctor_name ??
                                                            'Doctor'}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {
                                                            REQUEST_TYPE_LABELS[
                                                                request
                                                                    .request_type
                                                            ]
                                                        }
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        {formatDateRange(
                                                            request.start_date,
                                                            request.end_date,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <RequestBadge
                                                            status={
                                                                request.status
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                                                        {formatDateTime(
                                                            request.created_at,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-muted-foreground">
                                                        <div className="max-w-[220px]">
                                                            <p className="font-medium text-foreground">
                                                                {request.reviewed_by ??
                                                                    'Not reviewed'}
                                                            </p>
                                                            <p className="text-xs">
                                                                {formatDateTime(
                                                                    request.reviewed_at,
                                                                )}
                                                            </p>
                                                            {request.reviewer_notes && (
                                                                <p className="mt-1 line-clamp-2 text-xs">
                                                                    {
                                                                        request.reviewer_notes
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="max-w-[280px] px-3 py-3 text-muted-foreground">
                                                        <span className="line-clamp-3">
                                                            {request.remarks ||
                                                                'No remarks'}
                                                        </span>
                                                    </td>
                                                    {can_review_duty_requests && (
                                                        <td className="px-3 py-3">
                                                            {request.status ===
                                                            'pending' ? (
                                                                <div className="grid min-w-64 gap-2">
                                                                    <Input
                                                                        value={
                                                                            reviewerNotes[
                                                                                request
                                                                                    .id
                                                                            ] ??
                                                                            ''
                                                                        }
                                                                        placeholder="Reviewer notes"
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setReviewerNotes(
                                                                                (
                                                                                    current,
                                                                                ) => ({
                                                                                    ...current,
                                                                                    [request.id]:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                }),
                                                                            )
                                                                        }
                                                                    />
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            className="bg-emerald-600 hover:bg-emerald-700"
                                                                            onClick={() =>
                                                                                reviewDutyRequest(
                                                                                    request.id,
                                                                                    'approved',
                                                                                )
                                                                            }
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                reviewDutyRequest(
                                                                                    request.id,
                                                                                    'rejected',
                                                                                )
                                                                            }
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">
                                                                    Reviewed
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls
                                currentPage={paginatedRequests.currentPage}
                                lastPage={paginatedRequests.lastPage}
                                from={paginatedRequests.from}
                                to={paginatedRequests.to}
                                total={paginatedRequests.total}
                                onPageChange={setRequestPage}
                            />
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                            No leave or absence requests have been submitted.
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
