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

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="gender">
                                        Sex{' '}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Select name="gender" required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select sex" />
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
