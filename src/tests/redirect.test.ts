/**
 * Tests for post-login redirect helper.
 * Pure logic — no DB, no HTTP, no mocks needed.
 */

import { describe, it, expect } from "vitest";
import { getHomePathForRole, getPostLoginPath } from "@/lib/auth/redirect";
import type { UserRole } from "@prisma/client";

// ─── getHomePathForRole ───────────────────────────────────────────────────────

describe("getHomePathForRole", () => {
  const cases: Array<[UserRole | string | null | undefined, string]> = [
    // Canonical roles
    ["SUPER_ADMIN",           "/director"],
    ["BOARD_MEMBER",          "/board"],
    ["PRINCIPAL",            "/principal"],
    ["DEPUTY_PRINCIPAL",     "/deputy"],
    ["ACADEMIC_REGISTRAR",   "/registrar"],
    ["INSTRUCTOR",           "/tutor"],
    ["TEACHING_ASSISTANT",   "/tutor"],
    ["FINANCE_OFFICER",      "/finance"],
    ["HR_SYSTEM_ADMIN",      "/admin"],
    ["AUDITOR_READONLY",     "/auditor"],
    ["SYSTEM_IT",            "/system"],
    ["STUDENT",              "/dashboard"],
    // Legacy aliases
    ["SUPERADMIN",            "/director"],
    ["REGISTRAR",             "/registrar"],
    ["BURSAR",                "/finance"],
    ["TUTOR",                 "/tutor"],
    ["ADMIN",                 "/admin"],
    ["ADMINISTRATOR",         "/admin"],
    // Edge cases
    ["SPONSOR",               "/dashboard"],
    ["EMPLOYER",              "/dashboard"],
    [null,                    "/dashboard"],
    [undefined,               "/dashboard"],
    ["UNKNOWN_ROLE",          "/dashboard"],        // never a 404
  ];

  for (const [role, expected] of cases) {
    it(`role ${String(role)} -> ${expected}`, () => {
      expect(getHomePathForRole(role as UserRole)).toBe(expected);
    });
  }

  it("never returns /_rbac_redirect", () => {
    const allRoles: Array<UserRole | string | null | undefined> = [
      "SUPER_ADMIN","SUPERADMIN","BOARD_MEMBER","PRINCIPAL","DEPUTY_PRINCIPAL",
      "ACADEMIC_REGISTRAR","REGISTRAR","INSTRUCTOR","TUTOR","TEACHING_ASSISTANT",
      "FINANCE_OFFICER","BURSAR","HR_SYSTEM_ADMIN","ADMINISTRATOR","ADMIN",
      "AUDITOR_READONLY","SYSTEM_IT","STUDENT","SPONSOR","EMPLOYER",null,undefined,
    ];
    for (const role of allRoles) {
      expect(getHomePathForRole(role as UserRole)).not.toBe("/_rbac_redirect");
    }
  });

  it("never returns a path that would 404 in a known route", () => {
    const knownUnknownPaths = ["/_rbac_redirect", "/unknown", "/404-path"];
    const allRoles: UserRole[] = [
      "SUPER_ADMIN","SUPERADMIN","BOARD_MEMBER","PRINCIPAL","DEPUTY_PRINCIPAL",
      "ACADEMIC_REGISTRAR","REGISTRAR","INSTRUCTOR","TUTOR","TEACHING_ASSISTANT",
      "FINANCE_OFFICER","BURSAR","HR_SYSTEM_ADMIN","ADMINISTRATOR","ADMIN",
      "AUDITOR_READONLY","SYSTEM_IT","STUDENT",
    ];
    for (const role of allRoles) {
      const path = getHomePathForRole(role);
      expect(knownUnknownPaths).not.toContain(path);
    }
  });
});

// ─── getPostLoginPath ─────────────────────────────────────────────────────────

describe("getPostLoginPath", () => {
  const origin = "http://localhost:3000";

  it("returns role home when no callbackUrl", () => {
    expect(getPostLoginPath("STUDENT")).toBe("/dashboard");
    expect(getPostLoginPath("ACADEMIC_REGISTRAR")).toBe("/registrar");
    expect(getPostLoginPath("REGISTRAR")).toBe("/registrar");
    expect(getPostLoginPath("FINANCE_OFFICER")).toBe("/finance");
    expect(getPostLoginPath("BURSAR")).toBe("/finance");
    expect(getPostLoginPath("INSTRUCTOR")).toBe("/tutor");
    expect(getPostLoginPath("TUTOR")).toBe("/tutor");
    expect(getPostLoginPath("TEACHING_ASSISTANT")).toBe("/tutor");
    expect(getPostLoginPath("SUPER_ADMIN")).toBe("/director");
    expect(getPostLoginPath("SUPERADMIN")).toBe("/director");
    expect(getPostLoginPath("BOARD_MEMBER")).toBe("/board");
    expect(getPostLoginPath("PRINCIPAL")).toBe("/principal");
    expect(getPostLoginPath("DEPUTY_PRINCIPAL")).toBe("/deputy");
    expect(getPostLoginPath("HR_SYSTEM_ADMIN")).toBe("/admin");
    expect(getPostLoginPath("AUDITOR_READONLY")).toBe("/auditor");
    expect(getPostLoginPath("SYSTEM_IT")).toBe("/system");
  });

  it("honours a safe same-origin callbackUrl", () => {
    expect(getPostLoginPath("STUDENT", "/dashboard/courses", origin)).toBe("/dashboard/courses");
    expect(getPostLoginPath("ACADEMIC_REGISTRAR", "/registrar/students/abc123", origin)).toBe("/registrar/students/abc123");
  });

  it("honours a safe absolute same-origin callbackUrl", () => {
    expect(getPostLoginPath("STUDENT", "http://localhost:3000/dashboard/courses", origin))
      .toBe("/dashboard/courses");
  });

  it("rejects a callbackUrl to a different origin", () => {
    expect(getPostLoginPath("STUDENT", "https://evil.com/steal", origin)).toBe("/dashboard");
    expect(getPostLoginPath("SUPER_ADMIN", "http://evil.com/admin", origin)).toBe("/director");
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
    expect(getPostLoginPath("STUDENT", "/dashboard/courses?lesson=abc", origin))
      .toBe("/dashboard/courses?lesson=abc");
  });
});
