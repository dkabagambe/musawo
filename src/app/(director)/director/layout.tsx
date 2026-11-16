import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import {
  LayoutDashboard, ClipboardCheck, BarChart2, ShieldAlert, Users, GraduationCap,
  BookOpen, Library, ClipboardList, Award, Bell, User, HardDrive,
  CreditCard, UserCog, ShieldCheck, GraduationCap as GradCapIcon, FileText,
  Megaphone, MessageSquare,
} from "lucide-react";

// Groups per D2 spec:
// Overview: Dashboard, Approvals, Reports & Analytics, Audit Logs
// Academics: Students, Instructors, Academic Programmes, Courses,
//            Examinations & Results, Certificates, Graduates
// Finance: Finance
// Governance: Staff Accounts, Roles & Permissions, Access Review,
//             Policies & Settings, Storage
// Communication: Announcements, Messages, Notifications
// Account: Profile & Settings

function buildNav(pendingApprovals: number): NavItem[] {
  return [
    // Overview
    { href: "/director",               label: "Dashboard",              icon: <LayoutDashboard className="w-4 h-4" />, group: "overview" },
    { href: "/director/approvals",     label: "Approvals",              icon: <ClipboardCheck className="w-4 h-4" />,  group: "overview", badge: pendingApprovals > 0 ? pendingApprovals : undefined },
    { href: "/director/reports",       label: "Reports & Analytics",    icon: <BarChart2 className="w-4 h-4" />,       group: "overview" },
    { href: "/director/audit",         label: "Audit Logs",             icon: <ShieldAlert className="w-4 h-4" />,     group: "overview" },
    // Academics
    { href: "/director/students",      label: "Students",               icon: <Users className="w-4 h-4" />,           group: "academics" },
    { href: "/director/instructors",   label: "Instructors",            icon: <GraduationCap className="w-4 h-4" />,   group: "academics" },
    { href: "/director/programmes",    label: "Academic Programmes",    icon: <Library className="w-4 h-4" />,         group: "academics" },
    { href: "/director/courses",       label: "Courses",                icon: <BookOpen className="w-4 h-4" />,        group: "academics" },
    { href: "/director/examinations",  label: "Examinations & Results", icon: <ClipboardList className="w-4 h-4" />,   group: "academics" },
    { href: "/director/certificates",  label: "Certificates",           icon: <Award className="w-4 h-4" />,           group: "academics" },
    { href: "/director/graduates",     label: "Graduates",              icon: <GradCapIcon className="w-4 h-4" />,     group: "academics" },
    // Finance
    { href: "/director/finance",       label: "Finance",                icon: <CreditCard className="w-4 h-4" />,      group: "finance" },
    // Governance
    { href: "/director/staff",         label: "Staff Accounts",         icon: <UserCog className="w-4 h-4" />,         group: "governance" },
    { href: "/director/roles",         label: "Roles & Permissions",    icon: <ShieldCheck className="w-4 h-4" />,     group: "governance" },
    { href: "/director/access-review", label: "Access Review",          icon: <ShieldAlert className="w-4 h-4" />,     group: "governance" },
    { href: "/director/policies",      label: "Policies & Settings",    icon: <FileText className="w-4 h-4" />,        group: "governance" },
    { href: "/director/storage",       label: "Storage",                icon: <HardDrive className="w-4 h-4" />,       group: "governance" },
    // Communication
    { href: "/director/announcements", label: "Announcements",          icon: <Megaphone className="w-4 h-4" />,       group: "communication" },
    { href: "/director/messages",      label: "Messages",               icon: <MessageSquare className="w-4 h-4" />,   group: "communication" },
    { href: "/director/notifications", label: "Notifications",          icon: <Bell className="w-4 h-4" />,            group: "communication" },
    // Account
    { href: "/director/profile",       label: "Profile & Settings",     icon: <User className="w-4 h-4" />,            group: "account" },
  ];
}

// Tabs: Director monitors and approves; most important first
const TABS = ["general", "academics", "finance", "staff", "approvals", "reports"] as const;

import type { ApprovalRequestType } from "@prisma/client";

// Director-only approval types (from docs/director.md)
const DIRECTOR_APPROVAL_TYPES: ApprovalRequestType[] = [
  "ACADEMIC_PROGRAMME_CHANGE",
  "COURSE_CHANGE",
  "RESULTS_PUBLICATION",
  "CERTIFICATE_ISSUANCE",
  "PAYMENT_PROOF",
  "EQUIPMENT_REQUEST",
  "ROLE_ASSIGNMENT",
  "FEE_CHANGE",
  "WAIVER",
  "REFUND",
];

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "approvals.decide")) redirect("/login");

  const { db } = await import("@/lib/db");
  const [dbUser, pendingApprovals] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, professionalTitle: true, avatarUrl: true },
    }),
    db.approvalRequest.count({
      where: {
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
        type: { in: DIRECTOR_APPROVAL_TYPES },
      },
    }),
  ]);

  // name: first + last name only (no title), e.g. "Mathias Senyondo"
  // professionalTitle stored separately, e.g. "Dr."
  const name = dbUser?.name ?? session.user.name ?? "Director";
  const title = dbUser?.professionalTitle ?? "";
  // Sidebar shows "Dr. Mathias Senyondo" (title + name); greeting uses first name only
  const displayName = title ? `${title} ${name}` : name;

  return (
    <AppShell
      nav={buildNav(pendingApprovals)}
      role="Director"
      permissionRole={session.user.role}
      userName={name}
      userDisplayName={displayName}
      userInitial={name.charAt(0).toUpperCase()}
      userAvatarUrl={dbUser?.avatarUrl ?? null}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
