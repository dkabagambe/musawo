/**
 * Live class access tests.
 * Validates the new 6-role model (remarks.md s1).
 */

import { describe, expect, it } from "vitest";
import { can } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

const staffRoles: UserRole[] = [
  "DIRECTOR",
  "PRINCIPAL",
  "ADMIN",
  "ACADEMIC_REGISTRAR",
  "INSTRUCTOR",
  "SYSTEM_IT",
];

describe("live class access", () => {
  it("only STUDENT accounts use the enrolled-student join permission", () => {
    expect(can("STUDENT", "classes.join")).toBe(true);
    for (const role of staffRoles) {
      expect(can(role, "classes.join")).toBe(false);
    }
  });

  it("only INSTRUCTOR (and above) can upload course materials", () => {
    expect(can("INSTRUCTOR", "content.upload")).toBe(true);
    expect(can("STUDENT", "content.upload")).toBe(false);
    expect(can("SYSTEM_IT", "content.upload")).toBe(false);
  });

  it("only INSTRUCTOR can manage live classes", () => {
    expect(can("INSTRUCTOR", "classes.manage")).toBe(true);
    expect(can("STUDENT", "classes.manage")).toBe(false);
    expect(can("ACADEMIC_REGISTRAR", "classes.manage")).toBe(false);
    expect(can("SYSTEM_IT", "classes.manage")).toBe(false);
  });

  it("INSTRUCTOR can take roll call but STUDENT cannot", () => {
    expect(can("INSTRUCTOR", "attendance.take")).toBe(true);
    expect(can("STUDENT", "attendance.take")).toBe(false);
  });
});
