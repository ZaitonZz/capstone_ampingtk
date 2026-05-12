import { Head, Link, router, usePage, usePoll } from '@inertiajs/react';
import '@livekit/components-styles';
import {
    ControlBar,
    isTrackReference,
    LiveKitRoom,
    ParticipantTile,
    RoomAudioRenderer,
    useDataChannel,
    useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { AlertTriangle, CheckCircle2, LogOut, Shield } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatClinicTime } from '@/lib/clinic-date';
import {
    consultationDetailsUrlForRole,
    consultationIndexUrlForRole,
} from '@/lib/consultation-navigation';
import type { BreadcrumbItem } from '@/types';
import type {
    Consultation,
    ConsultationDeepfakeDetectionState,
    ConsultationIdentityVerificationState,
} from '@/types/consultation';
import * as ConsultationLobbyController from '@/actions/App/Http/Controllers/ConsultationLobbyController';

interface LiveKitSessionProps {
    enabled: boolean;
    ws_url: string | null;
    room_name: string | null;
    room_status: string | null;
    leave_url?: string | null;
    can_end_for_all?: boolean;
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
    verification?: ConsultationIdentityVerificationState;
    livekit: LiveKitSessionProps;
    deepfake_detection?: ConsultationDeepfakeDetectionState;
}

interface PageProps {
    auth?: {
        user?: {
            role?: string;
        };
    };
    [key: string]: unknown;
}
function DeepfakeDataListener({
    onUpdate,
    isPaused,
}: {
    onUpdate: (detection: ConsultationDeepfakeDetectionState) => void;
    isPaused: boolean;
}) {
    useDataChannel('deepfake_detection', (message) => {
        // Skip processing deepfake data while consultation is paused for identity verification.
        if (isPaused) {
            return;
        }

        try {
            const payloadText = new TextDecoder().decode(message.payload);
            const payload = JSON.parse(
                payloadText,
            ) as ConsultationDeepfakeDetectionState;

            if (payload?.state) {
                onUpdate(payload);
            }
        } catch {
            // Ignore malformed agent data packets; the server poll remains authoritative.
        }
    });

    return null;
}

function ConsultationCallStage({
    onDetectionUpdate,
    isPaused,
}: {
    onDetectionUpdate: (detection: ConsultationDeepfakeDetectionState) => void;
    isPaused: boolean;
}) {
    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: false },
        { source: Track.Source.ScreenShare, withPlaceholder: false },
    ]);

    const activeTracks = tracks.filter((trackRef) =>
        isTrackReference(trackRef),
    );

    return (
        <div className="flex h-full flex-col">
            <DeepfakeDataListener onUpdate={onDetectionUpdate} isPaused={isPaused} />

            <div className="grid flex-1 auto-rows-fr grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2 p-2">
                {activeTracks.length > 0 ? (
                    activeTracks.map((trackRef) => (
                        <ParticipantTile
                            key={`${trackRef.participant.identity}-${trackRef.publication.trackSid}`}
                            trackRef={trackRef}
                            className="h-full min-h-48 overflow-hidden rounded-xl bg-zinc-900"
                        />
                    ))
                ) : (
                    <div className="col-span-full flex min-h-[280px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
                        <p className="text-sm text-zinc-300">
                            Waiting for participants to publish camera or
                            screen-share tracks.
                        </p>
                    </div>
                )}
            </div>

            <RoomAudioRenderer />

            <ControlBar
                controls={{
                    chat: false,
                    settings: false,
                }}
                className="border-t border-zinc-800/70 bg-zinc-950/95 px-2 py-2"
            />
        </div>
    );
}

function DetectionStatusPanel({
    detection,
}: {
    detection?: ConsultationDeepfakeDetectionState;
}) {
    const state = detection?.state ?? 'unavailable';
    const label = {
        running: 'Detection running',
        starting: 'Detection starting',
        delayed: 'Detection delayed',
        unavailable: 'Detection unavailable',
        cancelled: 'Consultation cancelled',
    }[state];
    const description = {
        running: 'Deepfake monitoring is active.',
        starting: 'Waiting for the pipeline to confirm monitoring.',
        delayed: `No active heartbeat within ${detection?.timeout_seconds ?? 60} seconds.`,
        unavailable: 'Monitoring starts when the room and pipeline are ready.',
        cancelled: `No face was detected for ${detection?.no_face_timeout_seconds ?? 30} seconds, so the consultation was cancelled.`,
    }[state];
    const tone =
        state === 'running'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : state === 'cancelled'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : state === 'delayed'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800';
    const Icon = state === 'running' ? CheckCircle2 : AlertTriangle;

    return (
        <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
            <div className="mb-1 flex items-center gap-2 font-semibold">
                <Icon className="h-4 w-4" />
                {label}
            </div>
            <p className="text-sm">{description}</p>
            {detection?.last_heartbeat_at && (
                <p className="mt-2 text-xs opacity-75">
                    Last heartbeat:{' '}
                    {formatClinicTime(detection.last_heartbeat_at)}
                </p>
            )}
        </div>
    );
}

function FaceDetectionPanel({
    detection,
}: {
    detection?: ConsultationDeepfakeDetectionState;
}) {
    if (detection?.guidance?.no_face_detected !== true) {
        return (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Face detected
                </div>
                <p className="text-sm">
                    The pipeline can currently see a face in the camera feed.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                No face detected
            </div>
            <p className="text-sm">
                Keep your face visible in the camera frame so deepfake
                monitoring can continue. If no face is detected for{' '}
                {detection?.no_face_timeout_seconds ?? 30} seconds, the
                consultation will be cancelled.
            </p>
        </div>
    );
}

function getMetaCsrfToken(): string {
    const element = document.querySelector(
        'meta[name="csrf-token"]',
    ) as HTMLMetaElement | null;

    return element?.content ?? '';
}

function getCookie(name: string): string | null {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(
        new RegExp('(?:^|; )' + escapedName + '=([^;]*)'),
    );

    if (!match || match[1] === undefined) {
        return null;
    }

    return decodeURIComponent(match[1]);
}

export default function ConsultationSessionPage({
    consultation,
    verification,
    livekit,
    deepfake_detection,
}: Props) {
    const page = usePage<PageProps>();
    const isPaused =
        verification?.is_paused === true || consultation.status === 'paused';
    const [liveDetection, setLiveDetection] = useState<
        ConsultationDeepfakeDetectionState | undefined
    >(deepfake_detection);
    // Use explicit start/stop control for polling. Start when the session is
    // active (not paused) so we don't poll detection state while a participant
    // is paused for identity verification.
    const { start: startPolling, stop: stopPolling } = usePoll(
        5000,
        {
            only: ['consultation', 'verification', 'deepfake_detection'],
            onSuccess: (page) => {
                const props = page.props as {
                    deepfake_detection?: ConsultationDeepfakeDetectionState;
                };

                if (props.deepfake_detection) {
                    setLiveDetection(props.deepfake_detection);
                }
            },
        },
        { autoStart: false },
    );

    useEffect(() => {
        if (isPaused) {
            stopPolling();
            return;
        }

        startPolling();

        return () => {
            stopPolling();
        };
    }, [isPaused, startPolling, stopPolling]);

    const storageKey = useMemo(
        () => `livekit-connect-${consultation.id}`,
        [consultation.id],
    );
    const hasAutoRedirectedRef = useRef(false);
    const hasRedirectedRef = useRef(false);
    const isLeavingRef = useRef(false);
    const isCheckingLeaveRef = useRef(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isEndForAllDialogOpen, setIsEndForAllDialogOpen] = useState(false);
    const effectiveDetection = liveDetection ?? deepfake_detection;

    const isCurrentUserVerificationTarget =
        verification?.is_current_user_target === true;
    const verificationTargetRole = verification?.target_role ?? 'participant';
    const currentRole = page.props.auth?.user?.role;
    const consultationIndexUrl = consultationIndexUrlForRole(currentRole);
    const consultationDetailsUrl = consultationDetailsUrlForRole(
        currentRole,
        consultation.id,
    );

    const shouldRedirectToLobbyForVerification =
        isPaused && isCurrentUserVerificationTarget;
    const isTerminalConsultation = useMemo(
        () =>
            ['completed', 'cancelled', 'no_show'].includes(consultation.status),
        [consultation.status],
    );

    const redirectToConsultations = useCallback(
        (url?: string): void => {
            if (hasAutoRedirectedRef.current) {
                return;
            }

            hasAutoRedirectedRef.current = true;
            window.sessionStorage.removeItem(storageKey);

            router.visit(url ?? consultationIndexUrl, {
                replace: true,
                preserveScroll: true,
            });
        },
        [consultationIndexUrl, storageKey],
    );

    const redirectToLobbyForVerification = useCallback((): void => {
        if (hasAutoRedirectedRef.current) {
            return;
        }

        hasAutoRedirectedRef.current = true;
        window.sessionStorage.removeItem(storageKey);

        router.visit(ConsultationLobbyController.show.url(consultation.id), {
            replace: true,
            preserveScroll: true,
        });
    }, [consultation.id, storageKey]);

    useEffect(() => {
        if (!shouldRedirectToLobbyForVerification) {
            return;
        }

        redirectToLobbyForVerification();
    }, [shouldRedirectToLobbyForVerification, redirectToLobbyForVerification]);

    useEffect(() => {
        if (!isTerminalConsultation) {
            return;
        }

        redirectToConsultations();
    }, [isTerminalConsultation, redirectToConsultations]);

    // If OTP expires while the user is on the live session, redirect back to
    // consultation details when the backend marks the consultation cancelled.
    // Note: `isPaused` may become false at the same time the backend sets
    // `status: cancelled`, so watch for the transition from paused ->
    // cancelled or a cancellation reason that mentions verification/OTP.
    const prevPausedRef = useRef<boolean>(isPaused);

    useEffect(() => {
        if (hasRedirectedRef.current) {
            prevPausedRef.current = isPaused;
            return;
        }

        const reason = (consultation.cancellation_reason ?? '').toLowerCase();
        const reasonIndicatesVerification =
            reason.includes('verification') || reason.includes('otp') || reason.includes('identity');

        const wasPaused = prevPausedRef.current;

        if (consultation.status === 'cancelled' && (wasPaused || reasonIndicatesVerification)) {
            hasRedirectedRef.current = true;

            toast.error('Verification expired. This consultation has been cancelled.');

            router.visit(consultationDetailsUrl);
        }

        prevPausedRef.current = isPaused;
    }, [isPaused, consultation.status, consultation.cancellation_reason, consultationDetailsUrl]);

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
        !isTerminalConsultation &&
        payload?.participant_token &&
        payload?.room_name &&
        serverUrl,
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Consultations', href: consultationIndexUrl },
        {
            title: consultation.patient?.full_name ?? `#${consultation.id}`,
            href: consultationDetailsUrl,
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

    function clearStoredSession(): void {
        window.sessionStorage.removeItem(storageKey);
    }

    async function postLeaveRequest(body: Record<string, unknown>): Promise<{
        cancelled?: boolean;
        redirect_url?: string;
        requires_confirmation?: boolean;
        status?: string;
    } | null> {
        if (!livekit.leave_url) {
            return null;
        }

        const csrfToken = getMetaCsrfToken();
        const xsrfToken = getCookie('XSRF-TOKEN');

        try {
            const response = await fetch(livekit.leave_url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(csrfToken !== '' ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                    ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                return null;
            }

            return (await response.json()) as {
                cancelled?: boolean;
                redirect_url?: string;
                requires_confirmation?: boolean;
                status?: string;
            };
        } catch {
            return null;
        }
    }

    async function requestLeavePreview(): Promise<boolean> {
        const response = await postLeaveRequest({ preview: true });

        return response?.requires_confirmation === true;
    }

    async function leaveSession(endForAll = false): Promise<void> {
        if (isLeavingRef.current) {
            return;
        }

        isLeavingRef.current = true;
        setIsLeaving(true);

        if (endForAll) {
            setIsEndForAllDialogOpen(false);
        }

        clearStoredSession();

        const response = await postLeaveRequest({ end_for_all: endForAll });

        redirectToConsultations(response?.redirect_url);
    }

    async function handleLeaveClick(): Promise<void> {
        if (isLeavingRef.current || isCheckingLeaveRef.current) {
            return;
        }

        if (livekit.can_end_for_all === true && livekit.leave_url) {
            isCheckingLeaveRef.current = true;

            try {
                const requiresConfirmation = await requestLeavePreview();

                if (requiresConfirmation) {
                    setIsEndForAllDialogOpen(true);
                    return;
                }
            } finally {
                isCheckingLeaveRef.current = false;
            }
        }

        await leaveSession(false);
    }

    async function confirmEndForAll(): Promise<void> {
        await leaveSession(true);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teleconsultation Session" />

            <div className="p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Teleconsultation Session
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {consultation.patient?.full_name
                                ? `Live call workspace for ${consultation.patient.full_name}`
                                : `Consultation #${consultation.id}`}
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => void handleLeaveClick()}
                        disabled={isLeaving || isCheckingLeaveRef.current}
                    >
                        <LogOut className="h-4 w-4" />
                        {isLeaving ? 'Leaving...' : 'Leave Session'}
                    </Button>
                </div>

                {!livekit.enabled && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        <div className="mb-1 flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            LiveKit is disabled
                        </div>
                        <p className="text-sm">
                            Enable LiveKit in environment config to start the
                            call UI.
                        </p>
                    </div>
                )}

                {isPaused && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        <div className="mb-1 flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            Consultation paused for identity verification
                        </div>
                        <p className="text-sm">
                            {isCurrentUserVerificationTarget
                                ? 'You are required to verify your identity before rejoining this consultation.'
                                : `This consultation is paused while the ${verificationTargetRole} completes identity verification.`}
                        </p>
                        {isCurrentUserVerificationTarget && (
                            <div className="mt-3">
                                <Button size="sm" asChild>
                                    <Link
                                        href={ConsultationLobbyController.show.url(
                                            consultation.id,
                                        )}
                                    >
                                        Return to Lobby Verification
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {!payload && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                        <div className="mb-1 flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            Session credentials not found
                        </div>
                        <p className="text-sm">
                            Join from the lobby first so the app can request a
                            fresh participant token.
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
                                        clearStoredSession();

                                        if (
                                            shouldRedirectToLobbyForVerification
                                        ) {
                                            redirectToLobbyForVerification();

                                            return;
                                        }

                                        redirectToConsultations();
                                    }}
                                >
                                    <ConsultationCallStage
                                        onDetectionUpdate={setLiveDetection}
                                        isPaused={isPaused}
                                    />
                                </LiveKitRoom>
                            </div>
                        ) : (
                            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border bg-zinc-950 text-zinc-100 shadow-sm">
                                <div className="max-w-md p-6 text-center">
                                    <h2 className="mb-2 text-lg font-semibold">
                                        Call cannot start yet
                                    </h2>
                                    <p className="text-sm text-zinc-300">
                                        Missing token or LiveKit server URL. Go
                                        back to lobby and click Join Call again.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <DetectionStatusPanel detection={effectiveDetection} />

                        <FaceDetectionPanel detection={effectiveDetection} />

                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Connection Details
                            </p>

                            <div className="mt-2 space-y-2 text-sm">
                                <p>
                                    <span className="font-medium">Room:</span>{' '}
                                    {payload?.room_name ??
                                        livekit.room_name ??
                                        '—'}
                                </p>
                                <p>
                                    <span className="font-medium">Status:</span>{' '}
                                    {payload?.room_status ??
                                        livekit.room_status ??
                                        '—'}
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
                                <p className="text-sm">
                                    LiveKit call UI is mounted with your current
                                    participant token.
                                </p>
                            </div>
                        )}

                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                                <Shield className="h-4 w-4" />
                                Security Note
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Token is stored in session storage only and
                                removed when you leave the session page.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={isEndForAllDialogOpen}
                onOpenChange={setIsEndForAllDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            End consultation for everyone?
                        </DialogTitle>
                        <DialogDescription>
                            Leaving now will end the consultation for both
                            doctor and patient. Continue?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEndForAllDialogOpen(false)}
                            disabled={isLeaving}
                        >
                            Keep Session Open
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => void confirmEndForAll()}
                            disabled={isLeaving}
                        >
                            End Consultation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
