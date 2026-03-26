import { useEffect, useRef } from 'react';

type CameraPreviewPanelProps = {
    status: string;
    stream?: MediaStream | null;
};

export default function CameraPreviewPanel({ status, stream }: CameraPreviewPanelProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const isScanning = status === 'scanning';
    // const isSuccess = status === 'success'; 
    // const isFailed = status === 'failed' || status === 'no_face_detected' || status === 'multiple_faces_detected';
    const isActive = status === 'camera_ready' || isScanning;

    // Determine if we should show the video feed
    const showVideo = !!stream;

    return (
        <div className="relative h-full w-full bg-black">
            {/* Video Feed */}
            {showVideo && (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                />
            )}

            {/* Placeholder / Loading State */}
            {!showVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-gray-400">
                        {status === 'requesting_camera' ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
                                <span className="text-sm">Accessing camera...</span>
                            </div>
                        ) : (
                            <span className="text-sm">Camera preview</span>
                        )}
                    </div>
                </div>
            )}

            {/* Scan Overlay Effect */}
            {isScanning && (
                <div className="absolute inset-0 z-10 bg-emerald-500/10">
                    <div className="absolute top-0 h-1 w-full animate-[scan_2s_ease-in-out_infinite] bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"></div>
                </div>
            )}

            {/* Grid Overlay for "Techi" feel */}
            <svg
                className="absolute inset-0 h-full w-full opacity-20 pointer-events-none"
                preserveAspectRatio="none"
            >
                <defs>
                    <pattern
                        id="grid"
                        width="40"
                        height="40"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M 40 0 L 0 0 0 40"
                            fill="none"
                            stroke="white"
                            strokeWidth="0.5"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        </div>
    );
}
