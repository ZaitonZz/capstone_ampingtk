import { Head } from '@inertiajs/react';
import { Search, Filter } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import AddPatientDialog from '@/components/patients/add-patient-dialog';
import EditPatientDialog from '@/components/patients/edit-patient-dialog';
import ViewPatientDialog from '@/components/patients/view-patient-dialog';
import DeletePatientDialog from '@/components/patients/delete-patient-dialog';
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
import { list as patientsList } from '@/routes/patients';
import type { BreadcrumbItem } from '@/types';
import type { Patient, PaginatedData } from '@/types/patient';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Patients',
        href: patientsList(),
    },
];

export default function PatientList() {
    const [patients, setPatients] = useState<PaginatedData<Patient> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValue, setFilterValue] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const initialMount = useRef(true);

    const fetchPatients = async (page = 1, search = '', filter = 'all') => {
        setIsLoading(true);
        try {
            let url = `/patients?page=${page}&search=${encodeURIComponent(search)}`;
            if (filter !== 'all') {
                url += `&gender=${encodeURIComponent(filter)}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            setPatients(data);
        } catch (error) {
            console.error('Failed to fetch patients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchPatients(1, searchQuery, filterValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Trigger when filter changes (but not on initial mount)
    useEffect(() => {
        if (initialMount.current) {
            initialMount.current = false;
            return;
        }
        fetchPatients(1, searchQuery, filterValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterValue]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchPatients(1, searchQuery, filterValue);
    };

    const handlePageChange = (page: number) => {
        fetchPatients(page, searchQuery, filterValue);
    };

    const handleAddPatientSuccess = () => {
        fetchPatients(1, searchQuery, filterValue);
    };

    const handleViewPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setIsViewDialogOpen(true);
    };

    const handleEditPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setIsEditDialogOpen(true);
    };

    const handleDeletePatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setIsDeleteDialogOpen(true);
    };

    const handleDialogSuccess = () => {
        fetchPatients(patients?.current_page || 1, searchQuery, filterValue);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Patients" />

            <div className="space-y-6 p-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Patients</h1>
                    <p className="text-sm text-muted-foreground">Manage patient records</p>
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
                            open={isAddDialogOpen}
                            onOpenChange={setIsAddDialogOpen}
                            onSuccess={handleAddPatientSuccess}
                        />
                    </div>
                </div>

                {/* Patients Table */}
                <PatientTable
                    patients={patients?.data || []}
                    isLoading={isLoading}
                    onView={handleViewPatient}
                    onEdit={handleEditPatient}
                    onDelete={handleDeletePatient}
                />

                {/* Dialogs */}
                <ViewPatientDialog
                    patient={selectedPatient}
                    open={isViewDialogOpen}
                    onOpenChange={setIsViewDialogOpen}
                />

                <EditPatientDialog
                    patient={selectedPatient}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSuccess={handleDialogSuccess}
                />

                <DeletePatientDialog
                    patient={selectedPatient}
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    onSuccess={handleDialogSuccess}
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