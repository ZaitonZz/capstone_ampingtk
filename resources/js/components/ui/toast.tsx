import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
};

type ToastProps = {
    toast: Toast;
    onClose: (id: string) => void;
};

const typeStyles = {
    success: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
    info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
};

const iconStyles = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
};

export function Toast({ toast, onClose }: ToastProps) {
    useEffect(() => {
        const duration = toast.duration || 5000;
        const timer = setTimeout(() => onClose(toast.id), duration);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onClose]);

    return (
        <div
            className={`rounded-lg border px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 fade-in ${typeStyles[toast.type]}`}
            role="alert"
        >
            <p className="text-sm font-medium">{toast.message}</p>
            <Button
                size="icon"
                variant="ghost"
                className="size-5 hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => onClose(toast.id)}
                aria-label="Close notification"
            >
                <X className="size-4" />
            </Button>
        </div>
    );
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
}
