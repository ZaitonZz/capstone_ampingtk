import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dashboard as adminDashboard } from '@/routes/admin';
import * as AdminDeepfakeAlertsRoute from '@/routes/admin/deepfake-alerts';
import type { BreadcrumbItem } from '@/types';

interface DeepfakeAlertItem {
    id: number;
    consultation_id: number;
    triggered_role: 'patient' | 'doctor';
    streak_count: number;
    status: 'open' | 'resolved';
    notes: string | null;
    created_at: string;
    resolved_at: string | null;
    consultation?: {
        id: number;
        patient?: {
            first_name: string;
            last_name: string;
            full_name?: string;
        } | null;
        doctor?: {
            name: string;
        } | null;
    } | null;
    triggered_by?: {
        id: number;
        name: string;
    } | null;
    resolver?: {
        id: number;
        name: string;
    } | null;
}

interface Paginated<T> {
    data: T[];
}

interface Props {
    alerts: Paginated<DeepfakeAlertItem>;
    filters: {
        status?: 'open' | 'resolved' | null;
    };
}

export default function AdminDeepfakeAlerts({ alerts, filters }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Admin Dashboard',
            href: adminDashboard(),
        },
        {
            title: 'Deepfake Alerts',
            href: AdminDeepfakeAlertsRoute.index(),
        },
    ];

    const activeStatus = filters.status ?? null;

    function resolveAlert(alertId: number) {
        router.patch(AdminDeepfakeAlertsRoute.resolve.url(alertId));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Deepfake Alerts" />

            <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Deepfake Alerts</h1>
                        <p className="text-sm text-muted-foreground">
                            In-app escalations triggered by 5 straight fake scans.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            variant={activeStatus === null ? 'default' : 'outline'}
                            size="sm"
                        >
                            <Link href={AdminDeepfakeAlertsRoute.index()}>
                                All
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant={activeStatus === 'open' ? 'default' : 'outline'}
                            size="sm"
                        >
                            <Link
                                href={AdminDeepfakeAlertsRoute.index({
                                    query: { status: 'open' },
                                })}
                            >
                                Open
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant={activeStatus === 'resolved' ? 'default' : 'outline'}
                            size="sm"
                        >
                            <Link
                                href={AdminDeepfakeAlertsRoute.index({
                                    query: { status: 'resolved' },
                                })}
                            >
                                Resolved
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border">
                    {alerts.data.length === 0 ? (
                        <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                            <ShieldAlert className="h-5 w-5" />
                            <span>No alerts match this filter.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Status</th>
                                        <th className="px-3 py-2 font-medium">Consultation</th>
                                        <th className="px-3 py-2 font-medium">Patient</th>
                                        <th className="px-3 py-2 font-medium">Doctor</th>
                                        <th className="px-3 py-2 font-medium">Triggered By</th>
                                        <th className="px-3 py-2 font-medium">Streak</th>
                                        <th className="px-3 py-2 font-medium">Created</th>
                                        <th className="px-3 py-2 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {alerts.data.map((alert) => (
                                        <tr key={alert.id}>
                                            <td className="px-3 py-2">
                                                <Badge
                                                    variant={
                                                        alert.status === 'open'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {alert.status}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                #{alert.consultation_id}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {(alert.consultation?.patient
                                                    ?.full_name ??
                                                    `${alert.consultation?.patient?.first_name ?? ''} ${alert.consultation?.patient?.last_name ?? ''}`.trim()) ||
                                                    '—'}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {alert.consultation?.doctor?.name ?? '—'}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {alert.triggered_by?.name ?? 'System'}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {alert.streak_count} straight fake
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {new Date(alert.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2">
                                                {alert.status === 'open' ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() =>
                                                            resolveAlert(alert.id)
                                                        }
                                                    >
                                                        <CheckCircle2 className="mr-1 h-4 w-4" />
                                                        Resolve
                                                    </Button>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        {alert.resolved_at
                                                            ? `Resolved ${new Date(alert.resolved_at).toLocaleString()}`
                                                            : 'Resolved'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
