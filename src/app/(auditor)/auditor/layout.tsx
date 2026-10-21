import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, Users, FileSearch, BarChart2, FileText, GitBranch } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/auditor",          label: "Overview",          icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/auditor/students", label: "Student Records",   icon: <Users className="w-4 h-4" /> },
  { href: "/auditor/audit",    label: "Audit Log",         icon: <FileSearch className="w-4 h-4" /> },
  { href: "/auditor/reports",  label: "Reports",           icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/auditor/policies", label: "Policies",          icon: <FileText className="w-4 h-4" /> },
  { href: "/auditor/roles",    label: "Roles and Permissions", icon: <GitBranch className="w-4 h-4" /> },
];

// Tabs match DASHBOARD_WIDGETS for AUDITOR_READONLY role
const TABS = ["general", "audit", "reports"] as const;

export default async function AuditorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view")) redirect("/login");
  const name = session.user.name ?? "Auditor";
  return (
    <AppShell
      nav={NAV}
      role="Auditor"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
