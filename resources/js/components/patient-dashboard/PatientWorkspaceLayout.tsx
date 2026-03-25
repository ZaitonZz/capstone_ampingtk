import type { ReactNode } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface PatientWorkspaceLayoutProps {
    breadcrumbs: BreadcrumbItem[];
    children: ReactNode;
}

export function PatientWorkspaceLayout({
    breadcrumbs,
    children,
}: PatientWorkspaceLayoutProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-4 p-4 md:p-6">
                <main className="space-y-4">{children}</main>
            </div>
        </AppLayout>
    );
}
