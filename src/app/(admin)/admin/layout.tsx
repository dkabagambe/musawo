import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardList,
  Library,
  BookOpen,
  Layers,
  CalendarRange,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  BarChart,
  FileStack,
  BarChart2,
  Megaphone,
  Bell,
  CreditCard,
  Wrench,
  LifeBuoy,
  User,
  Search,
  UserRoundSearch,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/admin",              label: "Dashboard",                   icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/admin/students",     label: "Students",                    icon: <Users className="w-4 h-4" /> },
  { href: "/admin/admissions",   label: "Admissions",                  icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/admin/tutors",       label: "Instructors",                 icon: <GraduationCap className="w-4 h-4" /> },
  { href: "/admin/programmes",   label: "Academic Programmes",         icon: <Library className="w-4 h-4" /> },
  { href: "/admin/courses",      label: "Courses",                     icon: <BookOpen className="w-4 h-4" /> },
  { href: "/admin/classes",      label: "Classes & Groups",            icon: <Layers className="w-4 h-4" /> },
  { href: "/admin/intakes",      label: "Academic Years & Semesters",  icon: <CalendarRange className="w-4 h-4" /> },
  { href: "/admin/timetable",    label: "Timetable",                   icon: <Calendar className="w-4 h-4" /> },
  { href: "/admin/attendance",   label: "Attendance",                  icon: <CheckSquare className="w-4 h-4" /> },
  { href: "/admin/examinations", label: "Examinations",                icon: <ClipboardCheck className="w-4 h-4" /> },
  { href: "/admin/results",      label: "Results & Grading",           icon: <BarChart className="w-4 h-4" /> },
  { href: "/admin/documents",    label: "Student Documents",           icon: <FileStack className="w-4 h-4" /> },
  { href: "/admin/reports",      label: "Reports",                     icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/admin/notices",      label: "Announcements",               icon: <Megaphone className="w-4 h-4" /> },
  { href: "/admin/notifications", label: "Notifications",              icon: <Bell className="w-4 h-4" /> },
  { href: "/admin/profile",      label: "Profile",                     icon: <User className="w-4 h-4" /> },
  { href: "/admin/payments",     label: "Payments",                    icon: <CreditCard className="w-4 h-4" /> },
  { href: "/admin/equipment",    label: "Equipment",                   icon: <Wrench className="w-4 h-4" /> },
  { href: "/admin/support",      label: "Support",                     icon: <LifeBuoy className="w-4 h-4" /> },
];

const TABS = ["general", "students", "admissions", "academics", "operations", "reports"] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (
    !session?.user ||
    !(
      ["students.view", "students.create", "applications.process", "students.lookup"] as const
    ).some((p) => can(session.user.role, p))
  )
    redirect("/403");
  const name = session.user.name ?? "Admin";
  return (
    <AppShell
      nav={NAV}
      role="Administration"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
