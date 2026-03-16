import { Head } from '@inertiajs/react';
import { useState } from 'react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth/auth-layout';
import { login } from '@/routes';

type Props = {
    email?: string;
};

/**
 * OTP Verification Page
 *
 * This page provides a scaffold for two-factor authentication via OTP.
 * Backend integration points are marked with TODO comments.
 *
 * TODO: Wire to backend OTP verification endpoint
 * TODO: Implement resend OTP logic and rate limiting
 * TODO: Add countdown timer for resend button
 * TODO: Implement OTP expiration handling
 */
export default function OtpVerify({ email }: Props) {
    const [otp, setOtp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResendOptions, setShowResendOptions] = useState(false);
    const [otpError, setOtpError] = useState('');

    // TODO: Replace with actual backend form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setOtpError('');

        try {
            // TODO: POST /verify-otp with { email, otp }
            // Example: const response = await fetch('/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) })
            console.log('OTP Verification:', { email, otp });
            // TODO: Handle successful verification and redirect to dashboard
        } catch {
            setOtpError('Invalid or expired OTP. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // TODO: Implement resend OTP logic
    const handleResendOtp = async () => {
        setIsSubmitting(true);
        try {
            // TODO: POST /resend-otp with { email }
            console.log('Resending OTP to:', email);
            setShowResendOptions(false);
        } catch {
            setOtpError('Failed to resend OTP. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Verify your identity"
            description="Enter the one-time password sent to your email"
        >
            <Head title="Verify OTP" />

            <div className="space-y-6">
                {/* Email Display */}
                {email && (
                    <div className="rounded-md bg-muted/30 p-3 text-sm dark:bg-muted/20">
                        <p className="text-muted-foreground">
                            Verification code sent to:{' '}
                            <span className="font-medium text-foreground">{email}</span>
                        </p>
                    </div>
                )}

                {/* OTP Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* OTP Error */}
                    {otpError && (
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10">
                            {otpError}
                        </div>
                    )}

                    {/* OTP Input */}
                    <div className="space-y-2">
                        <Label htmlFor="otp" className="text-sm font-medium">
                            One-Time Password
                        </Label>
                        <Input
                            id="otp"
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.toUpperCase())}
                            disabled={isSubmitting}
                            placeholder="000000"
                            maxLength={6}
                            inputMode="numeric"
                            className="h-10 text-center text-2xl tracking-widest font-mono transition-colors duration-200"
                            aria-invalid={!!otpError}
                            autoComplete="one-time-code"
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter the 6-digit code from your email
                        </p>
                    </div>

                    {/* Verify Button */}
                    <Button
                        type="submit"
                        disabled={isSubmitting || otp.length !== 6}
                        className="h-10 w-full font-medium transition-all duration-200"
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner />
                                <span>Verifying...</span>
                            </>
                        ) : (
                            'Verify Code'
                        )}
                    </Button>
                </form>

                {/* Resend Options */}
                <div className="space-y-3 border-t border-border/50 pt-4 dark:border-border/30">
                    {!showResendOptions ? (
                        <p className="text-center text-sm text-muted-foreground">
                            Didn't receive the code?{' '}
                            <button
                                type="button"
                                onClick={() => setShowResendOptions(true)}
                                disabled={isSubmitting}
                                className="font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
                            >
                                Resend
                            </button>
                        </p>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                How would you like to receive your code?
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {/* TODO: Implement email resend */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={handleResendOtp}
                                    className="text-xs"
                                >
                                    {isSubmitting ? <Spinner /> : null}
                                    Email to {email ? `${email.split('@')[0]}***` : 'account'}
                                </Button>
                                {/* TODO: Implement SMS resend if SMS is enabled */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="text-xs opacity-50"
                                    title="SMS resend coming soon"
                                >
                                    SMS (Coming Soon)
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Back to Login Link */}
                <div className="text-center">
                    <TextLink
                        href={login()}
                        className="text-xs font-medium no-underline hover:underline"
                    >
                        Back to Login
                    </TextLink>
                </div>
            </div>
        </AuthLayout>
    );
}
