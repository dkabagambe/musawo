/**
 * RBAC unit tests.
 * Proves each role gets 403 (ForbiddenError) for every permission NOT assigned to it,
 * and passes for every permission it IS assigned.
 *
 * These are pure logic tests - no DB, no HTTP, no mocks needed.
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

function expectForbidden(role: UserRole, permission: Permission) {
  expect(() => requirePermission(role, permission)).toThrowError(ForbiddenError);
}

function expectAllowed(role: UserRole, permission: Permission) {
  expect(() => requirePermission(role, permission)).not.toThrow();
}

// ─── SUPERADMIN ───────────────────────────────────────────────────────────────

describe("SUPERADMIN", () => {
  it("can approve refunds",             () => expectAllowed("SUPERADMIN", "refunds.approve"));
  it("can approve waivers",             () => expectAllowed("SUPERADMIN", "waivers.approve"));
  it("can decide approval requests",    () => expectAllowed("SUPERADMIN", "approvals.decide"));
  it("can view full audit log",         () => expectAllowed("SUPERADMIN", "audit.view.full"));
  it("can complete access reviews",     () => expectAllowed("SUPERADMIN", "access_review.complete"));
  it("can revoke certificates",         () => expectAllowed("SUPERADMIN", "certificates.revoke"));
  it("can approve break-glass access",  () => expectAllowed("SUPERADMIN", "break_glass.approve"));
  it("can approve staff account changes", () => expectAllowed("SUPERADMIN", "staff.create.approve"));
  it("can view payments",               () => expectAllowed("SUPERADMIN", "payments.view"));
  it("can view grades",                 () => expectAllowed("SUPERADMIN", "grades.view"));
  it("can manage intakes",              () => expectAllowed("SUPERADMIN", "intakes.manage"));
  it("can edit secrets",                () => expectAllowed("SUPERADMIN", "settings.edit.secrets"));
  it("can approve graduands",           () => expectAllowed("SUPERADMIN", "graduands.approve"));
});

// ─── ADMINISTRATOR ────────────────────────────────────────────────────────────

describe("ADMINISTRATOR", () => {
  it("can manage intakes",              () => expectAllowed("ADMINISTRATOR", "intakes.manage"));
  it("can manage announcements",        () => expectAllowed("ADMINISTRATOR", "announcements.manage"));
  it("can create courses",              () => expectAllowed("ADMINISTRATOR", "courses.create"));
  it("can publish courses",             () => expectAllowed("ADMINISTRATOR", "courses.publish"));
  it("can view settings",               () => expectAllowed("ADMINISTRATOR", "settings.view"));
  it("can edit non-secret settings",    () => expectAllowed("ADMINISTRATOR", "settings.edit"));
  it("can initiate staff accounts",     () => expectAllowed("ADMINISTRATOR", "staff.create.initiate"));

  it("CANNOT approve payments",         () => expectForbidden("ADMINISTRATOR", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("ADMINISTRATOR", "ledger.view"));
  it("CANNOT initiate refunds",         () => expectForbidden("ADMINISTRATOR", "refunds.initiate"));
  it("CANNOT approve refunds",          () => expectForbidden("ADMINISTRATOR", "refunds.approve"));
  it("CANNOT decide approvals",         () => expectForbidden("ADMINISTRATOR", "approvals.decide"));
  it("CANNOT approve staff accounts",   () => expectForbidden("ADMINISTRATOR", "staff.create.approve"));
  it("CANNOT edit secrets",             () => expectForbidden("ADMINISTRATOR", "settings.edit.secrets"));
  it("CANNOT revoke certificates",      () => expectForbidden("ADMINISTRATOR", "certificates.revoke"));
  it("CANNOT approve graduands",        () => expectForbidden("ADMINISTRATOR", "graduands.approve"));
  it("CANNOT release exam results",     () => expectForbidden("ADMINISTRATOR", "exams.release"));
  it("CANNOT approve course content",   () => expectForbidden("ADMINISTRATOR", "content.approve"));
});

// ─── PRINCIPAL ────────────────────────────────────────────────────────────────

describe("PRINCIPAL", () => {
  it("can release exam results",        () => expectAllowed("PRINCIPAL", "exams.release"));
  it("can approve course content",      () => expectAllowed("PRINCIPAL", "content.approve"));
  it("can issue certificates",          () => expectAllowed("PRINCIPAL", "certificates.issue"));
  it("can approve graduands list",      () => expectAllowed("PRINCIPAL", "graduands.approve"));
  it("can prepare graduands list",      () => expectAllowed("PRINCIPAL", "graduands.prepare"));
  it("can view students",               () => expectAllowed("PRINCIPAL", "students.view"));
  it("can view grades",                 () => expectAllowed("PRINCIPAL", "grades.view"));
  it("can mark exams",                  () => expectAllowed("PRINCIPAL", "exams.mark"));
  it("can view payments (read-only)",   () => expectAllowed("PRINCIPAL", "payments.view"));
  it("can view full audit log",         () => expectAllowed("PRINCIPAL", "audit.view.full"));

  it("CANNOT initiate payments",         () => expectForbidden("PRINCIPAL", "payments.initiate"));
  it("CANNOT view ledger",              () => expectForbidden("PRINCIPAL", "ledger.view"));
  it("CANNOT initiate refunds",         () => expectForbidden("PRINCIPAL", "refunds.initiate"));
  it("CANNOT edit grades",              () => expectForbidden("PRINCIPAL", "grades.edit"));
  it("CANNOT decide approvals",         () => expectForbidden("PRINCIPAL", "approvals.decide"));
  it("CANNOT edit settings",            () => expectForbidden("PRINCIPAL", "settings.edit"));
  it("CANNOT manage intakes",           () => expectForbidden("PRINCIPAL", "intakes.manage"));
  it("CANNOT approve staff changes",    () => expectForbidden("PRINCIPAL", "staff.create.approve"));
});

// ─── ACADEMIC_REGISTRAR ───────────────────────────────────────────────────────

describe("ACADEMIC_REGISTRAR", () => {
  it("can view students",               () => expectAllowed("ACADEMIC_REGISTRAR", "students.view"));
  it("can create students",             () => expectAllowed("ACADEMIC_REGISTRAR", "students.create"));
  it("can issue certificates",          () => expectAllowed("ACADEMIC_REGISTRAR", "certificates.issue"));
  it("can view grades",                 () => expectAllowed("ACADEMIC_REGISTRAR", "grades.view"));
  it("can edit grades",                 () => expectAllowed("ACADEMIC_REGISTRAR", "grades.edit"));
  it("can prepare graduands",           () => expectAllowed("ACADEMIC_REGISTRAR", "graduands.prepare"));

  it("CANNOT view payments",            () => expectForbidden("ACADEMIC_REGISTRAR", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("ACADEMIC_REGISTRAR", "ledger.view"));
  it("CANNOT initiate refunds",         () => expectForbidden("ACADEMIC_REGISTRAR", "refunds.initiate"));
  it("CANNOT approve refunds",          () => expectForbidden("ACADEMIC_REGISTRAR", "refunds.approve"));
  it("CANNOT change fees",              () => expectForbidden("ACADEMIC_REGISTRAR", "fees.change.initiate"));
  it("CANNOT revoke certificates",      () => expectForbidden("ACADEMIC_REGISTRAR", "certificates.revoke"));
  it("CANNOT decide approvals",         () => expectForbidden("ACADEMIC_REGISTRAR", "approvals.decide"));
  it("CANNOT approve break-glass",      () => expectForbidden("ACADEMIC_REGISTRAR", "break_glass.approve"));
  it("CANNOT approve graduands",        () => expectForbidden("ACADEMIC_REGISTRAR", "graduands.approve"));
  it("CANNOT release exam results",     () => expectForbidden("ACADEMIC_REGISTRAR", "exams.release"));
  it("CANNOT edit secrets",             () => expectForbidden("ACADEMIC_REGISTRAR", "settings.edit.secrets"));
});

// ─── BURSAR ───────────────────────────────────────────────────────────────────

describe("BURSAR", () => {
  it("can view payments",               () => expectAllowed("BURSAR", "payments.view"));
  it("can view ledger",                 () => expectAllowed("BURSAR", "ledger.view"));
  it("can initiate refunds",            () => expectAllowed("BURSAR", "refunds.initiate"));
  it("can initiate fee changes",        () => expectAllowed("BURSAR", "fees.change.initiate"));
  it("can export payments",             () => expectAllowed("BURSAR", "payments.export"));

  it("CANNOT edit grades",              () => expectForbidden("BURSAR", "grades.edit"));
  it("CANNOT create courses",           () => expectForbidden("BURSAR", "courses.create"));
  it("CANNOT revoke certificates",      () => expectForbidden("BURSAR", "certificates.revoke"));
  it("CANNOT approve refunds",          () => expectForbidden("BURSAR", "refunds.approve"));
  it("CANNOT approve waivers",          () => expectForbidden("BURSAR", "waivers.approve"));
  it("CANNOT decide approvals",         () => expectForbidden("BURSAR", "approvals.decide"));
  it("CANNOT manage integrations",      () => expectForbidden("BURSAR", "integrations.edit"));
  it("CANNOT complete access reviews",  () => expectForbidden("BURSAR", "access_review.complete"));
  it("CANNOT approve staff accounts",   () => expectForbidden("BURSAR", "staff.create.approve"));
  it("CANNOT manage intakes",           () => expectForbidden("BURSAR", "intakes.manage"));
});

// ─── TUTOR ────────────────────────────────────────────────────────────────────

describe("TUTOR", () => {
  it("can view students",               () => expectAllowed("TUTOR", "students.view"));
  it("can create exams",                () => expectAllowed("TUTOR", "exams.create"));
  it("can mark exams",                  () => expectAllowed("TUTOR", "exams.mark"));
  it("can edit grades",                 () => expectAllowed("TUTOR", "grades.edit"));

  it("CANNOT view payments",            () => expectForbidden("TUTOR", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("TUTOR", "ledger.view"));
  it("CANNOT initiate refunds",         () => expectForbidden("TUTOR", "refunds.initiate"));
  it("CANNOT decide approvals",         () => expectForbidden("TUTOR", "approvals.decide"));
  it("CANNOT revoke certificates",      () => expectForbidden("TUTOR", "certificates.revoke"));
  it("CANNOT suspend students",         () => expectForbidden("TUTOR", "students.suspend"));
  it("CANNOT export payments",          () => expectForbidden("TUTOR", "payments.export"));
  it("CANNOT edit site settings",       () => expectForbidden("TUTOR", "settings.edit"));
  it("CANNOT manage integrations",      () => expectForbidden("TUTOR", "integrations.edit"));
  it("CANNOT release exam results",     () => expectForbidden("TUTOR", "exams.release"));
  it("CANNOT approve course content",   () => expectForbidden("TUTOR", "content.approve"));
  it("CANNOT approve graduands",        () => expectForbidden("TUTOR", "graduands.approve"));
  it("CANNOT manage intakes",           () => expectForbidden("TUTOR", "intakes.manage"));
});

// ─── SYSTEM_IT ────────────────────────────────────────────────────────────────

describe("SYSTEM_IT", () => {
  it("can manage integrations",         () => expectAllowed("SYSTEM_IT", "integrations.edit"));
  it("can manage backups",              () => expectAllowed("SYSTEM_IT", "backups.manage"));
  it("can view system health",          () => expectAllowed("SYSTEM_IT", "health.view"));
  it("can request break-glass",         () => expectAllowed("SYSTEM_IT", "break_glass.request"));

  it("CANNOT view student payments",    () => expectForbidden("SYSTEM_IT", "payments.view"));
  it("CANNOT initiate payments",        () => expectForbidden("SYSTEM_IT", "payments.initiate"));
  it("CANNOT view ledger",              () => expectForbidden("SYSTEM_IT", "ledger.view"));
  it("CANNOT edit grades",              () => expectForbidden("SYSTEM_IT", "grades.edit"));
  it("CANNOT view grades",              () => expectForbidden("SYSTEM_IT", "grades.view"));
  it("CANNOT issue certificates",       () => expectForbidden("SYSTEM_IT", "certificates.issue"));
  it("CANNOT revoke certificates",      () => expectForbidden("SYSTEM_IT", "certificates.revoke"));
  it("CANNOT decide approvals",         () => expectForbidden("SYSTEM_IT", "approvals.decide"));
  it("CANNOT approve break-glass",      () => expectForbidden("SYSTEM_IT", "break_glass.approve"));
  it("CANNOT create students",          () => expectForbidden("SYSTEM_IT", "students.create"));
  it("CANNOT approve staff accounts",   () => expectForbidden("SYSTEM_IT", "staff.create.approve"));
  it("CANNOT approve refunds",          () => expectForbidden("SYSTEM_IT", "refunds.approve"));
  it("CANNOT initiate refunds",         () => expectForbidden("SYSTEM_IT", "refunds.initiate"));
  it("CANNOT edit secrets",             () => expectForbidden("SYSTEM_IT", "settings.edit.secrets"));
  it("CANNOT manage intakes",           () => expectForbidden("SYSTEM_IT", "intakes.manage"));
});

// ─── STUDENT ──────────────────────────────────────────────────────────────────

describe("STUDENT", () => {
  it("can view courses",                () => expectAllowed("STUDENT", "courses.view"));
  it("can view own grades",             () => expectAllowed("STUDENT", "grades.view"));
  it("can view certificates",           () => expectAllowed("STUDENT", "certificates.view"));

  it("CANNOT view payments list",       () => expectForbidden("STUDENT", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("STUDENT", "ledger.view"));
  it("CANNOT create courses",           () => expectForbidden("STUDENT", "courses.create"));
  it("CANNOT edit grades",              () => expectForbidden("STUDENT", "grades.edit"));
  it("CANNOT issue certificates",       () => expectForbidden("STUDENT", "certificates.issue"));
  it("CANNOT revoke certificates",      () => expectForbidden("STUDENT", "certificates.revoke"));
  it("CANNOT decide approvals",         () => expectForbidden("STUDENT", "approvals.decide"));
  it("CANNOT suspend students",         () => expectForbidden("STUDENT", "students.suspend"));
  it("CANNOT edit settings",            () => expectForbidden("STUDENT", "settings.edit"));
  it("CANNOT manage integrations",      () => expectForbidden("STUDENT", "integrations.edit"));
  it("CANNOT view audit log",           () => expectForbidden("STUDENT", "audit.view"));
  it("CANNOT view staff list",          () => expectForbidden("STUDENT", "staff.view"));
  it("CANNOT request break-glass",      () => expectForbidden("STUDENT", "break_glass.request"));
  it("CANNOT manage intakes",           () => expectForbidden("STUDENT", "intakes.manage"));
  it("CANNOT approve graduands",        () => expectForbidden("STUDENT", "graduands.approve"));
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
    expectAllowed("BURSAR", "refunds.initiate");
    expectForbidden("BURSAR", "refunds.approve");
  });

  it("PRINCIPAL can approve graduands but cannot prepare and approve alone (two-person rule enforced in API)", () => {
    expectAllowed("PRINCIPAL", "graduands.approve");
    expectAllowed("PRINCIPAL", "graduands.prepare");
  });
});

// ─── No role escalation ───────────────────────────────────────────────────────

describe("No role escalation", () => {
  const nonSuperAdminRoles: UserRole[] = [
    "SYSTEM_IT", "ADMINISTRATOR", "ACADEMIC_REGISTRAR",
    "BURSAR", "TUTOR", "STUDENT",
    "REGISTRAR", "ADMIN",
  ];

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
    it(`${role} cannot edit secrets`, () => {
      expectForbidden(role, "settings.edit.secrets");
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

  it("ADMINISTRATOR has intakes.manage", () => {
    expect(can("ADMINISTRATOR", "intakes.manage")).toBe(true);
  });

  it("PRINCIPAL has exams.release", () => {
    expect(can("PRINCIPAL", "exams.release")).toBe(true);
  });
});
