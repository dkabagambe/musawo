import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import {
  LayoutDashboard, BookOpen, Users, FileCheck, Award, BarChart2, Search,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/principal",              label: "Overview",       icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/principal/courses",      label: "Courses",        icon: <BookOpen className="w-4 h-4" /> },
  { href: "/principal/students",     label: "Students",       icon: <Users className="w-4 h-4" /> },
  { href: "/principal/results",      label: "Results",        icon: <FileCheck className="w-4 h-4" /> },
  { href: "/principal/graduands",    label: "Graduands",      icon: <Award className="w-4 h-4" /> },
  { href: "/principal/reports",      label: "Reports",        icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/principal/audit",        label: "Audit Log",      icon: <Search className="w-4 h-4" /> },
];

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) {
    redirect("/dashboard");
  }
  const name = session.user.name ?? "Principal";
  return (
    <AppShell nav={NAV} role="Principal" userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
