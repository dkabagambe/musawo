import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import {
  LayoutDashboard, User, BookMarked, BookOpen, Calendar, FileText,
  ClipboardList, CheckSquare, ClipboardCheck, BarChart2, CreditCard,
  Award, Megaphone, Bell, LifeBuoy, Video, MessageSquare,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/dashboard",               label: "Dashboard",         icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/dashboard/profile",       label: "My Profile",        icon: <User className="w-4 h-4" /> },
  { href: "/dashboard/enrolled",      label: "My Programmes",     icon: <BookMarked className="w-4 h-4" /> },
  { href: "/dashboard/courses",       label: "My Courses",        icon: <BookOpen className="w-4 h-4" /> },
  { href: "/dashboard/timetable",     label: "My Timetable",      icon: <Calendar className="w-4 h-4" /> },
  { href: "/dashboard/materials",     label: "Learning Materials", icon: <FileText className="w-4 h-4" /> },
  { href: "/dashboard/assignments",   label: "Assignments",       icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/dashboard/attendance",    label: "Attendance",        icon: <CheckSquare className="w-4 h-4" /> },
  { href: "/dashboard/exams",         label: "Examinations",      icon: <ClipboardCheck className="w-4 h-4" /> },
  { href: "/dashboard/results",       label: "My Results",        icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/dashboard/payments",      label: "My Fees",           icon: <CreditCard className="w-4 h-4" /> },
  { href: "/dashboard/certificates",  label: "Certificates",      icon: <Award className="w-4 h-4" /> },
  { href: "/dashboard/announcements", label: "Announcements",     icon: <Megaphone className="w-4 h-4" /> },
  { href: "/dashboard/notifications", label: "Notifications",     icon: <Bell className="w-4 h-4" /> },
  { href: "/dashboard/support",       label: "Support",           icon: <LifeBuoy className="w-4 h-4" /> },
  { href: "/dashboard/classes",       label: "Live Classes",      icon: <Video className="w-4 h-4" /> },
  { href: "/dashboard/forum",         label: "Discussion Forum",  icon: <MessageSquare className="w-4 h-4" /> },
];

const TABS = ["general", "studies", "finance", "classes"] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const name = session.user.name ?? "Student";
  return (
    <AppShell
      nav={NAV}
      role="Student Portal"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
