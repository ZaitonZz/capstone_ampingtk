import { Head, Link, usePage } from '@inertiajs/react';
import {
    ClipboardList,
    ShieldCheck,
    Stethoscope,
    UserRoundCog,
} from 'lucide-react';
import { AppointmentCard } from '@/components/patient-dashboard/AppointmentCard';
import { DashboardCard } from '@/components/patient-dashboard/DashboardCard';
import { NotificationList } from '@/components/patient-dashboard/NotificationList';
import { PatientWorkspaceLayout } from '@/components/patient-dashboard/PatientWorkspaceLayout';
import { StatusBadge } from '@/components/patient-dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { dashboard as patientDashboard } from '@/routes/patient';
import type { Auth, BreadcrumbItem } from '@/types';

interface IdentityGuardStatus {
    status: 'Verified' | 'Pending' | 'Warning';
    description: string;
    last_check_at: string | null;
}

interface UpcomingAppointment {
    doctor_name: string;
    date_time: string;
    status: 'confirmed' | 'pending';
}

interface RecentConsultation {
    id: number;
    doctor_name: string;
    date: string;
    status: string;
}

interface PageProps {
    auth: Auth;
    identity_guard: IdentityGuardStatus;
    upcoming_appointment: UpcomingAppointment | null;
    recent_consultations: RecentConsultation[];
    notifications: string[];
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Patient Dashboard',
        href: patientDashboard(),
    },
];

export default function PatientDashboardPage() {
    const {
        auth,
        identity_guard: identityGuard,
        upcoming_appointment: upcomingAppointment,
        recent_consultations: recentConsultations,
        notifications,
    } = usePage<PageProps>().props;

    const identityTone =
        identityGuard.status === 'Verified'
            ? 'success'
            : identityGuard.status === 'Pending'
              ? 'pending'
              : 'warning';

    return (
        <PatientWorkspaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Patient Dashboard" />

            <section className="rounded-2xl border bg-card p-5 shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Welcome back, {auth.user.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your secure teleconsultation dashboard
                </p>
            </section>

            <div className="grid gap-4 xl:grid-cols-3">
                <DashboardCard
                    title="Identity Guard Status"
                    description="Session protection and face verification"
                    icon={ShieldCheck}
                    className="xl:col-span-2"
                >
                    <div className="space-y-3">
                        <StatusBadge
                            label={identityGuard.status}
                            tone={identityTone}
                        />
                        <p className="text-sm text-muted-foreground">
                            {identityGuard.description}
                        </p>
                        {identityGuard.last_check_at && (
                            <p className="text-xs text-muted-foreground">
                                Last check: {identityGuard.last_check_at}
                            </p>
                        )}
                    </div>
                </DashboardCard>

                {upcomingAppointment ? (
                    <AppointmentCard
                        doctorName={upcomingAppointment.doctor_name}
                        dateTime={upcomingAppointment.date_time}
                        status={upcomingAppointment.status}
                        joinUrl="/patient/lobby"
                    />
                ) : (
                    <DashboardCard
                        title="Upcoming Appointment"
                        description="Your next teleconsultation schedule"
                        icon={Stethoscope}
                    >
                        <p className="text-sm text-muted-foreground">
                            No upcoming appointment yet.
                        </p>
                        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                            <Link href="/patient/consultations">
                                Book Appointment
                            </Link>
                        </Button>
                    </DashboardCard>
                )}
            </div>

            <DashboardCard
                title="Quick Actions"
                description="Common patient actions"
                icon={ClipboardList}
            >
                <div className="flex flex-wrap gap-2">
                    <Button
                        asChild
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Link href="/patient/consultations">Book Appointment</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/patient/medical-records">
                            View Medical Records
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/patient/profile">Update Profile</Link>
                    </Button>
                </div>
            </DashboardCard>

            <div className="grid gap-4 xl:grid-cols-3">
                <DashboardCard
                    title="Recent Consultations"
                    description="Last 3 consultation sessions"
                    icon={UserRoundCog}
                    className="xl:col-span-2"
                >
                    <div className="space-y-2">
                        {recentConsultations.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No consultations yet.
                            </p>
                        )}

                        {recentConsultations.map((consultation) => (
                            <div
                                key={consultation.id}
                                className="flex flex-col gap-2 rounded-xl border border-border/80 p-3 md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {consultation.doctor_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {consultation.date}
                                    </p>
                                </div>
                                <StatusBadge
                                    label={consultation.status}
                                    tone={
                                        consultation.status === 'Completed'
                                            ? 'success'
                                            : consultation.status === 'Pending'
                                              ? 'pending'
                                              : 'neutral'
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </DashboardCard>

                <NotificationList items={notifications} />
            </div>
        </PatientWorkspaceLayout>
    );
}
