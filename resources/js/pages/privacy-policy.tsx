import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { login } from '@/routes';

const noticeItems = [
    {
        title: 'What we process',
        description:
            'Identity, account, and consultation-related information needed to support secure teleconsultation services.',
        icon: FileText,
    },
    {
        title: 'Why we process it',
        description:
            'To manage sign-in, protect consultations, support verification, and comply with applicable privacy requirements.',
        icon: ShieldCheck,
    },
];

export default function PrivacyPolicy() {
    return (
        <>
            <Head title="Data Privacy Policy" />

            <div className="relative min-h-svh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(6,95,70,0.12),transparent_32%),linear-gradient(180deg,rgba(249,250,251,1)_0%,rgba(241,245,249,1)_100%)] px-4 py-8 text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(5,150,105,0.14),transparent_32%),linear-gradient(180deg,rgba(2,6,23,1)_0%,rgba(15,23,42,1)_100%)] sm:px-6 lg:px-8">
                <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(15,23,42,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.6)_1px,transparent_1px)] bg-[size:28px_28px] dark:bg-[linear-gradient(rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.35)_1px,transparent_1px)]" />

                <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center gap-6">
                    <Link
                        href={login()}
                        className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/70 bg-white/75 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm backdrop-blur transition-colors hover:border-emerald-300 hover:bg-white dark:border-emerald-900/40 dark:bg-slate-950/65 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-slate-950"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>

                    <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/95 shadow-[0_28px_70px_-24px_rgba(15,23,42,0.35)] backdrop-blur dark:border-border/30">
                        <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
                            <div className="space-y-8 p-6 sm:p-8 lg:p-10">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Official notice
                                    </div>
                                    <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                                        AMPING_TK
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-sm font-semibold tracking-[0.2em] text-emerald-700 uppercase dark:text-emerald-300">
                                        Secure teleconsultation
                                    </p>
                                    <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                                        Data Privacy Policy
                                    </h1>
                                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                        AMPING_TK is designed to support secure teleconsultation services. This notice summarizes how information is handled so users can review the platform&apos;s privacy expectations before signing in.
                                    </p>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {noticeItems.map(({ title, description, icon: Icon }) => (
                                        <div
                                            key={title}
                                            className="rounded-2xl border border-border/60 bg-muted/35 p-5 shadow-sm"
                                        >
                                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <h2 className="mb-2 text-sm font-semibold text-foreground">
                                                {title}
                                            </h2>
                                            <p className="text-sm leading-6 text-muted-foreground">
                                                {description}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-5 text-sm leading-6 text-emerald-950 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100">
                                    By using AMPING_TK, you acknowledge that your data may be processed for secure authentication, patient-doctor interaction, and telemedicine workflow support.
                                </div>
                            </div>

                            <div className="relative min-h-104 overflow-hidden bg-emerald-950">
                                <img
                                    src="/images/Data_privacy_1.png"
                                    alt="Data privacy illustration"
                                    className="absolute inset-0 h-full w-full object-cover object-center opacity-82"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-emerald-950 via-emerald-950/60 to-transparent" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_36%)]" />

                                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6 text-white">
                                    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] uppercase backdrop-blur-sm">
                                        Privacy first
                                    </div>
                                    <div className="text-right text-xs text-emerald-100/80">
                                        Secure access before login
                                    </div>
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                                    <div className="max-w-sm space-y-3">
                                        <p className="text-xs font-semibold tracking-[0.24em] text-emerald-100/80 uppercase">
                                            Read before continuing
                                        </p>
                                        <p className="text-2xl font-semibold leading-tight sm:text-[2rem]">
                                            Privacy safeguards are part of every AMPING_TK session.
                                        </p>
                                        <p className="text-sm leading-6 text-emerald-50/90">
                                            We keep the notice short, clear, and visible so users can review it without friction.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}