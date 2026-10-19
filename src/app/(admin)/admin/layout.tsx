import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import {
  LayoutDashboard, BookOpen, Users, GraduationCap, Calendar,
  CreditCard, BarChart2, Handshake, Settings, Search,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/admin",                label: "Overview",      icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/admin/courses",        label: "Courses",       icon: <BookOpen className="w-4 h-4" /> },
  { href: "/admin/students",       label: "Students",      icon: <Users className="w-4 h-4" /> },
  { href: "/admin/tutors",         label: "Tutors",        icon: <GraduationCap className="w-4 h-4" /> },
  { href: "/admin/intakes",        label: "Intakes",       icon: <Calendar className="w-4 h-4" /> },
  { href: "/admin/payments",       label: "Payments",      icon: <CreditCard className="w-4 h-4" /> },
  // scholarships nav removed (SCHOLARSHIPS_ENABLED=false)
  { href: "/admin/reports",        label: "Reports",       icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/admin/partner-pages",  label: "Partner Pages", icon: <Handshake className="w-4 h-4" /> },
  { href: "/admin/settings",       label: "Settings",      icon: <Settings className="w-4 h-4" /> },
  { href: "/admin/audit",          label: "Audit Log",     icon: <Search className="w-4 h-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) {
    redirect("/dashboard");
  }
  const name = session.user.name ?? "Admin";
  return (
    <AppShell nav={NAV} role="Administration" userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
