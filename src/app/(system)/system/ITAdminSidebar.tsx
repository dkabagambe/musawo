"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Monitor,
  AlertTriangle,
  LifeBuoy,
  Clock,
  Mail,
  Database,
  HardDrive,
  Shield,
  Users,
  Key,
  Settings,
  Plug,
  Power,
  Flag,
  Package,
  BookOpen,
  FileText,
  User,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getInitials } from "@/lib/utils/initials";
import Image from "next/image";

interface ITAdminSidebarProps {
  userName: string;
  userAvatarUrl?: string | null;
}

interface NavGroup {
  label: string;
  defaultOpen?: boolean;
  items: {
    href: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    available?: boolean;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    defaultOpen: true,
    items: [
      { href: "/system/health", label: "System Health", icon: <Monitor className="w-4 h-4" />, available: true },
      { href: "/system/performance", label: "Performance", icon: <Monitor className="w-4 h-4" />, available: true },
      { href: "/system/alerts", label: "Alerts", icon: <AlertTriangle className="w-4 h-4" />, available: true },
    ],
  },
  {
    label: "Operations",
    defaultOpen: true,
    items: [
      { href: "/system/support", label: "Support Tickets", icon: <LifeBuoy className="w-4 h-4" />, available: true },
      { href: "/system/jobs", label: "Scheduled Jobs", icon: <Clock className="w-4 h-4" />, available: true },
      { href: "/system/email-queue", label: "Email and SMS Queue", icon: <Mail className="w-4 h-4" />, available: true },
    ],
  },
  {
    label: "Data Safety",
    items: [
      { href: "/system/backups", label: "Backups", icon: <Database className="w-4 h-4" />, available: true },
      { href: "/system/database", label: "Database", icon: <Database className="w-4 h-4" />, available: true },
      { href: "/system/storage", label: "Storage", icon: <HardDrive className="w-4 h-4" />, available: true },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/system/security-events", label: "Security Events", icon: <Shield className="w-4 h-4" />, available: false },
      { href: "/system/accounts", label: "Account Support", icon: <Users className="w-4 h-4" />, available: false },
      { href: "/system/break-glass", label: "Break-glass Requests", icon: <Key className="w-4 h-4" />, available: false },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/system/settings", label: "Settings", icon: <Settings className="w-4 h-4" />, available: true },
      { href: "/system/integrations", label: "Integrations", icon: <Plug className="w-4 h-4" />, available: true },
      { href: "/system/maintenance", label: "Maintenance Mode", icon: <Power className="w-4 h-4" />, available: false },
      { href: "/system/feature-flags", label: "Feature Flags", icon: <Flag className="w-4 h-4" />, available: false },
    ],
  },
  {
    label: "Releases",
    items: [
      { href: "/system/releases", label: "Deployments and Versions", icon: <Package className="w-4 h-4" />, available: false },
      { href: "/system/runbook", label: "Runbook", icon: <BookOpen className="w-4 h-4" />, available: false },
    ],
  },
  {
    label: "Logs",
    items: [
      { href: "/system/audit", label: "Audit Events", icon: <FileText className="w-4 h-4" />, available: true },
      { href: "/system/logs", label: "System Logs", icon: <FileText className="w-4 h-4" />, available: true },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/system/profile", label: "Profile", icon: <User className="w-4 h-4" />, available: true },
    ],
  },
];

export default function ITAdminSidebar({ userName, userAvatarUrl }: ITAdminSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(NAV_GROUPS.filter((g) => g.defaultOpen).map((g) => g.label))
  );

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-semibold text-sm">
            M
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Musawo LMS
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">IT Admin</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroups.has(group.label);

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <span>{group.label}</span>
                {isOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>

              {isOpen && (
                <div className="space-y-0.5 ml-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== "/" && pathname.startsWith(item.href));

                    if (item.available === false) {
                      return (
                        <div
                          key={item.href}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
                          title="Coming soon"
                        >
                          {item.icon}
                          <span className="flex-1 truncate">{item.label}</span>
                          <span className="text-xs text-gray-300 dark:text-gray-700">Soon</span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {item.icon}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          {userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt={userName}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium text-sm">
              {getInitials(userName)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {userName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">IT Admin</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3">
          <ThemeToggle />
          <Link
            href="/api/auth/signout"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
