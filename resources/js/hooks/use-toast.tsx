import { createContext, useContext, useState, useCallback } from 'react';
import type { Toast, ToastType } from '@/components/ui/toast';

type ToastContextType = {
    toasts: Toast[];
    addToast: (message: string, type: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback(
        (message: string, type: ToastType, duration?: number) => {
            const id = crypto.randomUUID();
            const newToast: Toast = { id, message, type, duration };
            setToasts((prev) => [...prev, newToast]);
        },
        []
    );

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const success = useCallback(
        (message: string, duration?: number) => addToast(message, 'success', duration),
        [addToast]
    );

    const error = useCallback(
        (message: string, duration?: number) => addToast(message, 'error', duration),
        [addToast]
    );

    const warning = useCallback(
        (message: string, duration?: number) => addToast(message, 'warning', duration),
        [addToast]
    );

    const info = useCallback(
        (message: string, duration?: number) => addToast(message, 'info', duration),
        [addToast]
    );

    const value: ToastContextType = {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
