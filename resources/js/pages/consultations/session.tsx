import { Head, Link, router, usePoll } from '@inertiajs/react';
import '@livekit/components-styles';
import {
    ControlBar,
    isTrackReference,
    LiveKitRoom,
    ParticipantTile,
    RoomAudioRenderer,
    useDataChannel,
    useRoomContext,
    useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { AlertTriangle, CheckCircle2, LogOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import * as ConsultationLiveKitController from '@/actions/App/Http/Controllers/ConsultationLiveKitController';
import * as ConsultationLobbyController from '@/actions/App/Http/Controllers/ConsultationLobbyController';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type {
    Consultation,
    ConsultationDeepfakeDetectionState,
    ConsultationIdentityVerificationState,
} from '@/types/consultation';

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

interface LiveKitLeaveResponse {
    status: Consultation['status'];
    cancelled: boolean;
    redirect_url: string;
}

interface Props {
    consultation: Consultation;
    verification?: ConsultationIdentityVerificationState;
    livekit: LiveKitSessionProps;
    deepfake_detection?: ConsultationDeepfakeDetectionState;
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

function DeepfakeDataListener({
    onUpdate,
}: {
    onUpdate: (detection: ConsultationDeepfakeDetectionState) => void;
}) {
    useDataChannel('deepfake_detection', (message) => {
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
    onLeaveCall,
    isLeaving,
}: {
    onDetectionUpdate: (detection: ConsultationDeepfakeDetectionState) => void;
    onLeaveCall: () => Promise<void>;
    isLeaving: boolean;
}) {
    const room = useRoomContext();
    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: false },
        { source: Track.Source.ScreenShare, withPlaceholder: false },
    ]);

    const activeTracks = tracks.filter((trackRef) =>
        isTrackReference(trackRef),
    );

    return (
        <div className="flex h-full flex-col">
            <DeepfakeDataListener onUpdate={onDetectionUpdate} />

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
                    leave: false,
                    settings: false,
                }}
                className="border-t border-zinc-800/70 bg-zinc-950/95 px-2 py-2"
            />
            <div className="flex justify-center border-t border-zinc-800/70 bg-zinc-950/95 px-2 pb-3">
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    disabled={isLeaving}
                    onClick={() => {
                        void onLeaveCall().finally(() => {
                            void room.disconnect();
                        });
                    }}
                >
                    <LogOut className="h-4 w-4" />
                    {isLeaving ? 'Leaving...' : 'Leave Call'}
                </Button>
            </div>
        </div>
    );
}

function DetectionStatusBadge({
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
        <div className={`rounded-xl border px-3 py-2 shadow-sm ${tone}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4" />
                {label}
            </div>
            <p className="mt-0.5 text-xs">{description}</p>
        </div>
    );
}

function FaceDetectionBadge({
    detection,
}: {
    detection?: ConsultationDeepfakeDetectionState;
}) {
    if (detection?.guidance?.no_face_detected !== true) {
        return (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Face detected
                </div>
                <p className="mt-0.5 text-xs">Camera visibility is clear.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4" />
                No face detected
            </div>
            <p className="mt-0.5 text-xs">
                Cancellation starts after {detection?.no_face_timeout_seconds ?? 30}
                s without a face.
            </p>
        </div>
    );
}

export default function ConsultationSessionPage({
    consultation,
    verification,
    livekit,
    deepfake_detection,
}: Props) {
    const isPaused =
        verification?.is_paused === true || consultation.status === 'paused';
    const [liveDetection, setLiveDetection] = useState<
        ConsultationDeepfakeDetectionState | undefined
    >(deepfake_detection);
    const [isLeaving, setIsLeaving] = useState(false);
    usePoll(5000, {
        only: ['consultation', 'verification', 'deepfake_detection'],
        onSuccess: (page) => {
            const props = page.props as {
                deepfake_detection?: ConsultationDeepfakeDetectionState;
            };

            if (props.deepfake_detection) {
                setLiveDetection(props.deepfake_detection);
            }
        },
    });

    const storageKey = useMemo(
        () => `livekit-connect-${consultation.id}`,
        [consultation.id],
    );
    const hasAutoRedirectedRef = useRef(false);
    const isManualLeaveRef = useRef(false);
    const isLeavingRef = useRef(false);
    const effectiveDetection = liveDetection ?? deepfake_detection;

    const isCurrentUserVerificationTarget =
        verification?.is_current_user_target === true;
    const verificationTargetRole = verification?.target_role ?? 'participant';

    const shouldRedirectToLobbyForVerification =
        isPaused && isCurrentUserVerificationTarget;

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

    const refreshVerificationState = useCallback((): void => {
        router.reload({
            only: ['consultation', 'verification', 'deepfake_detection'],
            onSuccess: (page) => {
                const props = page.props as {
                    consultation?: Consultation;
                    verification?: ConsultationIdentityVerificationState;
                    deepfake_detection?: ConsultationDeepfakeDetectionState;
                };

                if (props.deepfake_detection) {
                    setLiveDetection(props.deepfake_detection);
                }

                const refreshedIsPaused =
                    props.verification?.is_paused === true ||
                    props.consultation?.status === 'paused';
                const refreshedIsCurrentUserTarget =
                    props.verification?.is_current_user_target === true;

                if (refreshedIsPaused && refreshedIsCurrentUserTarget) {
                    redirectToLobbyForVerification();
                }
            },
        });
    }, [redirectToLobbyForVerification]);

    useEffect(() => {
        if (!shouldRedirectToLobbyForVerification) {
            return;
        }

        redirectToLobbyForVerification();
    }, [shouldRedirectToLobbyForVerification, redirectToLobbyForVerification]);

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
        consultation.status !== 'cancelled' &&
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

    function clearStoredSession(): void {
        window.sessionStorage.removeItem(storageKey);
    }

    const redirectToLobby = useCallback(
        (url?: string): void => {
            router.visit(
                url ?? ConsultationLobbyController.show.url(consultation.id),
                {
                    replace: true,
                    preserveScroll: true,
                },
            );
        },
        [consultation.id],
    );

    const leaveSession = useCallback(async (): Promise<void> => {
        if (isLeavingRef.current) {
            return;
        }

        isLeavingRef.current = true;
        isManualLeaveRef.current = true;
        setIsLeaving(true);
        clearStoredSession();

        const fallbackUrl = ConsultationLobbyController.show.url(
            consultation.id,
        );

        try {
            const csrfToken = getMetaCsrfToken();
            const xsrfToken = getCookie('XSRF-TOKEN');
            const response = await fetch(
                ConsultationLiveKitController.leave.url(consultation.id),
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        ...(csrfToken !== ''
                            ? { 'X-CSRF-TOKEN': csrfToken }
                            : {}),
                        ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
                    },
                },
            );

            if (!response.ok) {
                redirectToLobby(fallbackUrl);

                return;
            }

            const payload = (await response.json()) as LiveKitLeaveResponse;
            redirectToLobby(payload.redirect_url ?? fallbackUrl);
        } catch {
            redirectToLobby(fallbackUrl);
        }
    }, [consultation.id, redirectToLobby]);

    const goBackToLobby = useCallback((): void => {
        clearStoredSession();
        redirectToLobby();
    }, [redirectToLobby]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teleconsultation Session" />

            <div className="p-4 md:p-6">
                <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Teleconsultation Session
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {consultation.patient?.full_name
                                ? `Live call workspace for ${consultation.patient.full_name}`
                                : `Consultation #${consultation.id}`}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
                        <DetectionStatusBadge detection={effectiveDetection} />
                        <FaceDetectionBadge detection={effectiveDetection} />
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 lg:self-center"
                            disabled={isLeaving}
                            onClick={() => {
                                goBackToLobby();
                            }}
                        >
                            <LogOut className="h-4 w-4" />
                            Back to Lobby
                        </Button>
                    </div>
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

                <div>
                    <div>
                        {canStartCall ? (
                            <div className="overflow-hidden rounded-2xl border bg-zinc-950 shadow-sm">
                                <LiveKitRoom
                                    token={payload?.participant_token}
                                    serverUrl={serverUrl ?? undefined}
                                    connect
                                    audio
                                    video
                                    data-lk-theme="default"
                                    className="h-[680px]"
                                    onDisconnected={() => {
                                        clearStoredSession();

                                        if (isManualLeaveRef.current) {
                                            return;
                                        }

                                        if (
                                            shouldRedirectToLobbyForVerification
                                        ) {
                                            redirectToLobbyForVerification();

                                            return;
                                        }

                                        refreshVerificationState();
                                    }}
                                >
                                    <ConsultationCallStage
                                        onDetectionUpdate={setLiveDetection}
                                        onLeaveCall={leaveSession}
                                        isLeaving={isLeaving}
                                    />
                                </LiveKitRoom>
                            </div>
                        ) : (
                            <div className="flex min-h-[520px] items-center justify-center rounded-2xl border bg-zinc-950 text-zinc-100 shadow-sm">
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

                </div>
            </div>
        </AppLayout>
    );
}
