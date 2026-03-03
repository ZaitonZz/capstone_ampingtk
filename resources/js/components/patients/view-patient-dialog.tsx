import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Patient } from '@/types/patient';

type ViewPatientDialogProps = {
    patient: Patient | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function ViewPatientDialog({
    patient,
    open,
    onOpenChange,
}: ViewPatientDialogProps) {
    if (!patient) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Patient Details</DialogTitle>
                <DialogDescription>
                    MRN: {patient.id.toString().padStart(6, '0')}
                </DialogDescription>

                <div className="space-y-6 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">
                                First Name
                            </dt>
                            <dd className="mt-1 text-sm">{patient.first_name}</dd>
                        </div>

                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">
                                Last Name
                            </dt>
                            <dd className="mt-1 text-sm">{patient.last_name}</dd>
                        </div>

                        {patient.middle_name && (
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Middle Name
                                </dt>
                                <dd className="mt-1 text-sm">
                                    {patient.middle_name}
                                </dd>
                            </div>
                        )}

                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">
                                Date of Birth
                            </dt>
                            <dd className="mt-1 text-sm">
                                {formatDate(patient.date_of_birth)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">
                                Age
                            </dt>
                            <dd className="mt-1 text-sm">{patient.age} years</dd>
                        </div>

                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">
                                Sex
                            </dt>
                            <dd className="mt-1 text-sm capitalize">
                                {patient.gender}
                            </dd>
                        </div>

                        {patient.civil_status && (
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Civil Status
                                </dt>
                                <dd className="mt-1 text-sm capitalize">
                                    {patient.civil_status}
                                </dd>
                            </div>
                        )}

                        {patient.contact_number && (
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Contact Number
                                </dt>
                                <dd className="mt-1 text-sm">
                                    {patient.contact_number}
                                </dd>
                            </div>
                        )}

                        {patient.email && (
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Email
                                </dt>
                                <dd className="mt-1 text-sm">{patient.email}</dd>
                            </div>
                        )}

                        {patient.blood_type && (
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Blood Type
                                </dt>
                                <dd className="mt-1 text-sm">{patient.blood_type}</dd>
                            </div>
                        )}
                    </div>

                    {patient.address && (
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">
                                Address
                            </dt>
                            <dd className="mt-1 text-sm">{patient.address}</dd>
                        </div>
                    )}

                    {patient.known_allergies && (
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">
                                Known Allergies
                            </dt>
                            <dd className="mt-1 text-sm">{patient.known_allergies}</dd>
                        </div>
                    )}

                    {patient.emergency_contact_name && (
                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium mb-3">
                                Emergency Contact
                            </h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">
                                        Name
                                    </dt>
                                    <dd className="mt-1 text-sm">
                                        {patient.emergency_contact_name}
                                    </dd>
                                </div>
                                {patient.emergency_contact_number && (
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">
                                            Phone Number
                                        </dt>
                                        <dd className="mt-1 text-sm">
                                            {patient.emergency_contact_number}
                                        </dd>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t">
                        <div className="grid gap-4 sm:grid-cols-2 text-xs text-muted-foreground">
                            <div>
                                <dt className="font-medium">Created</dt>
                                <dd className="mt-1">
                                    {formatDate(patient.created_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium">Last Updated</dt>
                                <dd className="mt-1">
                                    {formatDate(patient.updated_at)}
                                </dd>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
