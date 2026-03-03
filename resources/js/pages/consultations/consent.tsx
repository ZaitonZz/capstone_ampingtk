import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import * as ConsultationConsentController from '@/actions/App/Http/Controllers/ConsultationConsentController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Consultation, ConsultationConsent } from '@/types/consultation';

interface Props {
    consultation: Consultation;
    consent: ConsultationConsent | null;
}

export default function ConsultationConsentPage({ consultation, consent }: Props) {
    const isAlreadyConfirmed = consent?.consent_confirmed === true;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Consultations', href: ConsultationController.index.url() },
        {
            title: consultation.patient?.full_name ?? `#${consultation.id}`,
            href: ConsultationController.show.url(consultation.id),
        },
        { title: 'Privacy Notice & Consent', href: ConsultationConsentController.show.url(consultation.id) },
    ];

    const { data, setData, post, processing, errors } = useForm({
        read_privacy_notice: false,
        agree_identity_guard: false,
        agree_liveness_check: false,
    });

    const allChecked = data.read_privacy_notice && data.agree_identity_guard && data.agree_liveness_check;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post(ConsultationConsentController.store.url(consultation.id), {
            onError: () => {
                toast.error('Please check all required items before confirming.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Privacy Notice & Consent" />

            <div className="mx-auto max-w-5xl p-4 md:p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Privacy Notice &amp; Consent</h1>
                        <p className="text-sm text-muted-foreground">
                            {consultation.patient?.full_name
                                ? `For ${consultation.patient.full_name}`
                                : `Consultation #${consultation.id}`}
                            {consultation.doctor?.name ? ` — Dr. ${consultation.doctor.name}` : ''}
                        </p>
                    </div>
                    {isAlreadyConfirmed && (
                        <Badge className="gap-1.5 bg-green-600 text-white hover:bg-green-600">
                            ✓ Consent Confirmed
                            {consent?.confirmed_at && (
                                <span className="text-xs font-normal opacity-80">
                                    &nbsp;on {new Date(consent.confirmed_at).toLocaleString()}
                                </span>
                            )}
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* ── LEFT: Document Viewer ──────────────────────────────── */}
                    <div className="lg:col-span-2">
                        <div className="rounded-xl border">
                            <div className="border-b px-5 py-3">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Privacy Notice &amp; Consent Document
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Please review the full document before confirming.
                                </p>
                            </div>

                            <div className="h-520px overflow-y-auto px-5 py-4 text-sm leading-relaxed">
                                <h2 className="mb-2 text-base font-semibold">
                                    AMPING Telekonsulta — Privacy Notice
                                </h2>
                                <p className="mb-4 text-muted-foreground">
                                    This Privacy Notice explains how AMPING Telekonsulta collects, uses,
                                    and protects your personal information in connection with your
                                    teleconsultation session.
                                </p>

                                <h3 className="mb-1 font-semibold">1. Data We Collect</h3>
                                <ul className="mb-4 list-disc pl-5 text-muted-foreground">
                                    <li>Identity information (name, date of birth, valid ID)</li>
                                    <li>Medical and clinical information provided during the consultation</li>
                                    <li>Video, audio, and image data captured during the session</li>
                                    <li>Device metadata and connection information</li>
                                    <li>AI-assisted liveness verification and deepfake detection data</li>
                                </ul>

                                <h3 className="mb-1 font-semibold">2. Purpose of Processing</h3>
                                <ul className="mb-4 list-disc pl-5 text-muted-foreground">
                                    <li>To verify your identity and prevent fraudulent access</li>
                                    <li>To facilitate a secure real-time teleconsultation</li>
                                    <li>To generate and store clinical records (SOAP notes, prescriptions, vitals)</li>
                                    <li>To detect and flag potential deepfake or impersonation attempts</li>
                                    <li>To comply with applicable health information laws and regulations</li>
                                </ul>

                                <h3 className="mb-1 font-semibold">3. Identity Guard Verification</h3>
                                <p className="mb-4 text-muted-foreground">
                                    As part of this consultation, AMPING Telekonsulta employs Identity Guard
                                    technology to confirm your identity in real time. This includes facial
                                    recognition matching against your registered profile. Your biometric data
                                    is processed solely for verification purposes and is not shared with
                                    third parties without your explicit consent, except as required by law.
                                </p>

                                <h3 className="mb-1 font-semibold">4. Liveness &amp; Security Checks</h3>
                                <p className="mb-4 text-muted-foreground">
                                    Anti-spoofing and liveness detection checks may be performed
                                    automatically during the session to ensure the integrity of the
                                    teleconsultation. Results of these checks are logged and may be reviewed
                                    by authorised medical staff.
                                </p>

                                <h3 className="mb-1 font-semibold">5. Data Retention</h3>
                                <p className="mb-4 text-muted-foreground">
                                    Personal and clinical data is retained in accordance with applicable
                                    medical records laws. You may request access, correction, or deletion of
                                    your data by contacting the platform administrator.
                                </p>

                                <h3 className="mb-1 font-semibold">6. Your Rights</h3>
                                <ul className="mb-4 list-disc pl-5 text-muted-foreground">
                                    <li>Right to access your personal data</li>
                                    <li>Right to correction of inaccurate data</li>
                                    <li>Right to object to processing in certain circumstances</li>
                                    <li>Right to lodge a complaint with the relevant data protection authority</li>
                                </ul>

                                <h3 className="mb-1 font-semibold">7. Contact</h3>
                                <p className="mb-4 text-muted-foreground">
                                    For questions about this Privacy Notice or your personal data, please
                                    contact the AMPING Telekonsulta Data Protection Officer via the
                                    platform's support channel.
                                </p>

                                <p className="mt-6 text-xs text-muted-foreground">
                                    Last updated: March 2026. This document is for informational purposes.
                                    By confirming consent, you acknowledge that you have read, understood,
                                    and agreed to the above.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Actions Panel ───────────────────────────────── */}
                    <div className="lg:col-span-1">
                        <div className="rounded-xl border p-5">
                            <h2 className="mb-4 font-semibold">Actions</h2>

                            {isAlreadyConfirmed ? (
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
                                        <p className="font-medium">Consent already confirmed.</p>
                                        {consent?.confirmed_at && (
                                            <p className="mt-1 text-xs opacity-80">
                                                Confirmed on{' '}
                                                {new Date(consent.confirmed_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        asChild
                                    >
                                        <a href={ConsultationController.show.url(consultation.id)}>
                                            ← Back to Details
                                        </a>
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Checkbox 1 */}
                                    <div className="space-y-1">
                                        <div className="flex items-start gap-2.5">
                                            <Checkbox
                                                id="read_privacy_notice"
                                                checked={data.read_privacy_notice}
                                                onCheckedChange={(checked) =>
                                                    setData('read_privacy_notice', checked === true)
                                                }
                                            />
                                            <Label
                                                htmlFor="read_privacy_notice"
                                                className="cursor-pointer text-sm leading-snug"
                                            >
                                                I have read and understood the Privacy Notice.
                                            </Label>
                                        </div>
                                        {errors.read_privacy_notice && (
                                            <p className="text-xs text-destructive pl-7">
                                                {errors.read_privacy_notice}
                                            </p>
                                        )}
                                    </div>

                                    {/* Checkbox 2 */}
                                    <div className="space-y-1">
                                        <div className="flex items-start gap-2.5">
                                            <Checkbox
                                                id="agree_identity_guard"
                                                checked={data.agree_identity_guard}
                                                onCheckedChange={(checked) =>
                                                    setData('agree_identity_guard', Boolean(checked))
                                                }
                                            />
                                            <Label
                                                htmlFor="agree_identity_guard"
                                                className="cursor-pointer text-sm leading-snug"
                                            >
                                                I agree to Identity Guard verification checks during
                                                the consultation.
                                            </Label>
                                        </div>
                                        {errors.agree_identity_guard && (
                                            <p className="text-xs text-destructive pl-7">
                                                {errors.agree_identity_guard}
                                            </p>
                                        )}
                                    </div>

                                    {/* Checkbox 3 */}
                                    <div className="space-y-1">
                                        <div className="flex items-start gap-2.5">
                                            <Checkbox
                                                id="agree_liveness_check"
                                                checked={data.agree_liveness_check}
                                                onCheckedChange={(checked) =>
                                                    setData('agree_liveness_check', Boolean(checked))
                                                }
                                            />
                                            <Label
                                                htmlFor="agree_liveness_check"
                                                className="cursor-pointer text-sm leading-snug"
                                            >
                                                I consent to liveness/security checks (if applicable).
                                            </Label>
                                        </div>
                                        {errors.agree_liveness_check && (
                                            <p className="text-xs text-destructive pl-7">
                                                {errors.agree_liveness_check}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={!allChecked || processing}
                                    >
                                        {processing ? 'Confirming…' : 'Agree & Confirm'}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        disabled
                                    >
                                        Download Copy
                                    </Button>

                                    <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
                                        Consent is required before proceeding to the teleconsultation
                                        lobby.
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
