import { Head, Link, router, usePage, usePoll } from '@inertiajs/react';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    LoaderCircle,
    Mic,
    MicOff,
    Monitor,
    Shield,
    Stethoscope,
    User,
    Video,
    VideoOff,
    Volume2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ElementType, FormEvent } from 'react';
import { toast } from 'sonner';
import * as ConsultationConsentController from '@/actions/App/Http/Controllers/ConsultationConsentController';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import * as ConsultationLiveKitController from '@/actions/App/Http/Controllers/ConsultationLiveKitController';
import * as ConsultationLobbyController from '@/actions/App/Http/Controllers/ConsultationLobbyController';
import * as ConsultationSessionController from '@/actions/App/Http/Controllers/ConsultationSessionController';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type {
    Consultation,
    ConsultationConsent,
    ConsultationIdentityVerificationState,
} from '@/types/consultation';

interface LiveKitLobbyProps {
    enabled: boolean;
    room_status: string | null;
    room_name: string | null;
    connect_url: string;
    ws_url: string | null;
}

interface LiveKitConnectPayload {
    room_name: string;
    room_status: string;
    participant_token: string;
    ws_url: string | null;
    role: string;
}

interface AuthUser {
    id: number;
    role: string;
}

interface PageProps {
    [key: string]: unknown;
    auth?: {
        user?: AuthUser;
    };
}

interface Props {
    consultation: Consultation;
    consent: ConsultationConsent | null;
    verification?: ConsultationIdentityVerificationState;
    livekit?: LiveKitLobbyProps;
}

type ConnectState = 'idle' | 'connecting' | 'connected' | 'error';

function SessionRow({
    icon: Icon,
    label,
    value,
    iconClass = 'bg-primary/10 text-primary',
}: {
    icon: ElementType;
    label: string;
    value: string;
    iconClass?: string;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
            >
                <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {label}
                </p>
                <p className="text-xs leading-snug font-medium">{value}</p>
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
    onIcon: ElementType;
    offIcon: ElementType;
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
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold shadow-xs transition-all duration-200',
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

function secondsUntil(dateString: string | null | undefined): number {
    if (!dateString) {
        return 0;
    }

    const target = new Date(dateString).getTime();

    if (Number.isNaN(target)) {
        return 0;
    }

    return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ConsultationLobbyPage({
    consultation,
    consent,
    verification,
    livekit,
}: Props) {
    const page = usePage<PageProps>();
    const isPaused =
        verification?.is_paused === true || consultation.status === 'paused';
    const { start: startPolling, stop: stopPolling } = usePoll(
        2000,
        { only: ['consultation', 'verification'] },
        { autoStart: false },
    );

    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [deviceTestOpen, setDeviceTestOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [micLevel, setMicLevel] = useState(0);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [connectState, setConnectState] = useState<ConnectState>('idle');
    const [connectError, setConnectError] = useState<string | null>(null);
    const [otpCode, setOtpCode] = useState('');
    const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
    const [isResendingOtp, setIsResendingOtp] = useState(false);

    const isConsentConfirmed = consent?.consent_confirmed === true;
    const isAdminUser = page.props.auth?.user?.role === 'admin';
    const hasJoinPermission = isConsentConfirmed || isAdminUser;
    const canJoinSession = hasJoinPermission && !isPaused;
    const isLiveKitEnabled = livekit?.enabled === true;
    const isCurrentUserVerificationTarget =
        verification?.is_current_user_target === true;
    const verificationTargetRole = verification?.target_role ?? 'participant';
    const configuredOtpLength = Number(verification?.otp_length ?? 6);
    const otpLength = Number.isFinite(configuredOtpLength)
        ? Math.max(4, Math.floor(configuredOtpLength))
        : 6;
    const expiresInSeconds = secondsUntil(verification?.expires_at);
    const resendInSeconds = secondsUntil(verification?.resend_available_at);

    const connectEndpoint = useMemo(
        () =>
            livekit?.connect_url ??
            ConsultationLiveKitController.connect.url(consultation.id),
        [consultation.id, livekit?.connect_url],
    );

    useEffect(() => {
        if (isPaused) {
            startPolling();

            return () => {
                stopPolling();
            };
        }

        stopPolling();

        return () => {
            stopPolling();
        };
    }, [isPaused, startPolling, stopPolling]);

    // Handle camera on/off
    useEffect(() => {
        let cancelled = false;

        const startCamera = async () => {
            try {
                setCameraError(null);
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                // Guard against late-resolving getUserMedia after camera was turned off or component unmounted
                if (cancelled || !cameraOn) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;
                setMediaStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                if (cancelled) return;
                console.error('Failed to access camera:', error);
                if (error instanceof DOMException) {
                    if (error.name === 'NotAllowedError') {
                        setCameraError('Camera permission denied');
                    } else if (error.name === 'NotFoundError') {
                        setCameraError('No camera device found');
                    } else {
                        setCameraError('Camera unavailable');
                    }
                } else {
                    setCameraError('Camera unavailable');
                }
            }
        };

        const stopCamera = () => {
            cancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            setMediaStream(null);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };

        if (cameraOn) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            cancelled = true;
            stopCamera();
        };
    }, [cameraOn]);

    // Handle mic on/off (only toggle audio track if camera is already running)
    useEffect(() => {
        if (streamRef.current && cameraOn) {
            const audioTracks = streamRef.current.getAudioTracks();
            audioTracks.forEach((track) => {
                track.enabled = micOn;
            });
        }
    }, [micOn, cameraOn]);

    // Setup audio analyzer for mic level when mic is on
    useEffect(() => {
        if (!micOn || !mediaStream) {
            // Cleanup if mic is off or no media stream
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            if (analyserRef.current) {
                analyserRef.current.disconnect();
                analyserRef.current = null;
            }
            if (
                audioContextRef.current &&
                audioContextRef.current.state !== 'closed'
            ) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            setMicLevel(0);
            return;
        }

        try {
            const audioContext = new (
                window.AudioContext || (window as any).webkitAudioContext
            )();
            const resume = () => audioContext.resume().catch(() => {});

            void resume();

            const resumeOnce = () => resume();
            if (audioContext.state === 'suspended') {
                window.addEventListener('pointerdown', resumeOnce, {
                    once: true,
                });
                window.addEventListener('keydown', resumeOnce, { once: true });
            }

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;

            const source = audioContext.createMediaStreamSource(mediaStream);
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let lastUpdate = 0;

            const updateLevel = () => {
                analyser.getByteFrequencyData(dataArray);

                // Throttle React state updates to ~12fps to avoid excessive re-renders
                const now = performance.now();
                if (now - lastUpdate >= 80) {
                    lastUpdate = now;
                    // Calculate RMS (Root Mean Square) for mic level
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i] * dataArray[i];
                    }
                    const rms = Math.sqrt(sum / dataArray.length);
                    // Normalize to 0.0-1.0 (255 is max possible value)
                    const normalizedLevel = rms / 255;
                    setMicLevel(normalizedLevel);
                }

                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };

            animationFrameRef.current = requestAnimationFrame(updateLevel);

            return () => {
                window.removeEventListener('pointerdown', resumeOnce);
                window.removeEventListener('keydown', resumeOnce);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                if (analyserRef.current) {
                    analyserRef.current.disconnect();
                    analyserRef.current = null;
                }
                if (
                    audioContextRef.current &&
                    audioContextRef.current.state !== 'closed'
                ) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
            };
        } catch (error) {
            console.error('Failed to setup audio analyzer:', error);
        }
    }, [micOn, mediaStream]);

    // Handle mic on/off (only toggle audio track if camera is already running)
    useEffect(() => {
        if (streamRef.current && cameraOn) {
            const audioTracks = streamRef.current.getAudioTracks();
            audioTracks.forEach((track) => {
                track.enabled = micOn;
            });
        }
    }, [micOn, cameraOn]);

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

    async function handleJoinCall(): Promise<void> {
        if (isPaused) {
            if (isCurrentUserVerificationTarget) {
                toast.error(
                    'Verify your OTP in the lobby before rejoining the consultation.',
                );
            } else {
                toast.error(
                    `Consultation is paused while the ${verificationTargetRole} completes identity verification.`,
                );
            }

            return;
        }

        if (!canJoinSession) {
            toast.error(
                'Consent is required before joining this teleconsultation.',
            );

            return;
        }

        if (!isLiveKitEnabled) {
            toast.error('LiveKit is not enabled yet in this environment.');

            return;
        }

        const csrfToken = getMetaCsrfToken();
        const xsrfToken = getCookie('XSRF-TOKEN');

        if (csrfToken === '' && !xsrfToken) {
            setConnectState('error');
            setConnectError(
                'Security token is missing. Please refresh the page and try again.',
            );

            return;
        }

        setConnectState('connecting');
        setConnectError(null);

        try {
            const response = await fetch(connectEndpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(csrfToken !== '' ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                    ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });

            const payload =
                (await response.json()) as Partial<LiveKitConnectPayload> & {
                    message?: string;
                };

            if (!response.ok) {
                const message =
                    payload.message ??
                    'Unable to connect to the teleconsultation room.';

                throw new Error(message);
            }

            if (
                !payload.room_name ||
                !payload.participant_token ||
                !payload.room_status
            ) {
                throw new Error('The server response is incomplete.');
            }

            const sessionPayload: LiveKitConnectPayload = {
                room_name: payload.room_name,
                room_status: payload.room_status,
                participant_token: payload.participant_token,
                ws_url: payload.ws_url ?? livekit?.ws_url ?? null,
                role: payload.role ?? 'participant',
            };

            window.sessionStorage.setItem(
                `livekit-connect-${consultation.id}`,
                JSON.stringify(sessionPayload),
            );

            setConnectState('connected');
            toast.success(
                'Session credentials issued. Redirecting to call UI...',
            );

            router.visit(
                ConsultationSessionController.show.url(consultation.id),
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unexpected connection error.';
            setConnectState('error');
            setConnectError(message);
            toast.error(message);
        }
    }

    function handleVerifyOtp(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        if (!verification?.verify_url) {
            toast.error('Verification endpoint is unavailable.');

            return;
        }

        const normalizedOtpCode = otpCode.trim();
        const otpPattern = new RegExp(`^\\d{${otpLength}}$`);

        if (!otpPattern.test(normalizedOtpCode)) {
            toast.error(`Enter a valid ${otpLength}-digit OTP code.`);

            return;
        }

        router.post(
            verification.verify_url,
            { otp_code: normalizedOtpCode },
            {
                preserveScroll: true,
                onStart: () => setIsSubmittingOtp(true),
                onFinish: () => setIsSubmittingOtp(false),
                onSuccess: () => {
                    setOtpCode('');
                    toast.success('Identity verification submitted.');
                },
                onError: (errors) => {
                    const otpError =
                        typeof errors.otp_code === 'string'
                            ? errors.otp_code
                            : 'OTP verification failed.';
                    toast.error(otpError);
                },
            },
        );
    }

    function handleResendOtp(): void {
        if (!verification?.resend_url) {
            toast.error('Resend endpoint is unavailable.');

            return;
        }

        router.post(
            verification.resend_url,
            {},
            {
                preserveScroll: true,
                onStart: () => setIsResendingOtp(true),
                onFinish: () => setIsResendingOtp(false),
            },
        );
    }

    const statusLabel = !isLiveKitEnabled
        ? 'LiveKit disabled'
        : isPaused
          ? isCurrentUserVerificationTarget
              ? 'Paused: verification required'
              : `Paused: waiting for ${verificationTargetRole}`
          : isAdminUser
            ? 'Admin audit access'
            : isConsentConfirmed
              ? 'Ready to join'
              : 'Consent required';

    const statusPillClass = !isLiveKitEnabled
        ? 'bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700'
        : isPaused
          ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-700'
          : canJoinSession
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-700'
            : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-700';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teleconsultation Lobby" />

            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
                {/* ── Page header ──────────────────────────────────────────── */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Teleconsultation Lobby
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {consultation.patient?.full_name
                                ? `Preparing session for ${consultation.patient.full_name}`
                                : `Consultation #${consultation.id}`}
                        </p>
                    </div>

                    <div
                        className={[
                            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-xs ring-1',
                            statusPillClass,
                        ].join(' ')}
                    >
                        <span
                            className={[
                                'h-2 w-2 animate-pulse rounded-full',
                                canJoinSession
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500',
                            ].join(' ')}
                        />
                        {statusLabel}
                    </div>
                </div>

                {/* ── Main 2-column layout ──────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    {/* ── LEFT (3 cols): Camera & Mic ──────────────────────── */}
                    <div className="flex flex-col gap-4 lg:col-span-3">
                        <div className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                                    <Video className="h-3 w-3 text-primary" />
                                </div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Camera and Mic Check
                                </p>
                            </div>

                            {/* Dark video preview */}
                            <div className="relative flex aspect-video max-h-[550px] w-full items-center justify-center overflow-hidden rounded-xl bg-linear-to-b from-zinc-800 to-zinc-950 ring-1 ring-white/5">
                                {/* Corner label */}
                                <span className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/60 backdrop-blur-sm">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    Preview
                                </span>

                                {cameraOn ? (
                                    <>
                                        {cameraError ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-950 text-rose-700 ring-2 ring-white/5">
                                                    <VideoOff className="h-12 w-12" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-rose-400">
                                                        {cameraError}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="h-full w-full object-cover"
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900 text-zinc-700 ring-2 ring-white/5">
                                            <VideoOff className="h-12 w-12" />
                                        </div>
                                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-500">
                                            Camera is off
                                        </span>
                                    </div>
                                )}

                                {/* Live mic level meter */}
                                {/* Minimal mic level indicator */}
                                {(() => {
                                    const micActive = micOn && micLevel > 0;
                                    const showLevelBars = micActive;

                                    // 3 bars like a speaker icon level meter
                                    const thresholds = [0.05, 0.15, 0.3];
                                    const heights = ['h-1.5', 'h-2.5', 'h-3.5'];

                                    return (
                                        <div className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-black/35 px-2.5 py-1 ring-1 ring-white/10 backdrop-blur-sm">
                                            {micActive ? (
                                                <Mic className="h-3.5 w-3.5 text-white/80" />
                                            ) : (
                                                <MicOff className="h-3.5 w-3.5 text-white/40" />
                                            )}

                                            <div className="flex items-end gap-0.5">
                                                {thresholds.map((t, i) => (
                                                    <span
                                                        key={i}
                                                        className={[
                                                            'w-0.5 rounded-full transition-all duration-75',
                                                            heights[i],
                                                            showLevelBars &&
                                                            micLevel >= t
                                                                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]'
                                                                : 'bg-white/10',
                                                        ].join(' ')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="mt-4 flex shrink-0 items-center justify-between">
                                <div className="flex gap-2.5">
                                    <DeviceButton
                                        on={cameraOn}
                                        onIcon={Video}
                                        offIcon={VideoOff}
                                        label={
                                            cameraOn
                                                ? 'Camera On'
                                                : 'Camera Off'
                                        }
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
                    <div className="flex w-full flex-col gap-3 lg:w-80">
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
                                    value={
                                        consultation.type === 'teleconsultation'
                                            ? 'Video Teleconsult'
                                            : consultation.type === 'in_person'
                                              ? 'In-person Consultation'
                                              : '—'
                                    }
                                />
                                <SessionRow
                                    icon={Calendar}
                                    label="Scheduled"
                                    iconClass="bg-orange-500/10 text-orange-500"
                                    value={
                                        consultation.scheduled_at
                                            ? new Date(
                                                  consultation.scheduled_at,
                                              ).toLocaleString()
                                            : '—'
                                    }
                                />
                                <SessionRow
                                    icon={Shield}
                                    label="Room"
                                    iconClass="bg-indigo-500/10 text-indigo-500"
                                    value={
                                        livekit?.room_name ??
                                        'Will be created by server'
                                    }
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <div
                                    className={`flex h-5 w-5 items-center justify-center rounded-md ${hasJoinPermission ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}
                                >
                                    <CheckCircle2
                                        className={`h-3 w-3 ${hasJoinPermission ? 'text-emerald-500' : 'text-amber-500'}`}
                                    />
                                </div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Privacy and Consent
                                </p>
                            </div>

                            {hasJoinPermission ? (
                                <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="font-semibold">
                                        {isAdminUser
                                            ? 'Admin audit mode ready'
                                            : 'Consent confirmed'}
                                    </span>
                                    {consent?.confirmed_at && !isAdminUser && (
                                        <span className="ml-auto opacity-60">
                                            {new Date(
                                                consent.confirmed_at,
                                            ).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="font-medium">
                                        Consent required before joining.
                                    </span>
                                </div>
                            )}

                            <ul className="mb-3 space-y-1.5 text-xs text-muted-foreground">
                                {[
                                    'Telemedicine consent',
                                    'Data Privacy Act notice',
                                    'Identity Guard verification',
                                ].map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center gap-2"
                                    >
                                        <CheckCircle2
                                            className={[
                                                'h-3 w-3 shrink-0',
                                                hasJoinPermission
                                                    ? 'text-emerald-500'
                                                    : 'text-muted-foreground/30',
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
                                    checked={hasJoinPermission}
                                    disabled
                                />
                                <Label
                                    htmlFor="lobby-consent-check"
                                    className="cursor-not-allowed text-xs leading-snug"
                                >
                                    {isAdminUser
                                        ? 'Audit access enabled for admin'
                                        : 'I agree to the Privacy Notice and Consent'}
                                </Label>
                            </div>
                        </div>

                        {isPaused && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
                                <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
                                    Consultation Paused
                                </p>

                                {isCurrentUserVerificationTarget ? (
                                    <>
                                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                                            Your identity must be verified
                                            before you can rejoin. Enter the OTP
                                            sent to your email.
                                        </p>

                                        <form
                                            className="mt-3 flex flex-col gap-2"
                                            onSubmit={handleVerifyOtp}
                                        >
                                            <Input
                                                value={otpCode}
                                                onChange={(
                                                    event: ChangeEvent<HTMLInputElement>,
                                                ) =>
                                                    setOtpCode(
                                                        event.target.value,
                                                    )
                                                }
                                                inputMode="numeric"
                                                maxLength={otpLength}
                                                placeholder={`Enter ${otpLength}-digit OTP`}
                                            />
                                            <Button
                                                type="submit"
                                                disabled={
                                                    isSubmittingOtp ||
                                                    otpCode.trim().length !==
                                                        otpLength
                                                }
                                                className="w-full"
                                            >
                                                {isSubmittingOtp
                                                    ? 'Verifying...'
                                                    : 'Verify Identity'}
                                            </Button>
                                        </form>

                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    isResendingOtp ||
                                                    resendInSeconds > 0
                                                }
                                                onClick={handleResendOtp}
                                            >
                                                {resendInSeconds > 0
                                                    ? `Resend in ${formatCountdown(resendInSeconds)}`
                                                    : isResendingOtp
                                                      ? 'Sending...'
                                                      : 'Resend OTP'}
                                            </Button>
                                            {expiresInSeconds > 0 && (
                                                <span className="text-[11px] text-amber-700 dark:text-amber-300">
                                                    Expires in{' '}
                                                    {formatCountdown(
                                                        expiresInSeconds,
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                                        Consultation is paused while the{' '}
                                        {verificationTargetRole} completes
                                        identity verification.
                                    </p>
                                )}
                            </div>
                        )}

                        {connectState === 'error' && connectError && (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm dark:border-rose-800 dark:bg-rose-950/40">
                                <p className="text-xs font-semibold tracking-wider text-rose-700 uppercase dark:text-rose-300">
                                    Connection Error
                                </p>
                                <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                                    {connectError}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <Button
                                className="w-full gap-2 bg-linear-to-r from-primary to-primary/80 shadow-md shadow-primary/25 transition-shadow hover:shadow-primary/40"
                                onClick={() => {
                                    void handleJoinCall();
                                }}
                                disabled={
                                    !canJoinSession ||
                                    !isLiveKitEnabled ||
                                    connectState === 'connecting'
                                }
                            >
                                {connectState === 'connecting' ? (
                                    <>
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Video className="h-4 w-4" />
                                        {connectState === 'connected'
                                            ? 'Reconnect Session'
                                            : 'Join Call'}
                                    </>
                                )}
                            </Button>

                            {!hasJoinPermission && (
                                <p className="text-center text-xs text-muted-foreground">
                                    Complete consent to enable joining.
                                </p>
                            )}

                            {hasJoinPermission && isPaused && (
                                <p className="text-center text-xs text-muted-foreground">
                                    Joining is disabled until identity
                                    verification is completed.
                                </p>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full shadow-xs"
                                asChild
                            >
                                <Link
                                    href={ConsultationConsentController.show.url(
                                        consultation.id,
                                    )}
                                >
                                    View Full Consent
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={deviceTestOpen} onOpenChange={setDeviceTestOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Device Test</DialogTitle>
                        <DialogDescription>
                            Camera and microphone test automation will be added
                            in the next slice.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
