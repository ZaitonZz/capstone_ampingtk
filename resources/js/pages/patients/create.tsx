import { Head, Link, useForm } from '@inertiajs/react';
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
        middle_name: '',
        date_of_birth: '',
        gender: 'other',
        civil_status: '',
        contact_number: '',
        address: '',
        blood_type: '',
        emergency_contact_name: '',
        emergency_contact_number: '',
        known_allergies: '',
        profile_photo: null as File | null,
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
            void startCamera();
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

    function createPatient(e: FormEvent) {
        e.preventDefault();

        post(PatientController.store.url(), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Patient created successfully.');
            },
            onError: () => {
                toast.error('Please fix the validation errors.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Patient" />

            <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
                <div>
                    <h1 className="text-3xl font-semibold">Create Patient</h1>
                    <p className="text-sm text-muted-foreground">
                        Fill all required fields, capture patient photo, then submit once.
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    <p className="mb-2 font-medium">Field rules</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        <li>Required: First Name, Last Name, Email, Gender, Profile Photo.</li>
                        <li>Date of Birth must be a valid date before today.</li>
                        <li>Email must be unique and valid.</li>
                        <li>Profile photo must be an image captured from webcam.</li>
                        <li>Optional text fields have max length validation from backend rules.</li>
                    </ul>
                </div>

                <form onSubmit={createPatient} className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name *</Label>
                                <Input
                                    id="first_name"
                                    value={data.first_name}
                                    onChange={(e) => setData('first_name', e.target.value)}
                                    maxLength={100}
                                />
                                <p className="text-xs text-muted-foreground">Max 100 characters.</p>
                                {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name *</Label>
                                <Input
                                    id="last_name"
                                    value={data.last_name}
                                    onChange={(e) => setData('last_name', e.target.value)}
                                    maxLength={100}
                                />
                                <p className="text-xs text-muted-foreground">Max 100 characters.</p>
                                {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="middle_name">Middle Name</Label>
                                <Input
                                    id="middle_name"
                                    value={data.middle_name}
                                    onChange={(e) => setData('middle_name', e.target.value)}
                                    maxLength={100}
                                />
                                {errors.middle_name && <p className="text-sm text-destructive">{errors.middle_name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_of_birth">Date of Birth</Label>
                                <Input
                                    id="date_of_birth"
                                    type="date"
                                    value={data.date_of_birth}
                                    onChange={(e) => setData('date_of_birth', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Must be before today.</p>
                                {errors.date_of_birth && <p className="text-sm text-destructive">{errors.date_of_birth}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    maxLength={191}
                                />
                                <p className="text-xs text-muted-foreground">Must be valid and unique.</p>
                                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    maxLength={30}
                                />
                                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact_number">Contact Number</Label>
                                <Input
                                    id="contact_number"
                                    value={data.contact_number}
                                    onChange={(e) => setData('contact_number', e.target.value)}
                                    maxLength={30}
                                />
                                {errors.contact_number && <p className="text-sm text-destructive">{errors.contact_number}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gender">Gender *</Label>
                                <select
                                    id="gender"
                                    value={data.gender}
                                    onChange={(e) => setData('gender', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="civil_status">Civil Status</Label>
                                <select
                                    id="civil_status"
                                    value={data.civil_status}
                                    onChange={(e) => setData('civil_status', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Select civil status</option>
                                    <option value="single">Single</option>
                                    <option value="married">Married</option>
                                    <option value="widowed">Widowed</option>
                                    <option value="separated">Separated</option>
                                </select>
                                {errors.civil_status && <p className="text-sm text-destructive">{errors.civil_status}</p>}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <textarea
                                    id="address"
                                    rows={3}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="blood_type">Blood Type</Label>
                                <Input
                                    id="blood_type"
                                    value={data.blood_type}
                                    onChange={(e) => setData('blood_type', e.target.value)}
                                    maxLength={5}
                                />
                                {errors.blood_type && <p className="text-sm text-destructive">{errors.blood_type}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                                <Input
                                    id="emergency_contact_name"
                                    value={data.emergency_contact_name}
                                    onChange={(e) => setData('emergency_contact_name', e.target.value)}
                                    maxLength={191}
                                />
                                {errors.emergency_contact_name && <p className="text-sm text-destructive">{errors.emergency_contact_name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                                <Input
                                    id="emergency_contact_number"
                                    value={data.emergency_contact_number}
                                    onChange={(e) => setData('emergency_contact_number', e.target.value)}
                                    maxLength={30}
                                />
                                {errors.emergency_contact_number && <p className="text-sm text-destructive">{errors.emergency_contact_number}</p>}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="known_allergies">Known Allergies</Label>
                                <textarea
                                    id="known_allergies"
                                    rows={3}
                                    value={data.known_allergies}
                                    onChange={(e) => setData('known_allergies', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {errors.known_allergies && <p className="text-sm text-destructive">{errors.known_allergies}</p>}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button type="submit" disabled={processing || !data.profile_photo}>
                                {processing ? 'Creating…' : 'Create Patient'}
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link href={PatientController.index.url()}>Cancel</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="lg:col-span-1 sticky top-6 h-fit space-y-3">
                        <Label>
                            Profile Photo (Webcam) *
                        </Label>

                        {!cameraOn && !capturedPhotoUrl && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCameraOn(true)}
                                className="w-full"
                            >
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
                                    className="h-full min-h-96 w-full rounded-md border border-input bg-black object-cover"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                                {!isVideoReady && (
                                    <p className="text-sm text-muted-foreground">Starting camera…</p>
                                )}
                                <div className="flex flex-col gap-2">
                                    <Button type="button" onClick={() => void capturePhoto()} disabled={!isVideoReady} className="w-full">
                                        Capture Photo
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setCameraOn(false)} className="w-full">
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
                                    className="h-full w-full rounded-md border border-input object-cover"
                                />
                                <Button type="button" variant="outline" onClick={retakePhoto} className="w-full">
                                    Retake Photo
                                </Button>
                            </div>
                        )}

                        <canvas ref={canvasRef} className="hidden" />

                        {!data.profile_photo && (
                            <p className="text-sm text-muted-foreground">
                                Capture a profile photo to continue.
                            </p>
                        )}

                        {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
                        {errors.profile_photo && <p className="text-sm text-destructive">{errors.profile_photo}</p>}
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
