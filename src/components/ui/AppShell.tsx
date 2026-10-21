"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterNavByPermission } from "@/lib/rbac/navigation";
import type { DashboardTab } from "@/lib/dashboard/widgets";
import {
  DashboardPageHeader,
  DashboardPreferenceProvider,
  WidgetCustomizer,
} from "@/components/ui/DashboardWidgets";
import type { UserRole } from "@prisma/client";
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  Bell,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSearch,
  GraduationCap,
  Layers,
  LifeBuoy,
  LayoutDashboard as LayoutDashboardIcon,
  LogOut,
  Menu,
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  Settings,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  group?: string;
  permission?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  nav: NavItem[];
  role: string;
  permissionRole: UserRole;
  userName: string;
  userInitial: string;
  accentClass?: string;
  /** Explicit ordered tab list for the dashboard page header.
   *  When provided, overrides the tabs derived from nav grouping.
   *  Each entry is a valid DashboardTab id. */
  tabs?: DashboardTab[];
}

function titleFor(pathname: string, nav: NavItem[]) {
  if (pathname === nav[0]?.href) return "Dashboard";
  const current = [...nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
  return current?.label ?? "Dashboard";
}

function dashboardGroup(href: string, root: string): DashboardTab {
  const relative =
    href === root ? "" : href.slice(root.length).replace(/^\//, "");
  const section = relative.split("/")[0];
  const groupsByRoot: Record<string, Record<string, DashboardTab>> = {
    "/dashboard": {
      courses: "studies",
      gradebook: "studies",
      results: "studies",
      assignments: "studies",
      forum: "studies",
      payments: "finance",
      recordings: "classes",
    },
    "/tutor": {
      courses: "teaching",
      materials: "teaching",
      classes: "teaching",
      students: "students",
      exams: "assessment",
      attendance: "assessment",
      announcements: "support",
    },
    "/registrar": {
      applications: "admissions",
      students: "students",
      enrolments: "academics",
      results: "academics",
      graduands: "academics",
      audit: "reports",
    },
    "/principal": {
      courses: "academics",
      students: "academics",
      results: "academics",
      graduands: "academics",
      reports: "reports",
      audit: "reports",
    },
    "/deputy": {
      students: "academics",
      timetable: "academics",
      complaints: "support",
      reports: "reports",
      policies: "support",
    },
    "/finance": {
      payments: "payments",
      ledger: "reconciliation",
      approvals: "payments",
    },
    "/bursar": {
      payments: "payments",
      ledger: "reconciliation",
      approvals: "payments",
    },
    "/admin": {
      courses: "academics",
      students: "students",
      tutors: "staff",
      intakes: "academics",
      payments: "finance",
      reports: "reports",
      settings: "settings",
      audit: "audit",
      "partner-pages": "settings",
    },
    "/director": {
      approvals: "approvals",
      staff: "staff",
      audit: "reports",
      "access-review": "staff",
      admin: "staff",
    },
    "/board": { reports: "reports", policies: "audit", graduates: "academics" },
    "/auditor": {
      students: "audit",
      audit: "audit",
      reports: "reports",
      policies: "audit",
    },
    "/system": { settings: "system", audit: "logs" },
  };
  return groupsByRoot[root]?.[section] ?? "general";
}

const TAB_LABELS: Record<DashboardTab, string> = {
  general: "General",
  studies: "Studies",
  finance: "Finance",
  classes: "Classes",
  teaching: "Teaching",
  students: "Students",
  assessment: "Assessment",
  support: "Support",
  materials: "Materials",
  admissions: "Admissions",
  academics: "Academics",
  approvals: "Approvals",
  reports: "Reports",
  payments: "Payments",
  reconciliation: "Reconciliation",
  staff: "Staff",
  settings: "Settings",
  audit: "Audit",
  system: "System",
  logs: "Logs",
};

function groupIcon(group: string) {
  const props = { size: 18, "aria-hidden": true as const };
  switch (group) {
    case "general":
      return <LayoutDashboardIcon {...props} />;
    case "teaching":
      return <GraduationCap {...props} />;
    case "assessment":
      return <ClipboardCheck {...props} />;
    case "support":
      return <LifeBuoy {...props} />;
    case "students":
      return <UserRound {...props} />;
    case "studies":
      return <BookOpen {...props} />;
    case "classes":
      return <CalendarDays {...props} />;
    case "finance":
    case "payments":
      return <Wallet {...props} />;
    case "reconciliation":
      return <ArrowLeftRight {...props} />;
    case "admissions":
      return <ClipboardList {...props} />;
    case "academics":
      return <Building2 {...props} />;
    case "reports":
      return <FileSearch {...props} />;
    case "audit":
      return <ShieldCheck {...props} />;
    case "staff":
      return <Users {...props} />;
    case "settings":
      return <SlidersHorizontal {...props} />;
    case "system":
      return <Settings2 {...props} />;
    default:
      return <Layers {...props} />;
  }
}

export function Sidebar({
  nav,
  pathname,
  userName,
  userInitial,
  role,
  collapsed,
  onToggle,
  onNavigate,
}: {
  nav: NavItem[];
  pathname: string;
  userName: string;
  userInitial: string;
  role: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const grouped = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    nav.forEach((item) => {
      const group = item.group ?? dashboardGroup(item.href, nav[0]?.href ?? "");
      map.set(group, [...(map.get(group) ?? []), item]);
    });
    return Array.from(map.entries());
  }, [nav]);

  const active = (href: string) =>
    href === pathname ||
    (href !== nav[0]?.href && pathname.startsWith(`${href}/`));

  return (
    <aside
      className={`portal-sidebar ${collapsed ? "portal-sidebar-collapsed" : ""}`}
      aria-label="Main sidebar"
    >
      <div className="portal-brand">
        <Link
          href="/"
          className="portal-brand-link"
          aria-label="Musawo Training Center"
        >
          <span className="portal-logo">
            <Image
              src="/assets/logo-header.png"
              alt=""
              width={30}
              height={30}
              priority
            />
          </span>
          <span className="portal-wordmark">
            <strong>Musawo TC</strong>
            <small>Learning system</small>
          </span>
        </Link>
        <button
          type="button"
          className="portal-icon-button portal-sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      <nav className="portal-nav">
        {grouped.map(([group, items]) => (
          <section key={group} className="portal-nav-group" aria-label={group}>
            {items.length > 1 && (
              <button
                type="button"
                className="portal-nav-link portal-nav-parent"
                aria-expanded={!collapsedGroups.includes(group)}
                title={
                  collapsed ? TAB_LABELS[group as DashboardTab] : undefined
                }
                onClick={() =>
                  setCollapsedGroups((current) =>
                    current.includes(group)
                      ? current.filter((value) => value !== group)
                      : [...current, group],
                  )
                }
              >
                <span className="portal-nav-icon" aria-hidden="true">
                  {groupIcon(group)}
                </span>
                <span className="portal-nav-label">
                  {TAB_LABELS[group as DashboardTab] ?? group}
                </span>
                <ChevronRight
                  className={`portal-nav-parent-chevron ${collapsedGroups.includes(group) ? "" : "is-expanded"}`}
                  size={16}
                  aria-hidden="true"
                />
              </button>
            )}
            {!collapsedGroups.includes(group) && (
              <ul
                className={items.length > 1 ? "portal-nav-subitems" : undefined}
              >
                {items.map((item) => {
                  const selected = active(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        aria-current={selected ? "page" : undefined}
                        className={`portal-nav-link ${selected ? "is-active" : ""}`}
                      >
                        <span className="portal-nav-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="portal-nav-label">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="portal-nav-badge">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </nav>

      <div className="portal-user-area">
        {userMenuOpen && (
          <div className="portal-user-menu" role="menu">
            <Link
              href={
                nav.find((item) => /profile/i.test(item.label))?.href ??
                "/dashboard/profile"
              }
              onClick={() => {
                setUserMenuOpen(false);
                onNavigate?.();
              }}
              role="menuitem"
            >
              <UserRound size={16} /> Profile
            </Link>
            <Link href="/signout" role="menuitem" onClick={() => { setUserMenuOpen(false); onNavigate?.(); }}>
              <LogOut size={16} /> Log out
            </Link>
          </div>
        )}
        <button
          type="button"
          className="portal-user-button"
          onClick={() => setUserMenuOpen((value) => !value)}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
          title={collapsed ? userName : undefined}
        >
          <span className="portal-avatar">{userInitial}</span>
          <span className="portal-user-copy">
            <strong>{userName}</strong>
            <small>{role}</small>
          </span>
          <ChevronDown className="portal-user-chevron" size={16} />
        </button>
      </div>
    </aside>
  );
}

export function Topbar({
  title,
  onMenu,
  nav,
  menuButtonRef,
}: {
  title: string;
  onMenu: () => void;
  nav: NavItem[];
  menuButtonRef: React.RefObject<HTMLButtonElement>;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!settingsOpen) return;
    const dismiss = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      )
        setSettingsOpen(false);
    };
    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, [settingsOpen]);

  const profile =
    nav.find((item) => /profile/i.test(item.label))?.href ??
    "/dashboard/profile";
  const notifications = nav.find((item) =>
    /notification/i.test(item.label),
  )?.href;
  return (
    <header className="portal-topbar">
      <div className="portal-topbar-title">
        <button
          ref={menuButtonRef}
          type="button"
          className="portal-icon-button portal-mobile-menu"
          onClick={onMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1>{title}</h1>
      </div>
      <div className="portal-settings-wrap" ref={menuRef}>
        <button
          type="button"
          className="portal-settings-button"
          aria-label="Settings"
          aria-expanded={settingsOpen}
          aria-haspopup="menu"
          onClick={() => setSettingsOpen((value) => !value)}
        >
          <Settings size={19} />
        </button>
        {settingsOpen && (
          <div className="portal-settings-menu" role="menu">
            <Link
              href={profile}
              role="menuitem"
              onClick={() => setSettingsOpen(false)}
            >
              <UserRound size={16} /> Profile
            </Link>
            {notifications && (
              <Link
                href={notifications}
                role="menuitem"
                onClick={() => setSettingsOpen(false)}
              >
                <Bell size={16} /> Notifications settings
              </Link>
            )}
            <Link
              href={`${profile}#password`}
              role="menuitem"
              onClick={() => setSettingsOpen(false)}
            >
              <Settings size={16} /> Change password
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default function AppShell({
  children,
  nav,
  role,
  permissionRole,
  userName,
  userInitial,
  tabs: tabsProp,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const visibleNav = useMemo(
    () =>
      filterNavByPermission(nav, permissionRole).map((item) => ({
        ...item,
        group: item.group ?? dashboardGroup(item.href, nav[0]?.href ?? ""),
      })),
    [nav, permissionRole],
  );
  const dashboardRoot = visibleNav[0]?.href;
  const isPortalDashboard = pathname === dashboardRoot;
  const dashboardTabs = useMemo(() => {
    // If caller explicitly passes tabs, use those (ensures widget registry alignment)
    if (tabsProp && tabsProp.length > 0) {
      return tabsProp.map((id) => ({ id, label: TAB_LABELS[id] ?? id }));
    }
    // Fallback: derive from nav grouping
    const tabs: DashboardTab[] = [];
    visibleNav.forEach((item) => {
      const tab = item.group as DashboardTab;
      if (!tabs.includes(tab)) tabs.push(tab);
    });
    if (!tabs.includes("general")) tabs.unshift("general");
    return tabs.map((id) => ({ id, label: TAB_LABELS[id] ?? id }));
  }, [visibleNav, tabsProp]);
  const currentTab =
    dashboardTabs.find((tab) => tab.id === searchParams.get("tab"))?.id ??
    "general";

  useEffect(() => {
    visibleNav.forEach((item) => router.prefetch(item.href));
  }, [visibleNav, router]);

  useEffect(() => {
    const beat = () =>
      fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        keepalive: true,
      }).catch(() => undefined);
    void beat();
    const timer = setInterval(beat, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);
  // Use a per-portal key so collapsing as tutor doesn't affect other roles
  const storageKey = `mtc-sidebar-collapsed${dashboardRoot ? `-${dashboardRoot.replace(/\//g, "")}` : ""}`;
  useEffect(() => {
    try {
      // Clear the old shared key that caused all roles to collapse together
      localStorage.removeItem("mtc-sidebar-collapsed");
      setCollapsed(localStorage.getItem(storageKey) === "true");
    } catch {
      /* storage can be unavailable */
    }
  }, [storageKey]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    if (!drawerOpen)
      return () => {
        document.body.style.overflow = "";
      };
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("a, button");
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1)?.focus();
      }
      if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen, closeDrawer]);

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        /* storage can be unavailable */
      }
      return next;
    });

  return (
    <div className={`portal-shell ${collapsed ? "has-collapsed-sidebar" : ""}`}>
      <div className="portal-desktop-sidebar">
        <Sidebar
          nav={visibleNav}
          pathname={pathname}
          userName={userName}
          userInitial={userInitial}
          role={role}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
        />
      </div>
      <div className="portal-main-column">
        <Topbar
          title={titleFor(pathname, visibleNav)}
          nav={visibleNav}
          onMenu={() => setDrawerOpen(true)}
          menuButtonRef={menuButtonRef}
        />
        <main className="portal-main" id="main-content">
          <div className="portal-content">
            {isPortalDashboard ? (
              <DashboardPreferenceProvider tab={currentTab}>
                <DashboardPageHeader
                  firstName={userName.split(" ")[0] || "there"}
                  tabs={dashboardTabs}
                  customizer={<WidgetCustomizer tab={currentTab} />}
                />
                {children}
              </DashboardPreferenceProvider>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
      {drawerOpen && (
        <button
          type="button"
          className="portal-scrim"
          aria-label="Close navigation"
          onClick={closeDrawer}
        />
      )}
      <div
        ref={dialogRef}
        className={`portal-mobile-drawer ${drawerOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!drawerOpen}
      >
        <Sidebar
          nav={visibleNav}
          pathname={pathname}
          userName={userName}
          userInitial={userInitial}
          role={role}
          collapsed={false}
          onToggle={closeDrawer}
          onNavigate={closeDrawer}
        />
      </div>
    </div>
  );
}
