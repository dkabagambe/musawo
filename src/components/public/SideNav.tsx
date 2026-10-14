"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface SideNavItem {
  label: string;
  href: string;
}

interface SideNavProps {
  items: SideNavItem[];
  /** Section title shown above the nav */
  title: string;
}

/**
 * Desktop: vertical side navigation with active highlight and amber underline.
 * Mobile: collapsible chip strip (accordion).
 */
export default function SideNav({ items, title }: SideNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeItem = items.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  return (
    <>
      {/* ── Desktop side nav ──────────────────────────────────────── */}
      <nav
        className="hidden lg:block sticky top-[128px] w-56 flex-shrink-0"
        aria-label={`${title} navigation`}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-3">
          {title}
        </p>
        <ul className="space-y-0.5 list-none">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium
                              no-underline transition-colors relative
                              ${active
                                ? "bg-primary/8 text-primary font-semibold"
                                : "text-gray-600 hover:text-primary hover:bg-surface"
                              }`}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent rounded-full"
                      aria-hidden="true"
                    />
                  )}
                  <span className="pl-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Mobile chip strip (accordion) ─────────────────────────── */}
      <div className="lg:hidden mb-8">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 bg-white border
                     border-border rounded-xl text-sm font-semibold text-primary
                     hover:bg-surface transition-colors"
        >
          <span>{activeItem?.label ?? title}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div className="mt-2 bg-white border border-border rounded-xl overflow-hidden">
            <ul className="list-none divide-y divide-border">
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm no-underline transition-colors
                                  ${active
                                    ? "text-primary font-semibold bg-primary/5"
                                    : "text-gray-600 hover:text-primary hover:bg-surface"
                                  }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
