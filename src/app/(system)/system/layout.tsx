import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { Monitor, Settings, FileSearch, LifeBuoy } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/system",          label: "Overview",       icon: <Monitor className="w-4 h-4" /> },
  { href: "/system/support",  label: "Support Tickets", icon: <LifeBuoy className="w-4 h-4" /> },
  { href: "/system/settings", label: "Settings",       icon: <Settings className="w-4 h-4" /> },
  { href: "/system/audit",    label: "System Logs",    icon: <FileSearch className="w-4 h-4" /> },
];

const TABS = ["general", "support", "system", "logs"] as const;

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "integrations.edit")) redirect("/login");
  const name = session.user.name ?? "IT Admin";
  return (
    <AppShell
      nav={NAV}
      role="IT Admin"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={[...TABS]}
    >
      {children}
    </AppShell>
  );
}
