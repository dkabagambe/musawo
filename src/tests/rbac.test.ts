/**
 * RBAC unit tests.
 * Proves each role gets 403 (ForbiddenError) for every permission NOT assigned to it,
 * and passes for every permission it IS assigned.
 *
 * These are pure logic tests — no DB, no HTTP, no mocks needed.
 */

import { describe, it, expect } from "vitest";
import {
  can,
  requirePermission,
  assertNotSelfApproval,
  ForbiddenError,
  type Permission,
} from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

// ─── Helper ───────────────────────────────────────────────────────────────────

function expectForbidden(role: UserRole, permission: Permission) {
  expect(() => requirePermission(role, permission)).toThrowError(ForbiddenError);
}

function expectAllowed(role: UserRole, permission: Permission) {
  expect(() => requirePermission(role, permission)).not.toThrow();
}

// ─── SUPERADMIN ───────────────────────────────────────────────────────────────

describe("SUPERADMIN", () => {
  it("can approve refunds", () => expectAllowed("SUPERADMIN", "refunds.approve"));
  it("can approve waivers", () => expectAllowed("SUPERADMIN", "waivers.approve"));
  it("can approve scholarship awards", () => expectAllowed("SUPERADMIN", "scholarships.approve"));
  it("can decide approval requests", () => expectAllowed("SUPERADMIN", "approvals.decide"));
  it("can view full audit log", () => expectAllowed("SUPERADMIN", "audit.view.full"));
  it("can complete access reviews", () => expectAllowed("SUPERADMIN", "access_review.complete"));
  it("can revoke certificates", () => expectAllowed("SUPERADMIN", "certificates.revoke"));
  it("can approve break-glass access", () => expectAllowed("SUPERADMIN", "break_glass.approve"));
  it("can approve staff account changes", () => expectAllowed("SUPERADMIN", "staff.create.approve"));
  it("can view payments", () => expectAllowed("SUPERADMIN", "payments.view"));
  it("can view grades", () => expectAllowed("SUPERADMIN", "grades.view"));
});

// ─── SYSTEM_IT ────────────────────────────────────────────────────────────────

describe("SYSTEM_IT", () => {
  it("can manage integrations", () => expectAllowed("SYSTEM_IT", "integrations.edit"));
  it("can manage backups",      () => expectAllowed("SYSTEM_IT", "backups.manage"));
  it("can view system health",  () => expectAllowed("SYSTEM_IT", "health.view"));
  it("can request break-glass", () => expectAllowed("SYSTEM_IT", "break_glass.request"));

  // Must be denied everything related to student data
  it("CANNOT view student payments",     () => expectForbidden("SYSTEM_IT", "payments.view"));
  it("CANNOT initiate payments",         () => expectForbidden("SYSTEM_IT", "payments.initiate"));
  it("CANNOT view ledger",               () => expectForbidden("SYSTEM_IT", "ledger.view"));
  it("CANNOT edit grades",               () => expectForbidden("SYSTEM_IT", "grades.edit"));
  it("CANNOT view grades",               () => expectForbidden("SYSTEM_IT", "grades.view"));
  it("CANNOT issue certificates",        () => expectForbidden("SYSTEM_IT", "certificates.issue"));
  it("CANNOT revoke certificates",       () => expectForbidden("SYSTEM_IT", "certificates.revoke"));
  it("CANNOT approve anything",          () => expectForbidden("SYSTEM_IT", "approvals.decide"));
  it("CANNOT approve break-glass",       () => expectForbidden("SYSTEM_IT", "break_glass.approve"));
  it("CANNOT create students",           () => expectForbidden("SYSTEM_IT", "students.create"));
  it("CANNOT approve staff accounts",    () => expectForbidden("SYSTEM_IT", "staff.create.approve"));
  it("CANNOT approve refunds",           () => expectForbidden("SYSTEM_IT", "refunds.approve"));
  it("CANNOT initiate refunds",          () => expectForbidden("SYSTEM_IT", "refunds.initiate"));
});

// ─── REGISTRAR ────────────────────────────────────────────────────────────────

describe("REGISTRAR", () => {
  it("can view students",        () => expectAllowed("REGISTRAR", "students.view"));
  it("can create students",      () => expectAllowed("REGISTRAR", "students.create"));
  it("can issue certificates",   () => expectAllowed("REGISTRAR", "certificates.issue"));
  it("can initiate scholarships",() => expectAllowed("REGISTRAR", "scholarships.initiate"));
  it("can view grades",          () => expectAllowed("REGISTRAR", "grades.view"));
  it("can edit grades",          () => expectAllowed("REGISTRAR", "grades.edit"));

  // Explicitly denied: all financial views
  it("CANNOT view payments",       () => expectForbidden("REGISTRAR", "payments.view"));
  it("CANNOT view ledger",         () => expectForbidden("REGISTRAR", "ledger.view"));
  it("CANNOT initiate refunds",    () => expectForbidden("REGISTRAR", "refunds.initiate"));
  it("CANNOT approve refunds",     () => expectForbidden("REGISTRAR", "refunds.approve"));
  it("CANNOT change fees",         () => expectForbidden("REGISTRAR", "fees.change.initiate"));
  it("CANNOT revoke certificates", () => expectForbidden("REGISTRAR", "certificates.revoke"));
  it("CANNOT approve anything",    () => expectForbidden("REGISTRAR", "approvals.decide"));
  it("CANNOT approve break-glass", () => expectForbidden("REGISTRAR", "break_glass.approve"));
});

// ─── BURSAR ───────────────────────────────────────────────────────────────────

describe("BURSAR", () => {
  it("can view payments",          () => expectAllowed("BURSAR", "payments.view"));
  it("can view ledger",            () => expectAllowed("BURSAR", "ledger.view"));
  it("can initiate refunds",       () => expectAllowed("BURSAR", "refunds.initiate"));
  it("can initiate fee changes",   () => expectAllowed("BURSAR", "fees.change.initiate"));
  it("can export payments",        () => expectAllowed("BURSAR", "payments.export"));

  // Explicitly denied
  it("CANNOT edit grades",               () => expectForbidden("BURSAR", "grades.edit"));
  it("CANNOT create courses",            () => expectForbidden("BURSAR", "courses.create"));
  it("CANNOT revoke certificates",       () => expectForbidden("BURSAR", "certificates.revoke"));
  it("CANNOT approve refunds",           () => expectForbidden("BURSAR", "refunds.approve"));
  it("CANNOT approve waivers",           () => expectForbidden("BURSAR", "waivers.approve"));
  it("CANNOT approve anything",          () => expectForbidden("BURSAR", "approvals.decide"));
  it("CANNOT manage integrations",       () => expectForbidden("BURSAR", "integrations.edit"));
  it("CANNOT complete access reviews",   () => expectForbidden("BURSAR", "access_review.complete"));
  it("CANNOT approve staff accounts",    () => expectForbidden("BURSAR", "staff.create.approve"));
});

// ─── TUTOR ────────────────────────────────────────────────────────────────────

describe("TUTOR", () => {
  it("can view students",    () => expectAllowed("TUTOR", "students.view"));
  it("can create exams",     () => expectAllowed("TUTOR", "exams.create"));
  it("can mark exams",       () => expectAllowed("TUTOR", "exams.mark"));
  it("can edit grades",      () => expectAllowed("TUTOR", "grades.edit"));

  // Explicitly denied
  it("CANNOT view payments",         () => expectForbidden("TUTOR", "payments.view"));
  it("CANNOT view ledger",           () => expectForbidden("TUTOR", "ledger.view"));
  it("CANNOT initiate refunds",      () => expectForbidden("TUTOR", "refunds.initiate"));
  it("CANNOT approve anything",      () => expectForbidden("TUTOR", "approvals.decide"));
  it("CANNOT revoke certificates",   () => expectForbidden("TUTOR", "certificates.revoke"));
  it("CANNOT suspend students",      () => expectForbidden("TUTOR", "students.suspend"));
  it("CANNOT export payments",       () => expectForbidden("TUTOR", "payments.export"));
  it("CANNOT edit site settings",    () => expectForbidden("TUTOR", "settings.edit"));
  it("CANNOT manage integrations",   () => expectForbidden("TUTOR", "integrations.edit"));
});

// ─── STUDENT ──────────────────────────────────────────────────────────────────

describe("STUDENT", () => {
  it("can view courses",     () => expectAllowed("STUDENT", "courses.view"));
  it("can view own grades",  () => expectAllowed("STUDENT", "grades.view"));
  it("can view certificates",() => expectAllowed("STUDENT", "certificates.view"));

  // Denied everything sensitive
  it("CANNOT view payments list",   () => expectForbidden("STUDENT", "payments.view"));
  it("CANNOT view ledger",          () => expectForbidden("STUDENT", "ledger.view"));
  it("CANNOT create courses",       () => expectForbidden("STUDENT", "courses.create"));
  it("CANNOT edit grades",          () => expectForbidden("STUDENT", "grades.edit"));
  it("CANNOT issue certificates",   () => expectForbidden("STUDENT", "certificates.issue"));
  it("CANNOT revoke certificates",  () => expectForbidden("STUDENT", "certificates.revoke"));
  it("CANNOT approve anything",     () => expectForbidden("STUDENT", "approvals.decide"));
  it("CANNOT suspend students",     () => expectForbidden("STUDENT", "students.suspend"));
  it("CANNOT edit settings",        () => expectForbidden("STUDENT", "settings.edit"));
  it("CANNOT manage integrations",  () => expectForbidden("STUDENT", "integrations.edit"));
  it("CANNOT view audit log",       () => expectForbidden("STUDENT", "audit.view"));
  it("CANNOT view staff list",      () => expectForbidden("STUDENT", "staff.view"));
  it("CANNOT request break-glass",  () => expectForbidden("STUDENT", "break_glass.request"));
});

// ─── Separation of duties ─────────────────────────────────────────────────────

describe("Separation of duties", () => {
  it("prevents self-approval", () => {
    expect(() => assertNotSelfApproval("user-1", "user-1")).toThrowError(ForbiddenError);
  });

  it("allows approval by a different user", () => {
    expect(() => assertNotSelfApproval("user-1", "user-2")).not.toThrow();
  });

  it("BURSAR cannot approve their own refund request", () => {
    // Bursar can initiate but not approve
    expectAllowed("BURSAR", "refunds.initiate");
    expectForbidden("BURSAR", "refunds.approve");
  });

  it("REGISTRAR cannot approve their own scholarship initiation", () => {
    expectAllowed("REGISTRAR", "scholarships.initiate");
    expectForbidden("REGISTRAR", "scholarships.approve");
  });
});

// ─── No role escalation ───────────────────────────────────────────────────────

describe("No role escalation", () => {
  const nonSuperAdminRoles: UserRole[] = ["SYSTEM_IT","REGISTRAR","BURSAR","TUTOR","STUDENT","ADMIN"];

  for (const role of nonSuperAdminRoles) {
    it(`${role} cannot approve role changes`, () => {
      expectForbidden(role, "staff.role.change.approve");
    });
    it(`${role} cannot complete access reviews`, () => {
      expectForbidden(role, "access_review.complete");
    });
    it(`${role} cannot decide on approval requests`, () => {
      expectForbidden(role, "approvals.decide");
    });
    it(`${role} cannot view full audit log`, () => {
      expectForbidden(role, "audit.view.full");
    });
  }
});

// ─── can() helper ─────────────────────────────────────────────────────────────

describe("can() helper", () => {
  it("returns true for valid permission", () => {
    expect(can("BURSAR", "payments.view")).toBe(true);
  });

  it("returns false for missing permission", () => {
    expect(can("BURSAR", "grades.edit")).toBe(false);
  });

  it("returns false for unknown permission string", () => {
    expect(can("SUPERADMIN", "nonexistent.permission" as Permission)).toBe(false);
  });
});
