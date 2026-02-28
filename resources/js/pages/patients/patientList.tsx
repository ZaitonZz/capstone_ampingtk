import { Head } from '@inertiajs/react';
import { Search, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import AddPatientDialog from '@/components/patients/add-patient-dialog';
import Pagination from '@/components/patients/pagination';
import PatientTable from '@/components/patients/patient-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { page as patientsListPage } from '@/routes/patients/index/index';
import type { BreadcrumbItem } from '@/types';
import type { Patient, PaginatedData } from '@/types/patient';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Patients',
        href: patientsListPage(),
    },
];

export default function PatientList() {
    const [patients, setPatients] = useState<PaginatedData<Patient> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValue, setFilterValue] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchPatients = async (page = 1, search = '') => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/patients?page=${page}&search=${encodeURIComponent(search)}`
            );
            const data = await response.json();
            setPatients(data);
        } catch (error) {
            console.error('Failed to fetch patients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchPatients(1, searchQuery);
    };

    const handlePageChange = (page: number) => {
        fetchPatients(page, searchQuery);
    };

    const handleAddPatientSuccess = () => {
        fetchPatients(1, searchQuery);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Patients" />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Patients</h1>
                </div>

                {/* Search and Actions Bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <form
                        onSubmit={handleSearch}
                        className="flex flex-1 gap-2 sm:max-w-md"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search: Name / MRN / Phone"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary">
                            Search
                        </Button>
                    </form>

                    <div className="flex gap-2">
                        <Select
                            value={filterValue}
                            onValueChange={setFilterValue}
                        >
                            <SelectTrigger className="w-32">
                                <Filter className="size-4" />
                                <SelectValue placeholder="Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>

                        <AddPatientDialog
                            open={isDialogOpen}
                            onOpenChange={setIsDialogOpen}
                            onSuccess={handleAddPatientSuccess}
                        />
                    </div>
                </div>

                {/* Patients Table */}
                <PatientTable
                    patients={patients?.data || []}
                    isLoading={isLoading}
                    onView={(patient) => console.log('View', patient)}
                    onEdit={(patient) => console.log('Edit', patient)}
                    onDelete={(patient) => console.log('Delete', patient)}
                />

                {/* Pagination */}
                {patients && patients.total > 0 && (
                    <Pagination
                        currentPage={patients.current_page}
                        lastPage={patients.last_page}
                        from={patients.from}
                        to={patients.to}
                        total={patients.total}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </AppLayout>
    );
}