import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Separator } from '@/components/ui/separator';

type AuthLayoutProps = {
    title: string;
    description: string;
    children: ReactNode;
};

export default function AuthLayout({
    title,
    description,
    children,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen bg-background">
            {/* Left Side - Branding Panel (Desktop Only) */}
            <div className="hidden flex-1 flex-col items-center justify-center bg-linear-to-b from-primary/5 to-primary/10 px-8 py-12 dark:from-primary/20 dark:to-primary/30 lg:flex">
                <div className="w-full max-w-sm space-y-8 text-center">
                    {/* Logo Area */}
                    <div className="flex w-full justify-center">
                        <AppLogoIcon className="h-20 w-auto" />
                    </div>

                    {/* Branding Text */}
                    <div className="space-y-3">
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                            AMPING Telekonsulta
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Secure Teleconsultation Platform
                        </p>
                    </div>

                    {/* Divider */}
                    <Separator className="my-6" />

                    {/* Features List */}
                    <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/30">
                                <svg
                                    className="h-3 w-3 text-primary"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <span className="text-muted-foreground">
                                Secure email & password authentication
                            </span>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/30">
                                <svg
                                    className="h-3 w-3 text-primary"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <span className="text-muted-foreground">
                                HIPAA-compliant secure communication
                            </span>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/30">
                                <svg
                                    className="h-3 w-3 text-primary"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <span className="text-muted-foreground">
                                Multi-factor authentication ready
                            </span>
                        </div>
                    </div>

                    {/* Footer text */}
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <p>
                            Professional medical consultations from the comfort of your home.
                        </p>
                        <p>
                            Your privacy and security are our top priorities.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Panel */}
            <div className="flex w-full flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
                <div className="w-full max-w-sm space-y-6">
                    {/* Mobile Logo (Visible only on small screens) */}
                    <div className="flex justify-center lg:hidden">
                        <AppLogoIcon className="h-16 w-auto" />
                    </div>

                    {/* Auth Card */}
                    <div className="space-y-6 rounded-lg border border-border/50 bg-card p-6 shadow-sm sm:p-8 dark:border-border/30">
                        {/* Header */}
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                {title}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>

                        {/* Content */}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
