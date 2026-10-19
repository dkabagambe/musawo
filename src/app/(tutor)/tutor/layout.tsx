import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, BookOpen, Video, ClipboardList, Users } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/tutor",          label: "Overview",     icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/tutor/courses",  label: "My Courses",   icon: <BookOpen className="w-4 h-4" /> },
  { href: "/tutor/classes",  label: "Live Classes", icon: <Video className="w-4 h-4" /> },
  { href: "/tutor/exams",    label: "Exams",        icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/tutor/students", label: "My Students",  icon: <Users className="w-4 h-4" /> },
];

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) {
    redirect("/dashboard");
  }
  const name = session.user.name ?? "Instructor";
  return (
    <AppShell nav={NAV} role="Instructor Portal" userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
