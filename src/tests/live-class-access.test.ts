import { describe, expect, it } from "vitest";
import { can } from "@/lib/rbac";

const staffRoles = ["SUPER_ADMIN", "BOARD_MEMBER", "PRINCIPAL", "DEPUTY_PRINCIPAL", "ACADEMIC_REGISTRAR", "INSTRUCTOR", "TEACHING_ASSISTANT", "FINANCE_OFFICER", "HR_SYSTEM_ADMIN", "AUDITOR_READONLY", "SYSTEM_IT"] as const;

describe("live class access", () => {
  it("lets only student accounts use the enrolled-student join permission", () => {
    expect(can("STUDENT", "classes.join")).toBe(true);
    for (const role of staffRoles) expect(can(role, "classes.join")).toBe(false);
  });

  it("allows assigned instructors and assistants to upload course materials", () => {
    expect(can("INSTRUCTOR", "content.upload")).toBe(true);
    expect(can("TEACHING_ASSISTANT", "content.upload")).toBe(true);
  });
});
