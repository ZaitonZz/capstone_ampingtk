import { Head, useForm, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import * as PatientController from '@/actions/App/Http/Controllers/PatientController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Patients', href: PatientController.index.url() },
    { title: 'Create Patient', href: PatientController.create.url() },
];

export default function PatientCreate() {
    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        address: '',
        profile_photo: null as File | null,
        gender: 'other',
    });

    const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let cancelled = false;

        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraError('Webcam is not supported on this browser.');
                setCameraOn(false);
                return;
            }

            try {
                setCameraError(null);
                setIsVideoReady(false);

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });

                if (cancelled || !cameraOn) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                if (error instanceof DOMException) {
                    if (error.name === 'NotAllowedError') {
                        setCameraError('Camera permission denied. Please allow webcam access.');
                    } else if (error.name === 'NotFoundError') {
                        setCameraError('No camera device found.');
                    } else {
                        setCameraError('Camera unavailable.');
                    }
                } else {
                    setCameraError('Camera unavailable.');
                }
            }
        };

        const stopCamera = () => {
            cancelled = true;

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }

            setIsVideoReady(false);
        };

        if (cameraOn) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [cameraOn]);

    async function capturePhoto() {
        if (!videoRef.current || !canvasRef.current) {
            return;
        }

        const canvas = canvasRef.current;
        const video = videoRef.current;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/png');
        });

        if (!blob) {
            setCameraError('Failed to capture image. Please try again.');
            return;
        }

        const file = new File([blob], `patient-profile-${Date.now()}.png`, {
            type: 'image/png',
        });

        if (capturedPhotoUrl) {
            URL.revokeObjectURL(capturedPhotoUrl);
        }

        setData('profile_photo', file);
        setCapturedPhotoUrl(URL.createObjectURL(file));
        setCameraOn(false);
    }

    function retakePhoto() {
        if (capturedPhotoUrl) {
            URL.revokeObjectURL(capturedPhotoUrl);
        }

        setCapturedPhotoUrl(null);
        setData('profile_photo', null);
        setCameraError(null);
        setCameraOn(true);
    }

    useEffect(() => {
        return () => {
            setCameraOn(false);
            if (capturedPhotoUrl) {
                URL.revokeObjectURL(capturedPhotoUrl);
            }
        };
    }, [capturedPhotoUrl]);

    function submit(e: FormEvent) {
        e.preventDefault();

        post(PatientController.store.url(), {
            forceFormData: true,
            onError: () => {
                toast.error('Please fix the errors and try again.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Patient" />

            <div className="mx-auto max-w-6xl p-4 md:p-6">
                <h1 className="mb-2 text-3xl font-semibold">Create New Patient</h1>
                <p className="mb-6 text-muted-foreground">
                    A patient account is automatically generated after record creation.
                </p>

                <form onSubmit={submit} className="space-y-8">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="first_name">First Name</Label>
                            <Input
                                id="first_name"
                                value={data.first_name}
                                onChange={(e) => setData('first_name', e.target.value)}
                            />
                            {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input
                                id="last_name"
                                value={data.last_name}
                                onChange={(e) => setData('last_name', e.target.value)}
                            />
                            {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                            />
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="date_of_birth">Date of Birth</Label>
                            <Input
                                id="date_of_birth"
                                type="date"
                                value={data.date_of_birth}
                                onChange={(e) => setData('date_of_birth', e.target.value)}
                            />
                            {errors.date_of_birth && <p className="text-sm text-destructive">{errors.date_of_birth}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <textarea
                                id="address"
                                rows={3}
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                            {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <Label>Profile Photo (Webcam)</Label>

                            {!cameraOn && !capturedPhotoUrl && (
                                <Button type="button" variant="outline" onClick={() => setCameraOn(true)}>
                                    Open Webcam
                                </Button>
                            )}

                            {cameraOn && (
                                <div className="space-y-3">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        onLoadedData={() => setIsVideoReady(true)}
                                        className="h-105 w-full max-w-4xl rounded-md border border-input bg-black object-cover"
                                    />
                                    {!isVideoReady && (
                                        <p className="text-sm text-muted-foreground">Starting camera…</p>
                                    )}
                                    <div className="flex gap-2">
                                        <Button type="button" onClick={() => void capturePhoto()} disabled={!isVideoReady}>
                                            Capture Photo
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setCameraOn(false)}>
                                            Close Webcam
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {capturedPhotoUrl && (
                                <div className="space-y-3">
                                    <img
                                        src={capturedPhotoUrl}
                                        alt="Profile preview"
                                        className="h-32 w-32 rounded-md border border-input object-cover"
                                    />
                                    <Button type="button" variant="outline" onClick={retakePhoto}>
                                        Retake Photo
                                    </Button>
                                </div>
                            )}

                            <canvas ref={canvasRef} className="hidden" />

                            {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
                            {errors.profile_photo && <p className="text-sm text-destructive">{errors.profile_photo}</p>}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating…' : 'Create Patient'}
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={PatientController.index.url()}>
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
