import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getInitials } from "@/lib/utils/initials";
import {
  LayoutDashboard, Users, ClipboardList, GraduationCap, Library, Building2,
  BookOpen, Layers, CalendarRange, Calendar, CheckSquare, ClipboardCheck,
  BarChart, Award, FileText, Megaphone, CreditCard, BarChart2, ClipboardCheck as ApprovalIcon,
  CalendarDays, UserCog, Search, User, Wrench, LifeBuoy, MessageSquare, Share2,
  HardDrive, Bell,
} from "lucide-react";

const NAV: NavItem[] = [
  // Overview
  { href: "/principal",                  label: "Dashboard",              icon: <LayoutDashboard className="w-4 h-4" />, group: "overview" },
  { href: "/principal/approvals-inbox",  label: "Approvals Inbox",        icon: <ClipboardList className="w-4 h-4" />, group: "overview" },
  { href: "/principal/approval-tracking", label: "Approval Tracking",    icon: <ApprovalIcon className="w-4 h-4" />, group: "overview" },
  { href: "/principal/reports",          label: "Reports and Analytics",  icon: <BarChart2 className="w-4 h-4" />, group: "overview" },
  { href: "/principal/audit",            label: "Audit Logs",             icon: <Search className="w-4 h-4" />, group: "overview" },
  
  // People
  { href: "/principal/students",         label: "Students",               icon: <Users className="w-4 h-4" />, group: "people" },
  { href: "/principal/admissions",       label: "Admissions",             icon: <ClipboardList className="w-4 h-4" />, group: "people" },
  { href: "/principal/instructors",      label: "Instructors",            icon: <GraduationCap className="w-4 h-4" />, group: "people" },
  { href: "/principal/user-management",  label: "User Management",        icon: <UserCog className="w-4 h-4" />, group: "people" },
  
  // Academics
  { href: "/principal/programmes",       label: "Academic Programmes",    icon: <Library className="w-4 h-4" />, group: "academics" },
  { href: "/principal/departments",      label: "Departments",            icon: <Building2 className="w-4 h-4" />, group: "academics" },
  { href: "/principal/courses",          label: "Courses and Subjects",   icon: <BookOpen className="w-4 h-4" />, group: "academics" },
  { href: "/principal/classes",          label: "Classes and Groups",     icon: <Layers className="w-4 h-4" />, group: "academics" },
  { href: "/principal/semesters",        label: "Terms",                  icon: <CalendarRange className="w-4 h-4" />, group: "academics" },
  { href: "/principal/calendar",         label: "Academic Calendar",      icon: <CalendarDays className="w-4 h-4" />, group: "academics" },
  { href: "/principal/timetable",        label: "Timetable",              icon: <Calendar className="w-4 h-4" />, group: "academics" },
  
  // Teaching and Assessment
  { href: "/principal/attendance",       label: "Attendance",             icon: <CheckSquare className="w-4 h-4" />, group: "assessment" },
  { href: "/principal/examinations",     label: "Examinations",           icon: <ClipboardCheck className="w-4 h-4" />, group: "assessment" },
  { href: "/principal/results",          label: "Results and Grading",    icon: <BarChart className="w-4 h-4" />, group: "assessment" },
  { href: "/principal/certificates",     label: "Certificates",           icon: <Award className="w-4 h-4" />, group: "assessment" },
  { href: "/principal/materials",        label: "Learning Materials",     icon: <FileText className="w-4 h-4" />, group: "assessment" },
  { href: "/principal/forum",            label: "Discussion Forum",       icon: <MessageSquare className="w-4 h-4" />, group: "assessment" },
  
  // Operations
  { href: "/principal/finance",          label: "Finance and Fees",       icon: <CreditCard className="w-4 h-4" />, group: "operations" },
  { href: "/principal/equipment",        label: "Equipment",              icon: <Wrench className="w-4 h-4" />, group: "operations" },
  { href: "/principal/storage",          label: "Storage",                icon: <HardDrive className="w-4 h-4" />, group: "operations" },
  { href: "/principal/support",          label: "Support",                icon: <LifeBuoy className="w-4 h-4" />, group: "operations" },
  
  // Communication
  { href: "/principal/announcements",    label: "Announcements",          icon: <Megaphone className="w-4 h-4" />, group: "communication" },
  { href: "/principal/messages",         label: "Messages",               icon: <MessageSquare className="w-4 h-4" />, group: "communication" },
  { href: "/principal/notifications",    label: "Notifications",          icon: <Bell className="w-4 h-4" />, group: "communication" },
  
  // Account
  { href: "/principal/profile",          label: "Profile and Settings",   icon: <User className="w-4 h-4" />, group: "account" },
];

const TABS = ["general", "academics", "approvals", "reports"] as const;

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/dashboard");
  const name = session.user.name ?? "Principal";
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true, professionalTitle: true },
  });
  return (
    <AppShell
      nav={NAV}
      role="Principal"
      permissionRole={session.user.role}
      userName={name}
      userInitial={getInitials(name)}
      userAvatarUrl={dbUser?.avatarUrl ?? null}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
