import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Camera, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
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
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Consultation, ConsultationConsent } from '@/types/consultation';

interface Props {
    consultation: Consultation;
    consent: ConsultationConsent | null;
}

function SessionDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="text-sm">{value}</dd>
        </div>
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
            title: 'Teleconsultation Lobby',
            href: ConsultationLobbyController.show.url(consultation.id),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teleconsultation Lobby" />

            <div className="mx-auto max-w-6xl p-4 md:p-6">
                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold">Teleconsultation Lobby</h1>
                    <p className="text-sm text-muted-foreground">
                        {consultation.patient?.full_name
                            ? `Preparing session for ${consultation.patient.full_name}`
                            : `Consultation #${consultation.id}`}
                    </p>
                </div>

                {/* Main 2-column bordered container */}
                <div className="grid grid-cols-1 gap-6 rounded-xl border p-6 lg:grid-cols-2">
                    {/* ── LEFT: Camera & Mic Check ──────────────────────────────── */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                            Camera &amp; Mic Check
                        </h2>

                        {/* Video preview placeholder */}
                        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted">
                            {cameraOn ? (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Camera className="h-12 w-12 opacity-40" />
                                    <span className="text-xs opacity-60">Camera preview unavailable</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <VideoOff className="h-12 w-12 opacity-40" />
                                    <span className="text-xs opacity-60">Camera is off</span>
                                </div>
                            )}
                        </div>

                        {/* Device control pills */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCameraOn((prev) => !prev)}
                                className={[
                                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                                    cameraOn
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-accent',
                                ].join(' ')}
                            >
                                {cameraOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                                Camera: {cameraOn ? 'On' : 'Off'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setMicOn((prev) => !prev)}
                                className={[
                                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                                    micOn
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-accent',
                                ].join(' ')}
                            >
                                {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                                Mic: {micOn ? 'On' : 'Off'}
                            </button>

                            <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
                            >
                                <Volume2 className="h-3.5 w-3.5" />
                                Speaker
                            </button>
                        </div>

                        {/* Test Devices button */}
                        <div className="flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => setDeviceTestOpen(true)}>
                                Test Devices
                            </Button>
                        </div>
                    </div>

                    {/* ── RIGHT: Session Details + Privacy & Consent ────────────── */}
                    <div className="flex flex-col gap-4">
                        {/* Session Details card */}
                        <div className="rounded-xl border p-5">
                            <h2 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                                Session Details
                            </h2>
                            <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <SessionDetail
                                    label="Patient"
                                    value={
                                        consultation.patient?.full_name
                                            ? `${consultation.patient.full_name} (Ref: #${consultation.id})`
                                            : `#${consultation.id}`
                                    }
                                />
                                <SessionDetail
                                    label="Provider"
                                    value={consultation.doctor?.name ? `Dr. ${consultation.doctor.name}` : '—'}
                                />
                                <SessionDetail label="Mode" value="Video Teleconsult" />
                                <SessionDetail
                                    label="Scheduled"
                                    value={
                                        consultation.scheduled_at
                                            ? new Date(consultation.scheduled_at).toLocaleString()
                                            : '—'
                                    }
                                />
                            </dl>
                        </div>

                        {/* Privacy & Consent card */}
                        <div className="rounded-xl border p-5">
                            <h2 className="mb-1 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                                Privacy &amp; Consent
                            </h2>
                            <p className="mb-3 text-sm text-muted-foreground">
                                Before joining, you must agree to:
                            </p>
                            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
                                <li>Telemedicine consent for remote consultation</li>
                                <li>Data Privacy Act notice (collection &amp; processing)</li>
                                <li>Recording policy (if enabled)</li>
                                <li>Identity Guard: randomized verification scans</li>
                            </ul>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="lobby-consent-check"
                                    checked={isConsentConfirmed}
                                    disabled
                                    aria-label="Consent confirmation status"
                                />
                                <Label
                                    htmlFor="lobby-consent-check"
                                    className="cursor-not-allowed text-sm text-muted-foreground"
                                >
                                    I agree to the Privacy Notice and Consent
                                </Label>
                                {isConsentConfirmed && (
                                    <span className="ml-1 text-xs font-medium text-green-600">✓ Confirmed</span>
                                )}
                            </div>
                        </div>

                        {/* Bottom actions */}
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={ConsultationConsentController.show.url(consultation.id)}
                                    >
                                        View Full Consent
                                    </Link>
                                </Button>

                                {isConsentConfirmed ? (
                                    <Button size="sm" asChild>
                                        <Link href={`/consultations/${consultation.id}/waiting`}>
                                            Join Call
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button size="sm" disabled>
                                        Join Call
                                    </Button>
                                )}
                            </div>

                            {!isConsentConfirmed && (
                                <p className="text-xs text-muted-foreground">
                                    Note: Join Call is disabled until consent is checked.
                                </p>
                            )}
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
