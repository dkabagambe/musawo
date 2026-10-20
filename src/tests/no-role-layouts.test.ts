/**
 * Enforces that no role-specific portal folder (src/app/(tutor), (dashboard),
 * (admin), etc.) defines its own layout shell, sidebar, topbar or card components
 * that duplicate the shared AppShell system.
 *
 * Every role's layout.tsx must delegate entirely to the shared AppShell from
 * "@/components/ui/AppShell" and must not export its own Sidebar, Topbar,
 * or card primitives.
 *
 * This prevents the "one per role" duplication the spec explicitly forbids.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const SRC_APP = join(ROOT, "src", "app");
const SHARED_APPSHELL = "@/components/ui/AppShell";

/** Role group directories inside src/app that wrap authenticated portals. */
function getRoleGroupDirs(): string[] {
  // Skip public/auth groups — they intentionally don't use AppShell
  const SKIP = new Set(["(auth)", "(public)"]);
  return readdirSync(SRC_APP)
    .filter((entry) => entry.startsWith("(") && entry.endsWith(")") && !SKIP.has(entry))
    .map((entry) => join(SRC_APP, entry))
    .filter((full) => statSync(full).isDirectory());
}

/**
 * Each role group dir contains exactly one portal sub-directory
 * (e.g. (tutor)/tutor). Walk into it and find layout.tsx files.
 */
function getLayoutFiles(groupDir: string): string[] {
  const layouts: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "layout.tsx") layouts.push(full);
    }
  }
  walk(groupDir);
  return layouts;
}

/**
 * Patterns that indicate a layout file has rolled its own shell components
 * instead of delegating to AppShell.
 */
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /export\s+(default\s+)?function\s+Sidebar\b/,
    label: "defines its own Sidebar component",
  },
  {
    pattern: /export\s+(default\s+)?function\s+Topbar\b/,
    label: "defines its own Topbar component",
  },
  {
    pattern: /export\s+(default\s+)?function\s+AppShell\b/,
    label: "re-exports its own AppShell",
  },
  {
    pattern: /className=[^>]*portal-sidebar\b/,
    label: "uses portal-sidebar CSS class directly (bypassing AppShell)",
  },
  {
    pattern: /className=[^>]*portal-topbar\b/,
    label: "uses portal-topbar CSS class directly (bypassing AppShell)",
  },
];

describe("No role-specific layout, sidebar or topbar components", () => {
  const groupDirs = getRoleGroupDirs();

  it("finds at least one authenticated role group directory", () => {
    expect(groupDirs.length).toBeGreaterThan(0);
  });

  it("every role layout.tsx imports and delegates to the shared AppShell", () => {
    const violations: string[] = [];

    for (const groupDir of groupDirs) {
      const layouts = getLayoutFiles(groupDir);
      for (const layout of layouts) {
        const content = readFileSync(layout, "utf-8");
        // Must import AppShell
        if (!content.includes(SHARED_APPSHELL)) {
          violations.push(
            `${layout}: does not import from "${SHARED_APPSHELL}"`,
          );
        }
        // Must not define its own shell components
        for (const { pattern, label } of FORBIDDEN_PATTERNS) {
          if (pattern.test(content)) {
            violations.push(`${layout}: ${label}`);
          }
        }
      }
    }

    expect(violations, violations.join("\n")).toHaveLength(0);
  });

  it("no role folder contains a standalone Sidebar or Topbar component file", () => {
    const forbidden: string[] = [];
    const BLOCKED_NAMES = new Set([
      "Sidebar.tsx",
      "sidebar.tsx",
      "Topbar.tsx",
      "topbar.tsx",
      "NavBar.tsx",
      "navbar.tsx",
    ]);

    function scan(dir: string) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
          // Don't scan the shared ui directory itself
          if (full === join(ROOT, "src", "components", "ui")) continue;
          scan(full);
        } else if (BLOCKED_NAMES.has(entry)) {
          forbidden.push(full);
        }
      }
    }

    // Scan app folder and components folder (except shared ui)
    for (const groupDir of groupDirs) scan(groupDir);

    expect(forbidden, forbidden.join("\n")).toHaveLength(0);
  });

  it("the shared AppShell component file exists", () => {
    const appShellPath = join(
      ROOT,
      "src",
      "components",
      "ui",
      "AppShell.tsx",
    );
    expect(existsSync(appShellPath)).toBe(true);
  });
});
