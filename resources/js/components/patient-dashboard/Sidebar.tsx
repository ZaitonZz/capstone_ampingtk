import { Link, usePage } from '@inertiajs/react';
import type { ComponentType } from 'react';
import {
    CalendarDays,
    ClipboardList,
    LayoutGrid,
    ShieldCheck,
    Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MenuItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
};

const menuItems: MenuItem[] = [
    {
        label: 'Dashboard',
        href: '/patient/dashboard',
        icon: LayoutGrid,
    },
    {
        label: 'Appointments',
        href: '/patient/consultations',
        icon: CalendarDays,
    },
    {
        label: 'Consultation Lobby',
        href: '/patient/lobby',
        icon: Stethoscope,
    },
    {
        label: 'Medical Records',
        href: '/patient/medical-records',
        icon: ClipboardList,
    },
    {
        label: 'Prescriptions',
        href: '/patient/prescriptions',
        icon: ShieldCheck,
    },
   
];

export function Sidebar() {
    const page = usePage();
    const currentPath = page.url.split('?')[0] ?? '';

    return (
        <aside className="w-full max-w-xs rounded-2xl border bg-card p-4 shadow-sm">
            <p className="mb-4 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
                Patient Menu
            </p>

            <nav className="space-y-1.5">
                {menuItems.map((item) => {
                    const isActive =
                        currentPath === item.href ||
                        (item.href !== '/patient/dashboard' &&
                            currentPath.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            prefetch
                            className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
