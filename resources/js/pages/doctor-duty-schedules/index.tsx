import { Head, router, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CalendarPlus,
    ChevronLeft,
    ChevronRight,
    Info,
    Pencil,
    RotateCcw,
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
type ScheduleMode = 'multiple_dates' | 'recurring_weekly';
type CalendarView = 'month' | 'week' | 'day';
type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface SpecificDateEntry {
    duty_date: string;
    start_time: string;
    end_time: string;
    status: DutyStatus;
    remarks: string;
}
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

interface CalendarSelection {
    date: string;
    title: string;
    subtitle: string;
    schedules: DutySchedule[];
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
    multiple_dates: 'Specific Dates',
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

const STATUS_DOT_CLASSES: Record<DutyStatus, string> = {
    on_duty: 'bg-emerald-600',
    off_duty: 'bg-slate-500',
    absent: 'bg-rose-600',
    on_leave: 'bg-amber-500',
};

const MODE_OPTIONS: ScheduleMode[] = ['multiple_dates', 'recurring_weekly'];
const CALENDAR_VIEW_LABELS: Record<CalendarView, string> = {
    month: 'Month',
    week: 'Week',
    day: 'Day',
};
const DEFAULT_DUTY_START_TIME = '08:00';
const DEFAULT_DUTY_END_TIME = '17:00';
const DEFAULT_DUTY_STATUS: DutyStatus = 'on_duty';
const TABLE_PAGE_SIZE = 10;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Doctor Duty Calendar', href: '/doctor-duty-schedules' },
];

function formatScheduleDate(date: string) {
    if (!date) {
        return '';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
}

function formatLongScheduleDate(date: string) {
    if (!date) {
        return '';
    }

    return new Intl.DateTimeFormat('en', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
}

function formatTime(time: string) {
    if (!time) {
        return '';
    }

    const [hour, minute] = time.split(':').map(Number);
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

function buildInputDate(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function startOfDay(date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    return dayStart;
}

function startOfWeek(date: Date) {
    const weekStart = new Date(date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    return weekStart;
}

function startOfMonth(date: Date) {
    const monthStart = new Date(date);
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setDate(1);

    return monthStart;
}

function addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);

    return nextDate;
}

function addMonths(date: Date, months: number) {
    const nextDate = new Date(date);
    nextDate.setDate(1);
    nextDate.setMonth(nextDate.getMonth() + months);
    nextDate.setHours(0, 0, 0, 0);

    return nextDate;
}

function formatBoardDay(date: Date) {
    return new Intl.DateTimeFormat('en', {
        weekday: 'short',
    }).format(date);
}

function formatBoardDate(date: Date) {
    return new Intl.DateTimeFormat('en', {
        month: 'numeric',
        day: 'numeric',
    }).format(date);
}

function formatWeekRange(startDate: Date, endDate: Date) {
    const sameYear = startDate.getFullYear() === endDate.getFullYear();
    const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
    const startFormat = new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: sameYear ? undefined : 'numeric',
    });
    const endFormat = new Intl.DateTimeFormat('en', {
        month: sameMonth ? undefined : 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return `${startFormat.format(startDate)} - ${endFormat.format(endDate)}`;
}

function formatMonthTitle(date: Date) {
    return new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatDayTitle(date: Date) {
    return new Intl.DateTimeFormat('en', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function buildMonthGridDates(date: Date) {
    const monthStart = startOfMonth(date);
    const gridStart = startOfWeek(monthStart);

    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function sortDutySchedules(items: DutySchedule[]) {
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

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

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
    const selectedDays = new Set(
        weekdays.map((weekday) => weekdayIndexes[weekday]),
    );
    const dates: string[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
        if (selectedDays.has(cursor.getDay())) {
            dates.push(buildInputDate(cursor));
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
}

function paginateItems<T>(items: T[], requestedPage: number) {
    const total = items.length;
    const lastPage = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
    const currentPage = Math.min(Math.max(requestedPage, 1), lastPage);
    const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;
    const rows = items.slice(startIndex, startIndex + TABLE_PAGE_SIZE);

    return {
        rows,
        currentPage,
        lastPage,
        from: total === 0 ? 0 : startIndex + 1,
        to: Math.min(startIndex + rows.length, total),
        total,
    };
}

function getPaginationPages(currentPage: number, lastPage: number) {
    const pageWindow = 5;
    const halfWindow = Math.floor(pageWindow / 2);
    const startPage = Math.max(
        1,
        Math.min(currentPage - halfWindow, lastPage - pageWindow + 1),
    );
    const endPage = Math.min(lastPage, startPage + pageWindow - 1);

    return Array.from(
        { length: endPage - startPage + 1 },
        (_, index) => startPage + index,
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
        <div className="flex flex-col gap-3 border-t bg-muted/10 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground">
                Showing {from} to {to} of {total}
            </div>
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
                                ? 'h-8 w-8 bg-emerald-600 p-0 text-white hover:bg-emerald-700'
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
    const [selectedSchedule, setSelectedSchedule] =
        useState<DutySchedule | null>(null);
    const [calendarSelection, setCalendarSelection] =
        useState<CalendarSelection | null>(null);
    const [calendarView, setCalendarView] = useState<CalendarView>('week');
    const [visibleDate, setVisibleDate] = useState(() =>
        startOfDay(new Date()),
    );
    const [draftDutyDate, setDraftDutyDate] = useState('');
    const [reviewerNotes, setReviewerNotes] = useState<Record<number, string>>(
        {},
    );
    const [schedulePage, setSchedulePage] = useState(1);
    const [pendingRequestsPage, setPendingRequestsPage] = useState(1);
    const [requestHistoryPage, setRequestHistoryPage] = useState(1);

    const createForm = useForm({
        doctor_id: '',
        schedule_mode: 'multiple_dates' as ScheduleMode,
        specific_date_entries: [] as SpecificDateEntry[],
        recurring_start_date: '',
        recurring_end_date: '',
        recurring_weekdays: ['mon'] as Weekday[],
        start_time: DEFAULT_DUTY_START_TIME,
        end_time: DEFAULT_DUTY_END_TIME,
        status: DEFAULT_DUTY_STATUS,
        remarks: '',
    });

    const editForm = useForm({
        doctor_id: '',
        duty_date: '',
        start_time: DEFAULT_DUTY_START_TIME,
        end_time: DEFAULT_DUTY_END_TIME,
        status: DEFAULT_DUTY_STATUS,
        remarks: '',
    });

    const dutyRequestForm = useForm({
        request_type: 'on_leave' as DutyRequestType,
        start_date: '',
        end_date: '',
        remarks: '',
    });

    const doctorNameById = useMemo(
        () =>
            doctors.reduce<Record<string, string>>((lookup, doctor) => {
                lookup[String(doctor.id)] = doctor.name;

                return lookup;
            }, {}),
        [doctors],
    );

    const visibleWeekStart = useMemo(
        () => startOfWeek(visibleDate),
        [visibleDate],
    );

    const currentWeekDates = useMemo(
        () =>
            Array.from({ length: 7 }, (_, index) =>
                addDays(visibleWeekStart, index),
            ),
        [visibleWeekStart],
    );

    const visibleWeekEnd = currentWeekDates[6] ?? visibleWeekStart;

    const currentMonthDates = useMemo(
        () => buildMonthGridDates(visibleDate),
        [visibleDate],
    );

    const currentDayDates = useMemo(
        () => [startOfDay(visibleDate)],
        [visibleDate],
    );

    const visibleCalendarDates = useMemo(() => {
        if (calendarView === 'month') {
            return currentMonthDates;
        }

        if (calendarView === 'day') {
            return currentDayDates;
        }

        return currentWeekDates;
    }, [calendarView, currentDayDates, currentMonthDates, currentWeekDates]);

    const schedulesByDate = useMemo(() => {
        const lookup: Record<string, DutySchedule[]> = {};

        schedules.forEach((schedule) => {
            lookup[schedule.duty_date] = lookup[schedule.duty_date] ?? [];
            lookup[schedule.duty_date].push(schedule);
        });

        Object.keys(lookup).forEach((date) => {
            lookup[date] = sortDutySchedules(lookup[date]);
        });

        return lookup;
    }, [schedules]);

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

    const selectedDoctorName =
        doctorNameById[createForm.data.doctor_id] ?? 'Select a doctor';

    const selectedSpecificDates = useMemo(
        () =>
            new Set(
                createForm.data.specific_date_entries.map(
                    (entry) => entry.duty_date,
                ),
            ),
        [createForm.data.specific_date_entries],
    );

    const defaultCalendarSelection = useMemo(() => {
        const visibleDateKeys = visibleCalendarDates.map((date) =>
            buildInputDate(date),
        );
        const todayKey = buildInputDate(new Date());
        const selectedDate =
            (visibleDateKeys.includes(todayKey) && todayKey) ||
            visibleDateKeys.find(
                (date) => (schedulesByDate[date] ?? []).length > 0,
            ) ||
            visibleDateKeys[0] ||
            '';
        const daySchedules = schedulesByDate[selectedDate] ?? [];

        return {
            date: selectedDate,
            title: selectedDate ? formatLongScheduleDate(selectedDate) : '',
            subtitle:
                daySchedules.length > 0
                    ? `${daySchedules.length} schedule ${daySchedules.length === 1 ? 'entry' : 'entries'} for this day`
                    : 'No schedules for this day',
            schedules: daySchedules,
        };
    }, [schedulesByDate, visibleCalendarDates]);

    const displayedCalendarSelection =
        calendarSelection ?? defaultCalendarSelection;

    const calendarTitle =
        calendarView === 'month'
            ? formatMonthTitle(visibleDate)
            : calendarView === 'day'
              ? formatDayTitle(visibleDate)
              : formatWeekRange(visibleWeekStart, visibleWeekEnd);

    const paginatedSchedules = useMemo(
        () => paginateItems(schedules, schedulePage),
        [schedulePage, schedules],
    );
    const paginatedPendingRequests = useMemo(
        () => paginateItems(pending_duty_requests, pendingRequestsPage),
        [pendingRequestsPage, pending_duty_requests],
    );
    const paginatedDutyRequests = useMemo(
        () => paginateItems(duty_requests, requestHistoryPage),
        [duty_requests, requestHistoryPage],
    );

    const hasBothRequestPanels =
        can_submit_duty_requests && can_review_duty_requests;

    function resetCreateForm() {
        createForm.reset();
        setDraftDutyDate('');
        createForm.setData('schedule_mode', 'multiple_dates');
        createForm.setData('specific_date_entries', []);
        createForm.setData('recurring_start_date', '');
        createForm.setData('recurring_end_date', '');
        createForm.setData('recurring_weekdays', ['mon']);
        createForm.setData('start_time', DEFAULT_DUTY_START_TIME);
        createForm.setData('end_time', DEFAULT_DUTY_END_TIME);
        createForm.setData('status', DEFAULT_DUTY_STATUS);
        createForm.setData('remarks', '');
    }

    function setScheduleMode(mode: ScheduleMode) {
        createForm.setData('schedule_mode', mode);

        if (mode === 'multiple_dates') {
            createForm.setData('recurring_start_date', '');
            createForm.setData('recurring_end_date', '');
            createForm.setData('recurring_weekdays', ['mon']);
            setDraftDutyDate('');
        }

        if (mode === 'recurring_weekly') {
            createForm.setData('specific_date_entries', []);
            setDraftDutyDate('');
        }
    }

    function handleCreateSubmit(e: FormEvent) {
        e.preventDefault();

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
            onSuccess: () => {
                resetCreateForm();
                toast.success('Duty schedule saved.');
            },
        });
    }

    function openEdit(schedule: DutySchedule) {
        setSelectedSchedule(schedule);
        setCalendarSelection({
            date: schedule.duty_date,
            title: formatLongScheduleDate(schedule.duty_date),
            subtitle: `${formatTimeRange(schedule.start_time, schedule.end_time)} - ${STATUS_LABELS[schedule.status]}`,
            schedules: [schedule],
        });
        editForm.setData({
            doctor_id: String(schedule.doctor_id),
            duty_date: schedule.duty_date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            status: schedule.status,
            remarks: schedule.remarks ?? '',
        });
        toast.success('Schedule loaded for editing');

        // Scroll to the edit form
        setTimeout(() => {
            const editSection = document.querySelector(
                '[data-edit-form="duty-schedule"]',
            );
            if (editSection) {
                editSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }
        }, 100);
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
        const currentEntries = createForm.data.specific_date_entries;

        if (
            currentEntries.some((entry) => entry.duty_date === normalizedDate)
        ) {
            toast.info('That date is already selected.');
            return;
        }

        const newEntry: SpecificDateEntry = {
            duty_date: normalizedDate,
            start_time: DEFAULT_DUTY_START_TIME,
            end_time: DEFAULT_DUTY_END_TIME,
            status: DEFAULT_DUTY_STATUS,
            remarks: '',
        };

        createForm.setData(
            'specific_date_entries',
            [...currentEntries, newEntry].sort((a, b) =>
                a.duty_date.localeCompare(b.duty_date),
            ),
        );
        setDraftDutyDate('');
    }

    function removeDutyDate(dateIndex: number) {
        createForm.setData(
            'specific_date_entries',
            createForm.data.specific_date_entries.filter(
                (_, index) => index !== dateIndex,
            ),
        );
    }

    function updateDutyEntry<K extends keyof SpecificDateEntry>(
        index: number,
        field: K,
        value: SpecificDateEntry[K],
    ) {
        const updatedEntries = [...createForm.data.specific_date_entries];
        if (updatedEntries[index]) {
            updatedEntries[index] = {
                ...updatedEntries[index],
                [field]: value,
            };
            createForm.setData('specific_date_entries', updatedEntries);
        }
    }

    function selectDay(date: string) {
        const daySchedules = schedulesByDate[date] ?? [];
        const parsedDate = new Date(`${date}T00:00:00`);

        if (!Number.isNaN(parsedDate.getTime())) {
            setVisibleDate(startOfDay(parsedDate));
        }

        setCalendarSelection({
            date,
            title: formatLongScheduleDate(date),
            subtitle:
                daySchedules.length > 0
                    ? `${daySchedules.length} schedule ${daySchedules.length === 1 ? 'entry' : 'entries'} for this day`
                    : 'No schedules for this day',
            schedules: daySchedules,
        });
    }

    function handleBoardDayClick(date: string) {
        selectDay(date);

        if (
            can_manage_schedule &&
            createForm.data.schedule_mode === 'multiple_dates'
        ) {
            addDutyDate(date);
        }
    }

    function handleBoardAddDate(date: string) {
        selectDay(date);
        if (
            can_manage_schedule &&
            createForm.data.schedule_mode === 'multiple_dates'
        ) {
            addDutyDate(date);
        }
    }

    function handleBoardScheduleClick(schedule: DutySchedule) {
        selectDay(schedule.duty_date);
    }

    function goToPreviousPeriod() {
        setVisibleDate((current) =>
            calendarView === 'month'
                ? addMonths(current, -1)
                : addDays(current, calendarView === 'day' ? -1 : -7),
        );
        setCalendarSelection(null);
    }

    function goToNextPeriod() {
        setVisibleDate((current) =>
            calendarView === 'month'
                ? addMonths(current, 1)
                : addDays(current, calendarView === 'day' ? 1 : 7),
        );
        setCalendarSelection(null);
    }

    function goToCurrentPeriod() {
        setVisibleDate(startOfDay(new Date()));
        setCalendarSelection(null);
    }

    function handleCalendarViewChange(view: CalendarView) {
        setCalendarView(view);
        setCalendarSelection(null);
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
                toast.error(
                    'Unable to submit request. Check the highlighted fields.',
                );
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Doctor Duty Calendar" />

            <div className="mx-auto w-full max-w-[1600px] space-y-3 p-3 md:p-4">
                <section className="rounded-xl border bg-card p-3 shadow-sm md:p-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-700">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight">
                                    Doctor Duty Calendar
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Manage weekly doctor coverage and schedule
                                    availability.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-1">
                            {(Object.keys(STATUS_COLORS) as DutyStatus[]).map(
                                (status) => (
                                    <span
                                        key={status}
                                        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                                    >
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    STATUS_COLORS[status],
                                            }}
                                        />
                                        {STATUS_LABELS[status]}
                                    </span>
                                ),
                            )}
                        </div>
                    </div>

                    <div className="rounded-lg border bg-background p-2">
                        <div className="mb-3 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={goToPreviousPeriod}
                                    aria-label={`Previous ${calendarView}`}
                                    className="h-9 w-9 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={goToNextPeriod}
                                    aria-label={`Next ${calendarView}`}
                                    className="h-9 w-9 border-emerald-200 p-0 text-emerald-700 hover:bg-emerald-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={goToCurrentPeriod}
                                    className="h-9 px-5"
                                >
                                    Today
                                </Button>
                            </div>

                            <div className="flex items-center justify-start gap-2 text-xl font-semibold lg:justify-center">
                                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                                {calendarTitle}
                            </div>

                            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                                <div className="grid grid-cols-3 rounded-lg border bg-muted/20 p-1">
                                    {(
                                        [
                                            'month',
                                            'week',
                                            'day',
                                        ] as CalendarView[]
                                    ).map((view) => (
                                        <Button
                                            key={view}
                                            type="button"
                                            size="sm"
                                            variant={
                                                calendarView === view
                                                    ? 'default'
                                                    : 'ghost'
                                            }
                                            aria-pressed={calendarView === view}
                                            className={
                                                calendarView === view
                                                    ? 'h-8 bg-emerald-600 px-4 text-white hover:bg-emerald-700'
                                                    : 'h-8 px-4 text-muted-foreground hover:bg-background'
                                            }
                                            onClick={() =>
                                                handleCalendarViewChange(view)
                                            }
                                        >
                                            {CALENDAR_VIEW_LABELS[view]}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <div
                                className={
                                    calendarView === 'day'
                                        ? 'grid min-w-0 grid-cols-1 gap-2'
                                        : 'grid min-w-[980px] grid-cols-7 gap-2'
                                }
                            >
                                {visibleCalendarDates.map((date) => {
                                    const dateKey = buildInputDate(date);
                                    const daySchedules =
                                        schedulesByDate[dateKey] ?? [];
                                    const onDutyCount = daySchedules.filter(
                                        (schedule) =>
                                            schedule.status === 'on_duty',
                                    ).length;
                                    const isToday =
                                        dateKey === buildInputDate(new Date());
                                    const isSelected =
                                        displayedCalendarSelection.date ===
                                        dateKey;
                                    const isDraftSelected =
                                        selectedSpecificDates.has(dateKey);
                                    const isOutsideMonth =
                                        calendarView === 'month' &&
                                        date.getMonth() !==
                                            visibleDate.getMonth();
                                    const calendarCellHeight =
                                        calendarView === 'month'
                                            ? 'h-[155px]'
                                            : calendarView === 'day'
                                              ? 'min-h-[280px]'
                                              : 'h-[220px]';

                                    return (
                                        <div
                                            key={dateKey}
                                            className={`flex ${calendarCellHeight} flex-col rounded-lg border bg-card transition ${isOutsideMonth ? 'bg-muted/20 text-muted-foreground/80' : ''} ${isToday ? 'border-emerald-200 bg-emerald-50/30' : ''} ${isSelected ? 'border-emerald-200 bg-emerald-50/20 ring-1 ring-emerald-200' : ''} ${isDraftSelected ? 'border-emerald-300' : ''}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleBoardDayClick(dateKey)
                                                }
                                                className="flex items-center justify-between gap-2 border-b px-3 py-2 text-left hover:bg-muted/30"
                                            >
                                                <span className="font-semibold">
                                                    {formatBoardDay(date)}{' '}
                                                    {formatBoardDate(date)}
                                                </span>
                                                {daySchedules.length > 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="shrink-0 border-emerald-100 bg-emerald-50 text-[11px] text-emerald-700"
                                                    >
                                                        {onDutyCount > 0
                                                            ? `${onDutyCount} on duty`
                                                            : `${daySchedules.length} scheduled`}
                                                    </Badge>
                                                )}
                                            </button>

                                            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                                                {daySchedules.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {daySchedules.map(
                                                            (schedule) => (
                                                                <button
                                                                    key={
                                                                        schedule.id
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleBoardScheduleClick(
                                                                            schedule,
                                                                        )
                                                                    }
                                                                    className="w-full rounded-md border bg-background px-2.5 py-1.5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
                                                                >
                                                                    <span className="flex items-start gap-2">
                                                                        <span
                                                                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[schedule.status]}`}
                                                                        />
                                                                        <span className="min-w-0">
                                                                            <span className="block truncate text-sm font-medium">
                                                                                {
                                                                                    schedule.doctor_name
                                                                                }
                                                                            </span>
                                                                            <span className="block text-xs text-muted-foreground">
                                                                                {formatTimeRange(
                                                                                    schedule.start_time,
                                                                                    schedule.end_time,
                                                                                )}
                                                                            </span>
                                                                        </span>
                                                                    </span>
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleBoardDayClick(
                                                                dateKey,
                                                            )
                                                        }
                                                        className="flex h-full min-h-0 w-full flex-col items-center justify-center rounded-md px-3 text-center text-sm text-muted-foreground hover:bg-muted/30"
                                                    >
                                                        <CalendarDays className="mb-2 h-7 w-7 text-muted-foreground/40" />
                                                        No duty schedules
                                                    </button>
                                                )}
                                            </div>

                                            {can_manage_schedule &&
                                                createForm.data
                                                    .schedule_mode ===
                                                    'multiple_dates' && (
                                                    <div className="border-t px-3 py-2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full justify-center text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                            onClick={() =>
                                                                handleBoardAddDate(
                                                                    dateKey,
                                                                )
                                                            }
                                                        >
                                                            <CalendarPlus className="mr-2 h-4 w-4" />
                                                            {isDraftSelected
                                                                ? 'Selected'
                                                                : 'Add duty'}
                                                        </Button>
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {can_manage_schedule && (
                    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <form
                            onSubmit={handleCreateSubmit}
                            className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm md:p-5"
                        >
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Add Duty Schedule
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Create schedules for selected dates or
                                        build a guided weekly recurrence.
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                                >
                                    {MODE_LABELS[createForm.data.schedule_mode]}
                                </Badge>
                            </div>

                            <div className="grid min-w-0 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="doctor_id"
                                        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                    >
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
                                    {createForm.errors.doctor_id && (
                                        <p className="text-sm text-destructive">
                                            {createForm.errors.doctor_id}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        Scheduling Mode
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/30 p-1.5 sm:grid-cols-2">
                                        {MODE_OPTIONS.map((mode) => (
                                            <Button
                                                key={mode}
                                                type="button"
                                                size="sm"
                                                variant={
                                                    createForm.data
                                                        .schedule_mode === mode
                                                        ? 'default'
                                                        : 'ghost'
                                                }
                                                className={
                                                    createForm.data
                                                        .schedule_mode === mode
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
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
                                </div>

                                {createForm.data.schedule_mode ===
                                    'multiple_dates' && (
                                    <div className="grid min-w-0 gap-3 rounded-xl border bg-muted/20 p-3">
                                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                                            <div className="flex gap-2">
                                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                <span>
                                                    Each selected date can have
                                                    its own start time, end
                                                    time, status, and remarks.
                                                    Edit times directly in the
                                                    table below.
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-end gap-2">
                                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                <Label
                                                    htmlFor="draft_duty_date"
                                                    className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                                >
                                                    Add Date
                                                </Label>
                                                <Input
                                                    id="draft_duty_date"
                                                    type="date"
                                                    className="h-10 rounded-lg"
                                                    value={draftDutyDate}
                                                    onChange={(e) =>
                                                        setDraftDutyDate(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10"
                                                onClick={() =>
                                                    addDutyDate(draftDutyDate)
                                                }
                                            >
                                                <CalendarPlus className="mr-2 h-4 w-4" />
                                                Add
                                            </Button>
                                        </div>

                                        <div className="min-w-0 overflow-hidden rounded-lg border bg-background">
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                                                <div>
                                                    <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                        Scheduled Dates
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {
                                                            createForm.data
                                                                .specific_date_entries
                                                                .length
                                                        }{' '}
                                                        selected
                                                    </p>
                                                </div>
                                                {createForm.data
                                                    .specific_date_entries
                                                    .length > 0 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-muted-foreground"
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
                                                .specific_date_entries.length >
                                            0 ? (
                                                <div className="max-h-[360px] overflow-auto border-t">
                                                    <table className="w-full min-w-[760px] text-sm">
                                                        <thead className="sticky top-0 z-10 bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                                            <tr>
                                                                <th className="px-3 py-2 font-medium">
                                                                    Date
                                                                </th>
                                                                <th className="px-3 py-2 font-medium">
                                                                    Start
                                                                </th>
                                                                <th className="px-3 py-2 font-medium">
                                                                    End
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
                                                                        className="align-middle"
                                                                    >
                                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                                            <div className="font-medium">
                                                                                {formatScheduleDate(
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
                                                                                id={`specific_date_entries_${index}_start_time`}
                                                                                type="time"
                                                                                value={
                                                                                    entry.start_time
                                                                                }
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateDutyEntry(
                                                                                        index,
                                                                                        'start_time',
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-8 w-28 rounded-md"
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <Input
                                                                                id={`specific_date_entries_${index}_end_time`}
                                                                                type="time"
                                                                                value={
                                                                                    entry.end_time
                                                                                }
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateDutyEntry(
                                                                                        index,
                                                                                        'end_time',
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-8 w-28 rounded-md"
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <select
                                                                                id={`specific_date_entries_${index}_status`}
                                                                                value={
                                                                                    entry.status
                                                                                }
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateDutyEntry(
                                                                                        index,
                                                                                        'status',
                                                                                        e
                                                                                            .target
                                                                                            .value as DutyStatus,
                                                                                    )
                                                                                }
                                                                                className="h-8 w-36 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
                                                                            >
                                                                                {(
                                                                                    Object.keys(
                                                                                        STATUS_LABELS,
                                                                                    ) as DutyStatus[]
                                                                                ).map(
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
                                                                                id={`specific_date_entries_${index}_remarks`}
                                                                                value={
                                                                                    entry.remarks
                                                                                }
                                                                                placeholder="Optional notes"
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateDutyEntry(
                                                                                        index,
                                                                                        'remarks',
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-8 min-w-44 rounded-md"
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                                                onClick={() =>
                                                                                    removeDutyDate(
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
                                                <div className="border-t px-3 py-6 text-center text-sm text-muted-foreground">
                                                    Add one or more dates to
                                                    begin.
                                                </div>
                                            )}
                                        </div>

                                        {createForm.errors
                                            .specific_date_entries && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    createForm.errors
                                                        .specific_date_entries
                                                }
                                            </p>
                                        )}
                                    </div>
                                )}

                                {createForm.data.schedule_mode ===
                                    'recurring_weekly' && (
                                    <div className="grid gap-4 rounded-xl border bg-muted/20 p-3">
                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                A. Recurrence Pattern
                                            </h3>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <Label
                                                        htmlFor="recurring_start_date"
                                                        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                                    >
                                                        Start Date
                                                    </Label>
                                                    <Input
                                                        id="recurring_start_date"
                                                        type="date"
                                                        className="h-10 rounded-lg"
                                                        value={
                                                            createForm.data
                                                                .recurring_start_date
                                                        }
                                                        onChange={(e) =>
                                                            createForm.setData(
                                                                'recurring_start_date',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <Label
                                                        htmlFor="recurring_end_date"
                                                        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                                    >
                                                        End Date
                                                    </Label>
                                                    <Input
                                                        id="recurring_end_date"
                                                        type="date"
                                                        className="h-10 rounded-lg"
                                                        value={
                                                            createForm.data
                                                                .recurring_end_date
                                                        }
                                                        onChange={(e) =>
                                                            createForm.setData(
                                                                'recurring_end_date',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-col gap-1.5">
                                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                    Repeat On
                                                </Label>
                                                <ToggleGroup
                                                    type="multiple"
                                                    value={
                                                        createForm.data
                                                            .recurring_weekdays
                                                    }
                                                    onValueChange={(value) =>
                                                        setRecurringWeekdays(
                                                            value,
                                                        )
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
                                                            {
                                                                WEEKDAY_LABELS[
                                                                    weekday
                                                                ]
                                                            }
                                                        </ToggleGroupItem>
                                                    ))}
                                                </ToggleGroup>
                                            </div>
                                        </div>

                                        {(createForm.errors
                                            .recurring_start_date ||
                                            createForm.errors
                                                .recurring_end_date ||
                                            createForm.errors
                                                .recurring_weekdays) && (
                                            <p className="text-sm text-destructive">
                                                {createForm.errors
                                                    .recurring_start_date ||
                                                    createForm.errors
                                                        .recurring_end_date ||
                                                    createForm.errors
                                                        .recurring_weekdays}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {createForm.data.schedule_mode ===
                                    'recurring_weekly' && (
                                    <>
                                        <div className="border-t pt-3">
                                            <h3 className="text-sm font-semibold">
                                                B. Duty Details
                                            </h3>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                These values apply to every
                                                schedule generated by this
                                                weekly recurrence.
                                            </p>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="flex flex-col gap-1.5">
                                                <Label
                                                    htmlFor="start_time"
                                                    className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                                >
                                                    Start Time
                                                </Label>
                                                <Input
                                                    id="start_time"
                                                    type="time"
                                                    className="h-10 rounded-lg"
                                                    value={
                                                        createForm.data
                                                            .start_time
                                                    }
                                                    onChange={(e) =>
                                                        createForm.setData(
                                                            'start_time',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label
                                                    htmlFor="end_time"
                                                    className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                                >
                                                    End Time
                                                </Label>
                                                <Input
                                                    id="end_time"
                                                    type="time"
                                                    className="h-10 rounded-lg"
                                                    value={
                                                        createForm.data.end_time
                                                    }
                                                    onChange={(e) =>
                                                        createForm.setData(
                                                            'end_time',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                        {(createForm.errors.start_time ||
                                            createForm.errors.end_time) && (
                                            <p className="text-sm text-destructive">
                                                {createForm.errors.start_time ||
                                                    createForm.errors.end_time}
                                            </p>
                                        )}

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="flex flex-col gap-1.5">
                                                <Label
                                                    htmlFor="status"
                                                    className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                                >
                                                    Status
                                                </Label>
                                                <select
                                                    id="status"
                                                    value={
                                                        createForm.data.status
                                                    }
                                                    onChange={(e) =>
                                                        createForm.setData(
                                                            'status',
                                                            e.target
                                                                .value as DutyStatus,
                                                        )
                                                    }
                                                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                                >
                                                    {(
                                                        Object.keys(
                                                            STATUS_LABELS,
                                                        ) as DutyStatus[]
                                                    ).map((status) => (
                                                        <option
                                                            key={status}
                                                            value={status}
                                                        >
                                                            {
                                                                STATUS_LABELS[
                                                                    status
                                                                ]
                                                            }
                                                        </option>
                                                    ))}
                                                </select>
                                                {createForm.errors.status && (
                                                    <p className="text-sm text-destructive">
                                                        {
                                                            createForm.errors
                                                                .status
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <Label
                                                    htmlFor="remarks"
                                                    className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                                >
                                                    Remarks
                                                </Label>
                                                <textarea
                                                    id="remarks"
                                                    value={
                                                        createForm.data.remarks
                                                    }
                                                    onChange={(e) =>
                                                        createForm.setData(
                                                            'remarks',
                                                            e.target.value,
                                                        )
                                                    }
                                                    rows={2}
                                                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                                    placeholder="Optional notes for this recurrence"
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-lg border bg-background p-3">
                                            <h3 className="text-sm font-semibold">
                                                C. Preview Summary
                                            </h3>
                                            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                                <div>
                                                    <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                                                        Doctor
                                                    </dt>
                                                    <dd className="font-medium">
                                                        {selectedDoctorName}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                                                        Time
                                                    </dt>
                                                    <dd className="font-medium">
                                                        {formatTimeRange(
                                                            createForm.data
                                                                .start_time,
                                                            createForm.data
                                                                .end_time,
                                                        )}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                                                        Date Range
                                                    </dt>
                                                    <dd className="font-medium">
                                                        {createForm.data
                                                            .recurring_start_date &&
                                                        createForm.data
                                                            .recurring_end_date
                                                            ? `${formatScheduleDate(createForm.data.recurring_start_date)} - ${formatScheduleDate(createForm.data.recurring_end_date)}`
                                                            : 'Choose a start and end date'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                                                        Entries
                                                    </dt>
                                                    <dd className="font-medium">
                                                        {
                                                            recurringPreviewDates.length
                                                        }
                                                    </dd>
                                                </div>
                                            </dl>
                                            <div className="mt-3">
                                                <div className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
                                                    Generated Dates
                                                </div>
                                                {recurringPreviewDates.length >
                                                0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {recurringPreviewDates
                                                            .slice(0, 8)
                                                            .map((date) => (
                                                                <span
                                                                    key={date}
                                                                    className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
                                                                >
                                                                    {formatScheduleDate(
                                                                        date,
                                                                    )}
                                                                </span>
                                                            ))}
                                                        {recurringPreviewDates.length >
                                                            8 && (
                                                            <span className="rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground">
                                                                +
                                                                {recurringPreviewDates.length -
                                                                    8}{' '}
                                                                more
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">
                                                        The preview appears
                                                        after choosing a date
                                                        range and repeat days.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {createForm.errors.schedule_mode && (
                                    <p className="text-sm text-destructive">
                                        {createForm.errors.schedule_mode}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2 border-t pt-3">
                                    <Button
                                        type="submit"
                                        disabled={createForm.processing}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        {createForm.processing
                                            ? 'Saving...'
                                            : 'Save Duty Schedule'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => resetCreateForm()}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </form>

                        <div className="grid min-w-0 gap-3">
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            Selected Day Details
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Showing schedules for{' '}
                                            <span className="font-medium text-emerald-700">
                                                {
                                                    displayedCalendarSelection.title
                                                }
                                            </span>
                                        </p>
                                    </div>
                                    {can_manage_schedule &&
                                        displayedCalendarSelection.date && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                onClick={() =>
                                                    handleBoardAddDate(
                                                        displayedCalendarSelection.date,
                                                    )
                                                }
                                            >
                                                <CalendarPlus className="mr-2 h-4 w-4" />
                                                Add Duty
                                            </Button>
                                        )}
                                </div>

                                {displayedCalendarSelection.schedules.length >
                                0 ? (
                                    <div className="overflow-x-auto rounded-lg border">
                                        <table className="w-full min-w-[560px] text-sm">
                                            <thead className="bg-muted/40">
                                                <tr className="text-left text-muted-foreground">
                                                    <th className="px-3 py-2.5">
                                                        Doctor
                                                    </th>
                                                    <th className="px-3 py-2.5">
                                                        Time
                                                    </th>
                                                    <th className="px-3 py-2.5">
                                                        Status
                                                    </th>
                                                    <th className="px-3 py-2.5">
                                                        Remarks
                                                    </th>
                                                    {can_manage_schedule && (
                                                        <th className="px-3 py-2.5 text-right">
                                                            Action
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {displayedCalendarSelection.schedules.map(
                                                    (schedule) => (
                                                        <tr
                                                            key={schedule.id}
                                                            className="border-t"
                                                        >
                                                            <td className="px-3 py-2.5 font-medium">
                                                                <span className="inline-flex items-center gap-2">
                                                                    <span
                                                                        className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[schedule.status]}`}
                                                                    />
                                                                    {
                                                                        schedule.doctor_name
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                {formatTimeRange(
                                                                    schedule.start_time,
                                                                    schedule.end_time,
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        STATUS_BADGE_CLASSES[
                                                                            schedule
                                                                                .status
                                                                        ]
                                                                    }
                                                                >
                                                                    {
                                                                        STATUS_LABELS[
                                                                            schedule
                                                                                .status
                                                                        ]
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-muted-foreground">
                                                                {schedule.remarks ||
                                                                    '-'}
                                                            </td>
                                                            {can_manage_schedule && (
                                                                <td className="px-3 py-2.5 text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-emerald-700 hover:text-emerald-800"
                                                                        onClick={() =>
                                                                            openEdit(
                                                                                schedule,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
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
                                ) : (
                                    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-5 text-center text-sm text-muted-foreground">
                                        No schedules are recorded for this day.
                                    </div>
                                )}

                                <div className="mt-3 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                                    Click a day in the calendar above to view
                                    its schedules.
                                </div>
                            </div>

                            {selectedSchedule ? (
                                <div
                                    className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm"
                                    data-edit-form="duty-schedule"
                                >
                                    <h2 className="mb-1 text-lg font-semibold">
                                        Edit Duty Schedule
                                    </h2>
                                    <p className="mb-4 text-xs text-muted-foreground">
                                        Editing: {selectedSchedule.doctor_name}{' '}
                                        on{' '}
                                        {formatScheduleDate(
                                            selectedSchedule.duty_date,
                                        )}
                                    </p>

                                    <form
                                        onSubmit={handleEditSubmit}
                                        className="grid gap-3"
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <Label
                                                htmlFor="edit_doctor_id"
                                                className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                            >
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
                                                    e.target
                                                        .value as DutyStatus,
                                                )
                                            }
                                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                        >
                                            {(
                                                Object.keys(
                                                    STATUS_LABELS,
                                                ) as DutyStatus[]
                                            ).map((status) => (
                                                <option
                                                    key={status}
                                                    value={status}
                                                >
                                                    {STATUS_LABELS[status]}
                                                </option>
                                            ))}
                                        </select>

                                        <textarea
                                            value={editForm.data.remarks}
                                            onChange={(e) =>
                                                editForm.setData(
                                                    'remarks',
                                                    e.target.value,
                                                )
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
                                                    editForm.errors
                                                        .start_time ||
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
                                                    handleDelete(
                                                        selectedSchedule.id,
                                                    )
                                                }
                                            >
                                                Delete
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() =>
                                                    setSelectedSchedule(null)
                                                }
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <div
                                    className="rounded-xl border bg-card p-4 shadow-sm"
                                    data-edit-form="duty-schedule"
                                >
                                    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-8 text-center">
                                        <div className="rounded-full border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
                                            <Pencil className="h-5 w-5" />
                                        </div>
                                        <h2 className="mt-4 text-lg font-semibold">
                                            Edit Duty Schedule
                                        </h2>
                                        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                            Select a schedule from the selected
                                            day details or the duty schedule
                                            list to load it here for editing.
                                        </p>
                                        <Badge
                                            variant="outline"
                                            className="mt-4 border-slate-200 bg-background text-muted-foreground"
                                        >
                                            No schedule selected
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                <section className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Duty Schedule List
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                All scheduled duty entries.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant="outline"
                                className="border-slate-200 bg-background text-muted-foreground"
                            >
                                {schedules.length} entries
                            </Badge>
                            <Badge
                                variant="outline"
                                className="border-emerald-100 bg-emerald-50 text-emerald-700"
                            >
                                10 rows per page
                            </Badge>
                        </div>
                    </div>
                    {schedules.length === 0 ? (
                        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                            No duty schedules in the selected range.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px] text-sm">
                                    <thead className="bg-muted/40">
                                        <tr className="text-left text-muted-foreground">
                                            <th className="px-3 py-2.5">
                                                Date
                                            </th>
                                            <th className="px-3 py-2.5">
                                                Doctor
                                            </th>
                                            <th className="px-3 py-2.5">
                                                Start Time
                                            </th>
                                            <th className="px-3 py-2.5">
                                                End Time
                                            </th>
                                            <th className="px-3 py-2.5">
                                                Status
                                            </th>
                                            <th className="px-3 py-2.5">
                                                Remarks
                                            </th>
                                            <th className="px-3 py-2.5">
                                                Created By
                                            </th>
                                            {can_manage_schedule && (
                                                <th className="px-3 py-2.5 text-right">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedSchedules.rows.map(
                                            (schedule) => (
                                                <tr
                                                    key={schedule.id}
                                                    className="border-t align-top hover:bg-muted/20"
                                                >
                                                    <td className="px-3 py-2.5">
                                                        {formatScheduleDate(
                                                            schedule.duty_date,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-medium">
                                                        <span className="inline-flex items-center gap-2">
                                                            <span
                                                                className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[schedule.status]}`}
                                                            />
                                                            {
                                                                schedule.doctor_name
                                                            }
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        {formatTime(
                                                            schedule.start_time,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        {formatTime(
                                                            schedule.end_time,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                STATUS_BADGE_CLASSES[
                                                                    schedule
                                                                        .status
                                                                ]
                                                            }
                                                        >
                                                            {
                                                                STATUS_LABELS[
                                                                    schedule
                                                                        .status
                                                                ]
                                                            }
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        {schedule.remarks ||
                                                            '-'}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        -
                                                    </td>
                                                    {can_manage_schedule && (
                                                        <td className="px-3 py-2.5 text-right">
                                                            <div className="inline-flex items-center justify-end gap-1">
                                                                <Button
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
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            schedule.id,
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
                    )}
                </section>

                {(can_submit_duty_requests || can_review_duty_requests) && (
                    <section
                        className={
                            hasBothRequestPanels
                                ? 'grid gap-4 xl:grid-cols-2'
                                : 'grid gap-4'
                        }
                    >
                        {can_submit_duty_requests && (
                            <div className="w-full rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                                <h2 className="text-lg font-semibold">
                                    Request Leave / Absence
                                </h2>
                                <p className="mb-4 text-xs text-muted-foreground">
                                    Quick request flow for leave and absence.
                                    End date defaults to start date if blank.
                                </p>

                                <form
                                    onSubmit={handleDutyRequestSubmit}
                                    className="grid gap-4 sm:grid-cols-2"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <Label
                                            htmlFor="request_type"
                                            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                        >
                                            Request Type
                                        </Label>
                                        <select
                                            id="request_type"
                                            value={
                                                dutyRequestForm.data
                                                    .request_type
                                            }
                                            onChange={(e) =>
                                                dutyRequestForm.setData(
                                                    'request_type',
                                                    e.target
                                                        .value as DutyRequestType,
                                                )
                                            }
                                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
                                        >
                                            <option value="on_leave">
                                                Leave
                                            </option>
                                            <option value="absent">
                                                Absent
                                            </option>
                                        </select>
                                        {dutyRequestForm.errors
                                            .request_type && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    dutyRequestForm.errors
                                                        .request_type
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label
                                            htmlFor="start_date"
                                            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                        >
                                            Start Date
                                        </Label>
                                        <Input
                                            id="start_date"
                                            type="date"
                                            className="h-10 rounded-lg"
                                            value={
                                                dutyRequestForm.data.start_date
                                            }
                                            onChange={(e) =>
                                                dutyRequestForm.setData(
                                                    'start_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {dutyRequestForm.errors.start_date && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    dutyRequestForm.errors
                                                        .start_date
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label
                                            htmlFor="end_date"
                                            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                        >
                                            End Date (optional)
                                        </Label>
                                        <Input
                                            id="end_date"
                                            type="date"
                                            className="h-10 rounded-lg"
                                            value={
                                                dutyRequestForm.data.end_date
                                            }
                                            onChange={(e) =>
                                                dutyRequestForm.setData(
                                                    'end_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {dutyRequestForm.errors.end_date && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    dutyRequestForm.errors
                                                        .end_date
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                                        <Label
                                            htmlFor="request_remarks"
                                            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                        >
                                            Reason / Remarks
                                        </Label>
                                        <textarea
                                            id="request_remarks"
                                            rows={3}
                                            value={dutyRequestForm.data.remarks}
                                            onChange={(e) =>
                                                dutyRequestForm.setData(
                                                    'remarks',
                                                    e.target.value,
                                                )
                                            }
                                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                            placeholder="Add reason for leave or absence request"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <Button
                                            type="submit"
                                            disabled={
                                                dutyRequestForm.processing
                                            }
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {dutyRequestForm.processing
                                                ? 'Submitting...'
                                                : 'Submit Request'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {can_review_duty_requests && (
                            <div className="w-full rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            Pending Leave / Absence Requests
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Review incoming duty changes without
                                            stretching the page.
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="border-emerald-100 bg-emerald-50 text-emerald-700"
                                    >
                                        10 rows per page
                                    </Badge>
                                </div>

                                {pending_duty_requests.length === 0 ? (
                                    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center">
                                        <p className="text-sm font-medium">
                                            No pending requests
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Incoming requests will appear here
                                            for review.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-lg border">
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[920px] text-sm">
                                                <thead className="bg-muted/40">
                                                    <tr className="text-left text-muted-foreground">
                                                        <th className="px-3 py-2.5">
                                                            Doctor
                                                        </th>
                                                        <th className="px-3 py-2.5">
                                                            Request
                                                        </th>
                                                        <th className="px-3 py-2.5">
                                                            Date Range
                                                        </th>
                                                        <th className="px-3 py-2.5">
                                                            Reason
                                                        </th>
                                                        <th className="px-3 py-2.5">
                                                            Review
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedPendingRequests.rows.map(
                                                        (request) => (
                                                            <tr
                                                                key={request.id}
                                                                className="border-t align-top hover:bg-muted/20"
                                                            >
                                                                <td className="px-3 py-2.5 font-medium">
                                                                    {
                                                                        request.doctor_name
                                                                    }
                                                                </td>
                                                                <td className="px-3 py-2.5">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={
                                                                            REQUEST_STATUS_BADGE_CLASSES[
                                                                                request
                                                                                    .status
                                                                            ]
                                                                        }
                                                                    >
                                                                        {
                                                                            REQUEST_TYPE_LABELS[
                                                                                request
                                                                                    .request_type
                                                                            ]
                                                                        }
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                                                                    {
                                                                        request.start_date
                                                                    }{' '}
                                                                    to{' '}
                                                                    {
                                                                        request.end_date
                                                                    }
                                                                </td>
                                                                <td className="max-w-[240px] px-3 py-2.5 text-muted-foreground">
                                                                    <span className="line-clamp-2">
                                                                        {request.remarks ||
                                                                            '-'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2.5">
                                                                    <div className="grid min-w-64 gap-2">
                                                                        <Input
                                                                            placeholder="Reviewer notes (optional)"
                                                                            value={
                                                                                reviewerNotes[
                                                                                    request
                                                                                        .id
                                                                                ] ??
                                                                                ''
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setReviewerNotes(
                                                                                    (
                                                                                        current,
                                                                                    ) => ({
                                                                                        ...current,
                                                                                        [request.id]:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    }),
                                                                                )
                                                                            }
                                                                            className="h-9"
                                                                        />
                                                                        <div className="flex gap-2">
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
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <PaginationControls
                                            currentPage={
                                                paginatedPendingRequests.currentPage
                                            }
                                            lastPage={
                                                paginatedPendingRequests.lastPage
                                            }
                                            from={paginatedPendingRequests.from}
                                            to={paginatedPendingRequests.to}
                                            total={
                                                paginatedPendingRequests.total
                                            }
                                            onPageChange={
                                                setPendingRequestsPage
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {(can_submit_duty_requests || can_review_duty_requests) && (
                    <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Duty Request History
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Recent leave and absence requests.
                                </p>
                            </div>
                            <Badge
                                variant="outline"
                                className="border-emerald-100 bg-emerald-50 text-emerald-700"
                            >
                                10 rows per page
                            </Badge>
                        </div>
                        {duty_requests.length === 0 ? (
                            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                                No duty requests recorded yet.
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-lg border">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-sm">
                                        <thead className="bg-muted/40">
                                            <tr className="text-left text-muted-foreground">
                                                <th className="px-3 py-2.5">
                                                    Doctor
                                                </th>
                                                <th className="px-3 py-2.5">
                                                    Type
                                                </th>
                                                <th className="px-3 py-2.5">
                                                    Date Range
                                                </th>
                                                <th className="px-3 py-2.5">
                                                    Status
                                                </th>
                                                <th className="px-3 py-2.5">
                                                    Remarks
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedDutyRequests.rows.map(
                                                (request) => (
                                                    <tr
                                                        key={request.id}
                                                        className="border-t align-top hover:bg-muted/20"
                                                    >
                                                        <td className="px-3 py-2.5">
                                                            {
                                                                request.doctor_name
                                                            }
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            {
                                                                REQUEST_TYPE_LABELS[
                                                                    request
                                                                        .request_type
                                                                ]
                                                            }
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            {request.start_date}{' '}
                                                            - {request.end_date}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    REQUEST_STATUS_BADGE_CLASSES[
                                                                        request
                                                                            .status
                                                                    ]
                                                                }
                                                            >
                                                                {
                                                                    REQUEST_STATUS_LABELS[
                                                                        request
                                                                            .status
                                                                    ]
                                                                }
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            {request.remarks ||
                                                                '-'}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <PaginationControls
                                    currentPage={
                                        paginatedDutyRequests.currentPage
                                    }
                                    lastPage={paginatedDutyRequests.lastPage}
                                    from={paginatedDutyRequests.from}
                                    to={paginatedDutyRequests.to}
                                    total={paginatedDutyRequests.total}
                                    onPageChange={setRequestHistoryPage}
                                />
                            </div>
                        )}
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
