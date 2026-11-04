import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import {
  LayoutDashboard, BookOpen, Video, Calendar, CheckSquare, FileText,
  ClipboardList, BarChart, Megaphone, BarChart2, Bell, User, Users, MessageSquare, LifeBuoy,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/tutor",               label: "Dashboard",      icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/tutor/courses",       label: "My Courses",     icon: <BookOpen className="w-4 h-4" /> },
  { href: "/tutor/classes",       label: "My Classes",     icon: <Video className="w-4 h-4" /> },
  { href: "/tutor/students",      label: "Students",       icon: <Users className="w-4 h-4" /> },
  { href: "/tutor/timetable",     label: "Timetable",      icon: <Calendar className="w-4 h-4" /> },
  { href: "/tutor/attendance",    label: "Attendance",     icon: <CheckSquare className="w-4 h-4" /> },
  { href: "/tutor/materials",     label: "Learning Materials", icon: <FileText className="w-4 h-4" /> },
  { href: "/tutor/assignments",   label: "Assignments",    icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/tutor/exams",         label: "Examinations",   icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/tutor/results",       label: "Marks & Results", icon: <BarChart className="w-4 h-4" /> },
  { href: "/tutor/announcements", label: "Announcements",  icon: <Megaphone className="w-4 h-4" /> },
  { href: "/tutor/reports",       label: "Reports",        icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/tutor/notifications", label: "Notifications",  icon: <Bell className="w-4 h-4" /> },
  { href: "/tutor/profile",       label: "Profile",        icon: <User className="w-4 h-4" /> },
  { href: "/tutor/forum",         label: "Discussion Forum", icon: <MessageSquare className="w-4 h-4" /> },
  { href: "/tutor/support",       label: "Support",        icon: <LifeBuoy className="w-4 h-4" /> },
];

const TABS = ["general", "teaching", "students", "assessment", "support"] as const;

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "classes.view")) redirect("/dashboard");
  const name = session.user.name ?? "Instructor";
  const { db } = await import("@/lib/db");
  const dbUser = await db.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  return (
    <AppShell
      nav={NAV}
      role="Instructor"
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
