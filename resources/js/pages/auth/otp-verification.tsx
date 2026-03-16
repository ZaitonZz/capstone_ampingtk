import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import TelemedicineLoginLayout from '@/layouts/auth/telemedicine-login-layout';

type Props = {
    status?: string;
    email?: string;
    phone?: string;
    otp_generated_at?: number;
    is_fresh_otp?: boolean;
};

export default function OtpVerification({ status, email, phone, otp_generated_at, is_fresh_otp }: Props) {
    const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [expirationSeconds, setExpirationSeconds] = useState(600); // 10 minutes
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Initialize expiration timer based on OTP generation timestamp
    useEffect(() => {
        let generatedAt: number | null = null;

        // Try to get timestamp from sessionStorage (for page refreshes)
        const storedTimestamp = sessionStorage.getItem('otp_generated_at');
        if (storedTimestamp) {
            generatedAt = parseInt(storedTimestamp, 10);
        }
        // Otherwise, use timestamp from props (for initial page load)
        else if (otp_generated_at) {
            generatedAt = otp_generated_at;
            sessionStorage.setItem('otp_generated_at', otp_generated_at.toString());
        }

        // If we have a generated timestamp from props, validate/update sessionStorage
        if (otp_generated_at && otp_generated_at !== generatedAt) {
            // OTP timestamp from server differs from stored - we're in a new session
            // Clear old sessionStorage entries
            sessionStorage.removeItem('otp_resend_at');
            generatedAt = otp_generated_at;
            sessionStorage.setItem('otp_generated_at', otp_generated_at.toString());
        }

        // Calculate remaining time
        if (generatedAt) {
            const now = Math.floor(Date.now() / 1000);
            const elapsedSeconds = now - generatedAt;
            const remainingSeconds = Math.max(0, 600 - elapsedSeconds);
            setExpirationSeconds(remainingSeconds);
        }
    }, [otp_generated_at]);

    // OTP expiration timer
    useEffect(() => {
        if (expirationSeconds <= 0) {
            setGeneralError('Verification code has expired. Please request a new one.');
            return;
        }

        const timer = setInterval(() => {
            setExpirationSeconds((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [expirationSeconds]);

    // Initialize resend cooldown timer from sessionStorage
    useEffect(() => {
        // If this is a fresh OTP, clear any old resend timer immediately
        if (is_fresh_otp) {
            sessionStorage.removeItem('otp_resend_at');
            setCooldownSeconds(0);
            return;
        }

        const resendAtTimestamp = sessionStorage.getItem('otp_resend_at');
        const storedOtpGeneratedAt = sessionStorage.getItem('otp_generated_at');

        if (resendAtTimestamp && storedOtpGeneratedAt) {
            // Validate that the stored OTP timestamp matches current session's OTP timestamp
            const storedOtpTime = parseInt(storedOtpGeneratedAt, 10);
            const currentOtpTime = otp_generated_at || storedOtpTime;

            // If OTP timestamps don't match, we're in a new session - clear old resend timer
            if (storedOtpTime !== currentOtpTime) {
                sessionStorage.removeItem('otp_resend_at');
                setCooldownSeconds(0);
                return;
            }

            const resendAt = parseInt(resendAtTimestamp, 10);
            const now = Math.floor(Date.now() / 1000);
            const elapsedSeconds = now - resendAt;
            const remainingCooldown = Math.max(0, 60 - elapsedSeconds);

            // Only set cooldown if time is still remaining
            if (remainingCooldown > 0) {
                setCooldownSeconds(remainingCooldown);
            } else {
                // Cooldown expired, clear the timestamp
                sessionStorage.removeItem('otp_resend_at');
            }
        }
    }, [otp_generated_at, is_fresh_otp]);

    // Resend cooldown timer - auto clear when expired
    useEffect(() => {
        if (cooldownSeconds <= 0) {
            // Clear sessionStorage when cooldown expires
            sessionStorage.removeItem('otp_resend_at');
            return;
        }

        const timer = setInterval(() => {
            setCooldownSeconds((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldownSeconds]);

    /**
     * Format time for display (MM:SS)
     */
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    /**
     * Handle OTP digit input
     */
    const handleOtpChange = (index: number, value: string) => {
        // Only allow single digits
        if (!/^\d*$/.test(value)) {
            return;
        }

        const newOtpDigits = [...otpDigits];
        newOtpDigits[index] = value.slice(-1); // Keep only last character
        setOtpDigits(newOtpDigits);

        // Auto-focus to next input if digit is entered
        if (newOtpDigits[index] && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Clear error when user starts typing
        if (generalError) {
            setGeneralError('');
        }
    };

    /**
     * Handle backspace to move to previous field
     */
    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace') {
            if (otpDigits[index]) {
                // Clear current field
                const newOtpDigits = [...otpDigits];
                newOtpDigits[index] = '';
                setOtpDigits(newOtpDigits);
            } else if (index > 0) {
                // Move to previous field if current is empty
                inputRefs.current[index - 1]?.focus();
            }
        } else if (event.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (event.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    /**
     * Handle paste event to fill all OTP digits at once
     */
    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        const pastedData = event.clipboardData.getData('text');
        const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

        if (digits.length === 6) {
            setOtpDigits(digits);
            // Focus on the last input
            inputRefs.current[5]?.focus();

            // Clear error when user pastes valid code
            if (generalError) {
                setGeneralError('');
            }
        }
    };

    /**
     * Handle OTP verification submission
     */
    const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const otpCode = otpDigits.join('');

        // Validation
        if (otpCode.length !== 6) {
            setGeneralError('Please enter all 6 digits');
            return;
        }

        if (!/^\d{6}$/.test(otpCode)) {
            setGeneralError('OTP must contain only digits');
            return;
        }

        setIsVerifying(true);
        setGeneralError(''); // Clear any previous errors

        try {
            // Submit OTP verification
            const response = await fetch('/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-Token': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    otp_code: otpCode,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                setGeneralError(
                    data.message || 'Invalid or expired verification code'
                );
                setIsVerifying(false);
                return;
            }

            // Handle successful verification
            const data = await response.json();

            if (data.success && data.redirect_url) {
                // Clear session storage and redirect to dashboard
                sessionStorage.removeItem('otp_generated_at');
                window.location.href = data.redirect_url;
            } else {
                setGeneralError('An unexpected error occurred. Please try again.');
                setIsVerifying(false);
            }
        } catch (error) {
            setGeneralError('An error occurred during verification. Please try again.');
            setIsVerifying(false);
        }
    };

    /**
     * Handle logout and clear OTP session by logging out user
     */
    const handleClearOtp = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Clear all sessionStorage immediately before form submission
        sessionStorage.clear();

        // Give the browser a moment to process the sessionStorage clear before navigating
        setTimeout(() => {
            // Create a form and submit to logout POST endpoint
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/clear-otp';
            form.style.display = 'none';

            // Add CSRF token
            const csrfToken = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';

            if (csrfToken) {
                const tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = '_token';
                tokenInput.value = csrfToken;
                form.appendChild(tokenInput);
            }

            document.body.appendChild(form);
            form.submit();
        }, 100); // 100ms delay ensures sessionStorage.clear() is processed
    };

    /**
     * Handle resend OTP code
     */
    const handleResendCode = async () => {
        setIsResending(true);
        setGeneralError('');

        try {
            const response = await fetch('/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') || '',
                },
            });

            if (!response.ok) {
                const data = await response.json();
                setGeneralError(data.message || 'Failed to resend code');
            } else {
                const data = await response.json();
                // Store OTP generation timestamp from server
                if (data.otp_generated_at) {
                    sessionStorage.setItem('otp_generated_at', data.otp_generated_at.toString());
                }
                // Store resend timestamp for cooldown persistence across page refreshes
                sessionStorage.setItem('otp_resend_at', Math.floor(Date.now() / 1000).toString());
                // Reset OTP fields and timers
                setOtpDigits(['', '', '', '', '', '']);
                setExpirationSeconds(600); // Reset to 10 minutes
                setCooldownSeconds(60); // 60 seconds cooldown
                inputRefs.current[0]?.focus();
            }
        } catch (error) {
            setGeneralError('An error occurred. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <TelemedicineLoginLayout
            title="Verify Your Identity"
            subtitle="A verification code has been sent to your registered email or phone."
        >
            <Head title="OTP Verification" />

            {/* General Error Message */}
            {generalError && (
                <div className="rounded-lg border border-red-200/50 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                    {generalError}
                </div>
            )}

            {/* Contact Information */}
            {(email || phone) && (
                <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400">
                    {email && <p>Sent to: <span className="font-semibold">{email}</span></p>}
                    {phone && <p>Sent to: <span className="font-semibold">{phone}</span></p>}
                </div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerify} className="space-y-6">
                {/* OTP Input Fields */}
                <div className="space-y-4">
                    {/* 6-Digit OTP Input */}
                    <div className="flex items-center justify-center gap-2">
                        {otpDigits.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => {
                                    inputRefs.current[index] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                disabled={isVerifying}
                                aria-label={`OTP digit ${index + 1}`}
                                className="h-12 w-12 border border-gray-300 rounded-lg bg-white text-center text-xl font-bold transition-colors duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
                            />
                        ))}
                    </div>

                    {/* Timers Section */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {/* Expiration Timer */}
                        <div className="flex items-center gap-1">
                            <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span>
                                Expires in: <span className="font-semibold">{formatTime(expirationSeconds)}</span>
                            </span>
                        </div>

                        {/* Cooldown Timer (shown only if active) */}
                        {cooldownSeconds > 0 && (
                            <span className="text-xs">
                                Resend available in: <span className="font-semibold">{cooldownSeconds}s</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Verify Button */}
                <Button
                    type="submit"
                    disabled={isVerifying || expirationSeconds <= 0}
                    className="h-10 w-full bg-emerald-600 font-semibold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                    {isVerifying ? (
                        <>
                            <Spinner />
                            <span>Verifying...</span>
                        </>
                    ) : (
                        'Verify Code'
                    )}
                </Button>

                {/* Resend Code Link */}
                <div className="text-center">
                    <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={cooldownSeconds > 0 || isResending}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:text-muted-foreground disabled:cursor-not-allowed dark:text-emerald-500 dark:hover:text-emerald-400"
                    >
                        {isResending ? (
                            <span className="inline-flex items-center gap-1">
                                <Spinner className="h-3 w-3" />
                                Sending...
                            </span>
                        ) : cooldownSeconds > 0 ? (
                            `Resend available in ${cooldownSeconds}s`
                        ) : (
                            'Resend Code'
                        )}
                    </button>
                </div>

                {/* Help Text */}
                <div className="text-center text-xs text-muted-foreground">
                    <p>Didn't receive the code? Check your spam folder or try resending.</p>
                </div>
            </form>

            {/* Back to Login Link */}
            <div className="border-t border-gray-200 pt-4 text-center text-sm dark:border-gray-800">
                <span className="text-muted-foreground">
                    Need to use a different method?{' '}
                    <button
                        type="button"
                        onClick={handleClearOtp}
                        className="font-semibold text-emerald-600 no-underline hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                    >
                        Go back to login
                    </button>
                </span>
            </div>
        </TelemedicineLoginLayout>
    );
}
