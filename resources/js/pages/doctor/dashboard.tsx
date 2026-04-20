import { Head, Link } from '@inertiajs/react';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Doctor Dashboard',
        href: '/doctor/dashboard',
    },
];

interface ScheduleItem {
    id: number;
    patient_name: string;
    scheduled_at: string | null;
    status: string;
    type: string;
}

interface Props {
    todays_schedule: ScheduleItem[];
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'scheduled') return 'default';
    if (status === 'ongoing' || status === 'completed') return 'secondary';
    if (status === 'cancelled' || status === 'no_show') return 'destructive';
    return 'outline';
}

export default function DoctorDashboard({ todays_schedule }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Doctor Dashboard" />

            <div className="mx-auto max-w-4xl p-4 md:p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold">Today&apos;s Consultation Schedule</h1>
                    <Button variant="outline" asChild>
                        <Link href={ConsultationController.index.url()}>
                            Open Schedule
                        </Link>
                    </Button>
                </div>

                <div className="rounded-xl border">
                    {todays_schedule.length === 0 ? (
                        <p className="p-6 text-sm text-muted-foreground">
                            You have no consultations scheduled for today.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {todays_schedule.map((item) => (
                                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                    <div>
                                        <p className="font-medium">{item.patient_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {item.scheduled_at
                                                ? new Date(item.scheduled_at).toLocaleString()
                                                : 'Time to be confirmed'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={statusVariant(item.status)}>
                                            {item.status.replace('_', ' ')}
                                        </Badge>
                                        <Badge variant="outline">
                                            {item.type === 'teleconsultation' ? 'Teleconsultation' : 'In Person'}
                                        </Badge>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={ConsultationController.show.url(item.id)}>View</Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
