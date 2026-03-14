import { Form, Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth/auth-layout';
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

    return (
        <AuthLayout
            title="Welcome back"
            description="Sign in to your account to continue your consultation journey"
        >
            <Head title="Log in" />

            {/* General Authentication Error */}
            {generalError && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10">
                    {generalError}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-4">
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
                                    disabled={processing}
                                    autoComplete="email"
                                    placeholder="your.email@example.com"
                                    className="h-10 transition-colors duration-200"
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
                                            className="text-xs font-medium no-underline hover:underline"
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
                                        className="h-10 pr-10 transition-colors duration-200"
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

                            {/* Remember Me Checkbox */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    disabled={processing}
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-sm font-normal cursor-pointer"
                                >
                                    Remember me on this device
                                </Label>
                            </div>

                            {/* Login Button */}
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-10 w-full font-medium transition-all duration-200"
                                data-test="login-button"
                            >
                                {processing ? (
                                    <>
                                        <Spinner />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    'Sign in to Account'
                                )}
                            </Button>
                        </div>

                        {/* Alternative Authentication Section */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Separator className="absolute inset-x-0 top-1/2" />
                                <div className="relative flex justify-center">
                                    <span className="bg-card px-2 text-xs font-medium text-muted-foreground">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            {/* Facial Recognition Option - Placeholder/Secondary */}
                            <div className="group rounded-md border border-dashed border-border/50 p-3 transition-all duration-200 hover:border-border/80 dark:border-border/30 dark:hover:border-border/50">
                                <button
                                    type="button"
                                    disabled={processing}
                                    className="flex w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground disabled:opacity-50"
                                    title="Facial recognition login feature coming soon"
                                >
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
                                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <span>Facial Recognition Login</span>
                                    <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                        Coming
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Signup Link */}
                        {canRegister && (
                            <div className="border-t border-border/50 pt-4 text-center text-sm dark:border-border/30">
                                <span className="text-muted-foreground">
                                    Don't have an account?{' '}
                                    <TextLink
                                        href={register()}
                                        className="font-semibold text-primary no-underline hover:underline"
                                    >
                                        Create one now
                                    </TextLink>
                                </span>
                            </div>
                        )}
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 rounded-md border border-green-200/50 bg-green-50 p-2 text-center text-sm font-medium text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
                    {status}
                </div>
            )}
        </AuthLayout>
    );
}
