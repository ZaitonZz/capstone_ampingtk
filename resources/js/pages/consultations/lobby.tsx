import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Mic,
    MicOff,
    Monitor,
    Stethoscope,
    User,
    Video,
    VideoOff,
    Volume2,
} from 'lucide-react';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import * as ConsultationConsentController from '@/actions/App/Http/Controllers/ConsultationConsentController';
import * as ConsultationLobbyController from '@/actions/App/Http/Controllers/ConsultationLobbyController';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Consultation, ConsultationConsent } from '@/types/consultation';

interface Props {
    consultation: Consultation;
    consent: ConsultationConsent | null;
}

function SessionRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <div>
                <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                <p className="text-xs font-medium">{value}</p>
            </div>
        </div>
    );
}

function DeviceButton({
    on,
    onIcon: OnIcon,
    offIcon: OffIcon,
    label,
    onClick,
}: {
    on: boolean;
    onIcon: React.ElementType;
    offIcon: React.ElementType;
    label: string;
    onClick?: () => void;
}) {
    const Icon = on ? OnIcon : OffIcon;
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={[
                'flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 text-xs font-medium transition-all',
                on
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/15'
                    : 'bg-destructive/10 text-destructive ring-1 ring-destructive/20 hover:bg-destructive/15',
            ].join(' ')}
        >
            <Icon className="h-5 w-5" />
            {label}
        </button>
    );
}

export default function ConsultationLobbyPage({ consultation, consent }: Props) {
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [deviceTestOpen, setDeviceTestOpen] = useState(false);

    const isConsentConfirmed = consent?.consent_confirmed === true;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Consultations', href: ConsultationController.index.url() },
        {
            title: consultation.patient?.full_name ?? `#${consultation.id}`,
            href: ConsultationController.show.url(consultation.id),
        },
        {
            title: 'Lobby',
            href: ConsultationLobbyController.show.url(consultation.id),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teleconsultation Lobby" />

            <div className="mx-auto max-w-7xl p-4 md:p-6">
                {/* ── Page header ──────────────────────────────────────────── */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Teleconsultation Lobby</h1>
                        <p className="text-sm text-muted-foreground">
                            {consultation.patient?.full_name
                                ? `Preparing session for ${consultation.patient.full_name}`
                                : `Consultation #${consultation.id}`}
                        </p>
                    </div>

                    {/* Ready status pill */}
                    <div
                        className={[
                            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ring-1',
                            isConsentConfirmed
                                ? 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-950 dark:text-green-300 dark:ring-green-800'
                                : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800',
                        ].join(' ')}
                    >
                        <span
                            className={[
                                'h-2 w-2 rounded-full',
                                isConsentConfirmed ? 'bg-green-500 animate-pulse' : 'bg-amber-500',
                            ].join(' ')}
                        />
                        {isConsentConfirmed ? 'Ready to join' : 'Consent required'}
                    </div>
                </div>

                {/* ── Main 2-column layout ──────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    {/* ── LEFT (3 cols): Camera & Mic ──────────────────────── */}
                    <div className="flex flex-col gap-4 lg:col-span-3">
                        <div className="rounded-2xl border bg-card p-5 shadow-xs">
                            <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Camera &amp; Mic Check
                            </p>

                            {/* Dark video preview */}
                            <div className="relative flex aspect-video w-auto max-h-[380px] mx-auto items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
                                {/* Corner label */}
                                <span className="absolute top-3 left-3 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white/70">
                                    Preview
                                </span>

                                {cameraOn ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-700 text-zinc-300">
                                            <User className="h-10 w-10" />
                                        </div>
                                        <span className="text-sm text-zinc-400">Camera preview unavailable</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-800 text-zinc-600">
                                            <VideoOff className="h-14 w-14" />
                                        </div>
                                        <span className="text-sm text-zinc-500">Camera is off</span>
                                    </div>
                                )}

                                {/* Live mic indicator */}
                                {micOn && (
                                    <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-[11px] text-white/70">
                                        <Mic className="h-3 w-3" />
                                        Mic active
                                    </span>
                                )}
                            </div>

                            {/* Device controls */}
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex gap-4">
                                    <DeviceButton
                                        on={cameraOn}
                                        onIcon={Video}
                                        offIcon={VideoOff}
                                        label={cameraOn ? 'Camera On' : 'Camera Off'}
                                        onClick={() => setCameraOn((p) => !p)}
                                    />
                                    <DeviceButton
                                        on={micOn}
                                        onIcon={Mic}
                                        offIcon={MicOff}
                                        label={micOn ? 'Mic On' : 'Mic Off'}
                                        onClick={() => setMicOn((p) => !p)}
                                    />
                                    <button
                                        type="button"
                                        title="Speaker"
                                        className="flex flex-col items-center gap-1.5 rounded-xl bg-muted px-4 py-3 text-xs font-medium text-muted-foreground ring-1 ring-border transition-all hover:bg-accent"
                                    >
                                        <Volume2 className="h-5 w-5" />
                                        Speaker
                                    </button>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => setDeviceTestOpen(true)}
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                    Test Devices
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT (1 col): Details + Consent + Actions ───────── */}
                    <div className="flex flex-col gap-3 lg:col-span-1 lg:min-w-[260px]">
                        {/* Session Details card */}
                        <div className="rounded-2xl border bg-card p-3 shadow-xs">
                            <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Session Details
                            </p>
                            <div className="flex flex-col gap-2">
                                <SessionRow
                                    icon={User}
                                    label="Patient"
                                    value={
                                        consultation.patient?.full_name
                                            ? `${consultation.patient.full_name} · #${consultation.id}`
                                            : `Ref #${consultation.id}`
                                    }
                                />
                                <SessionRow
                                    icon={Stethoscope}
                                    label="Provider"
                                    value={
                                        consultation.doctor?.name
                                            ? `Dr. ${consultation.doctor.name}`
                                            : '—'
                                    }
                                />
                                <SessionRow icon={Video} label="Mode" value="Video Teleconsult" />
                                <SessionRow
                                    icon={Calendar}
                                    label="Scheduled"
                                    value={
                                        consultation.scheduled_at
                                            ? new Date(consultation.scheduled_at).toLocaleString()
                                            : '—'
                                    }
                                />
                            </div>
                        </div>

                        {/* Privacy & Consent card */}
                        <div className="rounded-2xl border bg-card p-3 shadow-xs">
                            <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Privacy &amp; Consent
                            </p>

                            {/* Consent status banner */}
                            {isConsentConfirmed ? (
                                <div className="mb-2 flex items-center gap-2 rounded-lg bg-green-50 px-2.5 py-2 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="font-medium">Consent confirmed</span>
                                    {consent?.confirmed_at && (
                                        <span className="ml-auto opacity-70">
                                            {new Date(consent.confirmed_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-2 flex items-start gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>Consent required before joining.</span>
                                </div>
                            )}

                            <ul className="mb-2 space-y-1 text-xs text-muted-foreground">
                                {[
                                    'Telemedicine consent',
                                    'Data Privacy Act notice',
                                    'Recording policy (if enabled)',
                                    'Identity Guard verification',
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-1.5">
                                        <CheckCircle2
                                            className={[
                                                'h-3 w-3 shrink-0',
                                                isConsentConfirmed ? 'text-green-500' : 'text-muted-foreground/40',
                                            ].join(' ')}
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <Separator className="mb-2" />

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="lobby-consent-check"
                                    checked={isConsentConfirmed}
                                    disabled
                                />
                                <Label
                                    htmlFor="lobby-consent-check"
                                    className="cursor-not-allowed text-xs"
                                >
                                    I agree to the Privacy Notice and Consent
                                </Label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5">
                            {isConsentConfirmed ? (
                                <Button className="w-full gap-2" asChild>
                                    <Link href={`/consultations/${consultation.id}/waiting`}>
                                        <Video className="h-4 w-4" />
                                        Join Call
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button className="w-full gap-2" disabled>
                                        <Video className="h-4 w-4" />
                                        Join Call
                                    </Button>
                                    <p className="text-center text-xs text-muted-foreground">
                                        Disabled until consent is confirmed.
                                    </p>
                                </>
                            )}
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link href={ConsultationConsentController.show.url(consultation.id)}>
                                    View Full Consent
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Devices modal */}
            <Dialog open={deviceTestOpen} onOpenChange={setDeviceTestOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Device Test</DialogTitle>
                        <DialogDescription>Device test coming soon.</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
