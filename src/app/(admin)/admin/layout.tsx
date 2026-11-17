import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import type { DashboardTab } from "@/lib/dashboard/widgets";
import { getInitials } from "@/lib/utils/initials";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  MapPinned,
  Wrench,
  Bell,
  ClipboardList,
  Library,
  BookOpen,
  Layers,
  CheckSquare,
  ClipboardCheck,
  BarChart2,
  FileText,
  Megaphone,
  User,
  CreditCard,
  LifeBuoy,
  Mail,
  FileCheck,
  UserPlus,
} from "lucide-react";

// Admin sidebar structure per admin.md A2.2
const NAV: Array<{ item: NavItem; permission: Parameters<typeof can>[1] }> = [
  // ── Overview ──────────────────────────────────────────────────────
  {
    item: {
      href: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      group: "Overview",
    },
    permission: "reports.operational",
  },
  // ── People ────────────────────────────────────────────────────────
  {
    item: {
      href: "/admin/students",
      label: "Students",
      icon: <Users className="w-4 h-4" />,
      group: "People",
    },
    permission: "students.view",
  },
  {
    item: {
      href: "/admin/admissions",
      label: "Admissions",
      icon: <UserPlus className="w-4 h-4" />,
      group: "People",
    },
    permission: "applications.view",
  },
  {
    item: {
      href: "/admin/tutors",
      label: "Instructors",
      icon: <GraduationCap className="w-4 h-4" />,
      group: "People",
    },
    permission: "staff.view",
  },
  {
    item: {
      href: "/admin/documents",
      label: "Student Documents",
      icon: <FileText className="w-4 h-4" />,
      group: "People",
    },
    permission: "student.documents.manage",
  },
  // ── Academics ─────────────────────────────────────────────────────
  {
    item: {
      href: "/admin/programmes",
      label: "Academic Programmes",
      icon: <Library className="w-4 h-4" />,
      group: "Academics",
    },
    permission: "courses.view",
  },
  {
    item: {
      href: "/admin/courses",
      label: "Courses",
      icon: <BookOpen className="w-4 h-4" />,
      group: "Academics",
    },
    permission: "courses.create",
  },
  {
    item: {
      href: "/admin/classes",
      label: "Classes and Groups",
      icon: <Layers className="w-4 h-4" />,
      group: "Academics",
    },
    permission: "classes.view",
  },
  {
    item: {
      href: "/admin/intakes",
      label: "Terms",
      icon: <Calendar className="w-4 h-4" />,
      group: "Academics",
    },
    permission: "courses.publish",
  },
  // ── Teaching ──────────────────────────────────────────────────────
  {
    item: {
      href: "/admin/timetable",
      label: "Timetable",
      icon: <MapPinned className="w-4 h-4" />,
      group: "Teaching",
    },
    permission: "venues.manage",
  },
  {
    item: {
      href: "/admin/attendance",
      label: "Attendance",
      icon: <CheckSquare className="w-4 h-4" />,
      group: "Teaching",
    },
    permission: "attendance.view",
  },
  {
    item: {
      href: "/admin/examinations",
      label: "Examinations",
      icon: <ClipboardCheck className="w-4 h-4" />,
      group: "Teaching",
    },
    permission: "exams.create",
  },
  {
    item: {
      href: "/admin/results",
      label: "Results and Grading",
      icon: <FileCheck className="w-4 h-4" />,
      group: "Teaching",
    },
    permission: "grades.view",
  },
  {
    item: {
      href: "/admin/certificates",
      label: "Certificate Lists",
      icon: <ClipboardList className="w-4 h-4" />,
      group: "Teaching",
    },
    permission: "certificates.view",
  },
  // ── Finance ───────────────────────────────────────────────────────
  {
    item: {
      href: "/admin/payments",
      label: "Payments",
      icon: <CreditCard className="w-4 h-4" />,
      group: "Finance",
    },
    permission: "finance.totals.view",
  },
  {
    item: {
      href: "/admin/payments/proofs",
      label: "Payment Proofs",
      icon: <FileText className="w-4 h-4" />,
      group: "Finance",
    },
    permission: "finance.proof.collect",
  },
  // ── Operations ────────────────────────────────────────────────────
  {
    item: {
      href: "/admin/equipment",
      label: "Equipment",
      icon: <Wrench className="w-4 h-4" />,
      group: "Operations",
    },
    permission: "equipment.manage",
  },
  // ── Communication ─────────────────────────────────────────────────
  {
    item: {
      href: "/admin/announcements",
      label: "Announcements",
      icon: <Megaphone className="w-4 h-4" />,
      group: "Communication",
    },
    permission: "announcements.manage",
  },
  {
    item: {
      href: "/admin/messages",
      label: "Messages",
      icon: <Mail className="w-4 h-4" />,
      group: "Communication",
    },
    permission: "students.view",
  },
  {
    item: {
      href: "/admin/notifications",
      label: "Notifications",
      icon: <Bell className="w-4 h-4" />,
      group: "Communication",
    },
    permission: "students.view",
  },
  // ── Reports ───────────────────────────────────────────────────────
  {
    item: {
      href: "/admin/reports",
      label: "Reports",
      icon: <BarChart2 className="w-4 h-4" />,
      group: "Reports",
    },
    permission: "reports.view",
  },
  // ── Support and Account ───────────────────────────────────────────
  {
    item: {
      href: "/admin/support",
      label: "Support",
      icon: <LifeBuoy className="w-4 h-4" />,
      group: "Support and Account",
    },
    permission: "support.submit",
  },
  {
    item: {
      href: "/admin/profile",
      label: "Profile",
      icon: <User className="w-4 h-4" />,
      group: "Support and Account",
    },
    permission: "students.view",
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
        "support.submit",
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
  // Admin dashboard tabs per admin.md A2.3: General, Students, Timetable, Finance
  const tabs: DashboardTab[] = [
    "general",
    ...(can(session.user.role, "students.view") ? (["students"] as DashboardTab[]) : []),
    ...(can(session.user.role, "venues.manage") ? (["timetable"] as DashboardTab[]) : []),
    ...(can(session.user.role, "finance.totals.view") ? (["finance"] as DashboardTab[]) : []),
  ];
  return (
    <AppShell
      nav={NAV.filter(({ permission }) =>
        can(session.user.role, permission),
      ).map(({ item }) => item)}
      role="Admin"
      permissionRole={session.user.role}
      userName={name}
      userInitial={getInitials(name)}
      userAvatarUrl={dbUser?.avatarUrl ?? null}
      tabs={tabs}
    >
      {children}
    </AppShell>
  );
}
