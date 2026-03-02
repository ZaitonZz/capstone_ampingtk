import { Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Patient } from '@/types/patient';

type PatientTableProps = {
    patients: Patient[];
    isLoading: boolean;
    onView?: (patient: Patient) => void;
    onEdit?: (patient: Patient) => void;
    onDelete?: (patient: Patient) => void;
};

export default function PatientTable({
    patients,
    isLoading,
    onView,
    onEdit,
    onDelete,
}: PatientTableProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-sidebar">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                MRN
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Age
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Sex
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Last Visit
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                                >
                                    Loading patients...
                                </td>
                            </tr>
                        ) : patients.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                                >
                                    No patients found
                                </td>
                            </tr>
                        ) : (
                            patients.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className="hover:bg-muted/30 transition-colors"
                                >
                                    <td className="px-4 py-3 text-sm">
                                        {patient.id.toString().padStart(6, '0')}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium">
                                        {patient.last_name}, {patient.first_name}
                                        {patient.middle_name &&
                                            ` ${patient.middle_name.charAt(0)}.`}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {patient.age}
                                    </td>
                                    <td className="px-4 py-3 text-sm capitalize">
                                        {patient.gender}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {formatDate(patient.updated_at)}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex gap-2">
                                            {onView && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8"
                                                    onClick={() => onView(patient)}
                                                    aria-label="View patient details"
                                                >
                                                    <Eye className="size-4" />
                                                </Button>
                                            )}
                                            {onEdit && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8"
                                                    onClick={() => onEdit(patient)}
                                                    aria-label="Edit patient information"
                                                >
                                                    <Edit className="size-4" />
                                                </Button>
                                            )}
                                            {onDelete && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8 text-destructive hover:text-destructive"
                                                    onClick={() => onDelete(patient)}
                                                    aria-label="Delete patient"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
