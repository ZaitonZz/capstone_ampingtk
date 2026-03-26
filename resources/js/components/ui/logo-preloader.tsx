import AppLogoIcon from '@/components/app-logo-icon';
import { Spinner } from '@/components/ui/spinner';

type LogoPreloaderProps = {
    text?: string;
};

export default function LogoPreloader({ text = 'Please wait...' }: LogoPreloaderProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card/95 px-8 py-6 shadow-lg">
                <AppLogoIcon className="h-14 w-14 animate-pulse" />
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Spinner className="h-4 w-4" />
                    <span>{text}</span>
                </div>
            </div>
        </div>
    );
}
