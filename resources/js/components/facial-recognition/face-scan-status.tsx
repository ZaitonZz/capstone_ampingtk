import {
    AlertCircle,
    Camera,
    CheckCircle,
    Loader2,
    XCircle,
} from 'lucide-react';

type FaceScanStatusProps = {
    status: string;
    userName?: string;
};

const statusConfig: Record<
    string,
    {
        icon: React.ReactNode;
        label: string;
        bgColor: string;
    }
> = {
    idle: {
        icon: <Camera className="h-4 w-4" />,
        label: 'Ready to scan',
        bgColor: 'bg-gray-50 dark:bg-gray-900/30',
    },
    requesting_camera: {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        label: 'Requesting camera access',
        bgColor: 'bg-blue-50 dark:bg-blue-900/10',
    },
    camera_ready: {
        icon: <Camera className="h-4 w-4" />,
        label: 'Camera ready',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/10',
    },
    scanning: {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        label: 'Scanning face',
        bgColor: 'bg-blue-50 dark:bg-blue-900/10',
    },
    success: {
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Face recognized',
        bgColor: 'bg-green-50 dark:bg-green-900/10',
    },
    failed: {
        icon: <XCircle className="h-4 w-4" />,
        label: 'Recognition failed',
        bgColor: 'bg-red-50 dark:bg-red-900/10',
    },
    no_face_detected: {
        icon: <AlertCircle className="h-4 w-4" />,
        label: 'No face detected',
        bgColor: 'bg-red-50 dark:bg-red-900/10',
    },
    multiple_faces_detected: {
        icon: <AlertCircle className="h-4 w-4" />,
        label: 'Multiple faces detected',
        bgColor: 'bg-red-50 dark:bg-red-900/10',
    },
    permission_denied: {
        icon: <XCircle className="h-4 w-4" />,
        label: 'Camera permission denied',
        bgColor: 'bg-red-50 dark:bg-red-900/10',
    },
};

export default function FaceScanStatus({ status, userName }: FaceScanStatusProps) {
    const config = statusConfig[status] || statusConfig.idle;

    return (
        <div className={`rounded-lg border border-border p-4 ${config.bgColor}`}>
            <div className={`flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className="shrink-0 text-foreground">{config.icon}</div>
                    <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">
                            {status === 'success' && userName
                                ? `Welcome back, ${userName}`
                                : config.label}
                        </span>
                        {status === 'success' && userName && (
                            <span className="text-xs text-muted-foreground">Redirecting to dashboard...</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
