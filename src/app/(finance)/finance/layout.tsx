import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, CreditCard, BookOpen, ClipboardList } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/finance",           label: "Dashboard",   icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/finance/payments",  label: "Payments",    icon: <CreditCard className="w-4 h-4" /> },
  { href: "/finance/ledger",    label: "Ledger",      icon: <BookOpen className="w-4 h-4" /> },
  { href: "/finance/approvals", label: "My Requests", icon: <ClipboardList className="w-4 h-4" /> },
];

// Tabs match DASHBOARD_WIDGETS for FINANCE_OFFICER role
const TABS = ["general", "payments", "reconciliation", "reports"] as const;

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.view")) redirect("/login");
  const name = session.user.name ?? "Finance";
  return (
    <AppShell
      nav={NAV}
      role="Finance Officer"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
