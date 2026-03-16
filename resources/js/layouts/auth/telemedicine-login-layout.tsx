import AppLogoIcon from '@/components/app-logo-icon';
import { Separator } from '@/components/ui/separator';
import type { ReactNode } from 'react';

type TelemedicineLoginLayoutProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
};

export default function TelemedicineLoginLayout({
    title,
    subtitle,
    children,
}: TelemedicineLoginLayoutProps) {
    return (
        <div className="flex min-h-screen bg-background">
            {/* Left Side - Hero Image with Gradient Overlay (Desktop Only) */}
            <div className="hidden lg:flex lg:flex-[11] items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 relative overflow-hidden">
                {/* Background Image */}
                <img
                    src="/images/amping_tk1.png"
                    alt="AMPING Telekonsulta Healthcare"
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                />

                {/* Green Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/80 via-emerald-700/75 to-emerald-900/80" />

                {/* Content */}
                <div className="relative z-10 space-y-8 px-12 text-center">
                    {/* Main Text */}
                    <div className="space-y-4">
                        <h1 className="text-5xl font-bold tracking-tight text-white">
                            Secure Teleconsultation
                        </h1>
                        <p className="text-xl font-semibold text-emerald-100">
                            AI Identity Guard Protection
                        </p>
                    </div>

                    {/* Divider */}
                    <Separator className="bg-white/20" />

                    {/* Features */}
                    <div className="space-y-4 text-sm">
                        <div className="flex items-center gap-3 text-white/90">
                            <div className="h-2 w-2 rounded-full bg-emerald-300" />
                            <span>Advanced AI-powered identity verification</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/90">
                            <div className="h-2 w-2 rounded-full bg-emerald-300" />
                            <span>HIPAA-compliant secure communication</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/90">
                            <div className="h-2 w-2 rounded-full bg-emerald-300" />
                            <span>Multi-factor authentication ready</span>
                        </div>
                    </div>

                    {/* Footer Text */}
                    <div className="space-y-2 text-sm text-emerald-50">
                        <p>
                            Professional medical consultations from the comfort of your home.
                        </p>
                        <p>
                            Your privacy and security are our top priorities.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form Panel */}
            <div className="flex w-full lg:flex-[9] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
                <div className="w-full max-w-sm space-y-6">
                    {/* Mobile Logo (Visible only on small screens) */}
                    <div className="flex justify-center lg:hidden">
                        <AppLogoIcon className="h-16 w-auto" />
                    </div>

                    {/* Auth Card */}
                    <div className="space-y-6 rounded-xl border border-emerald-200/30 bg-card p-6 shadow-lg sm:p-8 dark:border-emerald-900/30">
                        {/* Header Section */}
                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold tracking-tight text-foreground">
                                {title}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {subtitle}
                            </p>
                        </div>

                        {/* Content */}
                        {children}
                    </div>

                    {/* Privacy Notice */}
                    <p className="text-center text-xs text-muted-foreground">
                        By signing in, you agree to our{' '}
                        <a href="#" className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400">
                            Terms of Service
                        </a>
                        {' '}and{' '}
                        <a href="#" className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400">
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
