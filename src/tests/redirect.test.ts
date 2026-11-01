/**
 * Tests for post-login redirect helper.
 * Pure logic - no DB, no HTTP, no mocks needed.
 *
 * Roles tested against remarks.md section 1 (6 canonical roles + SYSTEM_IT + ARCHIVED):
 *   DIRECTOR, PRINCIPAL, ADMIN, ACADEMIC_REGISTRAR, INSTRUCTOR, STUDENT, SYSTEM_IT, ARCHIVED
 *
 * Legacy aliases are kept in the helper to avoid broken sessions during migration.
 */

import { describe, it, expect } from "vitest";
import { getHomePathForRole, getPostLoginPath } from "@/lib/auth/redirect";
import type { UserRole } from "@prisma/client";

// ─── getHomePathForRole ───────────────────────────────────────────────────────

describe("getHomePathForRole", () => {
  // Canonical new roles
  it("DIRECTOR -> /director", () => expect(getHomePathForRole("DIRECTOR")).toBe("/director"));
  it("PRINCIPAL -> /principal", () => expect(getHomePathForRole("PRINCIPAL")).toBe("/principal"));
  it("ADMIN -> /admin", () => expect(getHomePathForRole("ADMIN")).toBe("/admin"));
  it("ACADEMIC_REGISTRAR -> /registrar", () => expect(getHomePathForRole("ACADEMIC_REGISTRAR")).toBe("/registrar"));
  it("INSTRUCTOR -> /tutor", () => expect(getHomePathForRole("INSTRUCTOR")).toBe("/tutor"));
  it("SYSTEM_IT -> /system", () => expect(getHomePathForRole("SYSTEM_IT")).toBe("/system"));
  it("STUDENT -> /dashboard", () => expect(getHomePathForRole("STUDENT")).toBe("/dashboard"));
  it("ARCHIVED -> /login?error=account_archived", () => expect(getHomePathForRole("ARCHIVED")).toBe("/login?error=account_archived"));

  // Legacy aliases (kept so old sessions do not 404)
  it("SUPER_ADMIN (legacy) -> /director", () => expect(getHomePathForRole("SUPER_ADMIN")).toBe("/director"));
  it("SUPERADMIN (legacy) -> /director", () => expect(getHomePathForRole("SUPERADMIN")).toBe("/director"));
  it("BOARD_MEMBER (legacy) -> /director", () => expect(getHomePathForRole("BOARD_MEMBER")).toBe("/director"));
  it("AUDITOR_READONLY (legacy) -> /director", () => expect(getHomePathForRole("AUDITOR_READONLY")).toBe("/director"));
  it("DEPUTY_PRINCIPAL (legacy) -> /principal", () => expect(getHomePathForRole("DEPUTY_PRINCIPAL")).toBe("/principal"));
  it("FINANCE_OFFICER (legacy) -> /director", () => expect(getHomePathForRole("FINANCE_OFFICER")).toBe("/director"));
  it("BURSAR (legacy) -> /director", () => expect(getHomePathForRole("BURSAR")).toBe("/director"));
  it("HR_SYSTEM_ADMIN (legacy) -> /admin", () => expect(getHomePathForRole("HR_SYSTEM_ADMIN")).toBe("/admin"));
  it("HR_MANAGER (legacy) -> /admin", () => expect(getHomePathForRole("HR_MANAGER")).toBe("/admin"));
  it("ADMINISTRATOR (legacy) -> /admin", () => expect(getHomePathForRole("ADMINISTRATOR")).toBe("/admin"));
  it("TEACHING_ASSISTANT (legacy) -> /tutor", () => expect(getHomePathForRole("TEACHING_ASSISTANT")).toBe("/tutor"));
  it("TUTOR (legacy) -> /tutor", () => expect(getHomePathForRole("TUTOR")).toBe("/tutor"));
  it("REGISTRAR (legacy) -> /registrar", () => expect(getHomePathForRole("REGISTRAR")).toBe("/registrar"));

  // Edge cases
  it("null -> /dashboard", () => expect(getHomePathForRole(null)).toBe("/dashboard"));
  it("undefined -> /dashboard", () => expect(getHomePathForRole(undefined)).toBe("/dashboard"));
  it("unknown string -> /dashboard", () => expect(getHomePathForRole("UNKNOWN_ROLE")).toBe("/dashboard"));

  it("never returns /_rbac_redirect", () => {
    const roles = [
      "DIRECTOR", "PRINCIPAL", "ADMIN", "ACADEMIC_REGISTRAR", "INSTRUCTOR",
      "STUDENT", "SYSTEM_IT", "ARCHIVED",
      "SUPER_ADMIN", "SUPERADMIN", "BOARD_MEMBER", "DEPUTY_PRINCIPAL",
      "FINANCE_OFFICER", "BURSAR", "HR_SYSTEM_ADMIN", "ADMINISTRATOR",
      "TEACHING_ASSISTANT", "TUTOR", "REGISTRAR",
      null, undefined,
    ];
    for (const role of roles) {
      expect(getHomePathForRole(role as UserRole)).not.toBe("/_rbac_redirect");
    }
  });
});

// ─── getPostLoginPath ─────────────────────────────────────────────────────────

describe("getPostLoginPath", () => {
  const origin = "http://localhost:3000";

  it("returns role home when no callbackUrl", () => {
    expect(getPostLoginPath("DIRECTOR")).toBe("/director");
    expect(getPostLoginPath("PRINCIPAL")).toBe("/principal");
    expect(getPostLoginPath("ADMIN")).toBe("/admin");
    expect(getPostLoginPath("ACADEMIC_REGISTRAR")).toBe("/registrar");
    expect(getPostLoginPath("INSTRUCTOR")).toBe("/tutor");
    expect(getPostLoginPath("STUDENT")).toBe("/dashboard");
    expect(getPostLoginPath("SYSTEM_IT")).toBe("/system");
  });

  it("honours a safe same-origin callbackUrl", () => {
    expect(getPostLoginPath("STUDENT", "/dashboard/courses", origin)).toBe("/dashboard/courses");
    expect(getPostLoginPath("ADMIN", "/admin/students/abc123", origin)).toBe("/admin/students/abc123");
  });

  it("honours a safe absolute same-origin callbackUrl", () => {
    expect(getPostLoginPath("STUDENT", "http://localhost:3000/dashboard/courses", origin)).toBe("/dashboard/courses");
  });

  it("rejects a callbackUrl to a different origin", () => {
    expect(getPostLoginPath("STUDENT", "https://evil.com/steal", origin)).toBe("/dashboard");
    expect(getPostLoginPath("DIRECTOR", "http://evil.com/admin", origin)).toBe("/director");
  });

  it("rejects auth pages as callbackUrl", () => {
    expect(getPostLoginPath("STUDENT", "/login", origin)).toBe("/dashboard");
    expect(getPostLoginPath("STUDENT", "/register", origin)).toBe("/dashboard");
    expect(getPostLoginPath("STUDENT", "/otp", origin)).toBe("/dashboard");
    expect(getPostLoginPath("STUDENT", "/_rbac_redirect", origin)).toBe("/dashboard");
  });

  it("rejects path traversal attempts", () => {
    expect(getPostLoginPath("STUDENT", "/../etc/passwd", origin)).toBe("/dashboard");
  });

  it("rejects callbackUrl not starting with /", () => {
    expect(getPostLoginPath("STUDENT", "javascript:alert(1)", origin)).toBe("/dashboard");
    expect(getPostLoginPath("STUDENT", "relative/path", origin)).toBe("/dashboard");
  });

  it("falls back to role home for null/undefined role with safe callbackUrl", () => {
    expect(getPostLoginPath(null, "/dashboard")).toBe("/dashboard");
    expect(getPostLoginPath(undefined, "/dashboard")).toBe("/dashboard");
  });

  it("preserves query string in callbackUrl", () => {
    expect(getPostLoginPath("STUDENT", "/dashboard/courses?lesson=abc", origin)).toBe("/dashboard/courses?lesson=abc");
  });
});
