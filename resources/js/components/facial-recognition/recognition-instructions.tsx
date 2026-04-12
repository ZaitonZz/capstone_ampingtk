import { AlertCircle, Check } from 'lucide-react';

type RecognitionInstructionsProps = {
    status: string;
};

export default function RecognitionInstructions({
    status,
}: RecognitionInstructionsProps) {
    const tips = [
        'Position your face inside the frame',
        'Ensure the environment is well lit',
        'Stay still during scanning',
        'Remove any large obstructions from your face',
        'Avoid backlighting or window reflections',
    ];

    const isScanning = status === 'scanning';
    const isSuccess = status === 'success';

    return (
        <div className="space-y-6">
            {/* User Guidance */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                    How to prepare
                </h3>
                <div className="space-y-2">
                    {tips.map((tip, index) => (
                        <div
                            key={index}
                            className="flex gap-3 rounded-lg border border-amber-200/40 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200"
                        >
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Privacy Notice */}
            <div className="rounded-lg border border-emerald-200/40 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-200">
                <p className="font-medium leading-relaxed">
                    🔒 <strong>Privacy Protected:</strong> Your facial data is processed locally and encrypted. We never store your face image on our servers.
                </p>
            </div>

            {/* Scanning Status Message */}
            {isScanning && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-900/10 dark:text-blue-200">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Scanning in progress... Please keep still</span>
                </div>
            )}

            {/* Success Message */}
            {isSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-900/10 dark:text-green-200">
                    <Check className="h-4 w-4" />
                    <span>Face recognized successfully!</span>
                </div>
            )}
        </div>
    );
}
