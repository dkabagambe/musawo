import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { LayoutDashboard, CreditCard, BookOpen, ClipboardList } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/bursar",           label: "Dashboard",   icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/bursar/payments",  label: "Payments",    icon: <CreditCard className="w-4 h-4" /> },
  { href: "/bursar/ledger",    label: "Ledger",      icon: <BookOpen className="w-4 h-4" /> },
  { href: "/bursar/approvals", label: "My Requests", icon: <ClipboardList className="w-4 h-4" /> },
];

// Tabs match DASHBOARD_WIDGETS for legacy FINANCE_OFFICER (bursar path)
const TABS = ["general", "payments", "reconciliation", "reports"] as const;

export default async function BursarLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.hold")) redirect("/login");
  const name = session.user.name ?? "Finance";
  return (
    <AppShell
      nav={NAV}
      role="Finance"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
