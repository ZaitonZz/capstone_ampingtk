import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { destroy as destroyPatient } from '@/actions/App/Http/Controllers/PatientController';
import type { Patient } from '@/types/patient';

type DeletePatientDialogProps = {
    patient: Patient | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export default function DeletePatientDialog({
    patient,
    open,
    onOpenChange,
    onSuccess,
}: DeletePatientDialogProps) {
    const { success, error } = useToast();
    const [processing, setProcessing] = useState(false);

    const handleDelete = async () => {
        if (!patient) return;

        setProcessing(true);

        try {
            const csrfElement = document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement;
            const csrfToken = csrfElement?.content || '';

            if (!csrfToken) {
                console.error('CSRF token not found in meta tag');
                error('Security token missing - page may need to be refreshed');
                return;
            }

            const response = await fetch(destroyPatient.url(patient.id), {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            const responseText = await response.text();

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse response as JSON:', parseError);
                error('Invalid response from server');
                return;
            }

            if (!response.ok) {
                error(responseData.message || 'Failed to delete patient');
                return;
            }

            success('Patient deleted successfully');
            onOpenChange(false);
            onSuccess();
        } catch (err) {
            console.error('Fetch error:', err);
            error(
                `An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`,
            );
        } finally {
            setProcessing(false);
        }
    };

    if (!patient) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogTitle>Delete Patient</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete this patient record?
                </DialogDescription>

                <div className="py-4">
                    <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm font-medium">
                            {patient.last_name}, {patient.first_name}
                            {patient.middle_name &&
                                ` ${patient.middle_name.charAt(0)}.`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            MRN: {patient.id.toString().padStart(6, '0')}
                        </p>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                        This action will soft-delete the patient record. The
                        data will be archived and can be recovered if needed.
                    </p>
                </div>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={processing}
                    >
                        {processing ? 'Deleting...' : 'Delete Patient'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
