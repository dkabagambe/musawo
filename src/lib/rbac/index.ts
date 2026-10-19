/**
 * RBAC - central permissions library.
 *
 * Principles:
 * - Default DENY: every check must be explicitly allowed.
 * - Server-side only: never trust the role from the client.
 * - Separation of duties: initiators cannot approve their own requests.
 * - No role names in business logic: use can() or requirePermission() only.
 * - Labels are editable in admin; these key strings are the stable identifiers.
 */

import type { UserRole } from "@prisma/client";

// ─── Role group helpers ────────────────────────────────────────────────────

export const STAFF_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "BOARD_MEMBER",
  "PRINCIPAL",
  "DEPUTY_PRINCIPAL",
  "ACADEMIC_REGISTRAR",
  "INSTRUCTOR",
  "TEACHING_ASSISTANT",
  "FINANCE_OFFICER",
  "HR_SYSTEM_ADMIN",
  "AUDITOR_READONLY",
  "SYSTEM_IT",
];

export const SUPER_ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN"];
// Legacy alias still used in a few places until full migration
export const SUPERADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "SUPERADMIN"];

export const FINANCE_ROLES: UserRole[] = ["SUPER_ADMIN", "FINANCE_OFFICER"];

export const ACADEMIC_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "PRINCIPAL",
  "DEPUTY_PRINCIPAL",
  "ACADEMIC_REGISTRAR",
  "INSTRUCTOR",
];

export const MAX_SUPER_ADMIN_ACCOUNTS = 3;
// Legacy name kept so existing imports compile
export const MAX_SUPERADMIN_ACCOUNTS = 3;

// ─── Permission definitions ────────────────────────────────────────────────

export type Permission =
  // Students / Enrolments
  | "students.view"
  | "students.create"
  | "students.edit"
  | "students.suspend"
  | "students.export"
  | "students.view.contacts"   // contact details hidden from BOARD_MEMBER
  | "enrolments.view"
  | "enrolments.create"
  | "enrolments.edit"
  | "applications.view"
  | "applications.process"     // create account from application

  // Finance - ACADEMIC roles and INSTRUCTOR must NEVER see these
  | "payments.view"
  | "payments.initiate"
  | "payments.export"
  | "payments.hold"            // FINANCE_OFFICER can place/lift payment holds
  | "ledger.view"
  | "refunds.initiate"
  | "refunds.approve"          // SUPER_ADMIN only
  | "waivers.initiate"
  | "waivers.approve"          // SUPER_ADMIN only
  | "fees.change.initiate"
  | "fees.change.approve"      // SUPER_ADMIN only
  | "scholarships.initiate"
  | "scholarships.approve"     // SUPER_ADMIN only
  | "finance.totals.view"      // PRINCIPAL sees totals only

  // Courses / Content
  | "courses.view"
  | "courses.create"           // ACADEMIC_REGISTRAR creates draft; PRINCIPAL approves
  | "courses.edit"
  | "courses.publish"          // PRINCIPAL approves and publishes
  | "courses.delete"
  | "content.upload"           // INSTRUCTOR uploads materials
  | "content.approve"          // PRINCIPAL approves content
  | "content.view.own"         // INSTRUCTOR sees own courses only
  | "lessons.edit"

  // Exams and results
  | "exams.create"
  | "exams.mark"
  | "exams.release"            // PRINCIPAL publishes final results
  | "grades.view"
  | "grades.edit"
  | "grades.view.own"          // INSTRUCTOR sees own course grades

  // Attendance and roll call
  | "attendance.take"          // INSTRUCTOR or TEACHING_ASSISTANT
  | "attendance.view"
  | "attendance.export"

  // Live classes
  | "classes.manage"           // create, start, stop, admit
  | "classes.view"

  // Certificates and graduands
  | "certificates.issue"
  | "certificates.revoke"      // SUPER_ADMIN only
  | "certificates.view"
  | "graduands.prepare"        // ACADEMIC_REGISTRAR prepares list
  | "graduands.approve"        // PRINCIPAL approves
  | "graduates.view"           // access to graduates register

  // Transcripts
  | "transcripts.view"
  | "transcripts.generate"

  // Announcements
  | "announcements.send.all"   // PRINCIPAL, DEPUTY_PRINCIPAL, ACADEMIC_REGISTRAR
  | "announcements.send.own"   // INSTRUCTOR to own classes

  // Messaging
  | "messaging.students.own"   // INSTRUCTOR chats with own students

  // Staff accounts
  | "staff.view"
  | "staff.create.initiate"    // HR_SYSTEM_ADMIN or SUPER_ADMIN
  | "staff.create.approve"     // SUPER_ADMIN only
  | "staff.suspend.initiate"
  | "staff.suspend.approve"    // SUPER_ADMIN only
  | "staff.role.change.approve"// SUPER_ADMIN only
  | "staff.leave.manage"       // HR_SYSTEM_ADMIN

  // Settings
  | "settings.view"
  | "settings.edit"            // HR_SYSTEM_ADMIN for non-secret; SUPER_ADMIN for all
  | "settings.edit.secrets"    // SUPER_ADMIN only

  // Integrations / infra
  | "integrations.edit"        // SYSTEM_IT
  | "backups.manage"
  | "health.view"

  // Audit and compliance
  | "audit.view"               // filtered per role
  | "audit.view.full"          // SUPER_ADMIN only; AUDITOR_READONLY also full
  | "audit.comment"            // AUDITOR_READONLY can add flags/comments
  | "access_review.view"
  | "access_review.complete"   // SUPER_ADMIN only

  // Approvals
  | "approvals.view"
  | "approvals.decide"         // SUPER_ADMIN only

  // Intakes
  | "intakes.manage"           // ACADEMIC_REGISTRAR creates, PRINCIPAL approves

  // Break-glass access
  | "break_glass.request"      // SYSTEM_IT requests temporary data access
  | "break_glass.approve"      // SUPER_ADMIN approves break-glass

  // Reports
  | "reports.view"
  | "reports.financial"        // FINANCE_OFFICER + SUPER_ADMIN
  | "reports.academic"
  | "reports.board"            // aggregates only, no individual student data

  // Policies
  | "policies.view"
  | "policies.edit"            // PRINCIPAL or SUPER_ADMIN

  // Announcements (internal only, never public)
  | "announcements.manage"     // send to all or own class

  // Support / complaints
  | "support.view"
  | "support.manage"

  // Partner pages
  | "partner_pages.edit"

  // Manual payment claims
  | "claims.submit"
  | "claims.review"
  | "claims.second_verify"
  | "statements.import"
  | "reconciliation.view";

// ─── Role -> permission map ────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {

  // ── SUPER_ADMIN: full access, final approver ──────────────────
  SUPER_ADMIN: [
    "students.view", "students.create", "students.edit", "students.suspend",
    "students.export", "students.view.contacts",
    "enrolments.view", "enrolments.create", "enrolments.edit",
    "applications.view", "applications.process",
    "payments.view", "payments.initiate", "payments.export", "payments.hold",
    "ledger.view", "finance.totals.view",
    "refunds.initiate", "refunds.approve",
    "waivers.initiate", "waivers.approve",
    "fees.change.initiate", "fees.change.approve",
    "scholarships.initiate", "scholarships.approve",
    "courses.view", "courses.create", "courses.edit", "courses.publish", "courses.delete",
    "content.upload", "content.approve",
    "lessons.edit",
    "exams.create", "exams.mark", "exams.release",
    "grades.view", "grades.edit",
    "attendance.take", "attendance.view", "attendance.export",
    "classes.manage", "classes.view",
    "certificates.issue", "certificates.revoke", "certificates.view",
    "graduands.prepare", "graduands.approve", "graduates.view",
    "transcripts.view", "transcripts.generate",
    "announcements.send.all", "announcements.send.own",
    "messaging.students.own",
    "staff.view", "staff.create.initiate", "staff.create.approve",
    "staff.suspend.initiate", "staff.suspend.approve",
    "staff.role.change.approve", "staff.leave.manage",
    "settings.view", "settings.edit", "settings.edit.secrets",
    "integrations.edit", "backups.manage", "health.view",
    "audit.view", "audit.view.full",
    "access_review.view", "access_review.complete",
    "approvals.view", "approvals.decide",
    "reports.view", "reports.financial", "reports.academic", "reports.board",
    "policies.view", "policies.edit",
    "support.view", "support.manage",
    "partner_pages.edit",
    "intakes.manage",
    "break_glass.approve",
    "announcements.manage",
    "claims.submit", "claims.review", "claims.second_verify",
    "statements.import", "reconciliation.view",
  ],

  // ── BOARD_MEMBER: read-only aggregates, no individual contacts ─
  BOARD_MEMBER: [
    "reports.view", "reports.board",
    "policies.view",
    "graduates.view",        // names, course, year only (scoped in query)
    "audit.view",
    "settings.view",
    // Explicitly DENIED: students.view.contacts, payments.*, finance.*, grades.*
  ],

  // ── PRINCIPAL: academic head, approver ────────────────────────
  PRINCIPAL: [
    "students.view", "students.export", "students.view.contacts",
    "enrolments.view",
    "applications.view",
    "finance.totals.view",
    "courses.view", "courses.create", "courses.edit", "courses.publish", "courses.delete",
    "content.approve",
    "exams.mark", "exams.release",
    "grades.view",
    "attendance.view", "attendance.export",
    "classes.view",
    "certificates.issue", "certificates.view",
    "graduands.prepare", "graduands.approve", "graduates.view",
    "transcripts.view",
    "announcements.send.all",
    "staff.view",
    "audit.view",
    "reports.view", "reports.academic",
    "policies.view", "policies.edit",
    "support.view",
    "approvals.view",
    // DENIED: payments.view, ledger.view, settings.edit, grades.edit
  ],

  // ── DEPUTY_PRINCIPAL: daily operations, delegates from Principal
  DEPUTY_PRINCIPAL: [
    "students.view", "students.export", "students.view.contacts",
    "enrolments.view",
    "applications.view",
    "finance.totals.view",
    "courses.view",
    "content.approve",   // only when Principal delegates (enforced in API)
    "exams.mark",
    "grades.view",
    "attendance.view", "attendance.export",
    "classes.view",
    "certificates.view",
    "graduates.view",
    "transcripts.view",
    "announcements.send.all",
    "staff.view",
    "audit.view",
    "reports.view", "reports.academic",
    "policies.view",
    "support.view", "support.manage",
    // DENIED: exams.release, graduands.approve, certificates.issue, policies.edit
  ],

  // ── ACADEMIC_REGISTRAR: student records, enrolments, academic calendar
  ACADEMIC_REGISTRAR: [
    "students.view", "students.create", "students.edit", "students.suspend",
    "students.export", "students.view.contacts",
    "enrolments.view", "enrolments.create", "enrolments.edit",
    "applications.view", "applications.process",
    "finance.totals.view",   // payment status totals only -- NOT payments.view (no ledger access)
    "intakes.manage",
    "courses.view", "courses.create", "courses.edit",
    "lessons.edit",
    "exams.create", "exams.mark",
    "grades.view", "grades.edit",
    "attendance.view", "attendance.export",
    "classes.view",
    "certificates.issue", "certificates.view",
    "graduands.prepare", "graduates.view",
    "transcripts.view", "transcripts.generate",
    "announcements.send.all",
    "announcements.manage",
    "scholarships.initiate",
    "waivers.initiate",
    "staff.create.initiate", "staff.suspend.initiate",
    "audit.view",
    "reports.view", "reports.academic",
    "policies.view",
    "support.view",
    // DENIED: exams.release, graduands.approve, certificates.revoke, payments.hold
  ],

  // ── INSTRUCTOR: own courses only ──────────────────────────────
  INSTRUCTOR: [
    "students.view",         // own students only (scoped in query)
    "enrolments.view",
    "courses.view",          // own courses only
    "courses.edit",          // own courses only
    "content.upload", "content.view.own",
    "lessons.edit",
    "exams.create", "exams.mark",
    "grades.view", "grades.edit", "grades.view.own",
    "attendance.take", "attendance.view", "attendance.export",
    "classes.manage", "classes.view",
    "certificates.view",
    "transcripts.view",      // own students only
    "announcements.send.own",
    "messaging.students.own",
    "reports.view",
    "policies.view",
    // DENIED: payments.*, finance.*, students.view.contacts (full), other instructors' data
  ],

  // ── TEACHING_ASSISTANT: limited upload and roll-call ──────────
  TEACHING_ASSISTANT: [
    "students.view",
    "enrolments.view",
    "courses.view",
    "content.upload",        // help upload materials
    "attendance.take",
    "classes.view",
    "policies.view",
    // DENIED: grades.edit, exams.*, payments.*, certificates.*
  ],

  // ── FINANCE_OFFICER: payments, ledger, holds ──────────────────
  FINANCE_OFFICER: [
    "students.view",
    "enrolments.view",
    "payments.view", "payments.initiate", "payments.export", "payments.hold",
    "ledger.view", "finance.totals.view",
    "refunds.initiate",
    "waivers.initiate",
    "fees.change.initiate",
    "scholarships.initiate",
    "audit.view",
    "reports.view", "reports.financial",
    "claims.review", "claims.second_verify",
    "statements.import", "reconciliation.view",
    "policies.view",
    // DENIED: grades.*, exams.*, certificates.revoke, settings.*
  ],

  // ── HR_SYSTEM_ADMIN: staff records, non-secret settings ───────
  HR_SYSTEM_ADMIN: [
    "students.view",
    "enrolments.view",
    "staff.view", "staff.create.initiate", "staff.suspend.initiate",
    "staff.leave.manage",
    "settings.view", "settings.edit",  // non-secrets only
    "audit.view",
    "reports.view",
    "support.view", "support.manage",
    "policies.view",
    // DENIED: settings.edit.secrets, SUPER_ADMIN/BOARD/AUDITOR creation,
    //         students.create, grades.*, payments.*, certificates.*
  ],

  // ── AUDITOR_READONLY: view everything, edit nothing ───────────
  AUDITOR_READONLY: [
    "students.view", "students.view.contacts",
    "enrolments.view",
    "payments.view", "ledger.view", "finance.totals.view",
    "courses.view",
    "grades.view",
    "attendance.view",
    "certificates.view",
    "graduates.view",
    "transcripts.view",
    "staff.view",
    "audit.view", "audit.view.full", "audit.comment",
    "reports.view", "reports.financial", "reports.academic",
    "policies.view",
    "support.view",
    "settings.view",
    // DENIED: everything that modifies data
  ],

  // ── SYSTEM_IT: technical only, no student or finance data ─────
  SYSTEM_IT: [
    "settings.view", "settings.edit",
    "integrations.edit", "backups.manage", "health.view",
    "audit.view",
    "reports.view",
    "break_glass.request",
    // DENIED: students.*, payments.*, grades.*, certificates.*
  ],

  // ── STUDENT: own learning only ────────────────────────────────
  STUDENT: [
    "courses.view",
    "grades.view",
    "certificates.view",
    "enrolments.view",
    "payments.initiate",
    "claims.submit",
    "transcripts.view",
    "policies.view",
    "attendance.view",
  ],

  // ── Legacy aliases: mirror canonical equivalents ──────────────
  SUPERADMIN: [
    "students.view", "students.create", "students.edit", "students.suspend",
    "students.export", "students.view.contacts",
    "enrolments.view", "enrolments.create", "enrolments.edit",
    "applications.view", "applications.process",
    "payments.view", "payments.initiate", "payments.export", "payments.hold",
    "ledger.view", "finance.totals.view",
    "refunds.initiate", "refunds.approve",
    "waivers.initiate", "waivers.approve",
    "fees.change.initiate", "fees.change.approve",
    "scholarships.initiate", "scholarships.approve",
    "courses.view", "courses.create", "courses.edit", "courses.publish", "courses.delete",
    "content.upload", "content.approve", "lessons.edit",
    "exams.create", "exams.mark", "exams.release",
    "grades.view", "grades.edit",
    "attendance.take", "attendance.view", "attendance.export",
    "classes.manage", "classes.view",
    "certificates.issue", "certificates.revoke", "certificates.view",
    "graduands.prepare", "graduands.approve", "graduates.view",
    "transcripts.view", "transcripts.generate",
    "announcements.send.all", "announcements.send.own",
    "staff.view", "staff.create.initiate", "staff.create.approve",
    "staff.suspend.initiate", "staff.suspend.approve",
    "staff.role.change.approve", "staff.leave.manage",
    "settings.view", "settings.edit", "settings.edit.secrets",
    "integrations.edit", "backups.manage", "health.view",
    "audit.view", "audit.view.full",
    "access_review.view", "access_review.complete",
    "approvals.view", "approvals.decide",
    "reports.view", "reports.financial", "reports.academic", "reports.board",
    "policies.view", "policies.edit",
    "support.view", "support.manage",
    "partner_pages.edit",
    "intakes.manage",
    "break_glass.approve",
    "announcements.manage",
    "claims.submit", "claims.review", "claims.second_verify",
    "statements.import", "reconciliation.view",
  ],
  ADMINISTRATOR: [
    "students.view", "enrolments.view", "applications.view",
    "courses.view", "courses.create", "courses.edit", "courses.publish",
    "content.upload", "lessons.edit", "exams.create",
    "grades.view", "certificates.view", "graduates.view",
    "staff.view", "staff.create.initiate", "staff.suspend.initiate",
    "settings.view", "settings.edit",
    "audit.view", "reports.view", "reports.academic",
    "policies.view", "partner_pages.edit", "scholarships.initiate",
    "attendance.view", "classes.view",
    "intakes.manage",
    "announcements.manage",
  ],
  BURSAR: [
    "students.view", "enrolments.view",
    "payments.view", "payments.initiate", "payments.export", "payments.hold",
    "ledger.view", "finance.totals.view",
    "refunds.initiate", "waivers.initiate", "fees.change.initiate",
    "scholarships.initiate",
    "audit.view", "reports.view", "reports.financial",
    "claims.review", "claims.second_verify",
    "statements.import", "reconciliation.view",
    "policies.view",
  ],
  TUTOR: [
    "students.view", "enrolments.view",
    "courses.view", "courses.edit",
    "content.upload", "content.view.own", "lessons.edit",
    "exams.create", "exams.mark",
    "grades.view", "grades.edit", "grades.view.own",
    "attendance.take", "attendance.view", "attendance.export",
    "classes.manage", "classes.view",
    "certificates.view",
    "announcements.send.own",
    "reports.view", "policies.view",
  ],
  REGISTRAR: [
    "students.view", "students.create", "students.edit", "students.suspend",
    "students.export", "students.view.contacts",
    "enrolments.view", "enrolments.create", "enrolments.edit",
    "applications.view", "applications.process",
    "payments.view", "finance.totals.view",
    "courses.view", "courses.create", "courses.edit",
    "lessons.edit", "exams.create", "exams.mark",
    "grades.view", "grades.edit",
    "attendance.view", "attendance.export",
    "classes.view",
    "certificates.issue", "certificates.view",
    "graduands.prepare", "graduates.view",
    "transcripts.view", "transcripts.generate",
    "announcements.send.all",
    "scholarships.initiate", "waivers.initiate",
    "staff.create.initiate", "staff.suspend.initiate",
    "audit.view", "reports.view", "reports.academic",
    "policies.view",
  ],
  ADMIN: [
    "students.view", "students.create", "students.edit", "students.suspend",
    "students.export", "students.view.contacts",
    "enrolments.view", "enrolments.create", "enrolments.edit",
    "applications.view", "applications.process",
    "courses.view", "courses.create", "courses.edit", "courses.publish",
    "content.upload", "lessons.edit", "exams.create", "exams.mark",
    "grades.view", "grades.edit",
    "attendance.view", "attendance.export",
    "classes.view",
    "certificates.issue", "certificates.view",
    "graduands.prepare", "graduates.view",
    "transcripts.view", "transcripts.generate",
    "announcements.send.all",
    "scholarships.initiate", "waivers.initiate",
    "settings.view", "settings.edit",
    "audit.view", "reports.view", "reports.academic",
    "policies.view", "partner_pages.edit",
  ],
  SPONSOR: ["reports.view"],
  EMPLOYER: [],
};

// ─── Core checks ──────────────────────────────────────────────────────────

export function can(role: UserRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(`Permission denied: ${permission}`);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertNotSelfApproval(initiatorId: string, approverId: string): void {
  if (initiatorId === approverId) {
    throw new ForbiddenError("Initiator cannot approve their own request.");
  }
}

// ─── Portal routing ───────────────────────────────────────────────────────

export function getHomeForRole(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "SUPERADMIN":         return "/director";
    case "BOARD_MEMBER":       return "/board";
    case "PRINCIPAL":          return "/principal";
    case "DEPUTY_PRINCIPAL":   return "/deputy";
    case "ACADEMIC_REGISTRAR":
    case "REGISTRAR":          return "/registrar";
    case "INSTRUCTOR":
    case "TUTOR":              return "/tutor";
    case "TEACHING_ASSISTANT": return "/tutor";
    case "FINANCE_OFFICER":
    case "BURSAR":             return "/finance";
    case "HR_SYSTEM_ADMIN":
    case "ADMINISTRATOR":
    case "ADMIN":              return "/admin";
    case "AUDITOR_READONLY":   return "/auditor";
    case "SYSTEM_IT":          return "/system";
    default:                   return "/dashboard"; // STUDENT
  }
}

export function canAccessPrefix(role: UserRole, prefix: string): boolean {
  const rules: Array<{ prefix: string; roles: UserRole[] }> = [
    { prefix: "/director",  roles: ["SUPER_ADMIN", "SUPERADMIN"] },
    { prefix: "/board",     roles: ["SUPER_ADMIN", "SUPERADMIN", "BOARD_MEMBER"] },
    { prefix: "/principal", roles: ["SUPER_ADMIN", "SUPERADMIN", "PRINCIPAL"] },
    { prefix: "/deputy",    roles: ["SUPER_ADMIN", "SUPERADMIN", "PRINCIPAL", "DEPUTY_PRINCIPAL"] },
    { prefix: "/registrar", roles: ["SUPER_ADMIN", "SUPERADMIN", "PRINCIPAL", "DEPUTY_PRINCIPAL", "ACADEMIC_REGISTRAR", "REGISTRAR"] },
    { prefix: "/admin",     roles: ["SUPER_ADMIN", "SUPERADMIN", "ACADEMIC_REGISTRAR", "REGISTRAR", "ADMINISTRATOR", "ADMIN", "HR_SYSTEM_ADMIN"] },
    { prefix: "/finance",   roles: ["SUPER_ADMIN", "SUPERADMIN", "FINANCE_OFFICER", "BURSAR"] },
    { prefix: "/bursar",    roles: ["SUPER_ADMIN", "SUPERADMIN", "FINANCE_OFFICER", "BURSAR"] }, // legacy redirect
    { prefix: "/tutor",     roles: ["SUPER_ADMIN", "SUPERADMIN", "INSTRUCTOR", "TUTOR", "TEACHING_ASSISTANT", "ACADEMIC_REGISTRAR", "REGISTRAR"] },
    { prefix: "/auditor",   roles: ["SUPER_ADMIN", "SUPERADMIN", "AUDITOR_READONLY"] },
    { prefix: "/system",    roles: ["SUPER_ADMIN", "SUPERADMIN", "SYSTEM_IT"] },
    { prefix: "/dashboard", roles: ["STUDENT", "SPONSOR"] },
  ];
  for (const rule of rules) {
    if (prefix.startsWith(rule.prefix)) {
      return rule.roles.includes(role);
    }
  }
  return false;
}

// ─── SYSTEM_IT audit scoping ──────────────────────────────────────────────

export function auditLogFilterForRole(role: UserRole): Record<string, unknown> | undefined {
  if (role === "SYSTEM_IT") {
    return {
      action: {
        notIn: [
          "PAYMENT_INITIATED", "PAYMENT_CONFIRMED", "PAYMENT_REFUNDED",
          "ENROLMENT_CREATED", "CERTIFICATE_ISSUED",
        ],
      },
    };
  }
  return undefined;
}
