import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, BarChart2, FileText, GraduationCap } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/board",           label: "Overview",  icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/board/reports",   label: "Reports",   icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/board/policies",  label: "Policies",  icon: <FileText className="w-4 h-4" /> },
  { href: "/board/graduates", label: "Graduates", icon: <GraduationCap className="w-4 h-4" /> },
];

// Tabs match DASHBOARD_WIDGETS for BOARD_MEMBER role
const TABS = ["general", "reports", "policies"] as const;

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.board")) redirect("/login");
  const name = session.user.name ?? "Board Member";
  return (
    <AppShell
      nav={NAV}
      role="Board"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
