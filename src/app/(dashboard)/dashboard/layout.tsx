import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import {
  LayoutDashboard, BookOpen, Calendar, BarChart2, ClipboardList,
  FileText, MessageSquare, CreditCard, Award, LifeBuoy, Bell, User, PlayCircle,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/dashboard",               label: "Dashboard",     icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/dashboard/courses",       label: "My Courses",    icon: <BookOpen className="w-4 h-4" /> },
  { href: "/dashboard/timetable",     label: "Timetable",     icon: <Calendar className="w-4 h-4" /> },
  { href: "/dashboard/recordings",    label: "Class Replays", icon: <PlayCircle className="w-4 h-4" /> },
  { href: "/dashboard/gradebook",     label: "Gradebook",     icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/dashboard/results",       label: "Results",       icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/dashboard/assignments",   label: "Assignments",   icon: <FileText className="w-4 h-4" /> },
  { href: "/dashboard/forum",         label: "Discussion",    icon: <MessageSquare className="w-4 h-4" /> },
  { href: "/dashboard/payments",      label: "Payments",      icon: <CreditCard className="w-4 h-4" /> },
  { href: "/dashboard/certificates",  label: "Certificates",  icon: <Award className="w-4 h-4" /> },
  { href: "/dashboard/support",       label: "Support",       icon: <LifeBuoy className="w-4 h-4" /> },
  { href: "/dashboard/notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { href: "/dashboard/profile",       label: "Profile",       icon: <User className="w-4 h-4" /> },
];

// Tabs match DASHBOARD_WIDGETS defaultTab values for STUDENT role
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
