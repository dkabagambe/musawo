import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import {
  LayoutDashboard, Users, BookOpen, FileText, Award, Search, ClipboardList,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/registrar",                label: "Overview",      icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/registrar/applications",   label: "Applications",  icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/registrar/students",       label: "Students",      icon: <Users className="w-4 h-4" /> },
  { href: "/registrar/enrolments",     label: "Enrolments",    icon: <BookOpen className="w-4 h-4" /> },
  { href: "/registrar/results",        label: "Results",       icon: <FileText className="w-4 h-4" /> },
  { href: "/registrar/graduands",      label: "Graduands",     icon: <Award className="w-4 h-4" /> },
  { href: "/registrar/audit",          label: "Audit Log",     icon: <Search className="w-4 h-4" /> },
];

export default async function RegistrarLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.create")) {
    redirect("/dashboard");
  }
  const name = session.user.name ?? "Registrar";
  return (
    <AppShell nav={NAV} role="Academic Registrar" userName={name} userInitial={name.charAt(0).toUpperCase()}>
      {children}
    </AppShell>
  );
}
