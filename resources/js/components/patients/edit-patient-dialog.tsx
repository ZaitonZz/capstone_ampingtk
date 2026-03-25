import { Camera, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
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
import { update as updatePatient } from '@/actions/App/Http/Controllers/PatientController';
import type { Patient } from '@/types/patient';

type EditPatientDialogProps = {
    patient: Patient | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export default function EditPatientDialog({
    patient,
    open,
    onOpenChange,
    onSuccess,
}: EditPatientDialogProps) {
    const { success, error } = useToast();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [gender, setGender] = useState('');
    const [cameraOn, setCameraOn] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [newProfilePhoto, setNewProfilePhoto] = useState<File | null>(null);
    const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        middle_name: '',
        date_of_birth: '',
    });

    useEffect(() => {
        if (patient) {
            // Format date_of_birth to YYYY-MM-DD for date input
            let formattedDate = '';
            if (patient.date_of_birth) {
                // If already in YYYY-MM-DD format, use it directly
                if (
                    typeof patient.date_of_birth === 'string' &&
                    /^\d{4}-\d{2}-\d{2}$/.test(patient.date_of_birth)
                ) {
                    formattedDate = patient.date_of_birth;
                } else {
                    // Otherwise, try to parse and format it
                    const date = new Date(patient.date_of_birth);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toISOString().split('T')[0];
                    }
                }
            }

            setFormData({
                first_name: patient.first_name || '',
                last_name: patient.last_name || '',
                middle_name: patient.middle_name || '',
                date_of_birth: formattedDate,
            });
            setGender(patient.gender || '');
            setNewProfilePhoto(null);
            setCapturedPhotoUrl(null);
            setCameraError(null);
            setCameraOn(false);
        }
    }, [patient]);

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
        return () => {
            if (capturedPhotoUrl) {
                URL.revokeObjectURL(capturedPhotoUrl);
            }
        };
    }, [capturedPhotoUrl]);

    const handleChoosePhoto = () => {
        setCameraOn(false);
        fileInputRef.current?.click();
    };

    const handlePhotoSelected = (file: File | null) => {
        if (capturedPhotoUrl) {
            URL.revokeObjectURL(capturedPhotoUrl);
        }

        if (!file) {
            setNewProfilePhoto(null);
            setCapturedPhotoUrl(null);
            return;
        }

        setNewProfilePhoto(file);
        setCapturedPhotoUrl(URL.createObjectURL(file));
    };

    const handleRetake = () => {
        setCameraError(null);
        handlePhotoSelected(null);
        setCameraOn(true);
    };

    const handleRemovePendingPhoto = () => {
        setCameraOn(false);
        setCameraError(null);
        handlePhotoSelected(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const capturePhoto = async () => {
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

        handlePhotoSelected(file);
        setCameraOn(false);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!patient) return;

        setProcessing(true);
        setErrors({});

        const data = {
            ...formData,
            gender,
        };

        try {
            const csrfElement = document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement;
            const csrfToken = csrfElement?.content || '';

            if (!csrfToken) {
                console.error('CSRF token not found in meta tag');
                error('Security token missing - page may need to be refreshed');
                return;
            }

            let response: Response;

            if (newProfilePhoto) {
                const multipartData = new FormData();
                multipartData.append('_method', 'PATCH');
                multipartData.append('first_name', data.first_name);
                multipartData.append('last_name', data.last_name);
                multipartData.append('middle_name', data.middle_name);
                multipartData.append('date_of_birth', data.date_of_birth);
                multipartData.append('gender', data.gender);
                multipartData.append('profile_photo', newProfilePhoto);

                response = await fetch(updatePatient.url(patient.id), {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: multipartData,
                    credentials: 'same-origin',
                });
            } else {
                response = await fetch(updatePatient.url(patient.id), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify(data),
                    credentials: 'same-origin',
                });
            }

            const responseText = await response.text();

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse response as JSON:', parseError);
                error('Invalid response from server');
                return;
            }

            if (!response.ok) {
                if (responseData.errors) {
                    const formattedErrors: Record<string, string> = {};
                    Object.entries(responseData.errors).forEach(
                        ([key, value]) => {
                            formattedErrors[key] = Array.isArray(value)
                                ? value[0]
                                : (value as string);
                        },
                    );
                    setErrors(formattedErrors);
                    error('Please check the form for errors');
                } else {
                    error(responseData.message || 'Failed to update patient');
                }
                return;
            }

            success('Patient updated successfully!');
            onOpenChange(false);
            onSuccess();
        } catch (err) {
            console.error('Fetch error:', err);
            error(
                `An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`,
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setErrors({});
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogTitle>Edit Patient</DialogTitle>
                <DialogDescription>
                    Update patient information.
                </DialogDescription>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit_first_name">
                                First Name{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_first_name"
                                value={formData.first_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        first_name: e.target.value,
                                    })
                                }
                                required
                                maxLength={100}
                            />
                            <InputError message={errors.first_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_last_name">
                                Last Name{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_last_name"
                                value={formData.last_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        last_name: e.target.value,
                                    })
                                }
                                required
                                maxLength={100}
                            />
                            <InputError message={errors.last_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_middle_name">
                                Middle Name
                            </Label>
                            <Input
                                id="edit_middle_name"
                                value={formData.middle_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        middle_name: e.target.value,
                                    })
                                }
                                maxLength={100}
                            />
                            <InputError message={errors.middle_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_date_of_birth">
                                Date of Birth{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_date_of_birth"
                                value={formData.date_of_birth}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        date_of_birth: e.target.value,
                                    })
                                }
                                type="date"
                                required
                            />
                            <InputError message={errors.date_of_birth} />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="edit_gender">
                                Sex <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={gender}
                                onValueChange={setGender}
                                required
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

                        <div className="space-y-3 sm:col-span-2">
                            <Label>Profile Photo</Label>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleChoosePhoto}
                                >
                                    <Upload className="h-4 w-4" />
                                    Update Profile Photo
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRetake}
                                >
                                    <Camera className="h-4 w-4" />
                                    Retake Profile Photo
                                </Button>
                                {newProfilePhoto && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleRemovePendingPhoto}
                                    >
                                        Remove New Photo
                                    </Button>
                                )}
                            </div>

                            <Input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0] ?? null;
                                    handlePhotoSelected(file);
                                }}
                            />

                            {cameraOn && (
                                <div className="space-y-3">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        onLoadedData={() => setIsVideoReady(true)}
                                        className="h-full min-h-64 w-full rounded-md border border-input bg-black object-cover"
                                    />
                                    {!isVideoReady && (
                                        <p className="text-sm text-muted-foreground">
                                            Starting camera…
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => void capturePhoto()}
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
                                <img
                                    src={capturedPhotoUrl}
                                    alt="Updated profile preview"
                                    className="h-40 w-40 rounded-md border border-input object-cover"
                                />
                            )}

                            {!capturedPhotoUrl && patient?.profile_photo_url && (
                                <img
                                    src={patient.profile_photo_url}
                                    alt="Current profile"
                                    className="h-40 w-40 rounded-md border border-input object-cover"
                                />
                            )}

                            <canvas ref={canvasRef} className="hidden" />
                            <InputError message={cameraError ?? undefined} />
                            <InputError message={errors.profile_photo} />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
