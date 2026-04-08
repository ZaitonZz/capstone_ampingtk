import { Link } from '@inertiajs/react';
import { CalendarDays, Stethoscope, Video } from 'lucide-react';
import { DashboardCard } from '@/components/patient-dashboard/DashboardCard';
import { StatusBadge } from '@/components/patient-dashboard/StatusBadge';
import { Button } from '@/components/ui/button';

type AppointmentStatus = 'confirmed' | 'pending';

interface AppointmentCardProps {
    doctorName: string;
    dateTime: string;
    status: AppointmentStatus;
    joinUrl: string;
}

export function AppointmentCard({
    doctorName,
    dateTime,
    status,
    joinUrl,
}: AppointmentCardProps) {
    return (
        <DashboardCard
            title="Upcoming Appointment"
            description="Your next teleconsultation schedule"
            icon={CalendarDays}
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm">
                        <Stethoscope className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium">{doctorName}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{dateTime}</p>
                </div>

                <StatusBadge
                    label={status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    tone={status === 'confirmed' ? 'success' : 'pending'}
                />

                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <Link href={joinUrl}>
                        <Video className="h-4 w-4" />
                        Join Consultation
                    </Link>
                </Button>
            </div>
        </DashboardCard>
    );
}
