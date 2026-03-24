type CameraPreviewPanelProps = {
    status: string;
};

export default function CameraPreviewPanel({ status }: CameraPreviewPanelProps) {
    const isScanning = status === 'scanning';
    const isSuccess = status === 'success';
    const isFailed = status === 'failed' || status === 'no_face_detected' || status === 'multiple_faces_detected';
    const isActive = status === 'camera_ready' || isScanning;

    return (
        <div className="space-y-4">
            {/* Camera Preview Container */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-emerald-200/50 bg-gradient-to-br from-gray-900 to-gray-950 shadow-lg dark:border-emerald-900/30">
                {/* Mock Video Feed Background */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Placeholder content for future camera integration */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950" />

                    {/* Mock Camera Feed Pattern */}
                    <svg
                        className="absolute inset-0 h-full w-full opacity-5"
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

                    {/* Status-based Content */}
                    {!isActive && (
                        <div className="relative z-10 text-center">
                            <div className="h-12 w-12 rounded-full border-2 border-gray-600 mx-auto mb-3 opacity-50" />
                            <p className="text-sm text-gray-400">
                                Camera {status === 'requesting_camera' ? 'initializing' : 'inactive'}
                            </p>
                        </div>
                    )}

                    {isSuccess && (
                        <div className="relative z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full border-2 border-green-400 opacity-30 animate-ping" />
                                    <div className="h-16 w-16 rounded-full border-2 border-green-500" />
                                </div>
                                <p className="text-sm font-medium text-green-400">
                                    Face verified!
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Face Detection Frame (when camera is active) */}
                {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {/* Outer oval frame - represents face detection area */}
                        <div className="relative h-3/4 w-2/3 max-h-96">
                            {/* Main frame border */}
                            <div
                                className={`absolute inset-0 rounded-3xl border-2 transition-colors duration-500 ${isSuccess
                                        ? 'border-green-500'
                                        : isFailed
                                            ? 'border-red-500'
                                            : 'border-emerald-400'
                                    } ${isScanning ? 'shadow-lg' : ''}`}
                                style={
                                    isScanning
                                        ? {
                                            boxShadow:
                                                '0 0 20px rgba(34, 197, 94, 0.5), inset 0 0 20px rgba(34, 197, 94, 0.2)',
                                        }
                                        : {}
                                }
                            />

                            {/* Corner guides */}
                            <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-emerald-400" />
                            <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-emerald-400" />
                            <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-emerald-400" />
                            <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-emerald-400" />

                            {/* Scanning animation overlay */}
                            {isScanning && (
                                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                                    {/* Horizontal scanning line */}
                                    <div
                                        className="absolute inset-x-0 h-0.5 bg-gradient-to-b from-transparent via-emerald-400 to-transparent animate-pulse"
                                        style={{
                                            animation:
                                                'scan 2s ease-in-out infinite',
                                        }}
                                    />

                                    {/* Grid overlay with animation */}
                                    <div className="absolute inset-0 opacity-20">
                                        <svg
                                            preserveAspectRatio="none"
                                            viewBox="0 0 100 100"
                                            className="h-full w-full"
                                        >
                                            <defs>
                                                <pattern
                                                    id="scanGrid"
                                                    width="20"
                                                    height="20"
                                                    patternUnits="objectBoundingBox"
                                                >
                                                    <path
                                                        d="M 20 0 L 0 0 0 20"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="0.5"
                                                        className="text-emerald-400"
                                                    />
                                                </pattern>
                                            </defs>
                                            <rect
                                                width="100"
                                                height="100"
                                                fill="url(#scanGrid)"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* CSS for scanning animation */}
                <style>{`
                    @keyframes scan {
                        0%,
                        100% {
                            top: 0%;
                        }
                        50% {
                            top: 100%;
                        }
                    }
                `}</style>
            </div>

            {/* Camera Info Text */}
            <div className="text-center">
                <p className="text-xs text-muted-foreground">
                    {isActive
                        ? 'Camera is active and ready'
                        : 'Camera access required for facial recognition'}
                </p>
            </div>
        </div>
    );
}
