import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, BookOpen, Video, ClipboardList, Users, FileText, CheckSquare, Megaphone } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/tutor",               label: "Overview",     icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/tutor/courses",       label: "My Courses",   icon: <BookOpen className="w-4 h-4" /> },
  { href: "/tutor/materials",     label: "Materials",    icon: <FileText className="w-4 h-4" /> },
  { href: "/tutor/classes",       label: "Live Classes", icon: <Video className="w-4 h-4" /> },
  { href: "/tutor/attendance",    label: "Attendance",   icon: <CheckSquare className="w-4 h-4" /> },
  { href: "/tutor/exams",         label: "Exams",        icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/tutor/announcements", label: "Announcements",icon: <Megaphone className="w-4 h-4" /> },
  { href: "/tutor/students",      label: "My Students",  icon: <Users className="w-4 h-4" /> },
];

// Tabs match DASHBOARD_WIDGETS for INSTRUCTOR / TEACHING_ASSISTANT roles
const TABS = ["general", "teaching", "students", "assessment", "support"] as const;

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/dashboard");
  const name = session.user.name ?? "Instructor";
  const nav = NAV.filter((item) => {
    if (item.href === "/tutor") return true;
    if (item.href === "/tutor/courses" || item.href === "/tutor/materials") return can(session.user.role, "courses.view");
    if (item.href === "/tutor/classes") return can(session.user.role, "classes.view");
    if (item.href === "/tutor/attendance") return can(session.user.role, "attendance.take") || can(session.user.role, "attendance.view");
    if (item.href === "/tutor/exams") return can(session.user.role, "exams.mark") || can(session.user.role, "exams.create");
    if (item.href === "/tutor/announcements") return can(session.user.role, "announcements.send.own");
    if (item.href === "/tutor/students") return can(session.user.role, "students.view");
    return false;
  });
  return (
    <AppShell
      nav={nav}
      role="Teaching Portal"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
