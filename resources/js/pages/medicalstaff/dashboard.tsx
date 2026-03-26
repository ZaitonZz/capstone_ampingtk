import { Head, Link } from '@inertiajs/react';
import { ClipboardList, ContactRound, UserRoundCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Medical Staff Dashboard',
        href: '/medicalstaff/dashboard',
    },
];

export default function MedicalStaffDashboardPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Medical Staff Dashboard" />

            <div className="space-y-6 p-4 md:p-6">
                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Medical Staff Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage patient records and consultation workflows.
                    </p>
                </section>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <ClipboardList className="h-4 w-4" />
                            Patients
                        </div>
                        <p className="text-sm text-muted-foreground">
                            View and manage patient records.
                        </p>
                        <Button asChild className="mt-4">
                            <Link href="/staff/patients">Open Patient List</Link>
                        </Button>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <ContactRound className="h-4 w-4" />
                            Consultations
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Track and coordinate consultation schedules.
                        </p>
                        <Button asChild className="mt-4">
                            <Link href="/consultations">Open Consultations</Link>
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <UserRoundCog className="h-4 w-4" />
                        Staff Access
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Use this role to test medical staff-facing UI without doctor-specific profile requirements.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
