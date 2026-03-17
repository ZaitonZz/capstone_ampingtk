import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: ReactNode;
    className?: string;
}

export function DashboardCard({
    title,
    description,
    icon: Icon,
    children,
    className,
}: DashboardCardProps) {
    return (
        <Card className={cn('rounded-2xl shadow-sm', className)}>
            <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        {description && (
                            <CardDescription>{description}</CardDescription>
                        )}
                    </div>
                    {Icon && (
                        <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                            <Icon className="h-4 w-4" />
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}
