import { Head, usePage } from '@inertiajs/react';
import { UserRound, ShieldCheck } from 'lucide-react';
import { DashboardCard } from '@/components/patient-dashboard/DashboardCard';
import { PatientWorkspaceLayout } from '@/components/patient-dashboard/PatientWorkspaceLayout';
import { StatusBadge } from '@/components/patient-dashboard/StatusBadge';
import type { Auth, BreadcrumbItem } from '@/types';

interface Props {
    auth: Auth;
    face_enrollment_status: 'Completed' | 'Not Completed';
    face_enrollment_last_updated: string | null;
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile',
        href: '/patient/profile',
    },
];

export default function PatientProfilePage() {
    const {
        auth,
        face_enrollment_status: faceEnrollmentStatus,
        face_enrollment_last_updated: faceEnrollmentLastUpdated,
    } = usePage<Props>().props;

    return (
        <PatientWorkspaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Patient Profile" />

            <section className="rounded-2xl border bg-card p-5 shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Profile
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Personal identity and enrollment details
                </p>
            </section>

            <DashboardCard
                title="Patient Information"
                description="Basic account details"
                icon={UserRound}
            >
                <div className="space-y-3 text-sm">
                    <div className="rounded-xl border p-3">
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{auth.user.name}</p>
                    </div>
                    <div className="rounded-xl border p-3">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{auth.user.email}</p>
                    </div>
                </div>
            </DashboardCard>

            <DashboardCard
                title="Face Enrollment Status"
                description="Identity Guard enrollment status"
                icon={ShieldCheck}
            >
                <div className="space-y-3">
                    <StatusBadge
                        label={faceEnrollmentStatus}
                        tone={
                            faceEnrollmentStatus === 'Completed'
                                ? 'success'
                                : 'pending'
                        }
                    />
                    <p className="text-sm text-muted-foreground">
                        Last updated: {faceEnrollmentLastUpdated ?? '—'}
                    </p>
                </div>
            </DashboardCard>
        </PatientWorkspaceLayout>
    );
}
