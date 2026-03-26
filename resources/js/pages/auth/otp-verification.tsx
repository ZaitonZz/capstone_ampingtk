import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import TelemedicineLoginLayout from '@/layouts/auth/telemedicine-login-layout';

type Props = {
    maskedEmail: string;
    expiresIn: number;
    resendAvailableIn: number;
};

export default function OtpVerification({ maskedEmail, expiresIn: initialExpiresIn, resendAvailableIn: initialResendAvailableIn }: Props) {
    const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [expirationSeconds, setExpirationSeconds] = useState(initialExpiresIn);
    const [cooldownSeconds, setCooldownSeconds] = useState(initialResendAvailableIn);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // OTP expiration timer
    useEffect(() => {
        if (expirationSeconds <= 0) {
            setGeneralError('Verification code has expired. Please request a new one.');
            return;
        }

        const timer = setInterval(() => {
            setExpirationSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [expirationSeconds]);

    // Resend cooldown timer
    useEffect(() => {
        if (cooldownSeconds <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setCooldownSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldownSeconds]);

    /**
     * Format time for display (MM:SS)
     */
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
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
        setGeneralError('');

        try {
            const response = await fetch('/auth/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    otp_code: otpCode,
                }),
            });

            if (!response.ok) {
                const data = await response.json();

                // Handle validation errors
                if (data.errors) {
                    const errorMessages = Object.values(data.errors).flat() as string[];
                    setGeneralError(errorMessages?.[0] || 'Verification failed');
                } else {
                    setGeneralError(data.message || 'Invalid or expired verification code');
                }

                // Clear OTP fields for retry
                setOtpDigits(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                setIsVerifying(false);
                return;
            }

            const data = await response.json();

            if (data.success && data.redirect_url) {
                // Redirect to dashboard
                window.location.href = data.redirect_url;
            } else {
                setGeneralError('An unexpected error occurred. Please try again.');
                setIsVerifying(false);
            }
        } catch (error) {
            console.error('Verification error:', error);
            setGeneralError('An error occurred during verification. Please try again.');
            setIsVerifying(false);
        }
    };

    /**
     * Handle cancel OTP verification
     */
    const handleCancel = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        try {
            const response = await fetch('/auth/cancel-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-Token': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                }
            }
        } catch (error) {
            console.error('Cancel error:', error);
            // Fallback redirect
            window.location.href = '/login';
        }
    };

    /**
     * Handle resend OTP code
     */
    const handleResendCode = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        setIsResending(true);
        setGeneralError('');

        try {
            const response = await fetch('/auth/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });

            if (!response.ok) {
                const data = await response.json();

                if (data.resend_available_in) {
                    // Cooldown is still active
                    setCooldownSeconds(data.resend_available_in);
                    setGeneralError(`Please wait ${formatTime(data.resend_available_in)} before requesting a new code.`);
                } else {
                    setGeneralError(data.message || 'Failed to resend code');
                }

                setIsResending(false);
                return;
            }

            const data = await response.json();

            // Success - update timers
            setExpirationSeconds(data.expires_in || 300);
            setCooldownSeconds(data.resend_available_in || 60);

            // Clear OTP fields for new code
            setOtpDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error) {
            console.error('Resend error:', error);
            setGeneralError('An error occurred. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <TelemedicineLoginLayout
            title="Verify Your Identity"
            subtitle="Enter the verification code sent to your email"
        >
            <Head title="OTP Verification" />

            {/* General Error Message */}
            {generalError && (
                <div className="rounded-lg border border-red-200/50 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                    {generalError}
                </div>
            )}

            {/* Email Display */}
            <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400">
                <p>Verification code sent to: <span className="font-semibold">{maskedEmail}</span></p>
            </div>

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
                                autoFocus={index === 0}
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
                            <span>Expires in {formatTime(expirationSeconds)}</span>
                        </div>
                    </div>
                </div>

                {/* Verify Button */}
                <Button
                    type="submit"
                    disabled={isVerifying || expirationSeconds === 0}
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

                {/* Resend Section */}
                <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                    <p className="mb-2 text-center text-xs text-muted-foreground">
                        Didn't receive the code?
                    </p>
                    <Button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isResending || cooldownSeconds > 0 || expirationSeconds === 0}
                        variant="outline"
                        className="h-10 w-full"
                    >
                        {isResending ? (
                            <>
                                <Spinner />
                                <span>Sending...</span>
                            </>
                        ) : cooldownSeconds > 0 ? (
                            `Resend in ${formatTime(cooldownSeconds)}`
                        ) : (
                            'Resend Code'
                        )}
                    </Button>
                </div>

                {/* Back to Login Button */}
                <Button
                    type="button"
                    onClick={handleCancel}
                    variant="ghost"
                    className="h-10 w-full"
                >
                    Back to Login
                </Button>
            </form>
        </TelemedicineLoginLayout>
    );
}
