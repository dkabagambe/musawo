import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, Users, Calendar, ClipboardList, FileText, BarChart2 } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/deputy",            label: "Overview",      icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/deputy/students",   label: "Students",      icon: <Users className="w-4 h-4" /> },
  { href: "/deputy/timetable",  label: "Timetable",     icon: <Calendar className="w-4 h-4" /> },
  { href: "/deputy/complaints", label: "Complaints",    icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/deputy/reports",    label: "Reports",       icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/deputy/policies",   label: "Policies",      icon: <FileText className="w-4 h-4" /> },
];

export default async function DeputyLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage")) redirect("/login");
  const name = session.user.name ?? "Deputy Principal";
  return (
    <AppShell nav={NAV} role="Deputy Principal" permissionRole={session.user.role} userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
