import { BellRing } from 'lucide-react';
import { DashboardCard } from '@/components/patient-dashboard/DashboardCard';

interface NotificationListProps {
    items: Array<{ id: string | number; message: string }>;
}

export function NotificationList({ items }: NotificationListProps) {
    return (
        <DashboardCard
            title="Notifications"
            description="Recent secure session updates"
            icon={BellRing}
        >
            <ul className="space-y-3">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className="rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-sm"
                    >
                        {item.message}
                    </li>
                ))}
            </ul>
        </DashboardCard>
    );
}
