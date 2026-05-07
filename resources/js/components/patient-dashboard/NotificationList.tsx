import { BellRing } from 'lucide-react';
import { DashboardCard } from '@/components/patient-dashboard/DashboardCard';

interface NotificationListProps {
    items: Array<string | { id: string | number; message: string }>;
}

export function NotificationList({ items }: NotificationListProps) {
    return (
        <DashboardCard
            title="Notifications"
            description="Recent secure session updates"
            icon={BellRing}
        >
            <ul className="space-y-3">
                {items.map((item, index) => {
                    const notification =
                        typeof item === 'string'
                            ? { id: `string-${index}`, message: item }
                            : item;

                    return (
                        <li
                            key={notification.id}
                            className="rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-sm"
                        >
                            {notification.message}
                        </li>
                    );
                })}
            </ul>
        </DashboardCard>
    );
}
