import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import * as PatientController from '@/actions/App/Http/Controllers/PatientController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type AddPatientDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export default function AddPatientDialog({
    open,
    onOpenChange,
    onSuccess,
}: AddPatientDialogProps) {
    const { success, error } = useToast();
    const { data, setData, post, processing, errors, clearErrors, reset } =
        useForm({
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
            } catch (exception) {
                if (cancelled) {
                    return;
                }

                if (exception instanceof DOMException) {
                    if (exception.name === 'NotAllowedError') {
                        setCameraError('Camera permission denied. Please allow webcam access.');
                    } else if (exception.name === 'NotFoundError') {
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

    useEffect(() => {
        if (!open) {
            setCameraOn(false);
        }
    }, [open]);

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

    function resetCreateForm() {
        if (capturedPhotoUrl) {
            URL.revokeObjectURL(capturedPhotoUrl);
        }

        reset();
        clearErrors();
        setData('gender', 'other');
        setData('profile_photo', null);
        setCameraError(null);
        setCapturedPhotoUrl(null);
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

    function createPatient(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        post(PatientController.store.url(), {
            forceFormData: true,
            onSuccess: () => {
                success('Patient created successfully.');
                resetCreateForm();
                onOpenChange(false);
                onSuccess();
            },
            onError: () => {
                error('Please fix the errors and try again.');
            },
        });
    }

    // Reset form when dialog closes
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            resetCreateForm();
        }

        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="size-4" />
                    Create Patient
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
                <DialogTitle>Create Patient</DialogTitle>
                <DialogDescription>
                    Complete all patient details, including webcam photo, then submit once.
                </DialogDescription>

                <form onSubmit={createPatient} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">
                                First Name{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="first_name"
                                value={data.first_name}
                                onChange={(event) =>
                                    setData('first_name', event.target.value)
                                }
                                maxLength={100}
                            />
                            <InputError message={errors.first_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="last_name">
                                Last Name{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="last_name"
                                value={data.last_name}
                                onChange={(event) =>
                                    setData('last_name', event.target.value)
                                }
                                maxLength={100}
                            />
                            <InputError message={errors.last_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="middle_name">Middle Name</Label>
                            <Input
                                id="middle_name"
                                value={data.middle_name}
                                onChange={(event) =>
                                    setData('middle_name', event.target.value)
                                }
                                maxLength={100}
                            />
                            <InputError message={errors.middle_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date_of_birth">
                                Date of Birth{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="date_of_birth"
                                type="date"
                                value={data.date_of_birth}
                                onChange={(event) =>
                                    setData('date_of_birth', event.target.value)
                                }
                            />
                            <InputError message={errors.date_of_birth} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(event) =>
                                    setData('email', event.target.value)
                                }
                                maxLength={191}
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={data.phone}
                                onChange={(event) =>
                                    setData('phone', event.target.value)
                                }
                                maxLength={30}
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contact_number">Contact Number</Label>
                            <Input
                                id="contact_number"
                                value={data.contact_number}
                                onChange={(event) =>
                                    setData('contact_number', event.target.value)
                                }
                                maxLength={30}
                            />
                            <InputError message={errors.contact_number} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gender">
                                Sex <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={data.gender}
                                onValueChange={(value) => setData('gender', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select sex" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">
                                        Female
                                    </SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.gender} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="civil_status">Civil Status</Label>
                            <Select
                                value={data.civil_status}
                                onValueChange={(value) =>
                                    setData('civil_status', value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select civil status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="single">Single</SelectItem>
                                    <SelectItem value="married">Married</SelectItem>
                                    <SelectItem value="widowed">Widowed</SelectItem>
                                    <SelectItem value="separated">Separated</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.civil_status} />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <textarea
                                id="address"
                                rows={3}
                                value={data.address}
                                onChange={(event) =>
                                    setData('address', event.target.value)
                                }
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                            <InputError message={errors.address} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="blood_type">Blood Type</Label>
                            <Input
                                id="blood_type"
                                value={data.blood_type}
                                onChange={(event) =>
                                    setData('blood_type', event.target.value)
                                }
                                maxLength={5}
                            />
                            <InputError message={errors.blood_type} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="emergency_contact_name">
                                Emergency Contact Name
                            </Label>
                            <Input
                                id="emergency_contact_name"
                                value={data.emergency_contact_name}
                                onChange={(event) =>
                                    setData(
                                        'emergency_contact_name',
                                        event.target.value,
                                    )
                                }
                                maxLength={191}
                            />
                            <InputError
                                message={errors.emergency_contact_name}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="emergency_contact_number">
                                Emergency Contact Number
                            </Label>
                            <Input
                                id="emergency_contact_number"
                                value={data.emergency_contact_number}
                                onChange={(event) =>
                                    setData(
                                        'emergency_contact_number',
                                        event.target.value,
                                    )
                                }
                                maxLength={30}
                            />
                            <InputError
                                message={errors.emergency_contact_number}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="known_allergies">Known Allergies</Label>
                            <textarea
                                id="known_allergies"
                                rows={3}
                                value={data.known_allergies}
                                onChange={(event) =>
                                    setData('known_allergies', event.target.value)
                                }
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                            <InputError message={errors.known_allergies} />
                        </div>

                        <div className="space-y-3 md:col-span-2">
                            <Label>
                                Profile Photo (Webcam){' '}
                                <span className="text-destructive">*</span>
                            </Label>

                            {!cameraOn && !capturedPhotoUrl && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCameraOn(true)}
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
                                        className="h-80 w-full rounded-md border border-input bg-black object-cover"
                                    />
                                    {!isVideoReady && (
                                        <p className="text-sm text-muted-foreground">
                                            Starting camera…
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                void capturePhoto();
                                            }}
                                            disabled={!isVideoReady}
                                        >
                                            Capture Photo
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setCameraOn(false)}
                                        >
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
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={retakePhoto}
                                    >
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

                            {cameraError && (
                                <p className="text-sm text-destructive">
                                    {cameraError}
                                </p>
                            )}
                            <InputError message={errors.profile_photo} />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={processing || !data.profile_photo}
                        >
                            {processing ? 'Creating...' : 'Create Patient'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
