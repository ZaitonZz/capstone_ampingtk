import { Head, usePage } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { Auth } from '@/types/auth';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

export default function Dashboard() {
    const { auth, admin_activity_logs, admin_activity_summary } = usePage<{
        auth: Auth;
        admin_activity_logs?: Array<{
            id: string;
            event_type: string;
            severity: 'info' | 'warning' | 'high' | string;
            title: string;
            description: string | null;
            user_name: string | null;
            user_email: string | null;
            ip_address: string | null;
            occurred_at: string | null;
        }>;
        admin_activity_summary?: {
            failed_logins_24h: number;
            repeated_identity_failures_24h: number;
            unusual_access_patterns_24h: number;
        };
    }>().props;

    const isAdmin = auth.user.role === 'admin';

    if (isAdmin) {
        const logs = admin_activity_logs ?? [];
        const summary = admin_activity_summary ?? {
            failed_logins_24h: 0,
            repeated_identity_failures_24h: 0,
            unusual_access_patterns_24h: 0,
        };

        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Dashboard" />
                <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                            <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">Failed logins (24h)</p>
                            <p className="mt-2 text-2xl font-semibold text-amber-900 dark:text-amber-100">{summary.failed_logins_24h}</p>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                            <p className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">Repeated identity failures</p>
                            <p className="mt-2 text-2xl font-semibold text-rose-900 dark:text-rose-100">{summary.repeated_identity_failures_24h}</p>
                        </div>
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                            <p className="text-xs font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300">Unusual access patterns</p>
                            <p className="mt-2 text-2xl font-semibold text-sky-900 dark:text-sky-100">{summary.unusual_access_patterns_24h}</p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className="border-b border-sidebar-border/70 bg-muted/20 px-4 py-3 dark:border-sidebar-border">
                            <h2 className="text-sm font-semibold">Security Activity Logs</h2>
                            <p className="text-xs text-muted-foreground">Monitoring failed logins, repeated identity-check failures, and unusual access behavior.</p>
                        </div>

                        {logs.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground">No security events detected yet.</div>
                        ) : (
                            <div className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">{log.title}</p>
                                            {log.description && <p className="text-sm text-muted-foreground">{log.description}</p>}
                                            <p className="text-xs text-muted-foreground">
                                                {[log.user_name, log.user_email, log.ip_address].filter(Boolean).join(' • ') || 'Unknown source'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 md:flex-col md:items-end">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                    log.severity === 'high'
                                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                                        : log.severity === 'warning'
                                                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                }`}
                                            >
                                                {log.severity}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{log.occurred_at ? new Date(log.occurred_at).toLocaleString() : 'Unknown time'}</span>
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>
                <div className="relative min-h-screen flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
