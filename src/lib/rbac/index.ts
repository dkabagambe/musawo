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
  "HR_MANAGER",
  "ADMINISTRATOR",
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

/**
 * Canonical role tree.
 * Levels follow the organogram spec (level 1 = top of normal hierarchy).
 * Labels live in site settings (role.label.*); these keys are the stable identifiers.
 * The tree is also stored in the database via the rbac.roleTree SiteSetting so
 * it can be rendered in the read-only Roles and Permissions page.
 *
 * Hierarchy (per spec):
 *   SUPER_ADMIN (level 1, max 3 accounts)
 *   BOARD_MEMBER (level 1, oversight - read-only)
 *   PRINCIPAL (level 2)
 *   DEPUTY_PRINCIPAL (level 3)
 *     ACADEMIC_REGISTRAR (level 4)
 *       INSTRUCTOR (level 5)
 *         TEACHING_ASSISTANT (level 6)
 *           STUDENT (level 7)
 *     FINANCE_OFFICER (level 4, parallel branch)
 *     HR_MANAGER (level 4, parallel branch)
 *       ADMINISTRATOR (level 5)
 *     AUDITOR_READONLY (level 4, read-only oversight under Deputy Principal)
 *   SYSTEM_IT (technical, outside the chain)
 */
export const ROLE_TREE: Record<
  string,
  { parent: string | null; level: number }
> = {
  SUPER_ADMIN: { parent: null, level: 1 },
  BOARD_MEMBER: { parent: null, level: 1 }, // oversight, read-only
  PRINCIPAL: { parent: "SUPER_ADMIN", level: 2 },
  DEPUTY_PRINCIPAL: { parent: "PRINCIPAL", level: 3 },
  ACADEMIC_REGISTRAR: { parent: "DEPUTY_PRINCIPAL", level: 4 },
  FINANCE_OFFICER: { parent: "DEPUTY_PRINCIPAL", level: 4 }, // parallel branch
  HR_MANAGER: { parent: "DEPUTY_PRINCIPAL", level: 4 }, // parallel branch
  ADMINISTRATOR: { parent: "HR_MANAGER", level: 5 },
  AUDITOR_READONLY: { parent: "DEPUTY_PRINCIPAL", level: 4 }, // read-only oversight
  INSTRUCTOR: { parent: "ACADEMIC_REGISTRAR", level: 5 },
  TEACHING_ASSISTANT: { parent: "INSTRUCTOR", level: 6 },
  STUDENT: { parent: "TEACHING_ASSISTANT", level: 7 },
  SYSTEM_IT: { parent: null, level: 1 }, // technical, outside chain
};

const ROLE_ALIASES: Partial<Record<UserRole, UserRole>> = {
  SUPERADMIN: "SUPER_ADMIN",
  HR_SYSTEM_ADMIN: "HR_MANAGER",
  ADMIN: "HR_MANAGER",
  BURSAR: "FINANCE_OFFICER",
  TUTOR: "INSTRUCTOR",
  REGISTRAR: "ACADEMIC_REGISTRAR",
};

const FINANCE_DETAIL_PERMISSIONS: Permission[] = [
  "payments.view",
  "payments.initiate",
  "payments.export",
  "payments.hold",
  "ledger.view",
  "refunds.initiate",
  "refunds.approve",
  "waivers.initiate",
  "waivers.approve",
  "fees.change.initiate",
  "fees.change.approve",
  "claims.review",
  "claims.second_verify",
  "statements.import",
  "reconciliation.view",
  "reports.financial",
];

const OPERATIONAL_ADMIN_PERMISSIONS: Permission[] = [
  "support.manage",
  "invites.resend",
  "password_reset.send",
  "students.lookup",
  "venues.manage",
  "bookings.manage",
  "practicals.manage",
  "attendance.sheets.view",
  "operational_notices.manage",
  "equipment.manage",
  "settings.edit.operational",
  "reports.operational",
];

const ROLE_PERMISSION_DENIES: Partial<Record<UserRole, Permission[]>> = {
  SUPER_ADMIN: ["classes.join"],
  BOARD_MEMBER: ["classes.join", "settings.view", "audit.view"],
  PRINCIPAL: [
    ...FINANCE_DETAIL_PERMISSIONS,
    ...OPERATIONAL_ADMIN_PERMISSIONS,
    "claims.submit",
    "classes.join",
    "settings.view",
    "settings.edit",
    "settings.edit.secrets",
    "staff.create.initiate",
    "staff.suspend.initiate",
    "staff.leave.manage",
    // Board documents are BOARD_MEMBER / AUDITOR_READONLY / SUPER_ADMIN only.
    "board_documents.view",
    "audit.comment",
  ],
  DEPUTY_PRINCIPAL: [
    ...FINANCE_DETAIL_PERMISSIONS,
    ...OPERATIONAL_ADMIN_PERMISSIONS,
    "claims.submit",
    "classes.join",
    "courses.delete",
    "courses.publish",
    "exams.release",
    "graduands.approve",
    "certificates.issue",
    "settings.view",
    "settings.edit",
    "settings.edit.secrets",
    "staff.create.initiate",
    "staff.suspend.initiate",
    "staff.leave.manage",
    // AUDITOR_READONLY is a child for oversight purposes only; its read-only audit
    // superpowers do NOT flow up the line to Deputy Principal or Academic Registrar.
    "audit.view",
    "audit.view.full",
    "audit.comment",
    // Marks-change approval is PRINCIPAL only by default; delegation unlocks it at runtime.
    "marks.change.approve",
    // Board documents are BOARD_MEMBER / AUDITOR_READONLY / SUPER_ADMIN only.
    "board_documents.view",
  ],
  ACADEMIC_REGISTRAR: [
    "classes.join",
    "payments.view",
    "payments.initiate",
    "payments.export",
    "payments.hold",
    "ledger.view",
    "claims.submit",
    "exams.release",
    "graduands.approve",
    "certificates.revoke",
    // Same safeguard: AUDITOR_READONLY's read-only audit permissions don't inherit down.
    "audit.view",
    "audit.view.full",
    "audit.comment",
  ],
  INSTRUCTOR: ["classes.join", "payments.initiate", "claims.submit", "learning.self.view"],
  TEACHING_ASSISTANT: ["classes.join", "payments.initiate", "claims.submit", "learning.self.view"],
  FINANCE_OFFICER: ["classes.join"],
  HR_SYSTEM_ADMIN: ["classes.join"],
  AUDITOR_READONLY: ["classes.join"],
  SYSTEM_IT: ["classes.join"],
};

// ─── Permission definitions ────────────────────────────────────────────────

export type Permission =
  // Students / Enrolments
  | "students.view"
  | "students.create"
  | "students.edit"
  | "students.suspend"
  | "students.export"
  | "students.view.contacts" // contact details hidden from BOARD_MEMBER
  | "enrolments.view"
  | "enrolments.create"
  | "enrolments.edit"
  | "applications.view"
  | "applications.process" // create account from application

  // Finance - ACADEMIC roles and INSTRUCTOR must NEVER see these
  | "payments.view"
  | "payments.initiate"
  | "payments.export"
  | "payments.hold" // FINANCE_OFFICER can place/lift payment holds
  | "ledger.view"
  | "refunds.initiate"
  | "refunds.approve" // SUPER_ADMIN only
  | "waivers.initiate"
  | "waivers.approve" // SUPER_ADMIN only
  | "fees.change.initiate"
  | "fees.change.approve" // SUPER_ADMIN only
  | "finance.totals.view" // PRINCIPAL sees totals only

  // Courses / Content
  | "courses.view"
  | "courses.create" // ACADEMIC_REGISTRAR creates draft; PRINCIPAL approves
  | "courses.edit"
  | "courses.publish" // PRINCIPAL approves and publishes
  | "courses.delete"
  | "content.upload" // INSTRUCTOR uploads materials
  | "content.approve" // PRINCIPAL approves content
  | "content.view.own" // INSTRUCTOR sees own courses only
  | "lessons.edit"

  // Exams and results
  | "exams.create"
  | "exams.mark"
  | "exams.release" // PRINCIPAL publishes final results
  | "grades.view"
  | "grades.edit"
  | "grades.view.own" // INSTRUCTOR sees own course grades

  // Attendance and roll call
  | "attendance.take" // INSTRUCTOR or TEACHING_ASSISTANT
  | "attendance.view"
  | "attendance.view.all"
  | "attendance.export"

  // Live classes
  | "classes.manage" // create, start, stop, admit
  | "classes.view"
  | "classes.join" // enrolled student requests entry to a live class

  // Certificates and graduands
  | "certificates.issue"
  | "certificates.revoke" // SUPER_ADMIN only
  | "certificates.view"
  | "graduands.prepare" // ACADEMIC_REGISTRAR prepares list
  | "graduands.approve" // PRINCIPAL approves
  | "graduates.view" // access to graduates register

  // Transcripts
  | "transcripts.view"
  | "transcripts.generate"

  // Announcements
  | "announcements.send.all" // PRINCIPAL, DEPUTY_PRINCIPAL, ACADEMIC_REGISTRAR
  | "announcements.send.own" // INSTRUCTOR to own classes

  // Messaging
  | "messaging.students.own" // INSTRUCTOR chats with own students

  // Staff accounts
  | "staff.view"
  | "staff.create.initiate" // HR_SYSTEM_ADMIN or SUPER_ADMIN
  | "staff.create.approve" // SUPER_ADMIN only
  | "staff.suspend.initiate"
  | "staff.suspend.approve" // SUPER_ADMIN only
  | "staff.role.change.approve" // SUPER_ADMIN only
  | "staff.leave.manage" // HR_SYSTEM_ADMIN

  // Settings
  | "settings.view"
  | "settings.edit" // HR_SYSTEM_ADMIN for non-secret; SUPER_ADMIN for all
  | "settings.edit.public" // SUPER_ADMIN or SYSTEM_IT for public-facing system data
  | "settings.edit.secrets" // SUPER_ADMIN and SYSTEM_IT

  // Integrations / infra
  | "integrations.edit" // SYSTEM_IT
  | "backups.manage"
  | "health.view"

  // Audit and compliance
  | "audit.view" // filtered per role
  | "audit.view.full" // SUPER_ADMIN only; AUDITOR_READONLY also full
  | "audit.comment" // AUDITOR_READONLY can add flags/comments
  | "access_review.view"
  | "access_review.complete" // SUPER_ADMIN only

  // Approvals
  | "approvals.view"
  | "approvals.decide" // SUPER_ADMIN only

  // Intakes
  | "intakes.manage" // ACADEMIC_REGISTRAR creates, PRINCIPAL approves

  // Break-glass access
  | "break_glass.request" // SYSTEM_IT requests temporary data access
  | "break_glass.approve" // SUPER_ADMIN approves break-glass

  // Reports
  | "reports.view"
  | "reports.financial" // FINANCE_OFFICER + SUPER_ADMIN
  | "reports.academic"
  | "reports.board" // aggregates only, no individual student data

  // Policies
  | "policies.view"
  | "policies.edit" // PRINCIPAL or SUPER_ADMIN

  // Announcements (internal only, never public)
  | "announcements.manage" // send to all or own class

  // Support / complaints
  | "support.view"
  | "support.submit"
  | "support.manage"
  | "complaints.manage"
  | "learning.self.view"
  | "invites.resend"
  | "password_reset.send"
  | "students.lookup"
  | "venues.manage"
  | "bookings.manage"
  | "practicals.manage"
  | "attendance.sheets.view"
  | "operational_notices.manage"
  | "equipment.manage"
  | "settings.edit.operational"
  | "reports.operational"
  | "staff.access_review"

  // Partner pages
  | "partner_pages.edit"

  // Board documents (Institution Secretary only)
  | "policies.manage" // edit and version policies (Institution Secretary BOARD_MEMBER)
  | "board_documents.manage" // manage board-level documents
  | "board_documents.view" // read board documents (all BOARD_MEMBER + SUPER_ADMIN + AUDITOR)

  // Marks change after release (Batch D / section 1 spec)
  | "marks.change.request" // INSTRUCTOR or ACADEMIC_REGISTRAR requests a change after release
  | "marks.change.approve" // PRINCIPAL (or DEPUTY when delegated) approves it; SUPER_ADMIN always can

  // Manual payment claims
  | "claims.submit"
  | "claims.review"
  | "claims.second_verify"
  | "statements.import"
  | "reconciliation.view";

// ─── Role -> permission map ────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // ── SUPER_ADMIN: full access, final approver ──────────────────
  SUPER_ADMIN: [
    "students.view",
    "students.create",
    "students.edit",
    "students.suspend",
    "students.export",
    "students.view.contacts",
    "enrolments.view",
    "enrolments.create",
    "enrolments.edit",
    "applications.view",
    "applications.process",
    "payments.view",
    "payments.initiate",
    "payments.export",
    "payments.hold",
    "ledger.view",
    "finance.totals.view",
    "refunds.initiate",
    "refunds.approve",
    "waivers.initiate",
    "waivers.approve",
    "fees.change.initiate",
    "fees.change.approve",
    "courses.view",
    "courses.create",
    "courses.edit",
    "courses.publish",
    "courses.delete",
    "content.upload",
    "content.approve",
    "content.view.own",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "exams.release",
    "grades.view",
    "grades.edit",
    "grades.view.own",
    "attendance.take",
    "attendance.view",
    "attendance.view.all",
    "attendance.export",
    "classes.manage",
    "classes.view",
    "certificates.issue",
    "certificates.revoke",
    "certificates.view",
    "graduands.prepare",
    "graduands.approve",
    "graduates.view",
    "transcripts.view",
    "transcripts.generate",
    "announcements.send.all",
    "announcements.send.own",
    "messaging.students.own",
    "staff.view",
    "staff.create.initiate",
    "staff.create.approve",
    "staff.suspend.initiate",
    "staff.suspend.approve",
    "staff.role.change.approve",
    "staff.leave.manage",
    "settings.view",
    "settings.edit",
    "settings.edit.public",
    "settings.edit.secrets",
    "integrations.edit",
    "backups.manage",
    "health.view",
    "audit.view",
    "audit.view.full",
    "audit.comment",
    "access_review.view",
    "access_review.complete",
    "approvals.view",
    "approvals.decide",
    "reports.view",
    "reports.financial",
    "reports.academic",
    "reports.board",
    "policies.view",
    "policies.edit",
    "policies.manage",
    "board_documents.manage",
    "support.submit",
    "support.view",
    "support.manage",
    "complaints.manage",
    ...OPERATIONAL_ADMIN_PERMISSIONS,
    "partner_pages.edit",
    "intakes.manage",
    "break_glass.approve",
    "break_glass.request",
    "announcements.manage",
    "claims.submit",
    "claims.review",
    "claims.second_verify",
    "statements.import",
    "reconciliation.view",
    "marks.change.request",
    "marks.change.approve",
    "board_documents.manage",
    "board_documents.view",
  ],
  // The Institution Secretary account also gets policies.manage and
  // board_documents.manage (granted via the institutionSecretary flag in
  // seed data; checked with canFor(user, "policies.manage")).
  BOARD_MEMBER: [
    "reports.view",
    "reports.board",
    "support.submit",
    "policies.view",
    "graduates.view", // names, course, year only (scoped in query)
    "board_documents.view", // read board documents
    // Institution Secretary extensions (granted at account level, not role level):
    //   policies.manage, board_documents.manage
    // Explicitly DENIED: students.view.contacts, payments.*, finance.*, grades.*
  ],

  // ── PRINCIPAL: academic head, approver ────────────────────────
  PRINCIPAL: [
    "students.view",
    "students.export",
    "students.view.contacts",
    "enrolments.view",
    "applications.view",
    "finance.totals.view", // read-only finance visibility
    "courses.view",
    "courses.create",
    "courses.edit",
    "courses.publish",
    "courses.delete",
    "content.approve",
    "content.upload",
    "exams.mark",
    "exams.release",
    "grades.view",
    "attendance.view",
    "attendance.view.all",
    "attendance.export",
    "classes.view",
    "certificates.issue",
    "certificates.view",
    "graduands.prepare",
    "graduands.approve",
    "graduates.view",
    "transcripts.view",
    "announcements.send.all",
    "staff.view",
    "audit.view",
    "audit.view.full",
    "reports.view",
    "reports.academic",
    "policies.view",
    "policies.edit",
    "support.view",
    "support.submit",
    "complaints.manage",
    "approvals.view",
    "marks.change.approve", // Principal approves marks-change requests after release
    // DENIED: payments.hold, payments.initiate, refunds.*, ledger.view, settings.edit
  ],

  // ── DEPUTY_PRINCIPAL: daily operations, delegates from Principal
  DEPUTY_PRINCIPAL: [
    "students.view",
    "students.export",
    "students.view.contacts",
    "enrolments.view",
    "applications.view",
    "finance.totals.view", // read-only finance visibility
    "courses.view",
    "content.approve",
    "content.upload", // when Principal delegates
    "exams.mark",
    "grades.view",
    "attendance.view",
    "attendance.view.all",
    "attendance.export",
    "classes.view",
    "certificates.view",
    "graduates.view",
    "transcripts.view",
    "announcements.send.all",
    "staff.view",
    "audit.view",
    "reports.view",
    "reports.academic",
    "policies.view",
    "support.view",
    "support.submit",
    "complaints.manage",
    // DENIED: exams.release, graduands.approve, certificates.issue, policies.edit,
    //         payments.hold, payments.initiate, refunds.*, ledger.view, settings.edit
  ],

  // ── ACADEMIC_REGISTRAR: student records, enrolments, academic calendar
  ACADEMIC_REGISTRAR: [
    "students.view",
    "students.create",
    "students.edit",
    "students.suspend",
    "students.export",
    "students.view.contacts",
    "enrolments.view",
    "enrolments.create",
    "enrolments.edit",
    "applications.view",
    "applications.process",
    "finance.totals.view", // payment status totals only -- NOT payments.view (no ledger access)
    "intakes.manage",
    "courses.view",
    "courses.create",
    "courses.edit",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "grades.view",
    "grades.edit",
    "attendance.view",
    "attendance.view.all",
    "attendance.export",
    "classes.view",
    "certificates.issue",
    "certificates.view",
    "graduands.prepare",
    "graduates.view",
    "transcripts.view",
    "transcripts.generate",
    "announcements.send.all",
    "announcements.manage",
    "audit.view",
    "reports.view",
    "reports.academic",
    "policies.view",
    "support.view",
    "support.submit",
    "marks.change.request", // Registrar can also request a mark change; Principal approves
    // DENIED: exams.release, graduands.approve, certificates.revoke, payments.hold
  ],

  // ── INSTRUCTOR: own courses only ──────────────────────────────
  INSTRUCTOR: [
    "students.view", // own students only (scoped in query)
    "enrolments.view",
    "courses.view", // own courses only
    "courses.edit", // own courses only
    "content.upload",
    "content.view.own",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "grades.view",
    "grades.edit",
    "grades.view.own",
    "attendance.take",
    "attendance.view",
    "attendance.export",
    "classes.manage",
    "classes.view",
    "certificates.view",
    "transcripts.view", // own students only
    "announcements.send.own",
    "messaging.students.own",
    "reports.view",
    "policies.view",
    "support.submit",
    "marks.change.request", // can request a change to a released mark (Principal must approve)
    // DENIED: payments.*, finance.*, students.view.contacts (full), other instructors' data
  ],

  // ── TEACHING_ASSISTANT: limited upload and roll-call ──────────
  TEACHING_ASSISTANT: [
    "students.view",
    "enrolments.view",
    "courses.view",
    "content.upload", // help upload materials
    "attendance.take",
    "classes.view",
    "policies.view",
    "support.submit",
    // DENIED: grades.edit, exams.*, payments.*, certificates.*
  ],

  // ── FINANCE_OFFICER: payments, ledger, holds ──────────────────
  FINANCE_OFFICER: [
    "students.view",
    "enrolments.view",
    "payments.view",
    "payments.initiate",
    "payments.export",
    "payments.hold",
    "ledger.view",
    "finance.totals.view",
    "refunds.initiate",
    "waivers.initiate",
    "fees.change.initiate",
    "audit.view",
    "reports.view",
    "reports.financial",
    "claims.review",
    "claims.second_verify",
    "statements.import",
    "reconciliation.view",
    "policies.view",
    "support.submit",
    // DENIED: grades.*, exams.*, certificates.revoke, settings.*
  ],

  // ── HR_MANAGER: staff records and access review ───────────────
  HR_MANAGER: [
    "staff.view",
    "staff.create.initiate",
    "staff.suspend.initiate",
    "staff.leave.manage",
    "staff.access_review",
    "reports.view",
    "support.view",
    "support.submit",
    "policies.view",
    // Operational actions are inherited from the ADMINISTRATOR child role.
    // DENIED: settings.edit.secrets, SUPER_ADMIN/BOARD/AUDITOR creation,
    //         students.create, grades.*, payments.*, certificates.*
  ],

  // ── ADMINISTRATOR: day-to-day operational services ────────────
  ADMINISTRATOR: [
    "support.manage",
    "invites.resend",
    "password_reset.send",
    "students.lookup",
    "venues.manage",
    "bookings.manage",
    "practicals.manage",
    "attendance.sheets.view",
    "operational_notices.manage",
    "equipment.manage",
    "settings.edit.operational",
    "reports.operational",
    "support.submit",
    "policies.view",
  ],

  // ── AUDITOR_READONLY: view everything, edit nothing ───────────
  AUDITOR_READONLY: [
    "students.view",
    "students.view.contacts",
    "enrolments.view",
    "payments.view",
    "ledger.view",
    "finance.totals.view",
    "courses.view",
    "grades.view",
    "attendance.view",
    "certificates.view",
    "graduates.view",
    "transcripts.view",
    "staff.view",
    "audit.view",
    "audit.view.full",
    "audit.comment",
    "reports.view",
    "reports.financial",
    "reports.academic",
    "policies.view",
    "support.view",
    "support.submit",
    "board_documents.view", // read board documents; every view logged
    // DENIED: everything that modifies data
  ],

  // ── SYSTEM_IT: technical only, no student or finance data ─────
  SYSTEM_IT: [
    "settings.view",
    "settings.edit",
    "settings.edit.public",
    "settings.edit.secrets",
    "integrations.edit",
    "backups.manage",
    "health.view",
    "audit.view",
    "reports.view",
    "support.submit",
    "break_glass.request",
    // DENIED: students.*, payments.*, grades.*, certificates.*
  ],

  // ── STUDENT: own learning only ────────────────────────────────
  STUDENT: [
    "learning.self.view",
    "support.submit",
    "classes.join",
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
    "students.view",
    "students.create",
    "students.edit",
    "students.suspend",
    "students.export",
    "students.view.contacts",
    "enrolments.view",
    "enrolments.create",
    "enrolments.edit",
    "applications.view",
    "applications.process",
    "payments.view",
    "payments.initiate",
    "payments.export",
    "payments.hold",
    "ledger.view",
    "finance.totals.view",
    "refunds.initiate",
    "refunds.approve",
    "waivers.initiate",
    "waivers.approve",
    "fees.change.initiate",
    "fees.change.approve",
    "courses.view",
    "courses.create",
    "courses.edit",
    "courses.publish",
    "courses.delete",
    "content.upload",
    "content.approve",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "exams.release",
    "grades.view",
    "grades.edit",
    "attendance.take",
    "attendance.view",
    "attendance.export",
    "classes.manage",
    "classes.view",
    "certificates.issue",
    "certificates.revoke",
    "certificates.view",
    "graduands.prepare",
    "graduands.approve",
    "graduates.view",
    "transcripts.view",
    "transcripts.generate",
    "announcements.send.all",
    "announcements.send.own",
    "staff.view",
    "staff.create.initiate",
    "staff.create.approve",
    "staff.suspend.initiate",
    "staff.suspend.approve",
    "staff.role.change.approve",
    "staff.leave.manage",
    "settings.view",
    "settings.edit",
    "settings.edit.secrets",
    "integrations.edit",
    "backups.manage",
    "health.view",
    "audit.view",
    "audit.view.full",
    "access_review.view",
    "access_review.complete",
    "approvals.view",
    "approvals.decide",
    "reports.view",
    "reports.financial",
    "reports.academic",
    "reports.board",
    "policies.view",
    "policies.edit",
    "policies.manage",
    "board_documents.manage",
    "support.view",
    "support.manage",
    "partner_pages.edit",
    "intakes.manage",
    "break_glass.approve",
    "announcements.manage",
    "claims.submit",
    "claims.review",
    "claims.second_verify",
    "statements.import",
    "reconciliation.view",
  ],
  HR_SYSTEM_ADMIN: [
    "students.view",
    "enrolments.view",
    "applications.view",
    "courses.view",
    "courses.create",
    "courses.edit",
    "courses.publish",
    "content.upload",
    "lessons.edit",
    "exams.create",
    "grades.view",
    "certificates.view",
    "graduates.view",
    "staff.view",
    "staff.create.initiate",
    "staff.suspend.initiate",
    "settings.view",
    "settings.edit",
    "audit.view",
    "reports.view",
    "reports.academic",
    "policies.view",
    "partner_pages.edit",
    "attendance.view",
    "classes.view",
    "intakes.manage",
    "announcements.manage",
  ],
  BURSAR: [
    "students.view",
    "enrolments.view",
    "payments.view",
    "payments.initiate",
    "payments.export",
    "payments.hold",
    "ledger.view",
    "finance.totals.view",
    "refunds.initiate",
    "waivers.initiate",
    "fees.change.initiate",
    "audit.view",
    "reports.view",
    "reports.financial",
    "claims.review",
    "claims.second_verify",
    "statements.import",
    "reconciliation.view",
    "policies.view",
  ],
  TUTOR: [
    "students.view",
    "enrolments.view",
    "courses.view",
    "courses.edit",
    "content.upload",
    "content.view.own",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "grades.view",
    "grades.edit",
    "grades.view.own",
    "attendance.take",
    "attendance.view",
    "attendance.export",
    "classes.manage",
    "classes.view",
    "certificates.view",
    "announcements.send.own",
    "reports.view",
    "policies.view",
  ],
  REGISTRAR: [
    "students.view",
    "students.create",
    "students.edit",
    "students.suspend",
    "students.export",
    "students.view.contacts",
    "enrolments.view",
    "enrolments.create",
    "enrolments.edit",
    "applications.view",
    "applications.process",
    "payments.view",
    "finance.totals.view",
    "courses.view",
    "courses.create",
    "courses.edit",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "grades.view",
    "grades.edit",
    "attendance.view",
    "attendance.export",
    "classes.view",
    "certificates.issue",
    "certificates.view",
    "graduands.prepare",
    "graduates.view",
    "transcripts.view",
    "transcripts.generate",
    "announcements.send.all",
    "waivers.initiate",
    "staff.create.initiate",
    "staff.suspend.initiate",
    "audit.view",
    "reports.view",
    "reports.academic",
    "policies.view",
  ],
  ADMIN: [
    "students.view",
    "students.create",
    "students.edit",
    "students.suspend",
    "students.export",
    "students.view.contacts",
    "enrolments.view",
    "enrolments.create",
    "enrolments.edit",
    "applications.view",
    "applications.process",
    "courses.view",
    "courses.create",
    "courses.edit",
    "courses.publish",
    "content.upload",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "grades.view",
    "grades.edit",
    "attendance.view",
    "attendance.export",
    "classes.view",
    "certificates.issue",
    "certificates.view",
    "graduands.prepare",
    "graduates.view",
    "transcripts.view",
    "transcripts.generate",
    "announcements.send.all",
    "waivers.initiate",
    "settings.view",
    "settings.edit",
    "audit.view",
    "reports.view",
    "reports.academic",
    "policies.view",
    "partner_pages.edit",
  ],
  SPONSOR: ["reports.view"],
  EMPLOYER: [],
};

// ─── Core checks ──────────────────────────────────────────────────────────

/**
 * Returns all roles in the tree that are equal to `role` or are descendants
 * (i.e., roles whose ancestor chain passes through `role`).
 * Used for permission inheritance: a senior role inherits all permissions
 * defined on roles beneath it in its own branch.
 */
export function getInheritedRolesFor(role: UserRole): UserRole[] {
  const canonicalRole = ROLE_ALIASES[role] ?? role;
  return Object.keys(ROLE_TREE).filter((candidate) => {
    if (candidate === canonicalRole) return true;
    let parent = ROLE_TREE[candidate]?.parent ?? null;
    while (parent) {
      if (parent === canonicalRole) return true;
      parent = ROLE_TREE[parent]?.parent ?? null;
    }
    return false;
  }) as UserRole[];
}

export function can(role: UserRole, permission: Permission): boolean {
  const canonicalRole = ROLE_ALIASES[role] ?? role;
  if ((ROLE_PERMISSION_DENIES[canonicalRole] ?? []).includes(permission))
    return false;
  if (canonicalRole === "SUPER_ADMIN") {
    return Object.values(ROLE_PERMISSIONS).some((permissions) =>
      permissions.includes(permission),
    );
  }

  const inheritedRoles = getInheritedRolesFor(role);
  return inheritedRoles.some((inheritedRole) =>
    (ROLE_PERMISSIONS[inheritedRole] ?? []).includes(permission),
  );
}

const ACCOUNT_RECOVERY_BLOCKED_PERMISSIONS: Permission[] = [
  "approvals.decide",
  "reports.board",
  "audit.view.full",
  "payments.view",
];

export function canManageAccountRecoveryTarget(role: UserRole): boolean {
  return !ACCOUNT_RECOVERY_BLOCKED_PERMISSIONS.some((permission) =>
    can(role, permission),
  );
}

/**
 * Returns the role via which permission is granted (for audit log "via role X").
 * Returns null if permission is denied.
 * For SUPER_ADMIN always returns "SUPER_ADMIN".
 */
export function canVia(
  role: UserRole,
  permission: Permission,
): UserRole | null {
  if (!can(role, permission)) return null;
  const canonicalRole = ROLE_ALIASES[role] ?? role;
  if (canonicalRole === "SUPER_ADMIN") return "SUPER_ADMIN";
  // If the role's own permission list grants it, return the role itself
  if ((ROLE_PERMISSIONS[canonicalRole] ?? []).includes(permission))
    return canonicalRole;
  // Otherwise find the most specific inherited role that grants it
  const inheritedRoles = getInheritedRolesFor(role).filter(
    (r) =>
      r !== canonicalRole && (ROLE_PERMISSIONS[r] ?? []).includes(permission),
  );
  // Sort by level ascending to return the highest-level (most specific ancestor) granter
  inheritedRoles.sort(
    (a, b) => (ROLE_TREE[b]?.level ?? 0) - (ROLE_TREE[a]?.level ?? 0),
  );
  return (inheritedRoles[0] as UserRole) ?? canonicalRole;
}

/**
 * Checks a permission for a user including account-level grants.
 * The `institutionSecretary` flag on a BOARD_MEMBER account grants
 * policies.manage and board_documents.manage without changing the role.
 */
export function canForUser(
  role: UserRole,
  permission: Permission,
  userFlags?: { institutionSecretary?: boolean },
): boolean {
  if (userFlags?.institutionSecretary && role === "BOARD_MEMBER") {
    if (
      permission === "policies.manage" ||
      permission === "board_documents.manage"
    )
      return true;
  }
  return can(role, permission);
}

export function requirePermission(
  role: UserRole,
  permission: Permission,
): void {
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

export function assertNotSelfApproval(
  initiatorId: string,
  approverId: string,
): void {
  if (initiatorId === approverId) {
    throw new ForbiddenError("Initiator cannot approve their own request.");
  }
}

// ─── Portal routing ───────────────────────────────────────────────────────

export function getHomeForRole(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "SUPERADMIN":
      return "/director";
    case "BOARD_MEMBER":
      return "/board";
    case "PRINCIPAL":
      return "/principal";
    case "DEPUTY_PRINCIPAL":
      return "/deputy";
    case "ACADEMIC_REGISTRAR":
    case "REGISTRAR":
      return "/registrar";
    case "INSTRUCTOR":
    case "TUTOR":
      return "/tutor";
    case "TEACHING_ASSISTANT":
      return "/tutor";
    case "FINANCE_OFFICER":
    case "BURSAR":
      return "/finance";
    case "HR_SYSTEM_ADMIN":
    case "HR_MANAGER":
    case "ADMINISTRATOR":
    case "ADMIN":
      return "/admin";
    case "AUDITOR_READONLY":
      return "/auditor";
    case "SYSTEM_IT":
      return "/system";
    default:
      return "/dashboard"; // STUDENT
  }
}

export function canAccessPrefix(role: UserRole, prefix: string): boolean {
  const rules: Array<{ prefix: string; permissions: Permission[] }> = [
    { prefix: "/director", permissions: ["approvals.decide"] },
    { prefix: "/board", permissions: ["reports.board"] },
    { prefix: "/principal", permissions: ["courses.publish"] },
    { prefix: "/deputy", permissions: ["complaints.manage", "support.view"] },
    { prefix: "/registrar", permissions: ["applications.process"] },
    {
      prefix: "/admin",
      permissions: [
        "staff.view",
        "support.manage",
        "settings.edit.operational",
        "students.lookup",
      ],
    },
    { prefix: "/finance", permissions: ["payments.view"] },
    { prefix: "/bursar", permissions: ["payments.hold"] },
    { prefix: "/tutor", permissions: ["classes.view"] },
    { prefix: "/auditor", permissions: ["audit.view.full"] },
    { prefix: "/system", permissions: ["integrations.edit"] },
    { prefix: "/dashboard", permissions: ["learning.self.view"] },
  ];
  for (const rule of rules) {
    if (prefix.startsWith(rule.prefix)) {
      return rule.permissions.some((permission) => can(role, permission));
    }
  }
  return false;
}

// ─── SYSTEM_IT audit scoping ──────────────────────────────────────────────

export function auditLogFilterForRole(
  role: UserRole,
): Record<string, unknown> | undefined {
  if (role === "SYSTEM_IT") {
    return {
      action: {
        notIn: [
          "PAYMENT_INITIATED",
          "PAYMENT_CONFIRMED",
          "PAYMENT_REFUNDED",
          "ENROLMENT_CREATED",
          "CERTIFICATE_ISSUED",
        ],
      },
    };
  }
  return undefined;
}

// ─── Delegation helper ────────────────────────────────────────────────────────
/**
 * Permissions the Principal may delegate to the Deputy Principal via a
 * time-limited site setting ("delegation.*").
 *
 * How it works:
 * 1. PRINCIPAL (or SUPER_ADMIN) sets a SiteSetting key such as
 *      "delegation.exams.release"  value: ISO-8601 expiry datetime
 * 2. Before checking `can(DEPUTY_PRINCIPAL, permission)` on a delegation-
 *    guarded action, call `isDelegatedToDeputy(permission, siteSettings)`.
 *    If true, bypass the normal deny and allow the action.
 * 3. Delegation is logged with AuditAction.DELEGATION_GRANTED and expires
 *    automatically when the timestamp passes.
 *
 * The API route /api/principal/delegation handles granting and revoking.
 * Delegatable permissions (spec: exams.release, graduands.approve,
 * certificates.issue, courses.publish, marks.change.approve).
 */
export const DELEGATABLE_TO_DEPUTY: Permission[] = [
  "exams.release",
  "graduands.approve",
  "certificates.issue",
  "courses.publish",
  "marks.change.approve",
];

export type DelegationSettings = Partial<Record<string, string>>; // key -> ISO expiry

/**
 * Returns true when `permission` has been delegated to the Deputy Principal
 * and the delegation has not yet expired.
 *
 * @param permission  The permission to check.
 * @param settings    A map of site-setting key -> value, sourced from the DB.
 *                    The relevant keys are `delegation.<permission>`.
 */
export function isDelegatedToDeputy(
  permission: Permission,
  settings: DelegationSettings,
): boolean {
  if (!DELEGATABLE_TO_DEPUTY.includes(permission)) return false;
  const key = `delegation.${permission}`;
  const expiry = settings[key];
  if (!expiry) return false;
  return new Date(expiry) > new Date();
}

/**
 * Checks whether a DEPUTY_PRINCIPAL may perform `permission`, taking active
 * delegations into account.  Pass this in place of `can()` in the relevant
 * approval/results/graduands/certificates handlers.
 *
 * Example:
 *   const settings = await getDelegationSettings(db);
 *   if (!canDeputyWithDelegation("exams.release", settings)) return forbidden();
 */
export function canDeputyWithDelegation(
  permission: Permission,
  settings: DelegationSettings,
): boolean {
  // Fast path: delegation is active
  if (isDelegatedToDeputy(permission, settings)) return true;
  // Normal RBAC check (will return false for delegatable-but-not-delegated)
  return can("DEPUTY_PRINCIPAL", permission);
}

/**
 * Fetches the delegation SiteSettings from the database.
 * Import `db` and call this at the top of any handler that uses delegation.
 */
export async function getDelegationSettings(db: {
  siteSetting: {
    findMany: (args: {
      where: { key: { startsWith: string } };
    }) => Promise<Array<{ key: string; value: string }>>;
  };
}): Promise<DelegationSettings> {
  const rows = await db.siteSetting.findMany({
    where: { key: { startsWith: "delegation." } },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
