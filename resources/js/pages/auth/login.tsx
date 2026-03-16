import { Form, Head, usePage } from '@inertiajs/react';
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
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    const { errors: serverErrors } = usePage().props;
    const [showPassword, setShowPassword] = useState(false);
    const [generalError, setGeneralError] = useState(status || '');
    const [facialRecognitionLoading, setFacialRecognitionLoading] = useState(false);
    const [otpRequired, setOtpRequired] = useState(false);
    const [otpCode, setOtpCode] = useState('');

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
        } catch (error) {
            setGeneralError('Facial recognition is not available at this time.');
        } finally {
            setFacialRecognitionLoading(false);
        }
    };

    /**
     * Handle OTP verification
     * Future implementation: Will handle multi-factor authentication
     */
    const handleOtpSubmit = () => {
        // TODO: Implement OTP verification
        // 1. Validate OTP code
        // 2. Send verification request
        // 3. Complete login if valid
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

            {otpRequired ? (
                // OTP Verification Step (Future Feature)
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Enter verification code
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            A verification code has been sent to your registered email.
                        </p>
                        <Input
                            type="text"
                            placeholder="000000"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="h-10 font-mono text-center text-lg"
                            maxLength={6}
                        />
                    </div>
                    <Button
                        onClick={handleOtpSubmit}
                        className="h-10 w-full bg-emerald-600 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    >
                        Verify Code
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setOtpRequired(false);
                            setOtpCode('');
                        }}
                        className="h-10 w-full"
                    >
                        Back to Login
                    </Button>
                </div>
            ) : (
                <Form
                    {...store.form()}
                    resetOnSuccess={['password']}
                    className="flex flex-col gap-6"
                >
                    {({ processing, errors }) => (
                        <>
                            {/* Username/Email Field */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Username or Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    disabled={processing}
                                    autoComplete="email"
                                    placeholder="your.email@example.com"
                                    className="h-10 border-gray-300 transition-colors duration-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    aria-invalid={!!errors.email}
                                />
                                <InputError message={errors.email} />
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
                                        disabled={processing}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className="h-10 pr-10 border-gray-300 transition-colors duration-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        aria-invalid={!!errors.password}
                                    />
                                    {/* Show/Hide Password Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={processing}
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
                                <InputError message={errors.password} />
                            </div>

                            {/* Primary Sign In Button */}
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-10 w-full bg-emerald-600 font-semibold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                data-test="login-button"
                            >
                                {processing ? (
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
                                disabled={facialRecognitionLoading || processing}
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
                        </>
                    )}
                </Form>
            )}
        </TelemedicineLoginLayout>
    );
}
