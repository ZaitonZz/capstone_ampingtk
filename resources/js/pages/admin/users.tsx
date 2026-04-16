import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Search, ShieldCheck, UserCog } from 'lucide-react';
import { FormEvent, useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { dashboard as adminDashboard } from '@/routes/admin';
import * as AdminUsersRoute from '@/routes/admin/users';
import type { BreadcrumbItem } from '@/types';
import type { UserRole, UserStatus } from '@/types/auth';

type DoctorProfilePayload = {
    specialty: string;
    license_number: string;
    clinic_name: string;
    clinic_address: string;
    phone: string;
    bio: string;
};

type UserFormPayload = {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    doctor_profile: DoctorProfilePayload;
};

type UserItem = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    must_change_password: boolean;
    doctor_profile: DoctorProfilePayload | null;
};

type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    users: PaginatedData<UserItem>;
    filters: {
        search?: string | null;
        role?: UserRole | null;
        status?: UserStatus | null;
    };
    options: {
        roles: UserRole[];
        statuses: UserStatus[];
    };
};

const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Admin',
    doctor: 'Doctor',
    medicalstaff: 'Medical Staff',
    patient: 'Patient',
};

const STATUS_BADGE_VARIANT: Record<UserStatus, 'default' | 'secondary' | 'destructive'> = {
    active: 'default',
    inactive: 'secondary',
    suspended: 'destructive',
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminDashboard(),
    },
    {
        title: 'User Management',
        href: AdminUsersRoute.index(),
    },
];

function emptyDoctorProfile(): DoctorProfilePayload {
    return {
        specialty: '',
        license_number: '',
        clinic_name: '',
        clinic_address: '',
        phone: '',
        bio: '',
    };
}

function emptyUserForm(): UserFormPayload {
    return {
        name: '',
        email: '',
        role: 'patient',
        status: 'active',
        doctor_profile: emptyDoctorProfile(),
    };
}

export default function AdminUsers({ users, filters, options }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [roleFilter, setRoleFilter] = useState(filters.role ?? 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);

    const createForm = useForm<UserFormPayload>(emptyUserForm());
    const updateForm = useForm<UserFormPayload>(emptyUserForm());

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            AdminUsersRoute.index(),
            {
                search: search || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    }

    function openCreateDialog() {
        createForm.reset();
        setIsCreateDialogOpen(true);
    }

    function openEditDialog(user: UserItem) {
        setEditingUser(user);
        updateForm.clearErrors();
        updateForm.setData({
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            doctor_profile: user.doctor_profile ?? emptyDoctorProfile(),
        });
        setIsEditDialogOpen(true);
    }

    function createUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        createForm.post(AdminUsersRoute.store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setIsCreateDialogOpen(false);
            },
        });
    }

    function updateUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!editingUser) {
            return;
        }

        updateForm.patch(AdminUsersRoute.update.url(editingUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />

            <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <UserCog className="h-6 w-6" />
                            User Management
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Appoint roles and update account status for platform users.
                        </p>
                    </div>

                    <Button type="button" onClick={openCreateDialog}>
                        <Plus className="mr-1 h-4 w-4" />
                        Create User
                    </Button>
                </div>

                <form onSubmit={applyFilters} className="rounded-xl border p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="search" className="mb-2 block">
                                Search
                            </Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    className="pl-9"
                                    placeholder="Name or email"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="role_filter" className="mb-2 block">
                                Role
                            </Label>
                            <select
                                id="role_filter"
                                value={roleFilter}
                                onChange={(event) => setRoleFilter(event.target.value as UserRole | 'all')}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="all">All roles</option>
                                {options.roles.map((role) => (
                                    <option key={role} value={role}>
                                        {ROLE_LABELS[role]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="status_filter" className="mb-2 block">
                                Status
                            </Label>
                            <select
                                id="status_filter"
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as UserStatus | 'all')}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="all">All status</option>
                                {options.statuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                        <Button type="submit" variant="secondary" size="sm">
                            Apply Filters
                        </Button>
                    </div>
                </form>

                <div className="rounded-xl border">
                    {users.data.length === 0 ? (
                        <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                            <ShieldCheck className="h-5 w-5" />
                            <span>No users matched the current filters.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Name</th>
                                        <th className="px-3 py-2 font-medium">Email</th>
                                        <th className="px-3 py-2 font-medium">Role</th>
                                        <th className="px-3 py-2 font-medium">Status</th>
                                        <th className="px-3 py-2 font-medium">Password</th>
                                        <th className="px-3 py-2 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.data.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-3 py-2">{user.name}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
                                            <td className="px-3 py-2">
                                                <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant={STATUS_BADGE_VARIANT[user.status]}>
                                                    {user.status}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {user.must_change_password ? 'Change required' : 'Up to date'}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditDialog(user)}
                                                >
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create User</DialogTitle>
                        <DialogDescription>
                            Create an account and appoint a system role.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={createUser} className="space-y-4">
                        <UserFormFields
                            data={createForm.data}
                            setData={createForm.setData}
                            errors={createForm.errors}
                            roles={options.roles}
                            statuses={options.statuses}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing}>
                                Save User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update account role, status, and profile details.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={updateUser} className="space-y-4">
                        <UserFormFields
                            data={updateForm.data}
                            setData={updateForm.setData}
                            errors={updateForm.errors}
                            roles={options.roles}
                            statuses={options.statuses}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateForm.processing}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

type UserFormFieldsProps = {
    data: UserFormPayload;
    setData: (key: keyof UserFormPayload, value: UserFormPayload[keyof UserFormPayload]) => void;
    errors: Record<string, string>;
    roles: UserRole[];
    statuses: UserStatus[];
};

function UserFormFields({ data, setData, errors, roles, statuses }: UserFormFieldsProps) {
    const isDoctorRole = data.role === 'doctor';

    const setDoctorProfileField = (key: keyof DoctorProfilePayload, value: string) => {
        setData('doctor_profile', {
            ...data.doctor_profile,
            [key]: value,
        });
    };

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(event) => setData('name', event.target.value)}
                        required
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(event) => setData('email', event.target.value)}
                        required
                    />
                    <InputError message={errors.email} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                        id="role"
                        value={data.role}
                        onChange={(event) => setData('role', event.target.value as UserRole)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                    >
                        {roles.map((role) => (
                            <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.role} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                        id="status"
                        value={data.status}
                        onChange={(event) => setData('status', event.target.value as UserStatus)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                    >
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.status} />
                </div>
            </div>

            {isDoctorRole ? (
                <div className="space-y-4 rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold">Doctor Profile</h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="specialty">Specialty</Label>
                            <Input
                                id="specialty"
                                value={data.doctor_profile.specialty}
                                onChange={(event) => setDoctorProfileField('specialty', event.target.value)}
                                required
                            />
                            <InputError message={errors['doctor_profile.specialty']} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="license_number">License Number</Label>
                            <Input
                                id="license_number"
                                value={data.doctor_profile.license_number}
                                onChange={(event) => setDoctorProfileField('license_number', event.target.value)}
                                required
                            />
                            <InputError message={errors['doctor_profile.license_number']} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="clinic_name">Clinic Name</Label>
                            <Input
                                id="clinic_name"
                                value={data.doctor_profile.clinic_name}
                                onChange={(event) => setDoctorProfileField('clinic_name', event.target.value)}
                            />
                            <InputError message={errors['doctor_profile.clinic_name']} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={data.doctor_profile.phone}
                                onChange={(event) => setDoctorProfileField('phone', event.target.value)}
                            />
                            <InputError message={errors['doctor_profile.phone']} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="clinic_address">Clinic Address</Label>
                        <Input
                            id="clinic_address"
                            value={data.doctor_profile.clinic_address}
                            onChange={(event) => setDoctorProfileField('clinic_address', event.target.value)}
                        />
                        <InputError message={errors['doctor_profile.clinic_address']} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <textarea
                            id="bio"
                            value={data.doctor_profile.bio}
                            onChange={(event) => setDoctorProfileField('bio', event.target.value)}
                            className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <InputError message={errors['doctor_profile.bio']} />
                    </div>
                </div>
            ) : null}

            <InputError message={errors.doctor_profile} />
        </>
    );
}
