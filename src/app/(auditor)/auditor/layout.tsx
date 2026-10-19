import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, Users, FileSearch, BarChart2, FileText } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/auditor",          label: "Overview",      icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/auditor/students", label: "Student Records",icon: <Users className="w-4 h-4" /> },
  { href: "/auditor/audit",    label: "Audit Log",     icon: <FileSearch className="w-4 h-4" /> },
  { href: "/auditor/reports",  label: "Reports",       icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/auditor/policies", label: "Policies",      icon: <FileText className="w-4 h-4" /> },
];

export default async function AuditorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.comment")) redirect("/login");
  const name = session.user.name ?? "Auditor";
  return (
    <AppShell nav={NAV} role="Auditor" userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
