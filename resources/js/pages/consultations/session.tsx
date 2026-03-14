import { Head, Link } from '@inertiajs/react';
import '@livekit/components-styles';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import { AlertTriangle, CheckCircle2, LogOut, Shield } from 'lucide-react';
import { useMemo } from 'react';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import * as ConsultationLobbyController from '@/actions/App/Http/Controllers/ConsultationLobbyController';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Consultation } from '@/types/consultation';

interface LiveKitSessionProps {
    enabled: boolean;
    ws_url: string | null;
    room_name: string | null;
    room_status: string | null;
}

interface LiveKitConnectPayload {
    room_name: string;
    room_status: string;
    participant_token: string;
    ws_url: string | null;
    role: string;
}

interface Props {
    consultation: Consultation;
    livekit: LiveKitSessionProps;
}

export default function ConsultationSessionPage({ consultation, livekit }: Props) {
    const storageKey = useMemo(
        () => `livekit-connect-${consultation.id}`,
        [consultation.id],
    );

    const payload = useMemo((): LiveKitConnectPayload | null => {
        if (typeof window === 'undefined') {
            return null;
        }

        try {
            const raw = window.sessionStorage.getItem(storageKey);

            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw) as LiveKitConnectPayload;

            if (!parsed.room_name || !parsed.participant_token) {
                return null;
            }

            return parsed;
        } catch {
            return null;
        }
    }, [storageKey]);

    const serverUrl = payload?.ws_url ?? livekit.ws_url;
    const canStartCall = Boolean(
        livekit.enabled &&
            payload?.participant_token &&
            payload?.room_name &&
            serverUrl,
    );

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
        {
            title: 'Session',
            href: '#',
        },
    ];

    function leaveSession(): void {
        window.sessionStorage.removeItem(storageKey);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teleconsultation Session" />

            <div className="p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Teleconsultation Session</h1>
                        <p className="text-sm text-muted-foreground">
                            {consultation.patient?.full_name
                                ? `Live call workspace for ${consultation.patient.full_name}`
                                : `Consultation #${consultation.id}`}
                        </p>
                    </div>

                    <Button variant="outline" asChild onClick={leaveSession}>
                        <Link href={ConsultationLobbyController.show.url(consultation.id)}>
                            <LogOut className="h-4 w-4" />
                            Back to Lobby
                        </Link>
                    </Button>
                </div>

                {!livekit.enabled && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        <div className="mb-1 flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            LiveKit is disabled
                        </div>
                        <p className="text-sm">Enable LiveKit in environment config to start the call UI.</p>
                    </div>
                )}

                {!payload && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                        <div className="mb-1 flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            Session credentials not found
                        </div>
                        <p className="text-sm">
                            Join from the lobby first so the app can request a fresh participant token.
                        </p>
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        {canStartCall ? (
                            <div className="overflow-hidden rounded-2xl border bg-zinc-950 shadow-sm">
                                <LiveKitRoom
                                    token={payload?.participant_token}
                                    serverUrl={serverUrl ?? undefined}
                                    connect
                                    audio
                                    video
                                    data-lk-theme="default"
                                    className="h-[620px]"
                                    onDisconnected={() => {
                                        window.sessionStorage.removeItem(storageKey);
                                    }}
                                >
                                    <VideoConference />
                                </LiveKitRoom>
                            </div>
                        ) : (
                            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border bg-zinc-950 text-zinc-100 shadow-sm">
                                <div className="max-w-md p-6 text-center">
                                    <h2 className="mb-2 text-lg font-semibold">Call cannot start yet</h2>
                                    <p className="text-sm text-zinc-300">
                                        Missing token or LiveKit server URL. Go back to lobby and click Join Call again.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Connection Details
                            </p>

                            <div className="mt-2 space-y-2 text-sm">
                                <p>
                                    <span className="font-medium">Room:</span>{' '}
                                    {payload?.room_name ?? livekit.room_name ?? '—'}
                                </p>
                                <p>
                                    <span className="font-medium">Status:</span>{' '}
                                    {payload?.room_status ?? livekit.room_status ?? '—'}
                                </p>
                                <p className="break-all">
                                    <span className="font-medium">WS:</span>{' '}
                                    {payload?.ws_url ?? livekit.ws_url ?? '—'}
                                </p>
                                <p>
                                    <span className="font-medium">Role:</span>{' '}
                                    {payload?.role ?? '—'}
                                </p>
                            </div>
                        </div>

                        {payload && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
                                <div className="mb-1 flex items-center gap-2 font-semibold">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Session credentials loaded
                                </div>
                                <p className="text-sm">LiveKit call UI is mounted with your current participant token.</p>
                            </div>
                        )}

                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                                <Shield className="h-4 w-4" />
                                Security Note
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Token is stored in session storage only and removed when you leave the session page.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
