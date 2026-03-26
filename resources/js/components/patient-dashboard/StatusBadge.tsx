import { CheckCircle2, Circle, Clock3, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type StatusTone = 'success' | 'pending' | 'warning' | 'neutral';

interface StatusBadgeProps {
    label: string;
    tone?: StatusTone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
    const styleMap: Record<StatusTone, string> = {
        success:
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
        pending:
            'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
        warning:
            'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
        neutral:
            'border-border bg-muted text-foreground',
    };

    const iconMap: Record<StatusTone, typeof Circle> = {
        success: CheckCircle2,
        pending: Clock3,
        warning: AlertTriangle,
        neutral: Circle,
    };

    const Icon = iconMap[tone];

    return (
        <Badge variant="outline" className={styleMap[tone]}>
            <Icon className="h-3.5 w-3.5" />
            {label}
        </Badge>
    );
}
