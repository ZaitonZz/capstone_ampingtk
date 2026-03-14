import { Plus } from 'lucide-react';
import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';

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
    const { success, error } = useToast();
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [gender, setGender] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const formData = new FormData(e.currentTarget);
        const data = {
            ...Object.fromEntries(formData.entries()),
            gender, // Add gender from state since Select doesn't work with FormData
        };

        try {
            // Get CSRF token from meta tag
            const csrfElement = document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement;
            const csrfToken = csrfElement?.content || '';

            if (!csrfToken) {
                console.error('CSRF token not found in meta tag');
                error('Security token missing - page may need to be refreshed');
                return;
            }

            const response = await fetch('/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(data),
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
                if (responseData.errors) {
                    // Laravel validation errors come as {field: [message]}
                    const formattedErrors: Record<string, string> = {};
                    Object.entries(responseData.errors).forEach(
                        ([key, value]) => {
                            formattedErrors[key] = Array.isArray(value)
                                ? value[0]
                                : (value as string);
                        },
                    );
                    setErrors(formattedErrors);
                    error('Please check the form for errors');
                } else {
                    error(responseData.message || 'Failed to add patient');
                }
                return;
            }

            success('Patient added successfully!');

            // Reset form before closing dialog
            try {
                e.currentTarget.reset();
            } catch (resetError) {
                console.error('Error resetting form:', resetError);
            }

            onOpenChange(false);
            onSuccess();
            setGender(''); // Reset gender state
        } catch (err) {
            console.error('Fetch error:', err);
            error(
                `An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`,
            );
        } finally {
            setProcessing(false);
        }
    };

    // Reset form when dialog closes
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setGender('');
            setErrors({});
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="size-4" />
                    Add Patient
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogTitle>Add New Patient</DialogTitle>
                <DialogDescription>
                    Enter patient information to create a new record.
                </DialogDescription>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                                Sex <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={gender}
                                onValueChange={setGender}
                                required
                            >
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
                </form>
            </DialogContent>
        </Dialog>
    );
}
