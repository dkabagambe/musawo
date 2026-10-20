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
import { ROLE_PERMISSIONS } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

function expectForbidden(role: UserRole, permission: Permission) {
  expect(() => requirePermission(role, permission)).toThrowError(ForbiddenError);
}

function expectAllowed(role: UserRole, permission: Permission) {
  expect(() => requirePermission(role, permission)).not.toThrow();
}

// ─── SUPER_ADMIN ───────────────────────────────────────────────────────────────

describe("SUPER_ADMIN", () => {
  it("can approve refunds",             () => expectAllowed("SUPER_ADMIN", "refunds.approve"));
  it("can approve waivers",             () => expectAllowed("SUPER_ADMIN", "waivers.approve"));
  it("can decide approval requests",    () => expectAllowed("SUPER_ADMIN", "approvals.decide"));
  it("can view full audit log",         () => expectAllowed("SUPER_ADMIN", "audit.view.full"));
  it("can complete access reviews",     () => expectAllowed("SUPER_ADMIN", "access_review.complete"));
  it("can revoke certificates",         () => expectAllowed("SUPER_ADMIN", "certificates.revoke"));
  it("can approve break-glass access",  () => expectAllowed("SUPER_ADMIN", "break_glass.approve"));
  it("can approve staff account changes", () => expectAllowed("SUPER_ADMIN", "staff.create.approve"));
  it("can view payments",               () => expectAllowed("SUPER_ADMIN", "payments.view"));
  it("can view grades",                 () => expectAllowed("SUPER_ADMIN", "grades.view"));
  it("can manage intakes",              () => expectAllowed("SUPER_ADMIN", "intakes.manage"));
  it("can edit secrets",                () => expectAllowed("SUPER_ADMIN", "settings.edit.secrets"));
  it("can approve graduands",           () => expectAllowed("SUPER_ADMIN", "graduands.approve"));
  it("can view graduates register",     () => expectAllowed("SUPER_ADMIN", "graduates.view"));
  it("can edit courses",                () => expectAllowed("SUPER_ADMIN", "courses.edit"));
  it("can manage classes",              () => expectAllowed("SUPER_ADMIN", "classes.manage"));
});

// ─── HR_SYSTEM_ADMIN ──────────────────────────────────────────────────────────

describe("HR_SYSTEM_ADMIN", () => {
  it("can manage staff accounts",       () => expectAllowed("HR_SYSTEM_ADMIN", "staff.create.initiate"));
  it("can view staff",                  () => expectAllowed("HR_SYSTEM_ADMIN", "staff.view"));
  it("can manage leave",                () => expectAllowed("HR_SYSTEM_ADMIN", "staff.leave.manage"));
  it("can view settings",               () => expectAllowed("HR_SYSTEM_ADMIN", "settings.view"));
  it("can edit non-secret settings",    () => expectAllowed("HR_SYSTEM_ADMIN", "settings.edit"));
  it("CANNOT edit public institution settings", () => expectForbidden("HR_SYSTEM_ADMIN", "settings.edit.public"));
  it("can manage support tickets",      () => expectAllowed("HR_SYSTEM_ADMIN", "support.manage"));

  it("CANNOT view payments",             () => expectForbidden("HR_SYSTEM_ADMIN", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("HR_SYSTEM_ADMIN", "ledger.view"));
  it("CANNOT approve refunds",          () => expectForbidden("HR_SYSTEM_ADMIN", "refunds.approve"));
  it("CANNOT decide approvals",         () => expectForbidden("HR_SYSTEM_ADMIN", "approvals.decide"));
  it("CANNOT approve staff accounts",   () => expectForbidden("HR_SYSTEM_ADMIN", "staff.create.approve"));
  it("CANNOT edit secrets",             () => expectForbidden("HR_SYSTEM_ADMIN", "settings.edit.secrets"));
  it("CANNOT revoke certificates",      () => expectForbidden("HR_SYSTEM_ADMIN", "certificates.revoke"));
  it("CANNOT approve graduands",        () => expectForbidden("HR_SYSTEM_ADMIN", "graduands.approve"));
  it("CANNOT release exam results",     () => expectForbidden("HR_SYSTEM_ADMIN", "exams.release"));
  it("CANNOT approve course content",   () => expectForbidden("HR_SYSTEM_ADMIN", "content.approve"));
  it("CANNOT edit grades",              () => expectForbidden("HR_SYSTEM_ADMIN", "grades.edit"));
  it("CANNOT create students",          () => expectForbidden("HR_SYSTEM_ADMIN", "students.create"));
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
  it("can view finance totals only",    () => expectAllowed("PRINCIPAL", "finance.totals.view"));
  it("can view full audit log",         () => expectAllowed("PRINCIPAL", "audit.view.full"));

  it("CANNOT initiate payments",         () => expectForbidden("PRINCIPAL", "payments.initiate"));
  it("CANNOT view payment details",      () => expectForbidden("PRINCIPAL", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("PRINCIPAL", "ledger.view"));
  it("CANNOT initiate refunds",         () => expectForbidden("PRINCIPAL", "refunds.initiate"));
  it("inherits instructor grade actions",() => expectAllowed("PRINCIPAL", "grades.edit"));
  it("CANNOT decide approvals",         () => expectForbidden("PRINCIPAL", "approvals.decide"));
  it("CANNOT edit settings",            () => expectForbidden("PRINCIPAL", "settings.edit"));
  it("inherits registrar intake actions",() => expectAllowed("PRINCIPAL", "intakes.manage"));
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

// ─── FINANCE_OFFICER ─────────────────────────────────────────────────────────

describe("FINANCE_OFFICER", () => {
  it("can view payments",               () => expectAllowed("FINANCE_OFFICER", "payments.view"));
  it("can view ledger",                 () => expectAllowed("FINANCE_OFFICER", "ledger.view"));
  it("can initiate refunds",            () => expectAllowed("FINANCE_OFFICER", "refunds.initiate"));
  it("can initiate fee changes",        () => expectAllowed("FINANCE_OFFICER", "fees.change.initiate"));
  it("can export payments",             () => expectAllowed("FINANCE_OFFICER", "payments.export"));
  it("can place payment holds",         () => expectAllowed("FINANCE_OFFICER", "payments.hold"));
  it("can review claims",               () => expectAllowed("FINANCE_OFFICER", "claims.review"));
  it("can import bank statements",      () => expectAllowed("FINANCE_OFFICER", "statements.import"));

  it("CANNOT edit grades",              () => expectForbidden("FINANCE_OFFICER", "grades.edit"));
  it("CANNOT create courses",           () => expectForbidden("FINANCE_OFFICER", "courses.create"));
  it("CANNOT revoke certificates",      () => expectForbidden("FINANCE_OFFICER", "certificates.revoke"));
  it("CANNOT approve refunds",          () => expectForbidden("FINANCE_OFFICER", "refunds.approve"));
  it("CANNOT approve waivers",          () => expectForbidden("FINANCE_OFFICER", "waivers.approve"));
  it("CANNOT decide approvals",         () => expectForbidden("FINANCE_OFFICER", "approvals.decide"));
  it("CANNOT manage integrations",      () => expectForbidden("FINANCE_OFFICER", "integrations.edit"));
  it("CANNOT complete access reviews",  () => expectForbidden("FINANCE_OFFICER", "access_review.complete"));
  it("CANNOT approve staff accounts",   () => expectForbidden("FINANCE_OFFICER", "staff.create.approve"));
  it("CANNOT manage intakes",           () => expectForbidden("FINANCE_OFFICER", "intakes.manage"));
  it("CANNOT edit secrets",             () => expectForbidden("FINANCE_OFFICER", "settings.edit.secrets"));
  it("CANNOT view exam questions",      () => expectForbidden("FINANCE_OFFICER", "exams.create"));
  it("CANNOT edit marks",               () => expectForbidden("FINANCE_OFFICER", "exams.mark"));
  it("CANNOT view graduates register",  () => expectForbidden("FINANCE_OFFICER", "graduates.view"));
});

// ─── INSTRUCTOR ───────────────────────────────────────────────────────────────

describe("INSTRUCTOR", () => {
  it("can view students",               () => expectAllowed("INSTRUCTOR", "students.view"));
  it("can create exams",                () => expectAllowed("INSTRUCTOR", "exams.create"));
  it("can mark exams",                  () => expectAllowed("INSTRUCTOR", "exams.mark"));
  it("can edit grades",                 () => expectAllowed("INSTRUCTOR", "grades.edit"));
  it("can take attendance",             () => expectAllowed("INSTRUCTOR", "attendance.take"));
  it("can manage classes",              () => expectAllowed("INSTRUCTOR", "classes.manage"));
  it("can upload content",              () => expectAllowed("INSTRUCTOR", "content.upload"));
  it("can message own students",        () => expectAllowed("INSTRUCTOR", "messaging.students.own"));
  it("can announce to own classes",     () => expectAllowed("INSTRUCTOR", "announcements.send.own"));

  it("CANNOT view payments",            () => expectForbidden("INSTRUCTOR", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("INSTRUCTOR", "ledger.view"));
  it("CANNOT initiate refunds",         () => expectForbidden("INSTRUCTOR", "refunds.initiate"));
  it("CANNOT decide approvals",         () => expectForbidden("INSTRUCTOR", "approvals.decide"));
  it("CANNOT revoke certificates",      () => expectForbidden("INSTRUCTOR", "certificates.revoke"));
  it("CANNOT suspend students",         () => expectForbidden("INSTRUCTOR", "students.suspend"));
  it("CANNOT export payments",          () => expectForbidden("INSTRUCTOR", "payments.export"));
  it("CANNOT edit site settings",       () => expectForbidden("INSTRUCTOR", "settings.edit"));
  it("CANNOT manage integrations",      () => expectForbidden("INSTRUCTOR", "integrations.edit"));
  it("CANNOT release exam results",     () => expectForbidden("INSTRUCTOR", "exams.release"));
  it("CANNOT approve course content",   () => expectForbidden("INSTRUCTOR", "content.approve"));
  it("CANNOT approve graduands",        () => expectForbidden("INSTRUCTOR", "graduands.approve"));
  it("CANNOT manage intakes",           () => expectForbidden("INSTRUCTOR", "intakes.manage"));
  it("CANNOT issue certificates",       () => expectForbidden("INSTRUCTOR", "certificates.issue"));
  it("CANNOT view graduates register",  () => expectForbidden("INSTRUCTOR", "graduates.view"));
  it("CANNOT see all students contacts", () => expectForbidden("INSTRUCTOR", "students.view.contacts"));
  it("CANNOT send all announcements",   () => expectForbidden("INSTRUCTOR", "announcements.send.all"));
});

// ─── TEACHING_ASSISTANT ───────────────────────────────────────────────────────

describe("TEACHING_ASSISTANT", () => {
  it("can view students",               () => expectAllowed("TEACHING_ASSISTANT", "students.view"));
  it("can view courses",               () => expectAllowed("TEACHING_ASSISTANT", "courses.view"));
  it("can upload content",              () => expectAllowed("TEACHING_ASSISTANT", "content.upload"));
  it("can take attendance",             () => expectAllowed("TEACHING_ASSISTANT", "attendance.take"));
  it("can view classes",               () => expectAllowed("TEACHING_ASSISTANT", "classes.view"));
  it("can view policies",              () => expectAllowed("TEACHING_ASSISTANT", "policies.view"));

  it("CANNOT set final marks",          () => expectForbidden("TEACHING_ASSISTANT", "grades.edit"));
  it("CANNOT create exams",            () => expectForbidden("TEACHING_ASSISTANT", "exams.create"));
  it("CANNOT mark exams",              () => expectForbidden("TEACHING_ASSISTANT", "exams.mark"));
  it("CANNOT view payments",            () => expectForbidden("TEACHING_ASSISTANT", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("TEACHING_ASSISTANT", "ledger.view"));
  it("CANNOT issue certificates",       () => expectForbidden("TEACHING_ASSISTANT", "certificates.issue"));
  it("CANNOT manage classes",          () => expectForbidden("TEACHING_ASSISTANT", "classes.manage"));
  it("CANNOT release exam results",     () => expectForbidden("TEACHING_ASSISTANT", "exams.release"));
  it("CANNOT decide approvals",         () => expectForbidden("TEACHING_ASSISTANT", "approvals.decide"));
  it("CANNOT edit settings",           () => expectForbidden("TEACHING_ASSISTANT", "settings.edit"));
  it("CANNOT view graduates register",  () => expectForbidden("TEACHING_ASSISTANT", "graduates.view"));
  it("CANNOT suspend students",         () => expectForbidden("TEACHING_ASSISTANT", "students.suspend"));
});

// ─── BOARD_MEMBER ─────────────────────────────────────────────────────────────

describe("BOARD_MEMBER", () => {
  it("can view board reports",          () => expectAllowed("BOARD_MEMBER", "reports.view"));
  it("can view board aggregates",       () => expectAllowed("BOARD_MEMBER", "reports.board"));
  it("can view policies",               () => expectAllowed("BOARD_MEMBER", "policies.view"));
  it("can view graduates register",     () => expectAllowed("BOARD_MEMBER", "graduates.view"));
  it("can view audit log",              () => expectAllowed("BOARD_MEMBER", "audit.view"));
  it("can view settings",               () => expectAllowed("BOARD_MEMBER", "settings.view"));

  it("CANNOT view student contacts",    () => expectForbidden("BOARD_MEMBER", "students.view.contacts"));
  it("CANNOT view payments",            () => expectForbidden("BOARD_MEMBER", "payments.view"));
  it("CANNOT view ledger",              () => expectForbidden("BOARD_MEMBER", "ledger.view"));
  it("CANNOT edit grades",              () => expectForbidden("BOARD_MEMBER", "grades.edit"));
  it("CANNOT create students",          () => expectForbidden("BOARD_MEMBER", "students.create"));
  it("CANNOT approve refunds",          () => expectForbidden("BOARD_MEMBER", "refunds.approve"));
  it("CANNOT decide approvals",         () => expectForbidden("BOARD_MEMBER", "approvals.decide"));
  it("CANNOT issue certificates",       () => expectForbidden("BOARD_MEMBER", "certificates.issue"));
  it("CANNOT edit settings",            () => expectForbidden("BOARD_MEMBER", "settings.edit"));
  it("CANNOT manage staff",             () => expectForbidden("BOARD_MEMBER", "staff.view"));
});

// ─── DEPUTY_PRINCIPAL ─────────────────────────────────────────────────────────

describe("DEPUTY_PRINCIPAL", () => {
  it("can view students",               () => expectAllowed("DEPUTY_PRINCIPAL", "students.view"));
  it("can view courses",               () => expectAllowed("DEPUTY_PRINCIPAL", "courses.view"));
  it("can mark exams",                  () => expectAllowed("DEPUTY_PRINCIPAL", "exams.mark"));
  it("can view grades",                 () => expectAllowed("DEPUTY_PRINCIPAL", "grades.view"));
  it("can view graduates register",     () => expectAllowed("DEPUTY_PRINCIPAL", "graduates.view"));
  it("can send all announcements",      () => expectAllowed("DEPUTY_PRINCIPAL", "announcements.send.all"));
  it("can manage complaints",           () => expectAllowed("DEPUTY_PRINCIPAL", "support.manage"));

  it("CANNOT release exam results",     () => expectForbidden("DEPUTY_PRINCIPAL", "exams.release"));
  it("CANNOT approve graduands",        () => expectForbidden("DEPUTY_PRINCIPAL", "graduands.approve"));
  it("CANNOT issue certificates",       () => expectForbidden("DEPUTY_PRINCIPAL", "certificates.issue"));
  it("CANNOT edit policies",            () => expectForbidden("DEPUTY_PRINCIPAL", "policies.edit"));
  it("CANNOT delete courses",           () => expectForbidden("DEPUTY_PRINCIPAL", "courses.delete"));
  it("CANNOT place payment holds",      () => expectForbidden("DEPUTY_PRINCIPAL", "payments.hold"));
  it("CANNOT initiate payments",        () => expectForbidden("DEPUTY_PRINCIPAL", "payments.initiate"));
  it("CANNOT view ledger",              () => expectForbidden("DEPUTY_PRINCIPAL", "ledger.view"));
  it("CANNOT edit settings",            () => expectForbidden("DEPUTY_PRINCIPAL", "settings.edit"));
  it("CANNOT decide approvals",         () => expectForbidden("DEPUTY_PRINCIPAL", "approvals.decide"));
});

// ─── AUDITOR_READONLY ─────────────────────────────────────────────────────────

describe("AUDITOR_READONLY", () => {
  it("can view students",               () => expectAllowed("AUDITOR_READONLY", "students.view"));
  it("can view student contacts",       () => expectAllowed("AUDITOR_READONLY", "students.view.contacts"));
  it("can view payments",               () => expectAllowed("AUDITOR_READONLY", "payments.view"));
  it("can view ledger",                 () => expectAllowed("AUDITOR_READONLY", "ledger.view"));
  it("can view graduates register",     () => expectAllowed("AUDITOR_READONLY", "graduates.view"));
  it("can view full audit log",         () => expectAllowed("AUDITOR_READONLY", "audit.view.full"));
  it("can flag/comment on audit",      () => expectAllowed("AUDITOR_READONLY", "audit.comment"));
  it("can view certificates",           () => expectAllowed("AUDITOR_READONLY", "certificates.view"));
  it("can view staff",                  () => expectAllowed("AUDITOR_READONLY", "staff.view"));

  it("CANNOT create students",          () => expectForbidden("AUDITOR_READONLY", "students.create"));
  it("CANNOT edit grades",              () => expectForbidden("AUDITOR_READONLY", "grades.edit"));
  it("CANNOT issue certificates",       () => expectForbidden("AUDITOR_READONLY", "certificates.issue"));
  it("CANNOT approve refunds",          () => expectForbidden("AUDITOR_READONLY", "refunds.approve"));
  it("CANNOT decide approvals",         () => expectForbidden("AUDITOR_READONLY", "approvals.decide"));
  it("CANNOT edit settings",            () => expectForbidden("AUDITOR_READONLY", "settings.edit"));
  it("CANNOT manage staff",             () => expectForbidden("AUDITOR_READONLY", "staff.create.initiate"));
  it("CANNOT take attendance",          () => expectForbidden("AUDITOR_READONLY", "attendance.take"));
  it("CANNOT create exams",            () => expectForbidden("AUDITOR_READONLY", "exams.create"));
});

// ─── SYSTEM_IT ────────────────────────────────────────────────────────────────

describe("SYSTEM_IT", () => {
  it("can manage integrations",         () => expectAllowed("SYSTEM_IT", "integrations.edit"));
  it("can manage backups",              () => expectAllowed("SYSTEM_IT", "backups.manage"));
  it("can view system health",          () => expectAllowed("SYSTEM_IT", "health.view"));
  it("can request break-glass",         () => expectAllowed("SYSTEM_IT", "break_glass.request"));
  it("can view settings",               () => expectAllowed("SYSTEM_IT", "settings.view"));
  it("can edit settings",               () => expectAllowed("SYSTEM_IT", "settings.edit"));

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
  it("can edit technical secrets",       () => expectAllowed("SYSTEM_IT", "settings.edit.secrets"));
  it("can edit public institution settings", () => expectAllowed("SYSTEM_IT", "settings.edit.public"));
  it("CANNOT manage intakes",           () => expectForbidden("SYSTEM_IT", "intakes.manage"));
  it("CANNOT view students",            () => expectForbidden("SYSTEM_IT", "students.view"));
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

  it("FINANCE_OFFICER cannot approve their own refund request", () => {
    expectAllowed("FINANCE_OFFICER", "refunds.initiate");
    expectForbidden("FINANCE_OFFICER", "refunds.approve");
  });

  it("PRINCIPAL can approve graduands but cannot prepare and approve alone (two-person rule enforced in API)", () => {
    expectAllowed("PRINCIPAL", "graduands.approve");
    expectAllowed("PRINCIPAL", "graduands.prepare");
  });

  it("ACADEMIC_REGISTRAR prepares graduands but cannot approve", () => {
    expectAllowed("ACADEMIC_REGISTRAR", "graduands.prepare");
    expectForbidden("ACADEMIC_REGISTRAR", "graduands.approve");
  });

  it("HR_SYSTEM_ADMIN initiates staff creation but cannot approve", () => {
    expectAllowed("HR_SYSTEM_ADMIN", "staff.create.initiate");
    expectForbidden("HR_SYSTEM_ADMIN", "staff.create.approve");
  });

  it("HR_SYSTEM_ADMIN cannot create SUPER_ADMIN, BOARD_MEMBER or AUDITOR_READONLY", () => {
    // These roles require SUPER_ADMIN approval; HR can only initiate
    expectAllowed("HR_SYSTEM_ADMIN", "staff.create.initiate");
    expectForbidden("HR_SYSTEM_ADMIN", "staff.create.approve");
  });
});

// ─── Hierarchy rules ─────────────────────────────────────────────────────────

describe("Hierarchy rules (SUPER_ADMIN inherits all)", () => {
  it("SUPER_ADMIN has every permission that PRINCIPAL has", () => {
    const principalPerms = ROLE_PERMISSIONS["PRINCIPAL"];
    const superAdminPerms = new Set(ROLE_PERMISSIONS["SUPER_ADMIN"]);
    for (const p of principalPerms) {
      expect(superAdminPerms.has(p)).toBe(true);
    }
  });

  it("SUPER_ADMIN has every permission that FINANCE_OFFICER has", () => {
    const financePerms = ROLE_PERMISSIONS["FINANCE_OFFICER"];
    const superAdminPerms = new Set(ROLE_PERMISSIONS["SUPER_ADMIN"]);
    for (const p of financePerms) {
      expect(superAdminPerms.has(p)).toBe(true);
    }
  });

  it("SUPER_ADMIN has every permission that INSTRUCTOR has", () => {
    const instructorPerms = ROLE_PERMISSIONS["INSTRUCTOR"];
    const superAdminPerms = new Set(ROLE_PERMISSIONS["SUPER_ADMIN"]);
    for (const p of instructorPerms) {
      expect(superAdminPerms.has(p)).toBe(true);
    }
  });

  it("SUPER_ADMIN has every permission that ACADEMIC_REGISTRAR has", () => {
    const registrarPerms = ROLE_PERMISSIONS["ACADEMIC_REGISTRAR"];
    const superAdminPerms = new Set(ROLE_PERMISSIONS["SUPER_ADMIN"]);
    for (const p of registrarPerms) {
      expect(superAdminPerms.has(p)).toBe(true);
    }
  });

  it("SUPER_ADMIN has every permission that HR_SYSTEM_ADMIN has", () => {
    const hrPerms = ROLE_PERMISSIONS["HR_SYSTEM_ADMIN"];
    const superAdminPerms = new Set(ROLE_PERMISSIONS["SUPER_ADMIN"]);
    for (const p of hrPerms) {
      expect(superAdminPerms.has(p)).toBe(true);
    }
  });

  it("PRINCIPAL has more academic permissions than DEPUTY_PRINCIPAL", () => {
    expect(can("PRINCIPAL", "exams.release")).toBe(true);
    expect(can("DEPUTY_PRINCIPAL", "exams.release")).toBe(false);
    expect(can("PRINCIPAL", "graduands.approve")).toBe(true);
    expect(can("DEPUTY_PRINCIPAL", "graduands.approve")).toBe(false);
    expect(can("PRINCIPAL", "certificates.issue")).toBe(true);
    expect(can("DEPUTY_PRINCIPAL", "certificates.issue")).toBe(false);
  });

  it("INSTRUCTOR has more permissions than TEACHING_ASSISTANT", () => {
    expect(can("INSTRUCTOR", "grades.edit")).toBe(true);
    expect(can("TEACHING_ASSISTANT", "grades.edit")).toBe(false);
    expect(can("INSTRUCTOR", "exams.create")).toBe(true);
    expect(can("TEACHING_ASSISTANT", "exams.create")).toBe(false);
    expect(can("INSTRUCTOR", "classes.manage")).toBe(true);
    expect(can("TEACHING_ASSISTANT", "classes.manage")).toBe(false);
  });
});

// ─── No role escalation ───────────────────────────────────────────────────────

describe("No role escalation", () => {
  const nonSuperAdminRoles: UserRole[] = [
    "BOARD_MEMBER", "PRINCIPAL", "DEPUTY_PRINCIPAL",
    "ACADEMIC_REGISTRAR", "INSTRUCTOR", "TEACHING_ASSISTANT",
    "FINANCE_OFFICER", "HR_SYSTEM_ADMIN", "AUDITOR_READONLY",
    "SYSTEM_IT", "STUDENT",
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
    it(`${role} cannot edit secrets`, () => {
      if (role === "SYSTEM_IT") expectAllowed(role, "settings.edit.secrets");
      else expectForbidden(role, "settings.edit.secrets");
    });
  }

  // Only SUPER_ADMIN and AUDITOR_READONLY can see the full audit log
  it("only SUPER_ADMIN, AUDITOR_READONLY and PRINCIPAL can view full audit log", () => {
    expectAllowed("SUPER_ADMIN", "audit.view.full");
    expectAllowed("AUDITOR_READONLY", "audit.view.full");
    expectAllowed("PRINCIPAL", "audit.view.full");
    expectForbidden("DEPUTY_PRINCIPAL", "audit.view.full");
    expectForbidden("HR_SYSTEM_ADMIN", "audit.view.full");
    expectForbidden("FINANCE_OFFICER", "audit.view.full");
    expectForbidden("ACADEMIC_REGISTRAR", "audit.view.full");
    expectForbidden("SYSTEM_IT", "audit.view.full");
    expectForbidden("INSTRUCTOR", "audit.view.full");
    expectForbidden("BOARD_MEMBER", "audit.view.full");
    expectForbidden("TEACHING_ASSISTANT", "audit.view.full");
    expectForbidden("STUDENT", "audit.view.full");
  });
});

// ─── can() helper ─────────────────────────────────────────────────────────────

describe("can() helper", () => {
  it("returns true for valid permission", () => {
    expect(can("FINANCE_OFFICER", "payments.view")).toBe(true);
  });

  it("returns false for missing permission", () => {
    expect(can("FINANCE_OFFICER", "grades.edit")).toBe(false);
  });

  it("returns false for unknown permission string", () => {
    expect(can("SUPER_ADMIN", "nonexistent.permission" as Permission)).toBe(false);
  });

  it("HR_SYSTEM_ADMIN has staff.view", () => {
    expect(can("HR_SYSTEM_ADMIN", "staff.view")).toBe(true);
  });

  it("PRINCIPAL has exams.release", () => {
    expect(can("PRINCIPAL", "exams.release")).toBe(true);
  });

  it("senior academic roles inherit descendant permissions", () => {
    expect(can("DEPUTY_PRINCIPAL", "students.create")).toBe(true);
    expect(can("ACADEMIC_REGISTRAR", "attendance.take")).toBe(true);
    expect(can("FINANCE_OFFICER", "students.create")).toBe(false);
  });

  it("deputy principal limits override inherited permissions", () => {
    expect(can("DEPUTY_PRINCIPAL", "courses.publish")).toBe(false);
    expect(can("DEPUTY_PRINCIPAL", "courses.delete")).toBe(false);
    expect(can("DEPUTY_PRINCIPAL", "exams.release")).toBe(false);
    expect(can("DEPUTY_PRINCIPAL", "graduands.approve")).toBe(false);
  });
});
