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

export default async function BursarLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.hold")) redirect("/login");
  const name = session.user.name ?? "Finance";
  return (
    <AppShell nav={NAV} role="Finance Officer" userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
