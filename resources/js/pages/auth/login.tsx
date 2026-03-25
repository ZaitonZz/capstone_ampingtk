import { Head } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import TelemedicineLoginLayout from '@/layouts/auth/telemedicine-login-layout';
import { register } from '@/routes';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    canResetPassword,
    canRegister,
}: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [facialRecognitionLoading, setFacialRecognitionLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    /**
     * Handle facial recognition login
     * Future implementation: Will integrate with biometric APIs
     */
    const handleFacialRecognitionLogin = async () => {
        setFacialRecognitionLoading(true);
        try {
            // TODO: Implement facial recognition authentication
            // 1. Check if browser supports Face API or WebRTC
            // 2. Request camera access
            // 3. Capture face data
            // 4. Send to backend for verification
            // 5. Redirect based on role
        } catch {
            setGeneralError('Facial recognition is not available at this time.');
        } finally {
            setFacialRecognitionLoading(false);
        }
    };

    /**
     * Handle email/password login start.
     * Submits to email-login-start endpoint to validate credentials and receive OTP.
     */
    const handleEmailLoginStart = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Clear previous errors
        setEmailError('');
        setPasswordError('');
        setGeneralError('');

        // Basic validation
        if (!email || !password) {
            if (!email) setEmailError('Email is required');
            if (!password) setPasswordError('Password is required');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/auth/email-login-start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password,
                    remember: false,
                }),
            });

            if (!response.ok) {
                const data = await response.json();

                // Handle validation errors from server
                if (data.errors) {
                    if (data.errors.email) {
                        setEmailError(Array.isArray(data.errors.email) ? data.errors.email[0] : data.errors.email);
                    }
                    if (data.errors.password) {
                        setPasswordError(Array.isArray(data.errors.password) ? data.errors.password[0] : data.errors.password);
                    }
                } else {
                    setGeneralError(data.message || 'Login failed. Please try again.');
                }

                setIsSubmitting(false);
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Redirect to OTP verification page
                window.location.href = '/auth/verify-otp';
            } else {
                setGeneralError(data.message || 'An unexpected error occurred. Please try again.');
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error('Login error:', error);
            setGeneralError('An error occurred during login. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <TelemedicineLoginLayout
            title="AMPING Telekonsulta"
            subtitle="Secure access for doctors and patients"
        >
            <Head title="Log in" />

            {/* General Authentication Error */}
            {generalError && (
                <div className="rounded-lg border border-red-200/50 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                    {generalError}
                </div>
            )}

            <form
                onSubmit={handleEmailLoginStart}
                className="flex flex-col gap-6"
            >
                {/* Email Field */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                        Email address
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        required
                        autoFocus
                        disabled={isSubmitting}
                        autoComplete="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setEmailError('');
                            setGeneralError('');
                        }}
                        className="h-10 border-gray-300 transition-colors duration-200 focus:border-emerald-500 focus:ring-emerald-500"
                        aria-invalid={!!emailError}
                    />
                    <InputError message={emailError} />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium">
                            Password
                        </Label>
                        {canResetPassword && (
                            <TextLink
                                href={request()}
                                className="text-xs font-medium text-emerald-600 no-underline hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                            >
                                Forgot password?
                            </TextLink>
                        )}
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            required
                            disabled={isSubmitting}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setPasswordError('');
                                setGeneralError('');
                            }}
                            className="h-10 pr-10 border-gray-300 transition-colors duration-200 focus:border-emerald-500 focus:ring-emerald-500"
                            aria-invalid={!!passwordError}
                        />
                        {/* Show/Hide Password Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isSubmitting}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                            aria-label={
                                showPassword
                                    ? 'Hide password'
                                    : 'Show password'
                            }
                        >
                            {showPassword ? (
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                    <InputError message={passwordError} />
                </div>

                {/* Primary Sign In Button */}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 w-full bg-emerald-600 font-semibold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    data-test="login-button"
                >
                    {isSubmitting ? (
                        <>
                            <Spinner />
                            <span>Signing in...</span>
                        </>
                    ) : (
                        'Sign In'
                    )}
                </Button>

                {/* Divider */}
                <div className="relative">
                    <Separator className="bg-border" />
                    <div className="relative flex justify-center -top-3">
                        <span className="bg-card px-2 text-xs font-medium text-muted-foreground">
                            Or continue with
                        </span>
                    </div>
                </div>

                {/* Facial Recognition Button (Future Feature) */}
                <Button
                    type="button"
                    disabled={facialRecognitionLoading || isSubmitting}
                    onClick={handleFacialRecognitionLogin}
                    className="h-10 w-full border-emerald-200 bg-emerald-50 font-medium text-emerald-700 transition-all duration-200 hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                    variant="outline"
                >
                    {facialRecognitionLoading ? (
                        <>
                            <Spinner />
                            <span>Authenticating...</span>
                        </>
                    ) : (
                        <>
                            <svg
                                className="h-4 w-4 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2m0 0l4-4m-4 4l-4-4m4 4v7m0 0H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2h-9z"
                                />
                            </svg>
                            <span>Login with Facial Recognition</span>
                        </>
                    )}
                </Button>

                {/* Sign Up Link */}
                {canRegister && (
                    <div className="border-t border-gray-200 pt-4 text-center text-sm dark:border-gray-800">
                        <span className="text-muted-foreground">
                            Don't have an account?{' '}
                            <TextLink
                                href={register()}
                                className="font-semibold text-emerald-600 no-underline hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                            >
                                Create one now
                            </TextLink>
                        </span>
                    </div>
                )}
            </form>
        </TelemedicineLoginLayout>
    );
}
