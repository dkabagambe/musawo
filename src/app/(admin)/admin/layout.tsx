import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import type { DashboardTab } from "@/lib/dashboard/widgets";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  Settings,
  Search,
  MapPinned,
  Wrench,
  Bell,
  ClipboardList,
  Library,
  BookOpen,
  Layers,
  CheckSquare,
  ClipboardCheck,
  BarChart,
  FileText,
  BarChart2,
  Megaphone,
  User,
  CreditCard,
  LifeBuoy,
  Mail,
  Globe,
} from "lucide-react";

const NAV: Array<{ item: NavItem; permission: Parameters<typeof can>[1] }> = [
  // ── Spec tabs (section 4) ──────────────────────────────────────────
  {
    item: {
      href: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    permission: "reports.operational",
  },
  {
    item: {
      href: "/admin/students",
      label: "Student Lookup",
      icon: <Users className="w-4 h-4" />,
    },
    permission: "students.view",
  },
  {
    item: {
      href: "/admin/admissions",
      label: "Admissions",
      icon: <ClipboardList className="w-4 h-4" />,
    },
    permission: "applications.view",
  },
  {
    item: {
      href: "/admin/tutors",
      label: "Instructors",
      icon: <GraduationCap className="w-4 h-4" />,
    },
    permission: "staff.create.approve",
  },
  {
    item: {
      href: "/admin/programmes",
      label: "Academic Programmes",
      icon: <Library className="w-4 h-4" />,
    },
    permission: "courses.view",
  },
  {
    item: {
      href: "/admin/courses",
      label: "Courses",
      icon: <BookOpen className="w-4 h-4" />,
    },
    permission: "courses.create",
  },
  {
    item: {
      href: "/admin/classes",
      label: "Classes & Groups",
      icon: <Layers className="w-4 h-4" />,
    },
    permission: "classes.view",
  },
  {
    item: {
      href: "/admin/intakes",
      label: "Academic Years & Semesters",
      icon: <Calendar className="w-4 h-4" />,
    },
    permission: "courses.publish",
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
      href: "/admin/attendance",
      label: "Attendance",
      icon: <CheckSquare className="w-4 h-4" />,
    },
    permission: "attendance.view",
  },
  {
    item: {
      href: "/admin/examinations",
      label: "Examinations",
      icon: <ClipboardCheck className="w-4 h-4" />,
    },
    permission: "exams.create",
  },
  {
    item: {
      href: "/admin/results",
      label: "Results & Grading",
      icon: <BarChart className="w-4 h-4" />,
    },
    permission: "grades.view",
  },
  {
    item: {
      href: "/admin/reports",
      label: "Reports",
      icon: <BarChart2 className="w-4 h-4" />,
    },
    permission: "reports.view",
  },
  {
    item: {
      href: "/admin/announcements",
      label: "Announcements",
      icon: <Megaphone className="w-4 h-4" />,
    },
    permission: "announcements.manage",
  },
  {
    item: {
      href: "/admin/notifications",
      label: "Notifications",
      icon: <Bell className="w-4 h-4" />,
    },
    permission: "students.view",
  },
  {
    item: {
      href: "/admin/profile",
      label: "Profile",
      icon: <User className="w-4 h-4" />,
    },
    permission: "students.view",
  },
  // ── ADD items (meeting notes) ─────────────────────────────────────
  {
    item: {
      href: "/admin/payments",
      label: "Payments",
      icon: <CreditCard className="w-4 h-4" />,
    },
    permission: "finance.totals.view",
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
      href: "/admin/support",
      label: "Support",
      icon: <LifeBuoy className="w-4 h-4" />,
    },
    permission: "support.submit",
  },
  {
    item: {
      href: "/admin/documents",
      label: "Student Documents",
      icon: <FileText className="w-4 h-4" />,
    },
    permission: "student.documents.manage",
  },
  // ── Extra tabs (operations, not in spec but useful) ────────────────
  {
    item: {
      href: "/admin/invites",
      label: "Invites",
      icon: <Mail className="w-4 h-4" />,
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
      href: "/admin/partner-pages",
      label: "Partner Pages",
      icon: <Globe className="w-4 h-4" />,
    },
    permission: "settings.edit.operational",
  },
  {
    item: {
      href: "/admin/audit",
      label: "Audit Log",
      icon: <Search className="w-4 h-4" />,
    },
    permission: "audit.view.full",
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
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });
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
      userAvatarUrl={dbUser?.avatarUrl ?? null}
      tabs={tabs}
    >
      {children}
    </AppShell>
  );
}
