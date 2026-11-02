"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────
   NAV STRUCTURE
   ───────────────────────────────────────────── */
interface NavItem {
  label: string;
  href: string;
}

const NAV: NavItem[] = [
  { label: "Home",          href: "/" },
  { label: "About MTC",    href: "/about" },
  { label: "How to Enrol", href: "/admissions/how-to-enrol" },
  { label: "Impact",       href: "/impact" },
];

/* ─────────────────────────────────────────────
   BREADCRUMB (used inside header on inner pages)
   ───────────────────────────────────────────── */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/* ─────────────────────────────────────────────
   MAIN HEADER
   ───────────────────────────────────────────── */
export default function PublicHeader() {
  const pathname  = usePathname();
  const [scrolled, setScrolled]   = useState(false);
  const [drawerOpen, setDrawer]   = useState(false);
  const drawerRef    = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  /* Scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* Close drawer on route change */
  useEffect(() => { setDrawer(false); }, [pathname]);

  /* Esc closes drawer */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  /* Click outside closes drawer */
  useEffect(() => {
    if (!drawerOpen) return;
    const fn = (e: MouseEvent) => {
      if (
        drawerRef.current && !drawerRef.current.contains(e.target as Node) &&
        hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)
      ) setDrawer(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [drawerOpen]);

  /* Lock scroll when drawer open */
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Skip nav */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]
                   focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded-lg
                   focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="fixed top-0 inset-x-0 z-50">
        {/* Main bar */}
        <div
          className={`bg-primary transition-all duration-300 ${scrolled ? "shadow-lg border-b border-white/10" : ""}`}
          style={{ height: 72 }}
        >
          <nav
            className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between gap-6"
            aria-label="Main navigation"
          >
            {/* Logo: image only, no wordmark */}
            <Link
              href="/"
              className="flex items-center no-underline flex-shrink-0"
              aria-label="Musawo Training Center - home"
            >
              <span className="flex items-center justify-center bg-white rounded-xl w-[52px] h-[52px] shadow-sm p-1.5">
                <Image
                  src="/assets/logo-header.png"
                  alt=""
                  width={40}
                  height={40}
                  priority
                  className="w-full h-full object-contain"
                  aria-hidden="true"
                />
              </span>
            </Link>

            {/* Desktop nav links */}
            <ul className="hidden lg:flex items-center gap-1 list-none flex-1 justify-center" role="list">
              {NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative px-4 py-2 rounded-lg text-sm font-semibold no-underline transition-colors
                                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
                                  ${active
                                    ? "text-white bg-white/15"
                                    : "text-white/80 hover:text-white hover:bg-white/10"
                                  }`}
                    >
                      {item.label}
                      {active && (
                        <span
                          className="absolute bottom-0.5 left-4 right-4 h-0.5 bg-accent rounded-full"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold
                           text-white/80 hover:text-white hover:bg-white/10 rounded-lg
                           no-underline transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/apply"
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-600
                           active:scale-[0.97] text-white text-sm font-bold px-4 py-2.5 rounded-xl
                           no-underline transition-all shadow-cta"
              >
                Apply now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>

              {/* Hamburger */}
              <button
                ref={hamburgerRef}
                type="button"
                className="lg:hidden ml-1 flex items-center justify-center w-10 h-10 rounded-xl
                           text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={drawerOpen ? "Close menu" : "Open menu"}
                aria-expanded={drawerOpen}
                aria-controls="mobile-drawer"
                onClick={() => setDrawer((v) => !v)}
              >
                {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {drawerOpen && (
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`fixed top-0 right-0 bottom-0 z-50 w-[min(320px,92vw)] bg-primary
                    flex flex-col lg:hidden transition-transform duration-300 ease-out
                    ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline"
            onClick={() => setDrawer(false)}
            aria-label="Musawo Training Center home"
          >
            <span className="flex items-center justify-center bg-white rounded-xl w-11 h-11 p-1.5 flex-shrink-0">
              <Image
                src="/assets/logo-header.png"
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-contain"
                aria-hidden="true"
              />
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setDrawer(false)}
            className="flex items-center justify-center w-9 h-9 rounded-lg
                       text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile navigation links">
          <ul className="space-y-1 list-none">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawer(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold
                                no-underline transition-colors
                                ${active
                                  ? "bg-white/15 text-white"
                                  : "text-white/75 hover:text-white hover:bg-white/10"
                                }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Drawer footer actions */}
        <div className="px-4 pb-6 pt-4 border-t border-white/10 space-y-3">
          <Link
            href="/apply"
            onClick={() => setDrawer(false)}
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-600
                       text-white font-bold text-sm px-4 py-3 rounded-xl no-underline transition-colors"
          >
            Apply now <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            onClick={() => setDrawer(false)}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15
                       text-white font-semibold text-sm px-4 py-3 rounded-xl no-underline transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </>
  );
}
