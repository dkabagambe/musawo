import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import type { DashboardTab } from "@/lib/dashboard/widgets";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  Settings,
  Search,
  HeadphonesIcon,
  MapPinned,
  Wrench,
  Bell,
  UserRoundSearch,
} from "lucide-react";

const NAV: Array<{ item: NavItem; permission: Parameters<typeof can>[1] }> = [
  {
    item: {
      href: "/admin",
      label: "Overview",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    permission: "reports.operational",
  },
  {
    item: {
      href: "/admin/tutors",
      label: "Staff",
      icon: <GraduationCap className="w-4 h-4" />,
    },
    permission: "staff.view",
  },
  {
    item: {
      href: "/admin/students",
      label: "Student Lookup",
      icon: <UserRoundSearch className="w-4 h-4" />,
    },
    permission: "students.lookup",
  },
  {
    item: {
      href: "/admin/intakes",
      label: "Intakes",
      icon: <Calendar className="w-4 h-4" />,
    },
    permission: "intakes.manage",
  },
  {
    item: {
      href: "/admin/support",
      label: "Support",
      icon: <HeadphonesIcon className="w-4 h-4" />,
    },
    permission: "support.manage",
  },
  {
    item: {
      href: "/admin/invites",
      label: "Invites",
      icon: <Users className="w-4 h-4" />,
    },
    permission: "invites.resend",
  },
  {
    item: {
      href: "/admin/leave",
      label: "Leave",
      icon: <Calendar className="w-4 h-4" />,
    },
    permission: "staff.leave.manage",
  },
  {
    item: {
      href: "/admin/access-review",
      label: "Access Review",
      icon: <Search className="w-4 h-4" />,
    },
    permission: "staff.access_review",
  },
  {
    item: {
      href: "/admin/timetable",
      label: "Timetable",
      icon: <MapPinned className="w-4 h-4" />,
    },
    permission: "venues.manage",
  },
  {
    item: {
      href: "/admin/equipment",
      label: "Equipment",
      icon: <Wrench className="w-4 h-4" />,
    },
    permission: "equipment.manage",
  },
  {
    item: {
      href: "/admin/notices",
      label: "Notices",
      icon: <Bell className="w-4 h-4" />,
    },
    permission: "operational_notices.manage",
  },
  {
    item: {
      href: "/admin/settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
    },
    permission: "settings.edit.operational",
  },
  {
    item: {
      href: "/admin/audit",
      label: "Audit Log",
      icon: <Search className="w-4 h-4" />,
    },
    permission: "audit.view",
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (
    !session?.user ||
    !(
      [
        "staff.view",
        "support.manage",
        "settings.edit.operational",
        "students.lookup",
      ] as const
    ).some((p) => can(session.user.role, p))
  )
    redirect("/403");
  const name = session.user.name ?? "Admin";
  const tabs: DashboardTab[] = [
    "general",
    ...(can(session.user.role, "staff.view") ? (["staff"] as DashboardTab[]) : []),
    ...(can(session.user.role, "staff.leave.manage") ? (["leave"] as DashboardTab[]) : []),
    ...(can(session.user.role, "support.manage") &&
    !can(session.user.role, "staff.leave.manage")
      ? (["support", "timetable"] as DashboardTab[])
      : []),
    ...(can(session.user.role, "reports.operational") ? (["operations"] as DashboardTab[]) : []),
  ];
  return (
    <AppShell
      nav={NAV.filter(({ permission }) =>
        can(session.user.role, permission),
      ).map(({ item }) => item)}
      role="Administration"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={tabs}
    >
      {children}
    </AppShell>
  );
}
