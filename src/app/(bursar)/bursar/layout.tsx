import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { LayoutDashboard, CreditCard, BookOpen, ClipboardList } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/bursar",           label: "Dashboard",   icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/bursar/payments",  label: "Payments",    icon: <CreditCard className="w-4 h-4" /> },
  { href: "/bursar/ledger",    label: "Ledger",      icon: <BookOpen className="w-4 h-4" /> },
  { href: "/bursar/approvals", label: "My Requests", icon: <ClipboardList className="w-4 h-4" /> },
];

export default async function BursarLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !["SUPERADMIN", "BURSAR"].includes(session.user.role)) redirect("/login");
  const name = session.user.name ?? "Bursar";
  return (
    <AppShell nav={NAV} role="Bursar" userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
