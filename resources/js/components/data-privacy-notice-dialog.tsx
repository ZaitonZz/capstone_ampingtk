import { Link } from '@inertiajs/react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const DATA_PRIVACY_NOTICE_STORAGE_KEY = 'ampingtk:data-privacy-notice-acknowledged';

export default function DataPrivacyNoticeDialog() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        try {
            setOpen(window.localStorage.getItem(DATA_PRIVACY_NOTICE_STORAGE_KEY) !== 'true');
        } catch {
            setOpen(true);
        }
    }, []);

    const acknowledgeNotice = () => {
        try {
            window.localStorage.setItem(DATA_PRIVACY_NOTICE_STORAGE_KEY, 'true');
        } catch {
            // Ignore storage failures and still close the dialog.
        }

        setOpen(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    acknowledgeNotice();
                    return;
                }

                setOpen(true);
            }}
        >
            <DialogContent className="max-h-[calc(100vh-1.5rem)] max-w-[min(92vw,34rem)] overflow-y-auto p-0 shadow-2xl">
                <div className="relative overflow-hidden">
                    <div className="relative min-h-56 w-full bg-emerald-950 flex items-center justify-center sm:min-h-64">
                        <img
                            src="/images/Data_privacy.png"
                            alt="AMPING_TK data privacy notice"
                            className="h-full w-full object-contain opacity-90 p-4"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />

                        <div className="absolute inset-x-0 bottom-4 left-0 right-0 flex justify-center">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur-sm">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Your privacy matters
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 p-5 sm:p-6">
                        <DialogHeader className="space-y-2 text-left">
                            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                Data Privacy Notice
                            </DialogTitle>
                            <DialogDescription className="text-sm leading-6 text-muted-foreground sm:text-[15px]">
                                By continuing to use AMPING_TK, you acknowledge that personal, identity, and consultation-related data may be processed securely to support teleconsultation services and comply with applicable privacy requirements.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground shadow-sm">
                            <p>
                                We handle your information to support account access, secure communication, consultation workflows, and identity protection.
                            </p>
                            <p className="mt-2">
                                Please review the full policy before proceeding.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <Button asChild variant="outline" className="w-full sm:w-auto">
                                <Link href="/privacy-policy" className="inline-flex items-center justify-center gap-2">
                                    <span>View Data Privacy Policy</span>
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </Button>

                            <Button
                                type="button"
                                onClick={acknowledgeNotice}
                                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                            >
                                I Understand
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}