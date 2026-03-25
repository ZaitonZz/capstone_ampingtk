import { Head } from '@inertiajs/react';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { DashboardCard } from '@/components/patient-dashboard/DashboardCard';
import { PatientWorkspaceLayout } from '@/components/patient-dashboard/PatientWorkspaceLayout';
import { StatusBadge } from '@/components/patient-dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Live Consultation',
        href: '/patient/consultation/live',
    },
];

export default function PatientLiveConsultationPage() {
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    return (
        <PatientWorkspaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Live Consultation" />

            <section className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Live Consultation
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Secure teleconsultation session room
                        </p>
                    </div>
                    <StatusBadge label="Secure Session Active" tone="success" />
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
                <DashboardCard
                    title="Doctor Video"
                    description="Doctor stream placeholder"
                    icon={ShieldCheck}
                >
                    <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed bg-muted/40 text-sm text-muted-foreground">
                        Doctor video placeholder
                    </div>
                </DashboardCard>

                <DashboardCard
                    title="Patient Video"
                    description="Your stream placeholder"
                    icon={Camera}
                >
                    <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed bg-muted/40 text-sm text-muted-foreground">
                        Patient video placeholder
                    </div>
                </DashboardCard>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsMicMuted((value) => !value)}
                    >
                        {isMicMuted ? (
                            <MicOff className="h-4 w-4" />
                        ) : (
                            <Mic className="h-4 w-4" />
                        )}
                        {isMicMuted ? 'Unmute' : 'Mute'}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setIsCameraOff((value) => !value)}
                    >
                        {isCameraOff ? (
                            <CameraOff className="h-4 w-4" />
                        ) : (
                            <Camera className="h-4 w-4" />
                        )}
                        {isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    </Button>

                    <Button variant="destructive">
                        <PhoneOff className="h-4 w-4" />
                        End Call
                    </Button>
                </div>
            </div>
        </PatientWorkspaceLayout>
    );
}
