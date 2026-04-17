import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    ContactRound,
    LayoutGrid,
    CalendarDays,
    ClipboardList,
    Stethoscope,
    Pill,
    ShieldAlert,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as adminDeepfakeAlerts } from '@/routes/admin/deepfake-alerts';
import { index as adminDeepfakeLogs } from '@/routes/admin/deepfake-logs';
import { index as adminDeepfakeVerifications } from '@/routes/admin/deepfake-verifications';
import { index as adminMicrocheckLogs } from '@/routes/admin/microcheck-logs';
import { index as adminUsers } from '@/routes/admin/users';
import { index as consultations } from '@/routes/consultations';
import { dashboard as doctorDashboard } from '@/routes/doctor';
import { dashboard as patientDashboard } from '@/routes/patient';
import { index as patientConsultations } from '@/routes/patient/consultations';
import { index as patientsList } from '@/routes/patients';
import type { NavItem } from '@/types';

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const user = usePage().props.auth.user;
    const isPatient = user.role === 'patient';
    const isMedicalStaff =
        user.role === 'doctor' ||
        user.role === 'admin' ||
        user.role === 'medicalstaff';
    const isAdmin = user.role === 'admin';
    const dashboardHref = isPatient
        ? patientDashboard()
        : user.role === 'doctor'
            ? doctorDashboard()
            : user.role === 'admin'
                ? adminDashboard()
                : user.role === 'medicalstaff'
                    ? '/medicalstaff/dashboard'
                    : dashboard();

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardHref,
            icon: LayoutGrid,
        },
    ];

    if (isMedicalStaff) {
        mainNavItems.push({
            title: 'Patient List',
            href: patientsList(),
            icon: ClipboardList,
        });
        mainNavItems.push({
            title: 'Consultations',
            href: consultations(),
            icon: ContactRound,
        });
    }

    if (isPatient) {
        mainNavItems.push({
            title: 'Appointments',
            href: patientConsultations(),
            icon: CalendarDays,
        });
        mainNavItems.push({
            title: 'Consultation Lobby',
            href: '/patient/lobby',
            icon: Stethoscope,
        });
        mainNavItems.push({
            title: 'Medical Records',
            href: '/patient/medical-records',
            icon: ClipboardList,
        });
        mainNavItems.push({
            title: 'Prescriptions',
            href: '/patient/prescriptions',
            icon: Pill,
        });
    }

    if (isAdmin) {
        mainNavItems.push({
            title: 'User Management',
            href: adminUsers(),
            icon: Users,
        });
        mainNavItems.push({
            title: 'Microcheck Logs',
            href: adminMicrocheckLogs(),
            icon: ClipboardList,
        });
        mainNavItems.push({
            title: 'Deepfake Logs',
            href: adminDeepfakeLogs(),
            icon: ShieldAlert,
        });
        mainNavItems.push({
            title: 'Deepfake Verification',
            href: adminDeepfakeVerifications(),
            icon: ShieldCheck,
        });
        mainNavItems.push({
            title: 'Deepfake Alerts',
            href: adminDeepfakeAlerts(),
            icon: ShieldAlert,
        });
    }

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboardHref} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
