import { Head, useForm, Link } from '@inertiajs/react';
import { useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { toast } from 'sonner';
import * as PatientController from '@/actions/App/Http/Controllers/PatientController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Patients', href: PatientController.index.url() },
    { title: 'Create Patient', href: PatientController.create.url() },
];

export default function PatientCreate() {
    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        address: '',
        profile_photo: null as File | null,
        gender: 'other',
    });

    const imagePreviewUrl = useMemo(() => {
        if (!data.profile_photo) {
            return null;
        }

        return URL.createObjectURL(data.profile_photo);
    }, [data.profile_photo]);

    function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
        setData('profile_photo', event.target.files?.[0] ?? null);
    }

    function submit(e: FormEvent) {
        e.preventDefault();

        post(PatientController.store.url(), {
            forceFormData: true,
            onError: () => {
                toast.error('Please fix the errors and try again.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Patient" />

            <div className="mx-auto max-w-4xl p-4 md:p-6">
                <h1 className="mb-2 text-3xl font-semibold">Create New Patient</h1>
                <p className="mb-6 text-muted-foreground">
                    A patient account is automatically generated after record creation.
                </p>

                <form onSubmit={submit} className="space-y-8">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="first_name">First Name</Label>
                            <Input
                                id="first_name"
                                value={data.first_name}
                                onChange={(e) => setData('first_name', e.target.value)}
                            />
                            {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input
                                id="last_name"
                                value={data.last_name}
                                onChange={(e) => setData('last_name', e.target.value)}
                            />
                            {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                            />
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="date_of_birth">Date of Birth</Label>
                            <Input
                                id="date_of_birth"
                                type="date"
                                value={data.date_of_birth}
                                onChange={(e) => setData('date_of_birth', e.target.value)}
                            />
                            {errors.date_of_birth && <p className="text-sm text-destructive">{errors.date_of_birth}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <textarea
                                id="address"
                                rows={3}
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                            {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <Label htmlFor="profile_photo">Profile Photo</Label>
                            <Input id="profile_photo" type="file" accept="image/*" onChange={handlePhotoChange} />
                            {errors.profile_photo && <p className="text-sm text-destructive">{errors.profile_photo}</p>}
                        </div>

                        {imagePreviewUrl && (
                            <div className="md:col-span-2">
                                <img src={imagePreviewUrl} alt="Profile preview" className="h-32 w-32 rounded-md object-cover" />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating…' : 'Create Patient'}
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={PatientController.index.url()}>
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
