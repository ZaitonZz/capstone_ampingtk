import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { ToastContainer } from '@/components/ui/toast';
import { initializeTheme } from '@/hooks/use-appearance';
import { ToastProvider, useToast } from '@/hooks/use-toast';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

function AppWithToast({ children }: { children: React.ReactNode }) {
    const { toasts, removeToast } = useToast();

    return (
        <>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </>
    );
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <ToastProvider>
                    <AppWithToast>
                        <App {...props} />
                    </AppWithToast>
                </ToastProvider>
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
