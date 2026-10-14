"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, ChevronRight } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AppShellProps {
  children: React.ReactNode;
  nav: NavItem[];
  role: string;
  userName: string;
  userInitial: string;
  /** accent colour class for sidebar active state — defaults to primary */
  accentClass?: string;
}

export default function AppShell({
  children,
  nav,
  role,
  userName,
  userInitial,
  accentClass = "bg-primary",
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawer] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawer(false); }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    href === pathname || (href !== "/dashboard" && href !== "/tutor" && href !== "/admin" && href !== "/director" && href !== "/bursar" && href !== "/system" && pathname.startsWith(href + "/"));

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <ul className="space-y-0.5 list-none">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all duration-150 relative
                ${active
                  ? "bg-primary text-white shadow-primary-glow"
                  : "text-gray-600 hover:bg-surface hover:text-primary"
                }`}
              aria-current={active ? "page" : undefined}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                ${active ? "bg-white/20" : "bg-surface"}`}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                  ${active ? "bg-white text-primary" : "bg-danger text-white"}`}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="bg-primary text-white h-16 flex items-center px-4 sm:px-6 gap-3 z-50 shadow-lg flex-shrink-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
          <span className="flex items-center justify-center bg-white rounded-xl w-9 h-9 p-1.5 flex-shrink-0">
            <Image src="/assets/logo-header.png" alt="MTC" width={28} height={28} className="w-full h-full object-contain" priority />
          </span>
          <span className="hidden sm:block">
            <span className="font-extrabold text-white text-sm leading-tight block">Musawo TC</span>
            <span className="text-white/50 text-[10px] uppercase tracking-widest">{role}</span>
          </span>
        </Link>

        <div className="flex-1" />

        {/* User pill */}
        <div className="hidden sm:flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-1.5">
          <span className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userInitial}
          </span>
          <span className="text-sm text-white/90 font-medium max-w-[140px] truncate">{userName}</span>
        </div>

        {/* Sign out */}
        <Link
          href="/api/auth/signout"
          className="hidden sm:flex items-center gap-1.5 text-xs text-white/60 hover:text-white no-underline transition-colors px-2 py-1.5 rounded-lg hover:bg-white/10"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </Link>

        {/* Hamburger */}
        <button
          type="button"
          onClick={() => setDrawer((v) => !v)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
        >
          {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Desktop sidebar ───────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-60 bg-white border-r border-border flex-shrink-0 overflow-y-auto">
          <div className="p-3 flex-1">
            <NavLinks />
          </div>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface">
              <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userInitial}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary truncate">{userName}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{role}</p>
              </div>
              <Link href="/api/auth/signout" className="text-gray-400 hover:text-danger transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </aside>

        {/* ── Mobile drawer backdrop ────────────────────────────── */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile drawer ─────────────────────────────────────── */}
        <div
          className={`fixed top-16 left-0 bottom-0 z-50 w-72 bg-white shadow-2xl md:hidden
            flex flex-col transition-transform duration-300 ease-out
            ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="p-3 flex-1 overflow-y-auto">
            <NavLinks onClick={() => setDrawer(false)} />
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface mb-2">
              <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userInitial}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary truncate">{userName}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{role}</p>
              </div>
            </div>
            <Link
              href="/api/auth/signout"
              onClick={() => setDrawer(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-danger/5 no-underline transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Link>
          </div>
        </div>

        {/* ── Main content ──────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
