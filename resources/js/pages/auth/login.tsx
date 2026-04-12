import { Head } from '@inertiajs/react';
import { ArrowLeft, Camera, Zap } from 'lucide-react';
import { useState } from 'react';
import CameraPreviewPanel from '@/components/facial-recognition/camera-preview-panel';
import FaceScanStatus from '@/components/facial-recognition/face-scan-status';
import DataPrivacyNoticeDialog from '@/components/data-privacy-notice-dialog';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import TelemedicineLoginLayout from '@/layouts/auth/telemedicine-login-layout';
import { register } from '@/routes';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

type RecognitionStatus =
    | 'idle'
    | 'requesting_camera'
    | 'camera_ready'
    | 'scanning'
    | 'success'
    | 'permission_denied';

export default function Login({
    canResetPassword,
    canRegister,
}: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Serial Recognition State
    const [isFaceLogin, setIsFaceLogin] = useState(false);
    const [status, setStatus] = useState<RecognitionStatus>('idle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [faceErrorMessage, setFaceErrorMessage] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    /**
     * Handle Start Camera button click
     * Initializes the camera stream
     */
    const handleStartCamera = async () => {
        setIsCameraOpen(true);
        setIsProcessing(true);
        setFaceErrorMessage('');
        setStatus('requesting_camera');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            setMediaStream(stream);
            setStatus('camera_ready');
        } catch (error) {
            console.error('Camera access error:', error);
            setStatus('permission_denied');
            setFaceErrorMessage(
                'Unable to access camera. Please check your browser permissions and ensure no other app is using the camera.'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Handle Scan Face button click
     * UI-only placeholder until model integration is available
     */
    const handleScanFace = async () => {
        if (status !== 'camera_ready') return;

        setIsProcessing(true);
        setFaceErrorMessage('');
        setStatus('scanning');

        try {
            await new Promise((resolve) => setTimeout(resolve, 800));
            setStatus('camera_ready');
            setFaceErrorMessage(
                'Facial recognition model is not integrated yet. UI is ready for backend/model hookup.'
            );
        } catch {
            setStatus('camera_ready');
            setFaceErrorMessage('Unable to continue scan. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Handle Stop Camera button click
     * Stops the camera stream and closes the dialog
     */
    const handleStopCamera = () => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
        setStatus('idle');
        setFaceErrorMessage('');
        setIsCameraOpen(false);
    };

    const isCameraReady = status === 'camera_ready';
    const isPermissionDenied = status === 'permission_denied';

    /**
     * Handle email/password login start.
     * Submits to email-login-start endpoint to validate credentials and receive OTP.
     */
    const handleEmailLoginStart = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setEmailError('');
        setPasswordError('');
        setGeneralError('');

        if (!email || !password) {
            if (!email) setEmailError('Email is required');
            if (!password) setPasswordError('Password is required');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/auth/email-login-start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN':
                        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    remember: false,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.errors) {
                    if (data.errors.email) {
                        setEmailError(Array.isArray(data.errors.email) ? data.errors.email[0] : data.errors.email);
                    }
                    if (data.errors.password) {
                        setPasswordError(Array.isArray(data.errors.password) ? data.errors.password[0] : data.errors.password);
                    }
                } else {
                    setGeneralError(data.message || 'Login failed. Please try again.');
                }

                setIsSubmitting(false);
                return;
            }

            if (data.success) {
                if (data.requires_otp) {
                    window.location.href = data.redirect_url || '/auth/verify-otp';
                    return;
                }

                window.location.href = data.redirect_url || '/dashboard';
                return;
            }

            setGeneralError(data.message || 'An unexpected error occurred. Please try again.');
            setIsSubmitting(false);
        } catch (error) {
            console.error('Login error:', error);
            setGeneralError('An error occurred during login. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <TelemedicineLoginLayout
            title={isFaceLogin ? "Face Authentication" : "AMPING Telekonsulta"}
            subtitle={isFaceLogin ? "Secure facial recognition login" : "Secure access for doctors and patients"}
        >
            <Head title={isFaceLogin ? "Face Login" : "Log in"} />

            <DataPrivacyNoticeDialog />

            <div className="relative w-full overflow-hidden">
                <div
                    className={`w-full transform transition-all duration-500 ease-in-out ${isFaceLogin
                        ? 'pointer-events-none absolute inset-0 -translate-x-full opacity-0'
                        : 'relative translate-x-0 opacity-100'
                        }`}
                >
                    {/* General Authentication Error */}
                    {generalError && (
                        <div className="mb-4 rounded-lg border border-red-200/50 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                            {generalError}
                        </div>
                    )}

                    <form
                        onSubmit={handleEmailLoginStart}
                        className="flex flex-col gap-6"
                    >
                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">
                                Email address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                disabled={isSubmitting}
                                autoComplete="email"
                                placeholder="your.email@example.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailError('');
                                    setGeneralError('');
                                }}
                                className="h-10 border-gray-300 transition-colors duration-200 focus:border-emerald-500 focus:ring-emerald-500"
                                aria-invalid={!!emailError}
                            />
                            <InputError message={emailError} />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    Password
                                </Label>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-xs font-medium text-emerald-600 no-underline hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                                    >
                                        Forgot password?
                                    </TextLink>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    disabled={isSubmitting}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setPasswordError('');
                                        setGeneralError('');
                                    }}
                                    className="h-10 pr-10 border-gray-300 transition-colors duration-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    aria-invalid={!!passwordError}
                                />
                                {/* Show/Hide Password Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isSubmitting}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                    aria-label={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                >
                                    {showPassword ? (
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <InputError message={passwordError} />
                        </div>

                        {/* Primary Sign In Button */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-10 w-full bg-emerald-600 font-semibold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                            data-test="login-button"
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        {/* Divider */}
                        <div className="relative">
                            <Separator className="bg-border" />
                            <div className="relative flex justify-center -top-3">
                                <span className="bg-card px-2 text-xs font-medium text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        {/* Facial Recognition Button */}
                        <Button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setIsFaceLogin(true)}
                            className="h-10 w-full border-emerald-200 bg-emerald-50 font-medium text-emerald-700 transition-all duration-200 hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                            variant="outline"
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            <span>Login with Facial Recognition</span>
                        </Button>

                        {/* Sign Up Link */}
                        {canRegister && (
                            <div className="border-t border-gray-200 pt-4 text-center text-sm dark:border-gray-800">
                                <span className="text-muted-foreground">
                                    Don't have an account?{' '}
                                    <TextLink
                                        href={register()}
                                        className="font-semibold text-emerald-600 no-underline hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                                    >
                                        Create one now
                                    </TextLink>
                                </span>
                            </div>
                        )}
                    </form>
                </div>

                <div
                    className={`w-full transform transition-all duration-500 ease-in-out ${isFaceLogin
                        ? 'relative translate-x-0 opacity-100'
                        : 'pointer-events-none absolute inset-0 translate-x-full opacity-0'
                        }`}
                >
                    <div className="space-y-4 px-1">
                        <div className="flex items-center justify-between border-b border-border pb-1">
                            <h3 className="text-lg font-semibold text-foreground">Face Login</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsFaceLogin(false);
                                    handleStopCamera();
                                }}
                                className="h-8 text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                                Back
                            </Button>
                        </div>

                        {/* Camera Dialog */}
                        <Dialog open={isCameraOpen} onOpenChange={(open) => !open && handleStopCamera()}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Face Verification</DialogTitle>
                                    <DialogDescription>
                                        Position your face in the frame to verify your identity.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-2">
                                    {/* Error Message inside Dialog */}
                                    {faceErrorMessage && (
                                        <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                            {faceErrorMessage}
                                        </div>
                                    )}

                                    <div className="rounded-lg overflow-hidden border border-border bg-black/5 aspect-video relative shadow-inner">
                                        <CameraPreviewPanel status={status} stream={mediaStream} />
                                    </div>
                                    <FaceScanStatus status={status} />
                                </div>

                                <DialogFooter className="flex-col sm:flex-row gap-2">
                                    <Button
                                        onClick={handleStopCamera}
                                        variant="outline"
                                        disabled={isProcessing}
                                        className="w-full sm:w-auto"
                                    >
                                        Cancel
                                    </Button>

                                    {!isPermissionDenied && (
                                        <Button
                                            onClick={handleScanFace}
                                            disabled={!isCameraReady || isProcessing}
                                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Spinner className="mr-2 h-4 w-4" />
                                                    Scanning...
                                                </>
                                            ) : (
                                                'Scan Face'
                                            )}
                                        </Button>
                                    )}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Main Sidebar Content (Always visible) */}
                        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-6 text-center dark:border-emerald-900/30 dark:bg-emerald-900/10">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 shadow-sm dark:bg-emerald-900/30">
                                <Camera className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="mb-1 text-base font-semibold text-foreground">Face Authentication</h3>
                            <p className="mx-auto mb-4 max-w-50 text-xs text-muted-foreground">
                                Click the button below to open the camera and verify your identity securely.
                            </p>

                            <Button
                                onClick={handleStartCamera}
                                className="w-full bg-emerald-600 font-medium text-white shadow-md hover:bg-emerald-700"
                                size="lg"
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                Start Camera
                            </Button>
                        </div>

                        {/* Instructions */}
                        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                            <p className="mb-2 flex items-center font-medium text-foreground">
                                <Zap className="h-3 w-3 mr-1 text-amber-500" />
                                Tips for success:
                            </p>
                            <ul className="space-y-1 pl-1">
                                <li className="flex gap-2">
                                    <span className="block h-1.5 w-1.5 mt-1 rounded-full bg-muted-foreground/40" />
                                    <span>Position your face clearly within the frame</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="block h-1.5 w-1.5 mt-1 rounded-full bg-muted-foreground/40" />
                                    <span>Ensure you are in a well-lit environment</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="block h-1.5 w-1.5 mt-1 rounded-full bg-muted-foreground/40" />
                                    <span>Remove accessories like sunglasses or masks</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </TelemedicineLoginLayout>
    );
}
