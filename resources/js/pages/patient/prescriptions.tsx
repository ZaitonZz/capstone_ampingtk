import { Head } from '@inertiajs/react';
import { Pill } from 'lucide-react';
import { DashboardCard } from '@/components/patient-dashboard/DashboardCard';
import { PatientWorkspaceLayout } from '@/components/patient-dashboard/PatientWorkspaceLayout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Prescriptions',
        href: '/patient/prescriptions',
    },
];

export default function PatientPrescriptionsPage() {
    return (
        <PatientWorkspaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Prescriptions" />

            <DashboardCard
                title="Prescriptions"
                description="Medication history from your consultations"
                icon={Pill}
            >
                <p className="text-sm text-muted-foreground">
                    Your prescribed medications will appear here.
                </p>
            </DashboardCard>
        </PatientWorkspaceLayout>
    );
}
