import { Head } from '@inertiajs/react';
import { ClipboardList } from 'lucide-react';
import { DashboardCard } from '@/components/patient-dashboard/DashboardCard';
import { PatientWorkspaceLayout } from '@/components/patient-dashboard/PatientWorkspaceLayout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Medical Records',
        href: '/patient/medical-records',
    },
];

export default function PatientMedicalRecordsPage() {
    return (
        <PatientWorkspaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Medical Records" />

            <DashboardCard
                title="Medical Records"
                description="Consultation notes and clinical history"
                icon={ClipboardList}
            >
                <p className="text-sm text-muted-foreground">
                    Your medical records will appear here.
                </p>
            </DashboardCard>
        </PatientWorkspaceLayout>
    );
}
