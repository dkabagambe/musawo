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
    ["SUPERADMIN",  "/director"],
    ["SYSTEM_IT",   "/system"],
    ["REGISTRAR",   "/admin/students"],
    ["BURSAR",      "/bursar"],
    ["TUTOR",       "/tutor"],
    ["STUDENT",     "/dashboard"],
    ["ADMIN",       "/admin/students"],   // legacy alias
    ["SPONSOR",     "/dashboard"],
    ["EMPLOYER",    "/dashboard"],
    [null,          "/dashboard"],
    [undefined,     "/dashboard"],
    ["UNKNOWN_ROLE","/dashboard"],        // never a 404
  ];

  for (const [role, expected] of cases) {
    it(`role ${String(role)} → ${expected}`, () => {
      expect(getHomePathForRole(role as UserRole)).toBe(expected);
    });
  }

  it("never returns /_rbac_redirect", () => {
    const allRoles: Array<UserRole | string | null | undefined> = [
      "SUPERADMIN","SYSTEM_IT","REGISTRAR","BURSAR","TUTOR",
      "STUDENT","ADMIN","SPONSOR","EMPLOYER",null,undefined,
    ];
    for (const role of allRoles) {
      expect(getHomePathForRole(role as UserRole)).not.toBe("/_rbac_redirect");
    }
  });

  it("never returns a path that would 404 in a known route", () => {
    const knownUnknownPaths = ["/_rbac_redirect", "/unknown", "/404-path"];
    const allRoles: UserRole[] = [
      "SUPERADMIN","SYSTEM_IT","REGISTRAR","BURSAR","TUTOR","STUDENT","ADMIN",
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
    expect(getPostLoginPath("REGISTRAR")).toBe("/admin/students");
    expect(getPostLoginPath("BURSAR")).toBe("/bursar");
    expect(getPostLoginPath("TUTOR")).toBe("/tutor");
    expect(getPostLoginPath("SUPERADMIN")).toBe("/director");
    expect(getPostLoginPath("SYSTEM_IT")).toBe("/system");
  });

  it("honours a safe same-origin callbackUrl", () => {
    expect(getPostLoginPath("STUDENT", "/dashboard/courses", origin)).toBe("/dashboard/courses");
    expect(getPostLoginPath("REGISTRAR", "/admin/students/abc123", origin)).toBe("/admin/students/abc123");
  });

  it("honours a safe absolute same-origin callbackUrl", () => {
    expect(getPostLoginPath("STUDENT", "http://localhost:3000/dashboard/courses", origin))
      .toBe("/dashboard/courses");
  });

  it("rejects a callbackUrl to a different origin", () => {
    expect(getPostLoginPath("STUDENT", "https://evil.com/steal", origin)).toBe("/dashboard");
    expect(getPostLoginPath("SUPERADMIN", "http://evil.com/admin", origin)).toBe("/director");
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
