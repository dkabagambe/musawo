import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import {
  LayoutDashboard, ClipboardCheck, BarChart2, Search, Users, GraduationCap,
  BookOpen, Library, ClipboardList, Award, Bell, User, Settings, HardDrive,
  CreditCard, UserCog, ShieldCheck, GraduationCap as GradCapIcon, FileText,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/director",                label: "Dashboard",              icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/director/approvals",      label: "Approvals",              icon: <ClipboardCheck className="w-4 h-4" /> },
  { href: "/director/finance",        label: "Finance",                icon: <CreditCard className="w-4 h-4" /> },
  { href: "/director/staff",          label: "Staff Accounts",         icon: <UserCog className="w-4 h-4" /> },
  { href: "/director/roles",          label: "Roles & Permissions",    icon: <ShieldCheck className="w-4 h-4" /> },
  { href: "/director/access-review",  label: "Access Review",          icon: <Search className="w-4 h-4" /> },
  { href: "/director/reports",        label: "Reports & Analytics",    icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/director/audit",          label: "Audit Logs",             icon: <Search className="w-4 h-4" /> },
  { href: "/director/students",       label: "Students",               icon: <Users className="w-4 h-4" /> },
  { href: "/director/instructors",    label: "Instructors",            icon: <GraduationCap className="w-4 h-4" /> },
  { href: "/director/graduates",      label: "Graduates",              icon: <GradCapIcon className="w-4 h-4" /> },
  { href: "/director/programmes",     label: "Academic Programmes",    icon: <Library className="w-4 h-4" /> },
  { href: "/director/courses",        label: "Courses",                icon: <BookOpen className="w-4 h-4" /> },
  { href: "/director/examinations",   label: "Examinations & Results", icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/director/certificates",   label: "Certificates",           icon: <Award className="w-4 h-4" /> },
  { href: "/director/policies",       label: "Policies & Settings",    icon: <FileText className="w-4 h-4" /> },
  { href: "/director/notifications",  label: "Notifications",          icon: <Bell className="w-4 h-4" /> },
  { href: "/director/storage",        label: "Storage",                icon: <HardDrive className="w-4 h-4" /> },
  { href: "/director/profile",        label: "Profile & Settings",     icon: <User className="w-4 h-4" /> },
];

// Tabs: Director monitors and approves; most important first
const TABS = ["general", "academics", "finance", "staff", "approvals", "reports"] as const;

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "approvals.decide")) redirect("/login");
  const name = session.user.name ?? "Director";
  const { db } = await import("@/lib/db");
  const dbUser = await db.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  return (
    <AppShell
      nav={NAV}
      role="Director"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      userAvatarUrl={dbUser?.avatarUrl ?? null}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
