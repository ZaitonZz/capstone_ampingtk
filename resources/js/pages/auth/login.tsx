import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import TelemedicineLoginLayout from '@/layouts/auth/telemedicine-login-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import CameraPreviewPanel from '@/components/facial-recognition/camera-preview-panel';
import FaceScanStatus from '@/components/facial-recognition/face-scan-status';
import RecognitionInstructions from '@/components/facial-recognition/recognition-instructions';
import { ArrowLeft, Camera, RotateCcw, Zap } from 'lucide-react';

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
    | 'failed'
    | 'no_face_detected'
    | 'multiple_faces_detected'
    | 'permission_denied';

export default function Login({
    canResetPassword,
    canRegister,
}: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [otpRequired, setOtpRequired] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    // Serial Recognition State
    const [isFaceLogin, setIsFaceLogin] = useState(false);
    const [status, setStatus] = useState<RecognitionStatus>('idle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [faceErrorMessage, setFaceErrorMessage] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    /**
     * Handle facial recognition login
     * Toggles to facial recognition view
     */
    const handleFacialRecognitionLogin = () => {
        setIsFaceLogin(true);
    };

    /**
     * Handle Start Camera button click
     * Simulates camera initialization with mock data
     */
    const handleStartCamera = async () => {
        setIsCameraOpen(true);
        setIsProcessing(true);
        setFaceErrorMessage('');
        setStatus('requesting_camera');

        try {
            // Simulate camera initialization delay
            await new Promise((resolve) => setTimeout(resolve, 800));
            setStatus('camera_ready');
        } catch {
            setStatus('permission_denied');
            setFaceErrorMessage(
                'Unable to access camera. Please check your browser permissions.'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Handle Scan Face button click
     * Simulates face detection scanning
     */
    const handleScanFace = async () => {
        if (status !== 'camera_ready') return;

        setIsProcessing(true);
        setFaceErrorMessage('');
        setStatus('scanning');

        try {
            // Simulate scanning delay
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Mock scenarios for demonstration
            const scenarios = [
                'success',
                'no_face_detected',
                'multiple_faces_detected',
            ];
            const randomScenario =
                scenarios[Math.floor(Math.random() * scenarios.length)];

            if (randomScenario === 'success') {
                setStatus('success');
                // In production, you would redirect to dashboard here
                // setTimeout(() => window.location.href = '/dashboard', 2000);
            } else if (randomScenario === 'no_face_detected') {
                setStatus('no_face_detected');
                setFaceErrorMessage(
                    'No face detected. Please position your face in the frame and try again.'
                );
            } else {
                setStatus('multiple_faces_detected');
                setFaceErrorMessage(
                    'Multiple faces detected. Please ensure only one face is visible.'
                );
            }
        } catch {
            setStatus('failed');
            setFaceErrorMessage('Facial recognition failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Handle Stop Camera button click
     */
    const handleStopCamera = () => {
        setStatus('idle');
        setFaceErrorMessage('');
        setIsCameraOpen(false);
    };

    /**
     * Handle Retry button click
     */
    const handleRetry = () => {
        setStatus('camera_ready');
        setFaceErrorMessage('');
    };

    const isIdle = status === 'idle';
    const isCameraReady = status === 'camera_ready';
    const isScanning = status === 'scanning';
    const isSuccess = status === 'success';
    const isFailed =
        status === 'failed' ||
        status === 'no_face_detected' ||
        status === 'multiple_faces_detected' ||
        status === 'permission_denied';
    const isActive = isCameraReady || isScanning;


    /**
     * Handle OTP verification
     * Future implementation: Will handle multi-factor authentication
     */
    const handleOtpSubmit = () => {
        // TODO: Implement OTP verification
        // 1. Validate OTP code
        // 2. Send verification request
        // 3. Complete login if valid
    };

    return (
        <TelemedicineLoginLayout
            title={isFaceLogin ? "Face Authentication" : "AMPING Telekonsulta"}
            subtitle={isFaceLogin ? "Secure facial recognition login" : "Secure access for doctors and patients"}
        >
            <Head title={isFaceLogin ? "Face Login" : "Log in"} />

            <div className="relative overflow-hidden w-full">
                <div
                    className={`flex w-[200%] transition-transform duration-500 ease-in-out ${isFaceLogin ? '-translate-x-1/2' : 'translate-x-0'
                        }`}
                >
                    {/* Left Section: Email Login */}
                    <div className="w-1/2 pr-1">
                        {/* General Authentication Error */}
                        {generalError && (
                            <div className="mb-4 rounded-lg border border-red-200/50 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                                {generalError}
                            </div>
                        )}

                        {otpRequired ? (
                            // OTP Verification Step (Future Feature)
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Enter verification code
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        A verification code has been sent to your registered email.
                                    </p>
                                    <Input
                                        type="text"
                                        placeholder="000000"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        className="h-10 font-mono text-center text-lg"
                                        maxLength={6}
                                    />
                                </div>
                                <Button
                                    onClick={handleOtpSubmit}
                                    className="h-10 w-full bg-emerald-600 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                >
                                    Verify Code
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setOtpRequired(false);
                                        setOtpCode('');
                                    }}
                                    className="h-10 w-full"
                                >
                                    Back to Login
                                </Button>
                            </div>
                        ) : (
                            <Form
                                {...store.form()}
                                resetOnSuccess={['password']}
                                className="flex flex-col gap-6"
                            >
                                {({ processing, errors }) => (
                                    <>
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
                                                disabled={processing}
                                                autoComplete="email"
                                                placeholder="your.email@example.com"
                                                className="h-10 border-gray-300 transition-colors duration-200 focus:border-emerald-500 focus:ring-emerald-500"
                                                aria-invalid={!!errors.email}
                                            />
                                            <InputError message={errors.email} />
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
                                                    disabled={processing}
                                                    autoComplete="current-password"
                                                    placeholder="••••••••"
                                                    className="h-10 pr-10 border-gray-300 transition-colors duration-200 focus:border-emerald-500 focus:ring-emerald-500"
                                                    aria-invalid={!!errors.password}
                                                />
                                                {/* Show/Hide Password Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    disabled={processing}
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
                                            <InputError message={errors.password} />
                                        </div>

                                        {/* Primary Sign In Button */}
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="h-10 w-full bg-emerald-600 font-semibold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                            data-test="login-button"
                                        >
                                            {processing ? (
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
                                            disabled={processing}
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
                                    </>
                                )}
                            </Form>
                        )}
                    </div>

                    {/* Right Section: Facial Recognition */}
                    <div className="w-1/2 ">
                        <div className="space-y-6 px-1">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
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
                                            <CameraPreviewPanel status={status} />
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

                                        {!isSuccess && !isFailed && (
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

                                        {isFailed && (
                                            <Button
                                                onClick={handleRetry}
                                                className="w-full sm:w-auto"
                                                variant="secondary"
                                            >
                                                Try Again
                                            </Button>
                                        )}

                                        {isSuccess && (
                                            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                                                Continue to Dashboard
                                            </Button>
                                        )}
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Main Sidebar Content (Always visible) */}
                            <div className="text-center py-10 px-4 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30">
                                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-emerald-900/30 shadow-sm">
                                    <Camera className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-base font-semibold text-foreground mb-1">Face Authentication</h3>
                                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mb-6">
                                    Click the button below to open the camera and verify your identity securely.
                                </p>

                                <Button
                                    onClick={handleStartCamera}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md"
                                    size="lg"
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    Start Camera
                                </Button>
                            </div>

                            {/* Instructions */}
                            <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border/50">
                                <p className="font-medium text-foreground mb-2 flex items-center">
                                    <Zap className="h-3 w-3 mr-1 text-amber-500" />
                                    Tips for success:
                                </p>
                                <ul className="space-y-1.5 pl-1">
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

                </div> {/* End Slide Container */}
            </div> {/* End Overflow Hide */}
        </TelemedicineLoginLayout>
    );
}
