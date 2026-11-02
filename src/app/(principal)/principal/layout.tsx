import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import {
  LayoutDashboard, Users, ClipboardList, GraduationCap, Library, Building2,
  BookOpen, Layers, CalendarRange, Calendar, CheckSquare, ClipboardCheck,
  BarChart, Award, FileText, Megaphone, CreditCard, BarChart2, ClipboardCheck as ApprovalIcon,
  CalendarDays, UserCog, Search, User, Wrench, LifeBuoy, MessageSquare, Share2,
  HardDrive,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/principal",                  label: "Dashboard",              icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/principal/students",         label: "Students",               icon: <Users className="w-4 h-4" /> },
  { href: "/principal/admissions",       label: "Admissions",             icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/principal/instructors",      label: "Instructors",            icon: <GraduationCap className="w-4 h-4" /> },
  { href: "/principal/programmes",       label: "Academic Programmes",    icon: <Library className="w-4 h-4" /> },
  { href: "/principal/departments",      label: "Departments",            icon: <Building2 className="w-4 h-4" /> },
  { href: "/principal/courses",          label: "Courses & Subjects",     icon: <BookOpen className="w-4 h-4" /> },
  { href: "/principal/classes",          label: "Classes & Groups",       icon: <Layers className="w-4 h-4" /> },
  { href: "/principal/semesters",        label: "Academic Years & Semesters", icon: <CalendarRange className="w-4 h-4" /> },
  { href: "/principal/timetable",        label: "Timetable",              icon: <Calendar className="w-4 h-4" /> },
  { href: "/principal/attendance",       label: "Attendance",             icon: <CheckSquare className="w-4 h-4" /> },
  { href: "/principal/examinations",     label: "Examinations",           icon: <ClipboardCheck className="w-4 h-4" /> },
  { href: "/principal/results",          label: "Results & Grading",      icon: <BarChart className="w-4 h-4" /> },
  { href: "/principal/certificates",     label: "Certificates",           icon: <Award className="w-4 h-4" /> },
  { href: "/principal/materials",        label: "Learning Materials",     icon: <FileText className="w-4 h-4" /> },
  { href: "/principal/announcements",    label: "Announcements",          icon: <Megaphone className="w-4 h-4" /> },
  { href: "/principal/finance",          label: "Finance & Fees",         icon: <CreditCard className="w-4 h-4" /> },
  { href: "/principal/reports",          label: "Reports & Analytics",    icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/principal/approval-tracking", label: "Approval Tracking",    icon: <ApprovalIcon className="w-4 h-4" /> },
  { href: "/principal/calendar",         label: "Academic Calendar",      icon: <CalendarDays className="w-4 h-4" /> },
  { href: "/principal/user-management",  label: "User Management",        icon: <UserCog className="w-4 h-4" /> },
  { href: "/principal/audit",            label: "Audit Logs",             icon: <Search className="w-4 h-4" /> },
  { href: "/principal/profile",          label: "Profile & Settings",     icon: <User className="w-4 h-4" /> },
  { href: "/principal/approvals-inbox",  label: "Approvals Inbox",        icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/principal/equipment",        label: "Equipment",              icon: <Wrench className="w-4 h-4" /> },
  { href: "/principal/support",          label: "Support",                icon: <LifeBuoy className="w-4 h-4" /> },
  { href: "/principal/forum",            label: "Discussion Forum",       icon: <MessageSquare className="w-4 h-4" /> },
  { href: "/principal/storage",          label: "Storage",                icon: <HardDrive className="w-4 h-4" /> },
];

const TABS = ["general", "students", "academics", "approvals", "operations", "reports"] as const;

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/dashboard");
  const name = session.user.name ?? "Principal";
  return (
    <AppShell
      nav={NAV}
      role="Principal"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
