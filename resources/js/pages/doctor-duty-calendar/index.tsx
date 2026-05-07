import { Head, router, useForm } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Clock, Send } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';

type DutyStatus = 'on_duty' | 'off_duty' | 'absent' | 'on_leave';
type RequestStatus = 'pending' | 'approved' | 'rejected';
type RequestType = 'on_leave' | 'absent';

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

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    on_leave: 'Leave',
    absent: 'Absent',
};

const REQUEST_TYPE_BADGE_CLASSES: Record<RequestType, string> = {
    on_leave: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    absent: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
};

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

function RequestTypeBadge({ type }: { type: RequestType }) {
    return (
        <Badge variant="outline" className={REQUEST_TYPE_BADGE_CLASSES[type]}>
            {REQUEST_TYPE_LABELS[type]}
        </Badge>
    );
}

type DutySchedule = {
    id: number;
    date: string;
    duty_date?: string | null;
    start_time: string;
    end_time: string;
    status: DutyStatus;
    remarks?: string | null;
};

type DutyRequest = {
    id: number;
    request_type: RequestType;
    start_date: string;
    end_date: string;
    status: RequestStatus;
    remarks?: string | null;
    created_at?: string | null;
    reviewed_at?: string | null;
    reviewer_notes?: string | null;
};

type PaginatedData<T> = {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
};

function dateKey(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
    return new Date(`${value}T00:00:00`);
}

function startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function endOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function getMonthGridDates(visible: Date) {
    const start = startOfMonth(visible);
    const startDay = start.getDay();
    const first = new Date(start);
    first.setDate(first.getDate() - startDay);

    const dates: Date[] = [];
    for (let i = 0; i < 42; i++) {
        const dt = new Date(first);
        dt.setDate(first.getDate() + i);
        dates.push(dt);
    }
    return dates;
}

function formatMonthYear(d: Date) {
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function formatDate(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString();
}

function formatDateRange(a?: string, b?: string) {
    if (!a) return '';
    if (!b || a === b) return formatDate(a);
    return `${formatDate(a)} — ${formatDate(b)}`;
}

function formatDateTime(value?: string | null) {
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

function toDateInputValue(date: Date) {
    return dateKey(date);
}

export default function DoctorDutyCalendarIndex(props: {
    auth: any;
    schedules: DutySchedule[];
    duty_requests: PaginatedData<DutyRequest>;
    pending_duty_requests: PaginatedData<DutyRequest>;
    filters: {
        start: string;
        end: string;
    };
}) {
    const { schedules = [], duty_requests, pending_duty_requests, filters } = props;

    const historyRequests = duty_requests?.data ?? [];
    const pendingRequests = pending_duty_requests?.data ?? [];
    const historyMeta = duty_requests?.meta ?? { current_page: 1, last_page: 1, per_page: 10, total: historyRequests.length };
    const pendingMeta = pending_duty_requests?.meta ?? { current_page: 1, last_page: 1, per_page: 10, total: pendingRequests.length };

    const initialMonth = filters?.start ? startOfMonth(parseLocalDate(filters.start)) : startOfMonth(new Date());
    const initialSelectedDate = schedules[0]?.date ?? filters?.start ?? dateKey(new Date());

    const [visibleDate, setVisibleDate] = useState(() => initialMonth);
    const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate);
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'calendar' | 'status' | 'history'>('calendar');

    const dutyRequestForm = useForm({ request_type: 'on_leave', start_date: '', end_date: '', remarks: '' });

    const schedulesByDate = useMemo(() => {
        const map: Record<string, DutySchedule[]> = {};
        schedules.forEach((s) => {
            const scheduleDate = s.date ?? s.duty_date;

            if (!scheduleDate) {
                return;
            }

            (map[scheduleDate] ||= []).push(s);
        });
        return map;
    }, [schedules]);

    const calendarDates = useMemo(() => getMonthGridDates(visibleDate), [visibleDate]);

    const selectedSchedules = schedulesByDate[selectedDate] ?? [];

    useEffect(() => {
        const nextVisibleDate = filters?.start ? startOfMonth(parseLocalDate(filters.start)) : startOfMonth(new Date());
        setVisibleDate(nextVisibleDate);
        setSelectedDate(schedules[0]?.date ?? filters?.start ?? dateKey(new Date()));
    }, [filters?.start, schedules]);

    function loadMonth(monthDate: Date) {
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        setVisibleDate(start);

        router.get('/doctor-duty-calendar', {
            start: toDateInputValue(start),
            end: toDateInputValue(end),
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function moveMonth(offset: number) {
        loadMonth(addMonths(visibleDate, offset));
    }

    function goToday() {
        loadMonth(startOfMonth(new Date()));
    }

    function goToHistoryPage(page: number) {
        router.get('/doctor-duty-calendar', {
            start: filters?.start,
            end: filters?.end,
            history_page: page,
            pending_page: pendingMeta.current_page,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function goToPendingPage(page: number) {
        router.get('/doctor-duty-calendar', {
            start: filters?.start,
            end: filters?.end,
            history_page: historyMeta.current_page,
            pending_page: page,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function handleRequestSubmit(e: FormEvent) {
        e.preventDefault();
        dutyRequestForm.post('/doctor-duty-requests', {
            onSuccess: () => {
                setIsRequestDialogOpen(false);
                dutyRequestForm.reset();
                toast.success('Request submitted');
                setActiveTab('status');
            },
            onError: () => toast.error('Unable to submit request'),
        });
    }

    return (
        <AppLayout>
            <Head title="Duty Calendar" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold">Duty Calendar</h1>
                        <p className="text-sm text-muted-foreground">Your personal duty calendar and request centre.</p>
                    </div>

                    <div className="rounded-lg border bg-background p-1 shadow-sm">
                        <div role="tablist" aria-label="Doctor duty calendar sections" className="grid gap-1 md:grid-cols-3">
                            {[
                                { id: 'calendar', label: 'Calendar', description: 'Month view and request action' },
                                { id: 'status', label: 'Request Status', description: 'Pending review items' },
                                { id: 'history', label: 'Request History', description: 'Submitted request records' },
                            ].map((tab) => {
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        className={`rounded-md px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
                                        onClick={() => setActiveTab(tab.id as 'calendar' | 'status' | 'history')}
                                    >
                                        <span className="block text-sm font-semibold">{tab.label}</span>
                                        <span className={`mt-0.5 block text-xs ${isActive ? 'text-slate-200' : 'text-muted-foreground'}`}>{tab.description}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <section className="grid gap-6">
                    {activeTab === 'calendar' && (
                        <div className="rounded-2xl border bg-background shadow-sm">
                            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">{formatMonthYear(visibleDate)}</h2>
                                    <p className="text-sm text-muted-foreground">Click a day to review the duty schedule for that date.</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => moveMonth(-1)} aria-label="Previous month">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={goToday}>Today</Button>
                                        <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => moveMonth(1)} aria-label="Next month">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <Button type="button" className="ml-3 bg-slate-900 hover:bg-slate-800" onClick={() => setIsRequestDialogOpen(true)}>
                                        Request Leave / Absence
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="grid grid-cols-7 rounded-t-lg border border-b-0 bg-muted/30 text-center text-xs font-medium text-muted-foreground">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                                        <div key={weekday} className="px-2 py-2">{weekday}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border bg-background">
                                    {calendarDates.map((date) => {
                                        const key = dateKey(date);
                                        const daySchedules = schedulesByDate[key] ?? [];
                                        const isCurrentMonth = date.getMonth() === visibleDate.getMonth();
                                        const isSelected = key === selectedDate;
                                        const isToday = key === dateKey(new Date());

                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                className={`min-h-36 border-r border-b p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${daySchedules.length > 0 ? 'bg-sky-50/60 hover:bg-sky-50/80' : 'bg-background hover:bg-muted/40'} ${isCurrentMonth ? 'text-foreground' : 'bg-muted/20 text-muted-foreground'} ${isSelected ? 'ring-2 ring-sky-500 ring-inset' : ''}`}
                                                onClick={() => setSelectedDate(key)}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${isToday ? 'bg-slate-900 text-white' : ''}`}>{date.getDate()}</span>
                                                </div>

                                                <div className="mt-2 space-y-1.5">
                                                    {daySchedules.slice(0, 2).map((schedule) => (
                                                        <div key={schedule.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] leading-snug">
                                                            <div className="flex items-center gap-1.5 font-medium"><StatusBadge status={schedule.status} /></div>
                                                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3.5 w-3.5" />{schedule.start_time} - {schedule.end_time}</div>
                                                        </div>
                                                    ))}
                                                    {daySchedules.length > 2 && <p className="px-1 text-[11px] text-muted-foreground">+{daySchedules.length - 2} more</p>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t p-4">
                                <div className="rounded-xl border bg-muted/20 p-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="font-semibold">{formatDate(selectedDate)}</h3>
                                            <p className="text-sm text-muted-foreground">{selectedSchedules.length > 0 ? `${selectedSchedules.length} scheduled block${selectedSchedules.length > 1 ? 's' : ''} on this date.` : 'No duty schedules are assigned for this date.'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                        {selectedSchedules.length > 0 ? (
                                            selectedSchedules.map((schedule) => (
                                                <div key={schedule.id} className="rounded-xl border bg-background p-4">
                                                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={schedule.status} /><span className="text-sm font-medium">{schedule.start_time} - {schedule.end_time}</span></div>
                                                    {schedule.remarks && <p className="mt-2 text-sm text-muted-foreground">{schedule.remarks}</p>}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">No entries for this date.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'status' && (
                        <section className="rounded-2xl border bg-background p-5 shadow-sm">
                            <h2 className="text-lg font-semibold">Request status</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Track your latest leave and absence requests.</p>

                            <div className="mt-4 space-y-3">
                                {pendingRequests.length > 0 ? (
                                    pendingRequests.map((request) => (
                                        <div key={request.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><RequestTypeBadge type={request.request_type} /><RequestBadge status={request.status} /></div><span className="text-xs text-muted-foreground">Submitted {formatDateTime(request.created_at)}</span></div>
                                            <p className="mt-2 text-sm font-medium">{formatDateRange(request.start_date, request.end_date)}</p>
                                            {request.remarks && <p className="mt-1 text-sm text-muted-foreground">{request.remarks}</p>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No pending requests.</div>
                                )}

                                {pendingMeta.last_page > 1 && (
                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" size="sm" disabled={pendingMeta.current_page <= 1} onClick={() => goToPendingPage(pendingMeta.current_page - 1)}>Previous</Button>
                                        <span className="text-xs text-muted-foreground">Page {pendingMeta.current_page} of {pendingMeta.last_page}</span>
                                        <Button type="button" variant="outline" size="sm" disabled={pendingMeta.current_page >= pendingMeta.last_page} onClick={() => goToPendingPage(pendingMeta.current_page + 1)}>Next</Button>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === 'history' && (
                        <section className="rounded-2xl border bg-background shadow-sm">
                            <div className="border-b p-5">
                                <h2 className="text-lg font-semibold">Request history</h2>
                                <p className="mt-1 text-sm text-muted-foreground">A compact history of your submitted leave and absence requests.</p>
                            </div>

                            <div className="divide-y">
                                {historyRequests.length > 0 ? (
                                    historyRequests.map((request) => (
                                        <div key={request.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_14rem]">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2"><RequestTypeBadge type={request.request_type} /><RequestBadge status={request.status} /></div>
                                                <p className="text-sm font-medium">{formatDateRange(request.start_date, request.end_date)}</p>
                                                {request.remarks && <p className="text-sm text-muted-foreground">{request.remarks}</p>}
                                            </div>

                                            <div className="space-y-1 text-sm text-muted-foreground md:text-right">
                                                <p>Submitted {formatDateTime(request.created_at)}</p>
                                                <p>Reviewed {formatDateTime(request.reviewed_at)}</p>
                                                {request.reviewer_notes && <p className="text-foreground">Notes: {request.reviewer_notes}</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-5 text-sm text-muted-foreground">No request history yet.</div>
                                )}

                                {historyMeta.last_page > 1 && (
                                    <div className="flex items-center justify-end gap-2 p-5 pt-3">
                                        <Button type="button" variant="outline" size="sm" disabled={historyMeta.current_page <= 1} onClick={() => goToHistoryPage(historyMeta.current_page - 1)}>Previous</Button>
                                        <span className="text-xs text-muted-foreground">Page {historyMeta.current_page} of {historyMeta.last_page}</span>
                                        <Button type="button" variant="outline" size="sm" disabled={historyMeta.current_page >= historyMeta.last_page} onClick={() => goToHistoryPage(historyMeta.current_page + 1)}>Next</Button>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </section>

                <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Request Leave / Absence</DialogTitle>
                            <DialogDescription>Submit a request to your administrator for review.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleRequestSubmit} className="space-y-4 p-2">
                            <div>
                                <Label>Type</Label>
                                <select className="mt-1 w-full rounded border p-2" value={dutyRequestForm.data.request_type} onChange={(e) => dutyRequestForm.setData('request_type', e.target.value)}>
                                    <option value="on_leave">Leave</option>
                                    <option value="absent">Absence</option>
                                </select>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                    <Label>Start date</Label>
                                    <Input value={dutyRequestForm.data.start_date} onChange={(e) => dutyRequestForm.setData('start_date', e.target.value)} type="date" />
                                </div>
                                <div>
                                    <Label>End date</Label>
                                    <Input value={dutyRequestForm.data.end_date} onChange={(e) => dutyRequestForm.setData('end_date', e.target.value)} type="date" />
                                </div>
                            </div>

                            <div>
                                <Label>Remarks</Label>
                                <textarea value={dutyRequestForm.data.remarks ?? ''} onChange={(e) => dutyRequestForm.setData('remarks', e.target.value)} className="mt-1 w-full rounded border p-2" rows={4} />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsRequestDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={dutyRequestForm.processing}><Send className="mr-2 h-4 w-4" /> Submit</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
