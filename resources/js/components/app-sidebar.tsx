import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    ContactRound,
    LayoutGrid,
    ClipboardList,
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
import { index as consultations } from '@/routes/consultations';
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
    const isMedicalStaff = user.role === 'doctor' || user.role === 'admin';

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
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
            title: 'My Consultations',
            href: patientConsultations(),
            icon: ContactRound,
        });
    }

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
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
