"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home",      href: "/" },
  { label: "Courses",   href: "/courses" },
  { label: "Resources", href: "/resources" },
  { label: "About",     href: "/about" },
  { label: "Contact",   href: "/contact" },
];

export default function PublicHeader() {
  const pathname   = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawer] = useState(false);
  const drawerRef    = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setDrawer(false); }, [pathname]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

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

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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

      {/* Always solid brand teal — never transparent over hero photos */}
      <header
        className={`fixed top-0 inset-x-0 z-50 bg-primary transition-all duration-300 ${
          scrolled ? "shadow-lg border-b border-white/10 h-14" : "h-16"
        }`}
      >
        <nav
          className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between gap-4"
          aria-label="Main navigation"
        >
          {/* Logo — white square badge (logo-header.png: dark navy on white) */}
          <Link
            href="/"
            className="flex items-center gap-3 no-underline flex-shrink-0"
            aria-label="Musawo Training Center — home"
          >
            <span className="flex items-center justify-center bg-white rounded-xl w-[52px] h-[52px] flex-shrink-0 shadow-sm p-1.5">
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
            <span className="hidden sm:flex flex-col leading-tight">
              <span className="font-extrabold text-white text-sm tracking-tight">Musawo Training Center</span>
              <span className="text-white/55 text-[10px] font-normal tracking-wide uppercase">Learn · Certify · Serve</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-0.5 text-sm font-medium list-none" role="list">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative px-3 py-2 rounded-lg no-underline transition-colors ${
                    isActive(href)
                      ? "text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  aria-current={isActive(href) ? "page" : undefined}
                >
                  {label}
                  {isActive(href) && (
                    <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-accent rounded-full" aria-hidden="true" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold
                         text-white/80 hover:text-white hover:bg-white/10 rounded-lg no-underline transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-600
                         active:scale-[0.97] text-white text-sm font-bold px-4 py-2 rounded-xl
                         no-underline transition-all shadow-cta"
            >
              Enrol now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>

            {/* Hamburger */}
            <button
              ref={hamburgerRef}
              type="button"
              className="md:hidden ml-1 flex items-center justify-center w-10 h-10 rounded-xl
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
      </header>

      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
          style={{ animation: "fadeIn 0.2s ease-out both" }}
        />
      )}

      {/* Mobile drawer */}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-primary flex flex-col md:hidden
                    transition-transform duration-300 ease-out ${
                      drawerOpen ? "translate-x-0" : "translate-x-full"
                    }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5 no-underline" onClick={() => setDrawer(false)}>
            <span className="flex items-center justify-center bg-white rounded-xl w-11 h-11 p-1.5 flex-shrink-0">
              <Image src="/assets/logo-header.png" alt="" width={36} height={36} className="w-full h-full object-contain" aria-hidden="true" />
            </span>
            <span className="font-extrabold text-white text-sm">Musawo Training Center</span>
          </Link>
          <button
            type="button"
            onClick={() => setDrawer(false)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-white/70
                       hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile navigation links">
          <ul className="space-y-1 list-none">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                              no-underline transition-colors ${
                                isActive(href)
                                  ? "bg-white/15 text-white"
                                  : "text-white/75 hover:text-white hover:bg-white/10"
                              }`}
                  onClick={() => setDrawer(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Drawer footer */}
        <div className="px-4 pb-8 pt-4 border-t border-white/10 space-y-3">
          <Link
            href="/login"
            className="flex items-center justify-center w-full py-3 text-sm font-semibold
                       text-white/80 hover:text-white hover:bg-white/10 border border-white/20
                       rounded-xl no-underline transition-colors"
            onClick={() => setDrawer(false)}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold
                       bg-accent hover:bg-accent-600 active:scale-[0.97] text-white rounded-xl
                       no-underline transition-all shadow-cta"
            onClick={() => setDrawer(false)}
          >
            Enrol now <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
