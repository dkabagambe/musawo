import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, ClipboardCheck, Users, Search, Shield, Settings } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/director",               label: "Executive Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/director/approvals",     label: "Approval Inbox",      icon: <ClipboardCheck className="w-4 h-4" /> },
  { href: "/director/staff",         label: "Staff Accounts",      icon: <Users className="w-4 h-4" /> },
  { href: "/director/audit",         label: "Full Audit Log",      icon: <Search className="w-4 h-4" /> },
  { href: "/director/access-review", label: "Access Review",       icon: <Shield className="w-4 h-4" /> },
  { href: "/admin",                  label: "Administration",      icon: <Settings className="w-4 h-4" /> },
];

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "approvals.decide")) redirect("/login");
  const name = session.user.name ?? "Director";
  return (
    <AppShell nav={NAV} role="Executive" permissionRole={session.user.role} userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
