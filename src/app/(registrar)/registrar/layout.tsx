import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import AppShell, { NavItem } from "@/components/ui/AppShell";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  LayoutDashboard, ClipboardList, Users, BookOpen, Calendar,
  FileText, Bell, User, Search,
} from "lucide-react";

// While the ACADEMIC_REGISTRAR_ACTIVE setting is false, the account can log
// in and sees only this portal shell with a holding page. Full nav is
// visible only when the setting is true.
async function isRegistrarActive(): Promise<boolean> {
  const setting = await db.siteSetting.findUnique({
    where: { key: "feature.ACADEMIC_REGISTRAR_ACTIVE" },
  });
  return setting?.value === "true";
}

const HOLDING_NAV: NavItem[] = [
  { href: "/registrar",         label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/registrar/profile", label: "Profile",   icon: <User className="w-4 h-4" /> },
];

const FULL_NAV: NavItem[] = [
  { href: "/registrar",               label: "Dashboard",    icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/registrar/applications",  label: "Admissions",   icon: <ClipboardList className="w-4 h-4" /> },
  { href: "/registrar/students",      label: "Students",     icon: <Users className="w-4 h-4" /> },
  { href: "/registrar/enrolments",    label: "Enrolments",   icon: <BookOpen className="w-4 h-4" /> },
  { href: "/registrar/results",       label: "Results",      icon: <FileText className="w-4 h-4" /> },
  { href: "/registrar/graduands",     label: "Graduands",    icon: <Users className="w-4 h-4" /> },
  { href: "/registrar/timetable",     label: "Timetable",    icon: <Calendar className="w-4 h-4" /> },
  { href: "/registrar/transcripts",   label: "Transcripts",  icon: <FileText className="w-4 h-4" /> },
  { href: "/registrar/announcements", label: "Announcements", icon: <Bell className="w-4 h-4" /> },
  { href: "/registrar/audit",         label: "Audit Log",    icon: <Search className="w-4 h-4" /> },
  { href: "/registrar/profile",       label: "Profile",      icon: <User className="w-4 h-4" /> },
];

export default async function RegistrarLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Guard: ACADEMIC_REGISTRAR has students.lookup; ADMIN and above also pass
  if (!session?.user || !can(session.user.role, "students.lookup")) redirect("/dashboard");

  const active = await isRegistrarActive();
  const name = session.user.name ?? "Registrar";

  return (
    <AppShell
      nav={active ? FULL_NAV : HOLDING_NAV}
      role="Academic Registrar"
      permissionRole={session.user.role}
      userName={name}
      userInitial={name.charAt(0).toUpperCase()}
      tabs={active ? ["general", "admissions", "students", "academics"] : ["general"]}
    >
      {children}
    </AppShell>
  );
}
