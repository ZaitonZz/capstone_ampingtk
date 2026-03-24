import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import CameraPreviewPanel from '@/components/facial-recognition/camera-preview-panel';
import FaceScanStatus from '@/components/facial-recognition/face-scan-status';
import RecognitionInstructions from '@/components/facial-recognition/recognition-instructions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import TextLink from '@/components/text-link';
import { ArrowLeft, Camera, RotateCcw, Zap } from 'lucide-react';

type FacialRecognitionProps = {
    canFallback?: boolean;
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

export default function FacialRecognition({
    canFallback = true,
}: FacialRecognitionProps) {
    const [status, setStatus] = useState<RecognitionStatus>('idle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    /**
     * Handle Start Camera button click
     * Simulates camera initialization with mock data
     */
    const handleStartCamera = async () => {
        setIsProcessing(true);
        setErrorMessage('');
        setStatus('requesting_camera');

        try {
            // Simulate camera initialization delay
            await new Promise((resolve) => setTimeout(resolve, 800));
            setStatus('camera_ready');
        } catch {
            setStatus('permission_denied');
            setErrorMessage(
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
        setErrorMessage('');
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
                setErrorMessage(
                    'No face detected. Please position your face in the frame and try again.'
                );
            } else {
                setStatus('multiple_faces_detected');
                setErrorMessage(
                    'Multiple faces detected. Please ensure only one face is visible.'
                );
            }
        } catch {
            setStatus('failed');
            setErrorMessage('Facial recognition failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Handle Stop Camera button click
     */
    const handleStopCamera = () => {
        setStatus('idle');
        setErrorMessage('');
    };

    /**
     * Handle Retry button click
     */
    const handleRetry = () => {
        setStatus('idle');
        setErrorMessage('');
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

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Head title="Facial Recognition Login" />

            {/* Header */}
            <div className="border-b border-border bg-card px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <AppLogoIcon className="h-10 w-auto" />
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                AMPING Telekonsulta
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Facial Recognition Login
                            </p>
                        </div>
                    </div>
                    <Link href="/login">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl space-y-8">
                    {/* Title Section */}
                    <div className="space-y-2 text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">
                            Secure Face Authentication
                        </h2>
                        <p className="text-base text-muted-foreground">
                            Use facial recognition for quick and secure login
                        </p>
                    </div>

                    {/* Main Card */}
                    <div className="space-y-8 rounded-xl border border-emerald-200/30 bg-card p-8 shadow-lg dark:border-emerald-900/30">
                        {/* Error Message */}
                        {errorMessage && (
                            <div className="rounded-lg border border-red-200/50 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                                {errorMessage}
                            </div>
                        )}

                        {/* Camera Preview */}
                        <div>
                            <label className="mb-4 block text-sm font-semibold text-foreground">
                                Camera Preview
                            </label>
                            <CameraPreviewPanel status={status} />
                        </div>

                        {/* Status Indicator */}
                        <FaceScanStatus status={status} />

                        {/* Divider */}
                        <Separator />

                        {/* Controls Section */}
                        <div className="space-y-4">
                            {!isActive ? (
                                <>
                                    <Button
                                        onClick={handleStartCamera}
                                        disabled={isProcessing || isSuccess}
                                        className="h-11 w-full bg-emerald-600 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Spinner className="mr-2 h-4 w-4" />
                                                Initializing...
                                            </>
                                        ) : (
                                            <>
                                                <Camera className="mr-2 h-4 w-4" />
                                                Start Camera
                                            </>
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        onClick={handleScanFace}
                                        disabled={
                                            isProcessing ||
                                            isSuccess ||
                                            !isCameraReady
                                        }
                                        className="h-11 w-full bg-emerald-600 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Spinner className="mr-2 h-4 w-4" />
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="mr-2 h-4 w-4" />
                                                Scan Face
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleStopCamera}
                                        disabled={isProcessing}
                                        variant="outline"
                                        className="h-11 w-full"
                                    >
                                        Stop Camera
                                    </Button>
                                </>
                            )}

                            {isSuccess && (
                                <Button
                                    onClick={handleRetry}
                                    className="h-11 w-full bg-emerald-600 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                >
                                    Continue
                                </Button>
                            )}

                            {isFailed && (
                                <Button
                                    onClick={handleRetry}
                                    variant="outline"
                                    className="h-11 w-full"
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Try Again
                                </Button>
                            )}
                        </div>

                        {/* Instructions */}
                        <RecognitionInstructions status={status} />
                    </div>

                    {/* Fallback Option */}
                    {canFallback && (
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                                Having trouble?{' '}
                                <TextLink
                                    href="/login"
                                    className="font-medium text-emerald-600 hover:text-emerald-700 no-underline dark:text-emerald-500 dark:hover:text-emerald-400"
                                >
                                    Use email and password instead
                                </TextLink>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-card px-4 py-6 text-center sm:px-6 lg:px-8">
                <p className="text-xs text-muted-foreground">
                    Your privacy is protected. We never store facial images on our servers.
                </p>
            </div>
        </div>
    );
}
