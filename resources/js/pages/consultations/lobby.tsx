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
    iconClass = 'bg-primary/10 text-primary',
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    iconClass?: string;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
                <p className="text-xs font-medium leading-snug">{value}</p>
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
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold transition-all duration-200 shadow-xs',
                on
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/25 hover:bg-primary/20 hover:ring-primary/40'
                    : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-400 dark:ring-rose-800',
            ].join(' ')}
        >
            <Icon className="h-4 w-4" />
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

            <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden p-4 md:p-6">
                {/* ── Page header ──────────────────────────────────────────── */}
                <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Teleconsultation Lobby</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {consultation.patient?.full_name
                                ? `Preparing session for ${consultation.patient.full_name}`
                                : `Consultation #${consultation.id}`}
                        </p>
                    </div>

                    {/* Ready status pill */}
                    <div
                        className={[
                            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 shadow-xs',
                            isConsentConfirmed
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-700'
                                : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-700',
                        ].join(' ')}
                    >
                        <span
                            className={[
                                'h-2 w-2 rounded-full',
                                isConsentConfirmed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse',
                            ].join(' ')}
                        />
                        {isConsentConfirmed ? 'Ready to join' : 'Consent required'}
                    </div>
                </div>

                {/* ── Main 2-column layout ──────────────────────────────────── */}
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-4">
                    {/* ── LEFT (3 cols): Camera & Mic ──────────────────────── */}
                    <div className="flex min-h-0 flex-col gap-4 lg:col-span-3">
                        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card p-5 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                                    <Video className="h-3 w-3 text-primary" />
                                </div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Camera &amp; Mic Check
                                </p>
                            </div>

                            {/* Dark video preview */}
                            <div className="relative min-h-0 flex-1 w-full overflow-hidden rounded-xl bg-linear-to-b from-zinc-800 to-zinc-950 ring-1 ring-white/5 flex items-center justify-center">
                                {/* Corner label */}
                                <span className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/60 backdrop-blur-sm">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    Preview
                                </span>

                                {cameraOn ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-zinc-600 to-zinc-700 text-zinc-300 ring-2 ring-white/10">
                                            <User className="h-10 w-10" />
                                        </div>
                                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">
                                            Camera preview unavailable
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900 text-zinc-700 ring-2 ring-white/5">
                                            <VideoOff className="h-12 w-12" />
                                        </div>
                                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-500">Camera is off</span>
                                    </div>
                                )}

                                {/* Live mic indicator */}
                                {micOn && (
                                    <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30 backdrop-blur-sm">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Mic active
                                    </span>
                                )}
                            </div>

                            {/* Device controls */}
                            <div className="mt-4 shrink-0 flex items-center justify-between">
                                <div className="flex gap-2.5">
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
                                        className="flex flex-col items-center gap-1 rounded-lg bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground shadow-xs ring-1 ring-border transition-all duration-200 hover:bg-accent hover:text-foreground"
                                    >
                                        <Volume2 className="h-4 w-4" />
                                        Speaker
                                    </button>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 shadow-xs"
                                    onClick={() => setDeviceTestOpen(true)}
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                    Test Devices
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT (1 col): Details + Consent + Actions ───────── */}
                    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:col-span-1 lg:min-w-65">
                        {/* Session Details card */}
                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10">
                                    <Stethoscope className="h-3 w-3 text-blue-500" />
                                </div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Session Details
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <SessionRow
                                    icon={User}
                                    label="Patient"
                                    iconClass="bg-violet-500/10 text-violet-500"
                                    value={
                                        consultation.patient?.full_name
                                            ? `${consultation.patient.full_name} · #${consultation.id}`
                                            : `Ref #${consultation.id}`
                                    }
                                />
                                <SessionRow
                                    icon={Stethoscope}
                                    label="Provider"
                                    iconClass="bg-blue-500/10 text-blue-500"
                                    value={
                                        consultation.doctor?.name
                                            ? `Dr. ${consultation.doctor.name}`
                                            : '—'
                                    }
                                />
                                <SessionRow
                                    icon={Video}
                                    label="Mode"
                                    iconClass="bg-emerald-500/10 text-emerald-500"
                                    value="Video Teleconsult"
                                />
                                <SessionRow
                                    icon={Calendar}
                                    label="Scheduled"
                                    iconClass="bg-orange-500/10 text-orange-500"
                                    value={
                                        consultation.scheduled_at
                                            ? new Date(consultation.scheduled_at).toLocaleString()
                                            : '—'
                                    }
                                />
                            </div>
                        </div>

                        {/* Privacy & Consent card */}
                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <div className={`flex h-5 w-5 items-center justify-center rounded-md ${isConsentConfirmed ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                    <CheckCircle2 className={`h-3 w-3 ${isConsentConfirmed ? 'text-emerald-500' : 'text-amber-500'}`} />
                                </div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Privacy &amp; Consent
                                </p>
                            </div>

                            {/* Consent status banner */}
                            {isConsentConfirmed ? (
                                <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="font-semibold">Consent confirmed</span>
                                    {consent?.confirmed_at && (
                                        <span className="ml-auto opacity-60">
                                            {new Date(consent.confirmed_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="font-medium">Consent required before joining.</span>
                                </div>
                            )}

                            <ul className="mb-3 space-y-1.5 text-xs text-muted-foreground">
                                {[
                                    'Telemedicine consent',
                                    'Data Privacy Act notice',
                                    'Recording policy (if enabled)',
                                    'Identity Guard verification',
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <CheckCircle2
                                            className={[
                                                'h-3 w-3 shrink-0',
                                                isConsentConfirmed ? 'text-emerald-500' : 'text-muted-foreground/30',
                                            ].join(' ')}
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <Separator className="mb-3" />

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="lobby-consent-check"
                                    checked={isConsentConfirmed}
                                    disabled
                                />
                                <Label
                                    htmlFor="lobby-consent-check"
                                    className="cursor-not-allowed text-xs leading-snug"
                                >
                                    I agree to the Privacy Notice and Consent
                                </Label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                            {isConsentConfirmed ? (
                                <Button
                                    className="w-full gap-2 bg-linear-to-r from-primary to-primary/80 shadow-md shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                                    asChild
                                >
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
                                        Complete consent to enable.
                                    </p>
                                </>
                            )}
                            <Button variant="outline" size="sm" className="w-full shadow-xs" asChild>
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
