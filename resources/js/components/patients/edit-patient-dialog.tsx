import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
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
import type { Patient } from '@/types/patient';

type EditPatientDialogProps = {
    patient: Patient | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export default function EditPatientDialog({
    patient,
    open,
    onOpenChange,
    onSuccess,
}: EditPatientDialogProps) {
    const { success, error } = useToast();
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [gender, setGender] = useState('');
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        middle_name: '',
        date_of_birth: '',
    });

    useEffect(() => {
        if (patient) {
            // Format date_of_birth to YYYY-MM-DD for date input
            let formattedDate = '';
            if (patient.date_of_birth) {
                // If already in YYYY-MM-DD format, use it directly
                if (
                    typeof patient.date_of_birth === 'string' &&
                    /^\d{4}-\d{2}-\d{2}$/.test(patient.date_of_birth)
                ) {
                    formattedDate = patient.date_of_birth;
                } else {
                    // Otherwise, try to parse and format it
                    const date = new Date(patient.date_of_birth);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toISOString().split('T')[0];
                    }
                }
            }

            setFormData({
                first_name: patient.first_name || '',
                last_name: patient.last_name || '',
                middle_name: patient.middle_name || '',
                date_of_birth: formattedDate,
            });
            setGender(patient.gender || '');
        }
    }, [patient]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!patient) return;

        setProcessing(true);
        setErrors({});

        const data = {
            ...formData,
            gender,
        };

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

            const response = await fetch(`/patients/${patient.id}`, {
                method: 'PATCH',
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
                    error(responseData.message || 'Failed to update patient');
                }
                return;
            }

            success('Patient updated successfully!');
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

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setErrors({});
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogTitle>Edit Patient</DialogTitle>
                <DialogDescription>
                    Update patient information.
                </DialogDescription>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit_first_name">
                                First Name{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_first_name"
                                value={formData.first_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        first_name: e.target.value,
                                    })
                                }
                                required
                                maxLength={100}
                            />
                            <InputError message={errors.first_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_last_name">
                                Last Name{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_last_name"
                                value={formData.last_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        last_name: e.target.value,
                                    })
                                }
                                required
                                maxLength={100}
                            />
                            <InputError message={errors.last_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_middle_name">
                                Middle Name
                            </Label>
                            <Input
                                id="edit_middle_name"
                                value={formData.middle_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        middle_name: e.target.value,
                                    })
                                }
                                maxLength={100}
                            />
                            <InputError message={errors.middle_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_date_of_birth">
                                Date of Birth{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_date_of_birth"
                                value={formData.date_of_birth}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        date_of_birth: e.target.value,
                                    })
                                }
                                type="date"
                                required
                            />
                            <InputError message={errors.date_of_birth} />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="edit_gender">
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
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
