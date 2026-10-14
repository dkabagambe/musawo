/**
 * RBAC - central permissions library.
 *
 * Design principles:
 * - Default DENY: every check must be explicitly allowed.
 * - Server-side only: never trust role from client.
 * - Separation of duties: declared here, enforced everywhere.
 * - Data scoping helpers: each role sees only what it should.
 */

import type { UserRole } from "@prisma/client";

// ─── Role hierarchy helpers ────────────────────────────────────────────────

export const STAFF_ROLES: UserRole[] = [
  "SUPERADMIN",
  "SYSTEM_IT",
  "REGISTRAR",
  "BURSAR",
  "TUTOR",
  "ADMIN", // legacy alias → treat as REGISTRAR
];

export const SUPERADMIN_ROLES: UserRole[] = ["SUPERADMIN"];

export const FINANCE_ROLES: UserRole[] = ["SUPERADMIN", "BURSAR"];

export const ACADEMIC_ROLES: UserRole[] = [
  "SUPERADMIN",
  "REGISTRAR",
  "TUTOR",
  "ADMIN",
];

export const MAX_SUPERADMIN_ACCOUNTS = 3;

// ─── Permission definitions ────────────────────────────────────────────────

export type Permission =
  // Students / Enrolments
  | "students.view"
  | "students.create"
  | "students.edit"
  | "students.suspend"
  | "students.export"
  | "enrolments.view"
  | "enrolments.create"
  | "enrolments.edit"

  // Finance - REGISTRAR & TUTOR must NEVER see these
  | "payments.view"
  | "payments.initiate"
  | "payments.export"
  | "ledger.view"
  | "refunds.initiate"      // BURSAR can initiate, SUPERADMIN approves
  | "refunds.approve"       // SUPERADMIN only
  | "waivers.initiate"      // BURSAR/REGISTRAR initiate, SUPERADMIN approves
  | "waivers.approve"       // SUPERADMIN only
  | "fees.change.initiate"  // BURSAR initiates
  | "fees.change.approve"   // SUPERADMIN only
  | "scholarships.initiate" // REGISTRAR/BURSAR initiate
  | "scholarships.approve"  // SUPERADMIN only

  // Courses / Academics
  | "courses.view"
  | "courses.create"
  | "courses.edit"
  | "courses.publish"
  | "courses.delete"
  | "lessons.edit"
  | "exams.create"
  | "exams.mark"
  | "grades.view"
  | "grades.edit"           // TUTOR/REGISTRAR; BURSAR NEVER

  // Certificates
  | "certificates.issue"
  | "certificates.revoke"   // SUPERADMIN only
  | "certificates.view"

  // Staff accounts
  | "staff.view"
  | "staff.create.initiate" // anyone can request; SUPERADMIN approves
  | "staff.create.approve"  // SUPERADMIN only
  | "staff.suspend.initiate"
  | "staff.suspend.approve" // SUPERADMIN only
  | "staff.role.change.approve" // SUPERADMIN only

  // System / Settings
  | "settings.view"
  | "settings.edit"         // SUPERADMIN only for sensitive; SYSTEM_IT for infra
  | "integrations.edit"     // SYSTEM_IT
  | "backups.manage"        // SYSTEM_IT
  | "health.view"           // SYSTEM_IT
  | "break_glass.request"   // SYSTEM_IT
  | "break_glass.approve"   // SUPERADMIN only

  // Audit & Compliance
  | "audit.view"            // SUPERADMIN full; others filtered
  | "audit.view.full"       // SUPERADMIN only
  | "access_review.view"
  | "access_review.complete"// SUPERADMIN only

  // Approvals
  | "approvals.view"        // SUPERADMIN sees all; initiator sees own
  | "approvals.decide"      // SUPERADMIN only - and never own request

  // Reports
  | "reports.view"
  | "reports.financial"     // BURSAR + SUPERADMIN only
  | "reports.academic"

  // Partner pages
  | "partner_pages.edit"

  // Manual payment claims / reconciliation
  | "claims.submit"
  | "claims.review"
  | "claims.second_verify"
  | "statements.import"
  | "reconciliation.view";

// ─── Role → permission map (exhaustive, default-deny) ─────────────────────

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPERADMIN: [
    // Full read access to everything
    "students.view", "students.create", "students.edit", "students.suspend", "students.export",
    "enrolments.view", "enrolments.create", "enrolments.edit",
    "payments.view", "payments.export", "ledger.view",
    "refunds.initiate", "refunds.approve",
    "waivers.initiate", "waivers.approve",
    "fees.change.initiate", "fees.change.approve",
    "scholarships.initiate", "scholarships.approve",
    "courses.view", "courses.create", "courses.edit", "courses.publish", "courses.delete",
    "lessons.edit", "exams.create", "exams.mark",
    "grades.view", "grades.edit",
    "certificates.issue", "certificates.revoke", "certificates.view",
    "staff.view", "staff.create.initiate", "staff.create.approve",
    "staff.suspend.initiate", "staff.suspend.approve",
    "staff.role.change.approve",
    "settings.view", "settings.edit",
    "integrations.edit", "backups.manage", "health.view",
    "break_glass.approve",
    "audit.view", "audit.view.full",
    "access_review.view", "access_review.complete",
    "approvals.view", "approvals.decide",
    "reports.view", "reports.financial", "reports.academic",
    "partner_pages.edit",
    "claims.submit", "claims.review", "claims.second_verify",
    "statements.import", "reconciliation.view",
  ],

  SYSTEM_IT: [
    "settings.view", "settings.edit",
    "integrations.edit", "backups.manage", "health.view",
    "break_glass.request",
    "audit.view", // filtered - no student/payment data
    "reports.view",
    // Explicitly DENIED (not in list): students.*, payments.*, grades.*, certificates.*
  ],

  REGISTRAR: [
    "students.view", "students.create", "students.edit", "students.suspend",
    "enrolments.view", "enrolments.create", "enrolments.edit",
    "courses.view",
    "lessons.edit",
    "exams.create", "exams.mark",
    "grades.view", "grades.edit",
    "certificates.issue", "certificates.view",
    "scholarships.initiate",
    "waivers.initiate",
    "staff.create.initiate", "staff.suspend.initiate",
    "audit.view",
    "reports.view", "reports.academic",
    "partner_pages.edit",
    // Explicitly DENIED: payments.*, ledger.*, refunds.*, fees.*
  ],

  BURSAR: [
    "students.view",
    "enrolments.view",
    "payments.view", "payments.initiate", "payments.export",
    "ledger.view",
    "refunds.initiate",
    "waivers.initiate",
    "fees.change.initiate",
    "scholarships.initiate",
    "audit.view",
    "reports.view", "reports.financial",
    "claims.review", "claims.second_verify",
    "statements.import", "reconciliation.view",
    // Explicitly DENIED: grades.edit, courses.edit, certificates.revoke
  ],

  TUTOR: [
    "students.view",
    "enrolments.view",
    "courses.view", "courses.edit",
    "lessons.edit",
    "exams.create", "exams.mark",
    "grades.view", "grades.edit",
    "certificates.view",
    // Explicitly DENIED: payments.*, finance.*
  ],

  // Legacy ADMIN = REGISTRAR permissions
  ADMIN: [
    "students.view", "students.create", "students.edit", "students.suspend",
    "enrolments.view", "enrolments.create", "enrolments.edit",
    "courses.view", "courses.create", "courses.edit", "courses.publish",
    "lessons.edit", "exams.create", "exams.mark",
    "grades.view", "grades.edit",
    "certificates.issue", "certificates.view",
    "scholarships.initiate", "waivers.initiate",
    "audit.view",
    "reports.view", "reports.academic",
    "partner_pages.edit",
  ],

  STUDENT: [
    "courses.view",
    "grades.view",
    "certificates.view",
    "enrolments.view",
    "payments.initiate",
    "claims.submit",
  ],

  SPONSOR: ["reports.view", "students.view"],
  EMPLOYER: [],
};

// ─── Core permission check ─────────────────────────────────────────────────

/**
 * Returns true if the role has the given permission.
 * Default deny - if permission not in map, returns false.
 */
export function can(role: UserRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

/**
 * Throws a 403-equivalent error if the role lacks the permission.
 * Use in API route handlers after auth.
 */
export function requirePermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(`Role ${role} does not have permission: ${permission}`);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ─── Separation-of-duties guard ───────────────────────────────────────────

/**
 * Verifies that the approver is NOT the same person who initiated a request.
 * Used on all approval endpoints.
 */
export function assertNotSelfApproval(initiatorId: string, approverId: string): void {
  if (initiatorId === approverId) {
    throw new ForbiddenError("Initiator cannot approve their own request.");
  }
}

// ─── Route-to-portal mapping ──────────────────────────────────────────────

/**
 * Where each role should land after login.
 */
export function getHomeForRole(role: UserRole): string {
  switch (role) {
    case "SUPERADMIN": return "/director";
    case "SYSTEM_IT":  return "/system";
    case "REGISTRAR":  return "/admin";
    case "BURSAR":     return "/bursar";
    case "TUTOR":      return "/tutor";
    case "ADMIN":      return "/admin"; // legacy
    default:           return "/dashboard"; // STUDENT, SPONSOR, EMPLOYER
  }
}

/**
 * Returns whether the given role may access a route prefix.
 * Used by middleware for coarse-grained routing.
 */
export function canAccessPrefix(role: UserRole, prefix: string): boolean {
  const rules: Array<{ prefix: string; roles: UserRole[] }> = [
    { prefix: "/director",  roles: ["SUPERADMIN"] },
    { prefix: "/system",    roles: ["SUPERADMIN", "SYSTEM_IT"] },
    { prefix: "/admin",     roles: ["SUPERADMIN", "REGISTRAR", "ADMIN"] },
    { prefix: "/bursar",    roles: ["SUPERADMIN", "BURSAR"] },
    { prefix: "/tutor",     roles: ["SUPERADMIN", "TUTOR", "REGISTRAR", "ADMIN"] },
    { prefix: "/dashboard", roles: ["STUDENT", "SPONSOR"] },
  ];

  for (const rule of rules) {
    if (prefix.startsWith(rule.prefix)) {
      return rule.roles.includes(role);
    }
  }
  return false;
}

// ─── SYSTEM_IT data scoping ───────────────────────────────────────────────

/**
 * SYSTEM_IT must never see student personal/payment data in audit logs
 * unless a valid non-expired break-glass grant exists.
 */
export function auditLogFilterForRole(role: UserRole): Record<string, unknown> | undefined {
  if (role === "SYSTEM_IT") {
    // Exclude actions that expose personal or financial data
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
