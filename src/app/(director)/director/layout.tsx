import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const NAV = [
  { href: "/director",               label: "Executive Dashboard", icon: "📊" },
  { href: "/director/approvals",     label: "Approval Inbox",      icon: "📋" },
  { href: "/director/staff",         label: "Staff Accounts",      icon: "👥" },
  { href: "/director/audit",         label: "Full Audit Log",      icon: "🔍" },
  { href: "/director/access-review", label: "Access Review",       icon: "🛡️" },
  // Also link into main admin for routine ops
  { href: "/admin",                  label: "Administration",      icon: "⚙️" },
];

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-primary text-white h-14 flex items-center px-4 gap-4 z-40 shadow-md">
        <Link href="/director" className="flex items-center gap-2 no-underline">
          <Image src="/assets/logo.webp" alt="MTC" width={80} height={24} className="h-7 w-auto" />
          <span className="text-white/60 text-sm font-semibold">Director</span>
        </Link>
        <div className="flex-1" />
        <span className="text-sm text-white/70 hidden sm:inline">{session.user.name}</span>
        <Link href="/api/auth/signout" className="text-xs text-white/50 hover:text-white no-underline">
          Sign out
        </Link>
      </header>

      <div className="flex flex-1">
        <nav
          className="hidden md:flex flex-col w-56 bg-white border-r border-border py-4 px-2 gap-0.5"
          aria-label="Director navigation"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-body-text hover:bg-surface hover:text-primary no-underline transition-colors"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 px-4 py-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
