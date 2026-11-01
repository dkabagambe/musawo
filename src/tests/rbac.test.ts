/**
 * RBAC unit tests.
 *
 * Validates the 6-role model from remarks.md:
 *   DIRECTOR, PRINCIPAL, ADMIN, ACADEMIC_REGISTRAR (dummy), INSTRUCTOR, STUDENT, SYSTEM_IT, ARCHIVED
 *
 * These are pure logic tests - no DB, no HTTP, no mocks needed.
 */

import { describe, it, expect } from "vitest";
import {
  can,
  requirePermission,
  assertNotSelfApproval,
  canForUser,
  canManageAccountRecoveryTarget,
  canVia,
  canAccessPrefix,
  ForbiddenError,
  ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

function expectForbidden(role: UserRole, permission: Permission) {
  expect(() => requirePermission(role, permission)).toThrowError(ForbiddenError);
}

function expectAllowed(role: UserRole, permission: Permission) {
  expect(() => requirePermission(role, permission)).not.toThrow();
}

// ─── DIRECTOR ─────────────────────────────────────────────────────────────────

describe("DIRECTOR", () => {
  it("can approve refunds", () => expectAllowed("DIRECTOR", "refunds.approve"));
  it("can approve waivers", () => expectAllowed("DIRECTOR", "waivers.approve"));
  it("can decide approval requests", () => expectAllowed("DIRECTOR", "approvals.decide"));
  it("can view full audit log", () => expectAllowed("DIRECTOR", "audit.view.full"));
  it("can complete access reviews", () => expectAllowed("DIRECTOR", "access_review.complete"));
  it("can revoke certificates", () => expectAllowed("DIRECTOR", "certificates.revoke"));
  it("can approve staff account changes", () => expectAllowed("DIRECTOR", "staff.create.approve"));
  it("can view payments", () => expectAllowed("DIRECTOR", "payments.view"));
  it("can view grades", () => expectAllowed("DIRECTOR", "grades.view"));
  it("can approve graduands", () => expectAllowed("DIRECTOR", "graduands.approve"));
  it("can view graduates register", () => expectAllowed("DIRECTOR", "graduates.view"));
  it("can edit approval policy settings", () => expectAllowed("DIRECTOR", "approvals.settings.edit"));

  it("CANNOT create students directly", () => expectForbidden("DIRECTOR", "students.create"));
  it("CANNOT edit students directly", () => expectForbidden("DIRECTOR", "students.edit"));
  it("CANNOT manage classes directly", () => expectForbidden("DIRECTOR", "classes.manage"));
  it("CANNOT join a class as a student", () => expectForbidden("DIRECTOR", "classes.join"));
  it("CANNOT edit technical settings", () => expectForbidden("DIRECTOR", "settings.edit"));
  it("CANNOT manage integrations", () => expectForbidden("DIRECTOR", "integrations.edit"));
  it("CANNOT edit secrets", () => expectForbidden("DIRECTOR", "settings.edit.secrets"));
  it("CANNOT take attendance", () => expectForbidden("DIRECTOR", "attendance.take"));
  it("CANNOT mark exams directly", () => expectForbidden("DIRECTOR", "exams.mark"));
  it("CANNOT upload content directly", () => expectForbidden("DIRECTOR", "content.upload"));
});

// ─── PRINCIPAL ────────────────────────────────────────────────────────────────

describe("PRINCIPAL", () => {
  it("can approve course content", () => expectAllowed("PRINCIPAL", "content.approve"));
  it("can issue certificates", () => expectAllowed("PRINCIPAL", "certificates.issue"));
  it("can approve graduands list", () => expectAllowed("PRINCIPAL", "graduands.approve"));
  it("can prepare graduands list", () => expectAllowed("PRINCIPAL", "graduands.prepare"));
  it("can view students", () => expectAllowed("PRINCIPAL", "students.view"));
  it("can create students", () => expectAllowed("PRINCIPAL", "students.create"));
  it("can view grades", () => expectAllowed("PRINCIPAL", "grades.view"));
  it("can edit grades", () => expectAllowed("PRINCIPAL", "grades.edit"));
  it("can mark exams", () => expectAllowed("PRINCIPAL", "exams.mark"));
  it("can view finance totals", () => expectAllowed("PRINCIPAL", "finance.totals.view"));
  it("can view full audit log", () => expectAllowed("PRINCIPAL", "audit.view.full"));
  it("can view payments", () => expectAllowed("PRINCIPAL", "payments.view"));
  it("can manage intakes", () => expectAllowed("PRINCIPAL", "intakes.manage"));
  it("can initiate refunds (forwards to Director)", () => expectAllowed("PRINCIPAL", "refunds.initiate"));

  it("CANNOT release exam results (Director only)", () => expectForbidden("PRINCIPAL", "exams.release"));
  it("CANNOT initiate payments", () => expectForbidden("PRINCIPAL", "payments.initiate"));
  it("CANNOT view ledger", () => expectForbidden("PRINCIPAL", "ledger.view"));
  it("CANNOT decide approvals (Director only)", () => expectForbidden("PRINCIPAL", "approvals.decide"));
  it("CANNOT edit settings", () => expectForbidden("PRINCIPAL", "settings.edit"));
  it("CANNOT approve staff changes (Director only)", () => expectForbidden("PRINCIPAL", "staff.create.approve"));
  it("CANNOT revoke certificates (Director only)", () => expectForbidden("PRINCIPAL", "certificates.revoke"));
  it("CANNOT join a class as a student", () => expectForbidden("PRINCIPAL", "classes.join"));
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────

describe("ADMIN", () => {
  it("can create students", () => expectAllowed("ADMIN", "students.create"));
  it("can edit students", () => expectAllowed("ADMIN", "students.edit"));
  it("can suspend students", () => expectAllowed("ADMIN", "students.suspend"));
  it("can process applications", () => expectAllowed("ADMIN", "applications.process"));
  it("can collect payment proofs", () => expectAllowed("ADMIN", "payments.collect"));
  it("can view payments", () => expectAllowed("ADMIN", "payments.view"));
  it("can submit claims", () => expectAllowed("ADMIN", "claims.submit"));
  it("can review claims", () => expectAllowed("ADMIN", "claims.review"));
  it("can manage timetable and venues", () => {
    expectAllowed("ADMIN", "venues.manage");
    expectAllowed("ADMIN", "bookings.manage");
  });
  it("can manage equipment", () => expectAllowed("ADMIN", "equipment.manage"));
  it("can manage student documents", () => expectAllowed("ADMIN", "student.documents.manage"));
  it("can resend invites", () => expectAllowed("ADMIN", "invites.resend"));
  it("can manage intakes", () => expectAllowed("ADMIN", "intakes.manage"));

  it("CANNOT decide approvals", () => expectForbidden("ADMIN", "approvals.decide"));
  it("CANNOT edit settings secrets", () => expectForbidden("ADMIN", "settings.edit.secrets"));
  it("CANNOT revoke certificates", () => expectForbidden("ADMIN", "certificates.revoke"));
  it("CANNOT view ledger", () => expectForbidden("ADMIN", "ledger.view"));
  it("CANNOT approve staff (Director only)", () => expectForbidden("ADMIN", "staff.create.approve"));
});

// ─── ACADEMIC_REGISTRAR (dummy/inactive) ─────────────────────────────────────

describe("ACADEMIC_REGISTRAR (dummy, inactive)", () => {
  it("can submit support tickets", () => expectAllowed("ACADEMIC_REGISTRAR", "support.submit"));
  it("can view policies", () => expectAllowed("ACADEMIC_REGISTRAR", "policies.view"));

  // All operational permissions explicitly denied
  it("CANNOT view students", () => expectForbidden("ACADEMIC_REGISTRAR", "students.view"));
  it("CANNOT create students", () => expectForbidden("ACADEMIC_REGISTRAR", "students.create"));
  it("CANNOT view payments", () => expectForbidden("ACADEMIC_REGISTRAR", "payments.view"));
  it("CANNOT view payments ledger", () => expectForbidden("ACADEMIC_REGISTRAR", "ledger.view"));
  it("CANNOT view courses", () => expectForbidden("ACADEMIC_REGISTRAR", "courses.view"));
  it("CANNOT view grades", () => expectForbidden("ACADEMIC_REGISTRAR", "grades.view"));
  it("CANNOT view audit logs", () => expectForbidden("ACADEMIC_REGISTRAR", "audit.view"));
  it("CANNOT view approvals", () => expectForbidden("ACADEMIC_REGISTRAR", "approvals.view"));
  it("CANNOT take attendance", () => expectForbidden("ACADEMIC_REGISTRAR", "attendance.take"));
  it("CANNOT view classes", () => expectForbidden("ACADEMIC_REGISTRAR", "classes.view"));
  it("CANNOT view certificates", () => expectForbidden("ACADEMIC_REGISTRAR", "certificates.view"));
  it("CANNOT decide approvals", () => expectForbidden("ACADEMIC_REGISTRAR", "approvals.decide"));
  it("CANNOT view staff", () => expectForbidden("ACADEMIC_REGISTRAR", "staff.view"));
  it("CANNOT manage equipment", () => expectForbidden("ACADEMIC_REGISTRAR", "equipment.manage"));
  it("CANNOT view reports", () => expectForbidden("ACADEMIC_REGISTRAR", "reports.view"));
});

// ─── INSTRUCTOR ───────────────────────────────────────────────────────────────

describe("INSTRUCTOR", () => {
  it("can view students", () => expectAllowed("INSTRUCTOR", "students.view"));
  it("can create exams", () => expectAllowed("INSTRUCTOR", "exams.create"));
  it("can mark exams", () => expectAllowed("INSTRUCTOR", "exams.mark"));
  it("can edit grades", () => expectAllowed("INSTRUCTOR", "grades.edit"));
  it("can take attendance", () => expectAllowed("INSTRUCTOR", "attendance.take"));
  it("can manage classes", () => expectAllowed("INSTRUCTOR", "classes.manage"));
  it("can upload content", () => expectAllowed("INSTRUCTOR", "content.upload"));
  it("can message own students", () => expectAllowed("INSTRUCTOR", "messaging.students.own"));
  it("can announce to own classes", () => expectAllowed("INSTRUCTOR", "announcements.send.own"));
  it("can submit support tickets", () => expectAllowed("INSTRUCTOR", "support.submit"));

  it("CANNOT view payments", () => expectForbidden("INSTRUCTOR", "payments.view"));
  it("CANNOT view ledger", () => expectForbidden("INSTRUCTOR", "ledger.view"));
  it("CANNOT initiate refunds", () => expectForbidden("INSTRUCTOR", "refunds.initiate"));
  it("CANNOT decide approvals", () => expectForbidden("INSTRUCTOR", "approvals.decide"));
  it("CANNOT revoke certificates", () => expectForbidden("INSTRUCTOR", "certificates.revoke"));
  it("CANNOT suspend students", () => expectForbidden("INSTRUCTOR", "students.suspend"));
  it("CANNOT export payments", () => expectForbidden("INSTRUCTOR", "payments.export"));
  it("CANNOT edit site settings", () => expectForbidden("INSTRUCTOR", "settings.edit"));
  it("CANNOT manage integrations", () => expectForbidden("INSTRUCTOR", "integrations.edit"));
  it("CANNOT release exam results", () => expectForbidden("INSTRUCTOR", "exams.release"));
  it("CANNOT approve course content", () => expectForbidden("INSTRUCTOR", "content.approve"));
  it("CANNOT approve graduands", () => expectForbidden("INSTRUCTOR", "graduands.approve"));
  it("CANNOT manage intakes", () => expectForbidden("INSTRUCTOR", "intakes.manage"));
  it("CANNOT issue certificates", () => expectForbidden("INSTRUCTOR", "certificates.issue"));
  it("CANNOT see all student contacts", () => expectForbidden("INSTRUCTOR", "students.view.contacts"));
  it("CANNOT join as a student", () => expectForbidden("INSTRUCTOR", "classes.join"));
  it("CANNOT initiate payments", () => expectForbidden("INSTRUCTOR", "payments.initiate"));
});

// ─── STUDENT ──────────────────────────────────────────────────────────────────

describe("STUDENT", () => {
  it("can submit a support ticket", () => expectAllowed("STUDENT", "support.submit"));
  it("CANNOT manage the support desk", () => expectForbidden("STUDENT", "support.manage"));
  it("can view courses", () => expectAllowed("STUDENT", "courses.view"));
  it("can view own grades", () => expectAllowed("STUDENT", "grades.view"));
  it("can view certificates", () => expectAllowed("STUDENT", "certificates.view"));
  it("can join a live class", () => expectAllowed("STUDENT", "classes.join"));
  it("can initiate a payment", () => expectAllowed("STUDENT", "payments.initiate"));
  it("can view own learning", () => expectAllowed("STUDENT", "learning.self.view"));

  it("CANNOT view payments list (Finance only)", () => expectForbidden("STUDENT", "payments.view"));
  it("CANNOT view ledger", () => expectForbidden("STUDENT", "ledger.view"));
  it("CANNOT create courses", () => expectForbidden("STUDENT", "courses.create"));
  it("CANNOT edit grades", () => expectForbidden("STUDENT", "grades.edit"));
  it("CANNOT issue certificates", () => expectForbidden("STUDENT", "certificates.issue"));
  it("CANNOT revoke certificates", () => expectForbidden("STUDENT", "certificates.revoke"));
  it("CANNOT decide approvals", () => expectForbidden("STUDENT", "approvals.decide"));
  it("CANNOT suspend students", () => expectForbidden("STUDENT", "students.suspend"));
  it("CANNOT edit settings", () => expectForbidden("STUDENT", "settings.edit"));
  it("CANNOT manage integrations", () => expectForbidden("STUDENT", "integrations.edit"));
  it("CANNOT view audit log", () => expectForbidden("STUDENT", "audit.view"));
  it("CANNOT view staff list", () => expectForbidden("STUDENT", "staff.view"));
  it("CANNOT manage intakes", () => expectForbidden("STUDENT", "intakes.manage"));
  it("CANNOT approve graduands", () => expectForbidden("STUDENT", "graduands.approve"));
  it("CANNOT manage classes", () => expectForbidden("STUDENT", "classes.manage"));
});

// ─── SYSTEM_IT ────────────────────────────────────────────────────────────────

describe("SYSTEM_IT", () => {
  it("can manage integrations", () => expectAllowed("SYSTEM_IT", "integrations.edit"));
  it("can manage backups", () => expectAllowed("SYSTEM_IT", "backups.manage"));
  it("can view system health", () => expectAllowed("SYSTEM_IT", "health.view"));
  it("can view settings", () => expectAllowed("SYSTEM_IT", "settings.view"));
  it("can edit settings", () => expectAllowed("SYSTEM_IT", "settings.edit"));
  it("can edit technical secrets", () => expectAllowed("SYSTEM_IT", "settings.edit.secrets"));
  it("can edit public institution settings", () => expectAllowed("SYSTEM_IT", "settings.edit.public"));
  it("can view audit logs", () => expectAllowed("SYSTEM_IT", "audit.view"));
  it("can manage support tickets", () => expectAllowed("SYSTEM_IT", "support.manage"));

  it("CANNOT view student payments", () => expectForbidden("SYSTEM_IT", "payments.view"));
  it("CANNOT initiate payments", () => expectForbidden("SYSTEM_IT", "payments.initiate"));
  it("CANNOT view ledger", () => expectForbidden("SYSTEM_IT", "ledger.view"));
  it("CANNOT edit grades", () => expectForbidden("SYSTEM_IT", "grades.edit"));
  it("CANNOT view grades", () => expectForbidden("SYSTEM_IT", "grades.view"));
  it("CANNOT issue certificates", () => expectForbidden("SYSTEM_IT", "certificates.issue"));
  it("CANNOT revoke certificates", () => expectForbidden("SYSTEM_IT", "certificates.revoke"));
  it("CANNOT decide approvals", () => expectForbidden("SYSTEM_IT", "approvals.decide"));
  it("CANNOT create students", () => expectForbidden("SYSTEM_IT", "students.create"));
  it("CANNOT approve staff accounts", () => expectForbidden("SYSTEM_IT", "staff.create.approve"));
  it("CANNOT approve refunds", () => expectForbidden("SYSTEM_IT", "refunds.approve"));
  it("CANNOT initiate refunds", () => expectForbidden("SYSTEM_IT", "refunds.initiate"));
  it("CANNOT manage intakes", () => expectForbidden("SYSTEM_IT", "intakes.manage"));
  it("CANNOT view students", () => expectForbidden("SYSTEM_IT", "students.view"));
  it("CANNOT join class as student", () => expectForbidden("SYSTEM_IT", "classes.join"));
  it("CANNOT edit approval policy settings (Director only)", () => expectForbidden("SYSTEM_IT", "approvals.settings.edit"));
});

// ─── ARCHIVED ─────────────────────────────────────────────────────────────────

describe("ARCHIVED", () => {
  it("cannot do anything", () => {
    const permissions: Permission[] = [
      "students.view", "courses.view", "grades.view", "support.submit",
      "classes.join", "learning.self.view", "policies.view", "settings.view",
    ];
    for (const perm of permissions) {
      expectForbidden("ARCHIVED", perm);
    }
  });
});

// ─── Separation of duties ─────────────────────────────────────────────────────

describe("Separation of duties", () => {
  it("prevents self-approval", () => {
    expect(() => assertNotSelfApproval("user-1", "user-1")).toThrowError(ForbiddenError);
  });

  it("allows approval by a different user", () => {
    expect(() => assertNotSelfApproval("user-1", "user-2")).not.toThrow();
  });

  it("PRINCIPAL can submit marks but only DIRECTOR can approve final results publication", () => {
    expectAllowed("PRINCIPAL", "exams.mark");
    expectAllowed("DIRECTOR", "exams.release");
    expectForbidden("PRINCIPAL", "exams.release");
  });

  it("ADMIN prepares graduands but DIRECTOR approves certificate issuance", () => {
    expectAllowed("ADMIN", "graduands.prepare");
    expectAllowed("DIRECTOR", "graduands.approve");
    expectForbidden("ADMIN", "graduands.approve");
  });

  it("PRINCIPAL can initiate staff suspension but only DIRECTOR approves it", () => {
    expectAllowed("PRINCIPAL", "staff.suspend.initiate");
    expectAllowed("DIRECTOR", "staff.suspend.approve");
    expectForbidden("PRINCIPAL", "staff.suspend.approve");
  });

  it("ADMIN can collect payment proof but cannot verify or edit payment records", () => {
    expectAllowed("ADMIN", "payments.collect");
    expectForbidden("ADMIN", "payments.hold");
    // ADMIN can view but cannot edit payments
    expectAllowed("ADMIN", "payments.view");
  });
});

// ─── Hierarchy rules ─────────────────────────────────────────────────────────

describe("Hierarchy rules", () => {
  it("DIRECTOR inherits read-level permissions from the chain, but operational actions are denied", () => {
    // DIRECTOR can always view what INSTRUCTOR produces
    expect(can("DIRECTOR", "grades.view")).toBe(true);
    expect(can("DIRECTOR", "attendance.view")).toBe(true);
    expect(can("DIRECTOR", "courses.view")).toBe(true);
    expect(can("DIRECTOR", "classes.view")).toBe(true);
    // But DIRECTOR does not operate
    expect(can("DIRECTOR", "classes.manage")).toBe(false);
    expect(can("DIRECTOR", "exams.mark")).toBe(false);
    expect(can("DIRECTOR", "attendance.take")).toBe(false);
    expect(can("DIRECTOR", "content.upload")).toBe(false);
  });

  it("DIRECTOR has all approval and oversight permissions above PRINCIPAL", () => {
    // Things only DIRECTOR can do
    expect(can("DIRECTOR", "approvals.decide")).toBe(true);
    expect(can("PRINCIPAL", "approvals.decide")).toBe(false);
    expect(can("DIRECTOR", "certificates.revoke")).toBe(true);
    expect(can("PRINCIPAL", "certificates.revoke")).toBe(false);
    expect(can("DIRECTOR", "staff.create.approve")).toBe(true);
    expect(can("PRINCIPAL", "staff.create.approve")).toBe(false);
    // Things PRINCIPAL can do that DIRECTOR monitors but does not initiate
    expect(can("PRINCIPAL", "students.create")).toBe(true);
    expect(can("DIRECTOR", "students.create")).toBe(false); // Director is oversight
  });

  it("PRINCIPAL has more academic permissions than INSTRUCTOR", () => {
    // Director is the final approver for exam result publication
    expect(can("DIRECTOR", "exams.release")).toBe(true);
    expect(can("INSTRUCTOR", "exams.release")).toBe(false);
    expect(can("PRINCIPAL", "content.approve")).toBe(true);
    expect(can("INSTRUCTOR", "content.approve")).toBe(false);
  });

  it("STUDENT has fewer permissions than INSTRUCTOR", () => {
    expect(can("INSTRUCTOR", "classes.manage")).toBe(true);
    expect(can("STUDENT", "classes.manage")).toBe(false);
    expect(can("INSTRUCTOR", "attendance.take")).toBe(true);
    expect(can("STUDENT", "attendance.take")).toBe(false);
  });
});

// ─── Portal access ────────────────────────────────────────────────────────────

describe("Portal access (canAccessPrefix)", () => {
  it("DIRECTOR can enter /director portal", () => expect(canAccessPrefix("DIRECTOR", "/director")).toBe(true));
  it("PRINCIPAL can enter /principal portal", () => expect(canAccessPrefix("PRINCIPAL", "/principal")).toBe(true));
  it("ADMIN can enter /admin portal", () => expect(canAccessPrefix("ADMIN", "/admin")).toBe(true));
  it("INSTRUCTOR can enter /tutor portal", () => expect(canAccessPrefix("INSTRUCTOR", "/tutor")).toBe(true));
  it("STUDENT can enter /dashboard portal", () => expect(canAccessPrefix("STUDENT", "/dashboard")).toBe(true));
  it("SYSTEM_IT can enter /system portal", () => expect(canAccessPrefix("SYSTEM_IT", "/system")).toBe(true));

  it("STUDENT cannot enter /director", () => expect(canAccessPrefix("STUDENT", "/director")).toBe(false));
  it("STUDENT cannot enter /admin", () => expect(canAccessPrefix("STUDENT", "/admin")).toBe(false));
  it("INSTRUCTOR cannot enter /director", () => expect(canAccessPrefix("INSTRUCTOR", "/director")).toBe(false));
  it("SYSTEM_IT cannot enter /dashboard (student portal)", () => expect(canAccessPrefix("SYSTEM_IT", "/dashboard")).toBe(false));
});

// ─── No removed role keys in code ─────────────────────────────────────────────

describe("No removed role keys in RBAC or permission checks", () => {
  it("canManageAccountRecoveryTarget blocks high-privilege roles", () => {
    expect(canManageAccountRecoveryTarget("STUDENT")).toBe(true);
    expect(canManageAccountRecoveryTarget("INSTRUCTOR")).toBe(true);
    // DIRECTOR has approvals.decide -> blocked
    expect(canManageAccountRecoveryTarget("DIRECTOR")).toBe(false);
    // PRINCIPAL has audit.view.full -> blocked
    expect(canManageAccountRecoveryTarget("PRINCIPAL")).toBe(false);
  });

  it("canForUser delegates to can() ignoring deprecated institutionSecretary flag", () => {
    expect(canForUser("DIRECTOR", "approvals.decide", { institutionSecretary: true })).toBe(true);
    expect(canForUser("STUDENT", "approvals.decide", { institutionSecretary: true })).toBe(false);
  });
});

// ─── Live class access ────────────────────────────────────────────────────────

describe("Live class access", () => {
  it("only STUDENT accounts use the enrolled-student join permission", () => {
    expect(can("STUDENT", "classes.join")).toBe(true);
    const staffRoles: UserRole[] = ["DIRECTOR", "PRINCIPAL", "ADMIN", "ACADEMIC_REGISTRAR", "INSTRUCTOR", "SYSTEM_IT"];
    for (const role of staffRoles) {
      expect(can(role, "classes.join")).toBe(false);
    }
  });

  it("INSTRUCTOR can upload course materials", () => {
    expect(can("INSTRUCTOR", "content.upload")).toBe(true);
    expect(can("STUDENT", "content.upload")).toBe(false);
  });
});
