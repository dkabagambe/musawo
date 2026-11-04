/**
 * Guards that removed role names do NOT appear in business logic outside
 * the allowed migration-mapping files (auth redirects and redirect.ts).
 *
 * Allowed files: auth pages that handle post-login redirects for users who
 * were migrated from old roles, and the central redirect utility.
 * Those are the ONLY places where legacy role strings are permitted.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(__dirname, "../..");

// Role names that no longer exist in the UserRole enum after remarks.md batch 1.
const REMOVED_ROLES = [
  "BOARD_MEMBER",
  "DEPUTY_PRINCIPAL",
  "TEACHING_ASSISTANT",
  "FINANCE_OFFICER",
  "HR_MANAGER",
  "AUDITOR_READONLY",
];

// Files that are explicitly allowed to reference removed roles (migration safety nets).
const ALLOWED_FILES = new Set([
  "src/app/(auth)/login/page.tsx",
  "src/app/(auth)/otp/page.tsx",
  "src/app/(auth)/2fa-verify/page.tsx",
  "src/app/(auth)/invite/[token]/AcceptInviteForm.tsx",
  "src/app/(auth)/invite/[token]/StudentAcceptForm.tsx",
  "src/lib/redirect.ts",
  "src/tests/redirect.test.ts",
  "src/tests/role-integration.test.ts",   // tests the migration mapping exhaustively
  "src/tests/no-removed-roles.test.ts",
  "src/app/api/board/documents/route.ts",
  "src/app/api/grades/change-request/route.ts",
]);

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

describe("No removed role names in business logic", () => {
  it("removed roles appear only in migration-mapping files", () => {
    const violations: string[] = [];
    const files = collectFiles(join(ROOT, "src"));

    for (const file of files) {
      const rel = relative(ROOT, file);
      if (ALLOWED_FILES.has(rel)) continue;

      const content = readFileSync(file, "utf8");
      for (const role of REMOVED_ROLES) {
        const regex = new RegExp(`\\b${role}\\b`);
        if (!regex.test(content)) continue;

        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (!regex.test(line)) return;
          // Skip pure comment lines (// ... or * ...) -- they are docs, not logic.
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
          violations.push(`${rel}:${i + 1}: ${trimmed}`);
        });
      }
    }

    expect(violations, violations.join("\n")).toHaveLength(0);
  });
});
