import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { ThemeSync } from "@/components/ui/ThemeSync";
import {
  LayoutDashboard, User, BookMarked, BookOpen, Calendar, FileText,
  ClipboardList, CheckSquare, ClipboardCheck, BarChart2, CreditCard,
  Award, Megaphone, Bell, LifeBuoy, Video, MessageSquare, Mail,
} from "lucide-react";

const NAV: NavItem[] = [
  // Overview
  { href: "/dashboard",               label: "Dashboard",         icon: <LayoutDashboard className="w-4 h-4" />, group: "general" },
  { href: "/dashboard/profile",       label: "My Profile",        icon: <User className="w-4 h-4" />, group: "general" },
  // Learning
  { href: "/dashboard/enrolled",      label: "My Programmes",     icon: <BookMarked className="w-4 h-4" />, group: "learning" },
  { href: "/dashboard/courses",       label: "My Courses",        icon: <BookOpen className="w-4 h-4" />, group: "learning" },
  { href: "/dashboard/materials",     label: "Learning Materials", icon: <FileText className="w-4 h-4" />, group: "learning" },
  { href: "/dashboard/assignments",   label: "Assignments",       icon: <ClipboardList className="w-4 h-4" />, group: "learning" },
  { href: "/dashboard/forum",         label: "Discussion Forum",  icon: <MessageSquare className="w-4 h-4" />, group: "learning" },
  // Classes
  { href: "/dashboard/timetable",     label: "My Timetable",      icon: <Calendar className="w-4 h-4" />, group: "classes" },
  { href: "/dashboard/classes",       label: "Live Classes",      icon: <Video className="w-4 h-4" />, group: "classes" },
  { href: "/dashboard/recordings",    label: "Class Replays",     icon: <Video className="w-4 h-4" />, group: "classes" },
  { href: "/dashboard/attendance",    label: "Attendance",        icon: <CheckSquare className="w-4 h-4" />, group: "classes" },
  // Assessment
  { href: "/dashboard/exams",         label: "Examinations",      icon: <ClipboardCheck className="w-4 h-4" />, group: "assessment" },
  { href: "/dashboard/results",       label: "My Results",        icon: <BarChart2 className="w-4 h-4" />, group: "assessment" },
  { href: "/dashboard/certificates",  label: "Certificates",      icon: <Award className="w-4 h-4" />, group: "assessment" },
  // Finance
  { href: "/dashboard/payments",      label: "My Fees",           icon: <CreditCard className="w-4 h-4" />, group: "finance" },
  // Communication
  { href: "/dashboard/messages",     label: "Messages",         icon: <Mail className="w-4 h-4" />, group: "communication" },
  { href: "/dashboard/announcements", label: "Announcements",     icon: <Megaphone className="w-4 h-4" />, group: "communication" },
  { href: "/dashboard/notifications", label: "Notifications",     icon: <Bell className="w-4 h-4" />, group: "communication" },
  { href: "/dashboard/support",       label: "Support",           icon: <LifeBuoy className="w-4 h-4" />, group: "communication" },
];

const TABS = ["general", "studies", "finance", "classes"] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const name = session.user.name ?? "Student";
  const dbUser = await import("@/lib/db").then(m => m.db.user.findUnique({
    where: { id: session.user.id }, select: { avatarUrl: true, themePreference: true },
  }));
  return (
    <AppShell
      nav={NAV}
      role="Student"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      userAvatarUrl={dbUser?.avatarUrl ?? null}
      tabs={[...TABS]}
    >
      <ThemeSync initialTheme={dbUser?.themePreference ?? "system"} />
      {children}
    </AppShell>
  );
}
