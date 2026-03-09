import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Nurse Dashboard',
        href: '/nurse/dashboard',
    },
];

export default function NurseDashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nurse Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="mb-4">
                    <h1 className="text-3xl font-bold tracking-tight">Nurse Dashboard</h1>
                    <p className="text-muted-foreground">
                        Assist with patient care and manage daily nursing tasks
                    </p>
                </div>
                
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        <div className="relative z-10 flex h-full flex-col items-center justify-center p-4">
                            <h3 className="text-lg font-semibold">Patient Care Tasks</h3>
                            <p className="text-sm text-muted-foreground">View assigned tasks</p>
                        </div>
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        <div className="relative z-10 flex h-full flex-col items-center justify-center p-4">
                            <h3 className="text-lg font-semibold">Vital Signs</h3>
                            <p className="text-sm text-muted-foreground">Record patient vitals</p>
                        </div>
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        <div className="relative z-10 flex h-full flex-col items-center justify-center p-4">
                            <h3 className="text-lg font-semibold">Medications</h3>
                            <p className="text-sm text-muted-foreground">Medication administration</p>
                        </div>
                    </div>
                </div>
                <div className="relative min-h-screen flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    <div className="relative z-10 flex h-full items-center justify-center p-8">
                        <p className="text-center text-muted-foreground">
                            Today's patient care activities and notes will appear here
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
