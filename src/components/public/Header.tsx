"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────
   NAV STRUCTURE
   ───────────────────────────────────────────── */
interface NavChild {
  label: string;
  href: string;
  desc?: string;
}

interface NavItem {
  label: string;
  href?: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Courses",
    children: [
      {
        label: "Certificate in Medical Home Care Course",
        href: "/courses/medical-home-caregiver",
        desc: "3 months. For registered health professionals.",
      },
      {
        label: "Certificate in Basic Home Care",
        href: "/courses/basic-home-caregiver",
        desc: "3 months. Open to all.",
      },
      {
        label:
          "Basic Certificate in Babysitting, Child Care and Safety Management",
        href: "/courses/babysitting-childcare-safety",
        desc: "2 months. Open to all.",
      },
      {
        label: "Certificate in Mental Health Support and Advocacy",
        href: "/courses/mental-health-support-advocacy",
        desc: "3 months. Open to all.",
      },
      {
        label:
          "Basic Certificate in Care of Older Persons and Persons with Disability",
        href: "/courses/care-older-persons-disability",
        desc: "3 months. Open to all.",
      },
      {
        label: "Certificate in Basic Life Support",
        href: "/courses/basic-life-support-first-aid",
        desc: "1 month. Open to all.",
      },
      {
        label: "Certificate in Advanced Life Support",
        href: "/courses/advanced-life-support",
        desc: "1 month. For registered health professionals.",
      },
      {
        label: "Certificate in Advanced First Aid",
        href: "/courses/advanced-first-aid",
        desc: "1 month. Open to non-health professionals aged 18 and above.",
      },
      {
        label: "All courses",
        href: "/courses",
        desc: "Browse and compare all programmes.",
      },
    ],
  },
  {
    label: "Admissions",
    children: [
      {
        label: "Apply now",
        href: "/apply",
        desc: "Submit your application for the November 2026 intake.",
      },
      {
        label: "How to enrol",
        href: "/admissions/how-to-enrol",
        desc: "Step-by-step guide to joining MTC.",
      },
      {
        label: "Fees and instalments",
        href: "/admissions/fees",
        desc: "Full fees and instalment options.",
      },
      {
        label: "Payment options",
        href: "/admissions/payment-options",
        desc: "Mobile money, bank and more.",
      },
    ],
  },
  {
    label: "Learning",
    children: [
      {
        label: "How you will learn",
        href: "/learning/how-you-learn",
        desc: "Hybrid and online approach with skills lab practicals.",
      },
      {
        label: "Live classes",
        href: "/learning/live-classes",
        desc: "Sessions with your tutor and fellow students.",
      },
      {
        label: "Exams and certificates",
        href: "/learning/exams",
        desc: "Assessments and digital certificates.",
      },
      {
        label: "Free resources",
        href: "/resources",
        desc: "Study guides and reference materials.",
      },
    ],
  },
  {
    label: "About",
    children: [
      {
        label: "About MTC",
        href: "/about",
        desc: "Our story, mission and values.",
      },
      {
        label: "Accreditation",
        href: "/about/accreditation",
        desc: "Accreditation details.",
      },
      {
        label: "Our trainers",
        href: "/about/trainers",
        desc: "Meet the clinical educators.",
      },
      { label: "FAQ", href: "/faq", desc: "Common questions answered." },
    ],
  },
  { label: "Contact", href: "/contact" },
];

/* ─────────────────────────────────────────────
   BREADCRUMB (used inside header on inner pages)
   ───────────────────────────────────────────── */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/* ─────────────────────────────────────────────
   UTILITY BAR
   ───────────────────────────────────────────── */
function UtilityBar() {
  return (
    <div
      className="hidden lg:block bg-[#095549] text-white/80 text-xs"
      style={{ height: 38 }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between gap-4">
        {/* Left links */}
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="hover:text-white no-underline transition-colors"
          >
            Student login
          </Link>
          <a
            href="https://musawo.ug"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white no-underline transition-colors flex items-center gap-1"
          >
            Visit musawo.ug{" "}
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
        {/* Right info */}
        <div className="flex items-center gap-5">
          <a
            href="tel:+256709184468"
            className="hover:text-white no-underline transition-colors flex items-center gap-1.5"
          >
            <Phone className="w-3 h-3" aria-hidden="true" />
            0709 184 468
          </a>
          <a
            href="https://wa.me/256709184468"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white no-underline transition-colors flex items-center gap-1.5"
          >
            <MessageCircle className="w-3 h-3" aria-hidden="true" />
            WhatsApp
          </a>
          <a
            href="mailto:info@musawo.ug"
            className="hover:text-white no-underline transition-colors flex items-center gap-1.5"
          >
            <Mail className="w-3 h-3" aria-hidden="true" />
            info@musawo.ug
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DESKTOP DROPDOWN ITEM
   ───────────────────────────────────────────── */
function DropdownMenu({
  item,
  isOpen,
  onOpen,
  onClose,
  isParentActive,
}: {
  item: NavItem;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  isParentActive: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = useCallback(() => {
    timerRef.current = setTimeout(onClose, 200);
  }, [onClose]);

  const cancelClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Keyboard: arrow keys navigate items, Escape closes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      triggerRef.current?.focus();
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen) {
        onClose();
      } else {
        onOpen();
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const first = panelRef.current?.querySelector<HTMLAnchorElement>("a");
      first?.focus();
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        onOpen();
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onKeyDown={handleKeyDown}
        className={`relative flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
                    no-underline transition-colors focus-visible:outline-2
                    focus-visible:outline-offset-2 focus-visible:outline-accent
                    ${isParentActive ? "text-white" : "text-white/75 hover:text-white hover:bg-white/10"}`}
      >
        {item.label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        {isParentActive && (
          <span
            className="absolute bottom-1 left-3 right-3 h-0.5 bg-accent rounded-full"
            aria-hidden="true"
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <m.div
            ref={panelRef}
            key="dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            role="menu"
            aria-label={`${item.label} submenu`}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="absolute top-full left-0 w-72 z-[60]"
            style={{ paddingTop: 6 }}
          >
            {/* invisible bridge covers the gap between button bottom and panel */}
            <div className="bg-white rounded-[8px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 py-2">
              {item.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  role="menuitem"
                  className="flex flex-col px-4 py-3 no-underline hover:bg-[#F1F7F5]
                           transition-colors group focus-visible:bg-[#F1F7F5]
                           focus-visible:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      onClose();
                      triggerRef.current?.focus();
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const el = e.currentTarget
                        .nextElementSibling as HTMLElement | null;
                      el?.focus();
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const el = e.currentTarget
                        .previousElementSibling as HTMLElement | null;
                      el?.focus();
                    }
                  }}
                >
                  <span className="text-sm font-semibold text-[#1F2937] group-hover:text-primary transition-colors">
                    {child.label}
                  </span>
                  {child.desc && (
                    <span className="text-xs text-[#4B5563] mt-0.5 leading-snug">
                      {child.desc}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MOBILE ACCORDION GROUP
   ───────────────────────────────────────────── */
function MobileAccordion({
  item,
  isActive,
  onClose,
}: {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const childActive = item.children?.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
  );

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm
                    font-semibold text-left transition-colors
                    ${
                      childActive || isActive
                        ? "bg-white/15 text-white"
                        : "text-white/75 hover:text-white hover:bg-white/10"
                    }`}
      >
        {item.label}
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <m.ul
            key="accordion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden pl-4 list-none"
          >
            {item.children?.map((child) => {
              const active =
                pathname === child.href ||
                pathname.startsWith(child.href + "/");
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onClose}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                                no-underline transition-colors
                                ${
                                  active
                                    ? "text-accent font-semibold"
                                    : "text-white/65 hover:text-white"
                                }`}
                  >
                    <ChevronRight
                      className="w-3 h-3 flex-shrink-0"
                      aria-hidden="true"
                    />
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </m.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

/* ─────────────────────────────────────────────
   MAIN HEADER COMPONENT
   ───────────────────────────────────────────── */
export default function PublicHeader({
  showAccreditation = false,
}: {
  showAccreditation?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawer] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Build nav, filtering out the Accreditation item when setting is not filled
  const nav: NavItem[] = NAV.map((item) => {
    if (item.label === "About" && item.children) {
      return {
        ...item,
        children: showAccreditation
          ? item.children
          : item.children.filter((c) => c.href !== "/about/accreditation"),
      };
    }
    return item;
  });

  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Scroll detection
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawer(false);
    setOpenMenu(null);
  }, [pathname]);

  // Esc key closes everything
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawer(false);
        setOpenMenu(null);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  // Click outside closes drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const fn = (e: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(e.target as Node)
      )
        setDrawer(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [drawerOpen]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const isItemActive = (item: NavItem): boolean => {
    if (item.href) {
      return item.href === "/"
        ? pathname === "/"
        : pathname.startsWith(item.href);
    }
    return (item.children ?? []).some(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
    );
  };

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

      <header className="fixed top-0 inset-x-0 z-50 flex flex-col">
        {/* ── Utility bar ─────────────────────────────────────────── */}
        <UtilityBar />

        {/* ── Main bar ────────────────────────────────────────────── */}
        <div
          className={`bg-primary transition-all duration-300 ${
            scrolled ? "shadow-lg border-b border-white/10" : ""
          }`}
          style={{ height: 72 }}
        >
          <nav
            className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between gap-4"
            aria-label="Main navigation"
          >
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 no-underline flex-shrink-0"
              aria-label="Musawo Training Center - home"
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
                <span className="font-extrabold text-white text-sm tracking-tight">
                  Musawo Training Center
                </span>
                <span className="text-white/55 text-[10px] font-normal tracking-wide uppercase">
                  Learn · Serve · Transform
                </span>
              </span>
            </Link>

            {/* Desktop nav */}
            <ul
              className="hidden lg:flex items-center gap-0.5 text-sm font-medium list-none"
              role="list"
            >
              {nav.map((item) => {
                if (item.children) {
                  return (
                    <li key={item.label}>
                      <DropdownMenu
                        item={item}
                        isOpen={openMenu === item.label}
                        onOpen={() => setOpenMenu(item.label)}
                        onClose={() => setOpenMenu(null)}
                        isParentActive={isItemActive(item)}
                      />
                    </li>
                  );
                }
                const active = isItemActive(item);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href!}
                      className={`relative px-3 py-2 rounded-lg no-underline transition-colors text-sm font-medium
                                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
                                  ${
                                    active
                                      ? "text-white"
                                      : "text-white/75 hover:text-white hover:bg-white/10"
                                  }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                      {active && (
                        <span
                          className="absolute bottom-1 left-3 right-3 h-0.5 bg-accent rounded-full"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Right actions */}
            <div className="flex items-center gap-2">
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
                Apply now{" "}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>

              {/* Hamburger (mobile + tablet) */}
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
                {drawerOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* ── Mobile backdrop ───────────────────────────────────────── */}
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

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
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
            <span className="font-extrabold text-white text-sm leading-tight">
              Musawo
              <br />
              Training Center
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
        <nav
          className="flex-1 overflow-y-auto px-4 py-4"
          aria-label="Mobile navigation links"
        >
          <ul className="space-y-1 list-none">
            {nav.map((item) => {
              if (item.children) {
                return (
                  <MobileAccordion
                    key={item.label}
                    item={item}
                    isActive={isItemActive(item)}
                    onClose={() => setDrawer(false)}
                  />
                );
              }
              const active = isItemActive(item);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href!}
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold
                                no-underline transition-colors
                                ${
                                  active
                                    ? "bg-white/15 text-white"
                                    : "text-white/75 hover:text-white hover:bg-white/10"
                                }`}
                    onClick={() => setDrawer(false)}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Utility links in drawer */}
          <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
            <p className="text-white/40 text-[10px] uppercase tracking-widest px-4 mb-3">
              More
            </p>
            {[
              {
                label: "Visit musawo.ug",
                href: "https://musawo.ug",
                external: true,
              },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noopener noreferrer" : undefined}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                           text-white/60 hover:text-white hover:bg-white/10 no-underline
                           transition-colors"
                onClick={() => setDrawer(false)}
              >
                {l.label}
                {l.external && (
                  <ExternalLink
                    className="w-3 h-3 opacity-50"
                    aria-hidden="true"
                  />
                )}
              </a>
            ))}
            <div className="px-4 pt-1 space-y-1.5 text-xs text-white/50">
              <a
                href="tel:+256709184468"
                className="flex items-center gap-2 hover:text-white/80 no-underline transition-colors py-1.5"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                0709 184 468
              </a>
              <a
                href="mailto:info@musawo.ug"
                className="flex items-center gap-2 hover:text-white/80 no-underline transition-colors py-1.5"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                info@musawo.ug
              </a>
            </div>
          </div>
        </nav>

        {/* Drawer footer CTA */}
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
            href="/apply"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold
                       bg-accent hover:bg-accent-600 active:scale-[0.97] text-white rounded-xl
                       no-underline transition-all shadow-cta"
            onClick={() => setDrawer(false)}
          >
            Apply now <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
