import { Form } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { store as storePatient } from '@/actions/App/Http/Controllers/PatientController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type AddPatientDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export default function AddPatientDialog({
    open,
    onOpenChange,
    onSuccess,
}: AddPatientDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="size-4" />
                    Add Patient
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Add New Patient</DialogTitle>
                <DialogDescription>
                    Enter patient information to create a new record.
                </DialogDescription>

                <Form
                    {...storePatient.form()}
                    onSuccess={() => {
                        onOpenChange(false);
                        onSuccess();
                    }}
                    className="space-y-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">
                                        First Name{' '}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="first_name"
                                        name="first_name"
                                        required
                                        maxLength={100}
                                    />
                                    <InputError message={errors.first_name} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="last_name">
                                        Last Name{' '}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="last_name"
                                        name="last_name"
                                        required
                                        maxLength={100}
                                    />
                                    <InputError message={errors.last_name} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="middle_name">Middle Name</Label>
                                    <Input
                                        id="middle_name"
                                        name="middle_name"
                                        maxLength={100}
                                    />
                                    <InputError message={errors.middle_name} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date_of_birth">
                                        Date of Birth{' '}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="date_of_birth"
                                        name="date_of_birth"
                                        type="date"
                                        required
                                    />
                                    <InputError message={errors.date_of_birth} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="gender">
                                        Gender{' '}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Select name="gender" required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">
                                                Female
                                            </SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.gender} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="civil_status">
                                        Civil Status
                                    </Label>
                                    <Select name="civil_status">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="single">Single</SelectItem>
                                            <SelectItem value="married">
                                                Married
                                            </SelectItem>
                                            <SelectItem value="widowed">
                                                Widowed
                                            </SelectItem>
                                            <SelectItem value="separated">
                                                Separated
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.civil_status} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact_number">
                                        Contact Number
                                    </Label>
                                    <Input
                                        id="contact_number"
                                        name="contact_number"
                                        type="tel"
                                        maxLength={30}
                                    />
                                    <InputError message={errors.contact_number} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        maxLength={191}
                                    />
                                    <InputError message={errors.email} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" name="address" />
                                <InputError message={errors.address} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="blood_type">Blood Type</Label>
                                    <Select name="blood_type">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A+">A+</SelectItem>
                                            <SelectItem value="A-">A-</SelectItem>
                                            <SelectItem value="B+">B+</SelectItem>
                                            <SelectItem value="B-">B-</SelectItem>
                                            <SelectItem value="AB+">AB+</SelectItem>
                                            <SelectItem value="AB-">AB-</SelectItem>
                                            <SelectItem value="O+">O+</SelectItem>
                                            <SelectItem value="O-">O-</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.blood_type} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_name">
                                        Emergency Contact Name
                                    </Label>
                                    <Input
                                        id="emergency_contact_name"
                                        name="emergency_contact_name"
                                        maxLength={191}
                                    />
                                    <InputError
                                        message={errors.emergency_contact_name}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_number">
                                        Emergency Contact Number
                                    </Label>
                                    <Input
                                        id="emergency_contact_number"
                                        name="emergency_contact_number"
                                        type="tel"
                                        maxLength={30}
                                    />
                                    <InputError
                                        message={errors.emergency_contact_number}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="known_allergies">
                                    Known Allergies
                                </Label>
                                <Input
                                    id="known_allergies"
                                    name="known_allergies"
                                    placeholder="e.g., Penicillin, Peanuts"
                                />
                                <InputError message={errors.known_allergies} />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Adding...' : 'Add Patient'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
