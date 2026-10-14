import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/dashboard/courses", label: "My Courses", icon: "📚" },
  { href: "/dashboard/timetable", label: "Timetable", icon: "📅" },
  { href: "/dashboard/gradebook", label: "Gradebook", icon: "📊" },
  { href: "/dashboard/results", label: "Results", icon: "📋" },
  { href: "/dashboard/assignments", label: "Assignments", icon: "📝" },
  { href: "/dashboard/forum", label: "Discussion", icon: "💬" },
  { href: "/dashboard/payments", label: "Payments", icon: "💳" },
  { href: "/dashboard/certificates", label: "Certificates", icon: "🎓" },
  { href: "/dashboard/support", label: "Support", icon: "🆘" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "🔔" },
  { href: "/dashboard/profile", label: "Profile", icon: "👤" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top nav */}
      <header className="bg-primary text-white h-14 flex items-center px-4 gap-4 z-40 shadow-md">
        <Link href="/" className="flex items-center gap-2 no-underline mr-4">
          <Image
            src="/assets/logo.webp"
            alt="Musawo Training Center"
            width={100}
            height={30}
            className="h-7 w-auto"
          />
        </Link>
        <span className="text-white/40 text-sm hidden sm:inline">Student Portal</span>
        <div className="flex-1" />
        <span className="text-sm text-white/70 hidden sm:inline">
          {session.user.name}
        </span>
        <Link
          href="/api/auth/signout"
          className="text-xs text-white/50 hover:text-white no-underline"
        >
          Sign out
        </Link>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - hidden on mobile, shown md+ */}
        <nav
          className="hidden md:flex flex-col w-52 bg-white border-r border-border py-4 px-2 gap-1"
          aria-label="Dashboard navigation"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-body-text hover:bg-surface hover:text-primary no-underline transition-colors"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Main */}
        <main className="flex-1 px-4 py-6 pb-24 md:pb-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex z-40"
        aria-label="Mobile navigation"
      >
        {NAV.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2 text-xs text-gray-500 hover:text-primary no-underline gap-0.5"
          >
            <span className="text-base" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
