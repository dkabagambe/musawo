/**
 * RBAC - central permissions library.
 *
 * Principles:
 * - Default DENY: every check must be explicitly allowed.
 * - Server-side only: never trust the role from the client.
 * - Separation of duties: initiators cannot approve their own requests.
 * - No role names in business logic: use can() or requirePermission() only.
 * - Labels are editable in admin; these key strings are the stable identifiers.
 *
 * Role model (remarks.md batch 1A):
 *   DIRECTOR           - Final approver, read-only view of all data. TOTP in prod.
 *   PRINCIPAL          - Full operational CRUD. TOTP in prod.
 *   ADMIN              - PA to Principal, day-to-day academic administration.
 *   ACADEMIC_REGISTRAR - Dummy/inactive; holding page only.
 *   INSTRUCTOR         - Own assigned courses and classes only.
 *   STUDENT            - Own learning only.
 *   SYSTEM_IT          - Technical: support tickets, system health, non-secret settings.
 *   ARCHIVED           - Former accounts; suspended, no login.
 *
 * Hierarchy for oversight: DIRECTOR > PRINCIPAL > ADMIN > INSTRUCTOR > STUDENT
 */

import type { UserRole } from "@prisma/client";

// ─── Role group helpers ────────────────────────────────────────────────────

export const STAFF_ROLES: UserRole[] = [
  "DIRECTOR",
  "PRINCIPAL",
  "ADMIN",
  "ACADEMIC_REGISTRAR",
  "INSTRUCTOR",
  "SYSTEM_IT",
];

export const DIRECTOR_ROLES: UserRole[] = ["DIRECTOR"];

/**
 * Maximum number of Director-level accounts allowed in the system.
 * The Director role is the top of the hierarchy and accounts are limited.
 */
export const MAX_DIRECTOR_ACCOUNTS = 3;

/**
 * Canonical role tree for the new 6-role model.
 * ACADEMIC_REGISTRAR and SYSTEM_IT are outside the normal chain.
 * ARCHIVED has no operational level.
 */
export const ROLE_TREE: Record<
  string,
  { parent: string | null; level: number | null }
> = {
  DIRECTOR: { parent: null, level: 1 },
  PRINCIPAL: { parent: "DIRECTOR", level: 2 },
  ADMIN: { parent: "PRINCIPAL", level: 3 },
  INSTRUCTOR: { parent: "ADMIN", level: 4 },
  STUDENT: { parent: "INSTRUCTOR", level: 5 },
  ACADEMIC_REGISTRAR: { parent: null, level: null }, // dummy, outside chain
  SYSTEM_IT: { parent: null, level: null },          // technical, outside chain
  ARCHIVED: { parent: null, level: null },            // no login
};

// ─── Permission definitions ────────────────────────────────────────────────

export type Permission =
  // Students / Enrolments
  | "students.view"
  | "students.create"
  | "students.edit"
  | "students.suspend"
  | "students.export"
  | "students.view.contacts"
  | "enrolments.view"
  | "enrolments.create"
  | "enrolments.edit"
  | "applications.view"
  | "applications.process"  // Admin creates student account from application

  // Finance
  | "payments.view"         // view payment records
  | "payments.collect"      // Admin records proof of payment
  | "payments.initiate"     // Student initiates payment
  | "payments.export"
  | "payments.hold"
  | "ledger.view"
  | "finance.totals.view"
  | "refunds.initiate"
  | "refunds.approve"       // Director only
  | "waivers.initiate"
  | "waivers.approve"       // Director only
  | "fees.change.initiate"
  | "fees.change.approve"   // Director only
  | "claims.submit"
  | "claims.review"         // Admin collects, forwards to Principal
  | "claims.second_verify"
  | "statements.import"
  | "reconciliation.view"

  // Courses / Content
  | "courses.view"
  | "courses.create"
  | "courses.edit"
  | "courses.publish"       // Principal approves
  | "courses.delete"
  | "content.upload"        // Instructor uploads materials
  | "content.approve"       // Principal approves content
  | "content.view.own"      // Instructor sees own courses only
  | "lessons.edit"

  // Exams and results
  | "exams.create"
  | "exams.mark"
  | "exams.release"         // Director approves final results publication
  | "grades.view"
  | "grades.edit"
  | "grades.view.own"       // Instructor sees own course grades
  | "marks.change.request"  // Instructor requests a mark change after release
  | "marks.change.approve"  // Principal approves; Director sees in audit

  // Attendance and roll call
  | "attendance.take"       // Instructor takes roll call
  | "attendance.view"
  | "attendance.view.all"
  | "attendance.export"
  | "attendance.sheets.view"

  // Live classes
  | "classes.manage"        // create, start, stop, admit, roll call
  | "classes.view"
  | "classes.join"          // enrolled student joins a live class

  // Certificates and graduands
  | "certificates.issue"
  | "certificates.revoke"   // Director only
  | "certificates.view"
  | "graduands.prepare"
  | "graduands.approve"     // Director approves certificate issuance
  | "graduates.view"

  // Transcripts
  | "transcripts.view"
  | "transcripts.generate"

  // Announcements
  | "announcements.send.all"    // Principal institution-wide
  | "announcements.send.own"    // Instructor to own classes
  | "announcements.manage"      // Admin manages administrative announcements

  // Messaging
  | "messaging.students.own"    // Instructor chats with own students

  // Staff accounts (Admin creates and manages; Director assigns Director/Principal)
  | "staff.view"
  | "staff.create.initiate"
  | "staff.create.approve"      // Director only
  | "staff.suspend.initiate"
  | "staff.suspend.approve"     // Director only
  | "staff.role.change.approve" // Director only

  // Settings
  | "settings.view"             // SYSTEM_IT sees non-secret settings
  | "settings.edit"             // SYSTEM_IT edits non-secret settings
  | "settings.edit.public"      // SYSTEM_IT for public-facing system data
  | "settings.edit.secrets"     // SYSTEM_IT only (payment keys, API keys, etc.)
  | "settings.edit.operational" // Admin edits operational settings
  | "approvals.settings.edit"   // Director edits approval policy table

  // Integrations / infra (SYSTEM_IT only)
  | "integrations.edit"
  | "backups.manage"
  | "health.view"

  // Audit and compliance
  | "audit.view"
  | "audit.view.full"           // Director sees everything
  | "access_review.view"
  | "access_review.complete"    // Director only

  // Approvals
  | "approvals.view"
  | "approvals.decide"          // Director final approval/rejection

  // Intakes
  | "intakes.manage"

  // Reports
  | "reports.view"
  | "reports.financial"
  | "reports.academic"
  | "reports.operational"

  // Policies
  | "policies.view"
  | "policies.edit"             // Principal or Director

  // Support tickets
  | "support.view"              // SYSTEM_IT sees all tickets
  | "support.submit"            // every role can submit
  | "support.manage"            // SYSTEM_IT manages/replies

  // Equipment
  | "equipment.manage"          // Admin manages; Principal approves

  // Venues and bookings (Admin manages timetable)
  | "venues.manage"
  | "bookings.manage"
  | "practicals.manage"
  | "operational_notices.manage"

  // Student documents (Admin uploads and manages)
  | "student.documents.manage"

  // Invites and password resets
  | "invites.resend"
  | "password_reset.send"
  | "students.lookup"

  // Storage (section 10)
  | "storage.view"          // Principal + Director see storage dashboard
  | "storage.manage"        // Principal can initiate and confirm cleanup

  // Learning (student self-view)
  | "learning.self.view"

  // Deprecated permissions kept for backward compatibility with existing page/API code.
  // Not granted to any role in the new model; will be removed in batch 1B nav refactor.
  | "staff.leave.manage"
  | "staff.access_review"
  | "reports.board"
  | "complaints.manage"
  | "board_documents.view"
  | "board_documents.manage"
  | "policies.manage"
  | "audit.comment"
  | "break_glass.request"
  | "break_glass.approve"
  | "partner_pages.edit";

// ─── Role -> permission map ────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // ── DIRECTOR: final approver, read-only on all data ───────────────────────
  DIRECTOR: [
    // Students (read only)
    "students.view",
    "students.export",
    "students.view.contacts",
    "enrolments.view",
    "applications.view",
    // Finance (read and approve)
    "payments.view",
    "payments.export",
    "finance.totals.view",
    "refunds.approve",
    "waivers.approve",
    "fees.change.approve",
    "ledger.view",
    "reconciliation.view",
    // Courses (read and approve)
    "courses.view",
    "courses.publish",  // Director approves programme and course changes
    "courses.delete",
    "content.approve",
    // Exams and results (approve publication)
    "exams.release",    // Director approves final results publication
    "grades.view",
    "marks.change.approve",
    // Attendance and classes (read only)
    "attendance.view",
    "attendance.view.all",
    "attendance.export",
    "classes.view",
    // Certificates (approve issuance, revoke)
    "certificates.issue",
    "certificates.revoke",
    "certificates.view",
    "graduands.approve",
    "graduates.view",
    "transcripts.view",
    // Staff and approvals
    "staff.view",
    "staff.create.approve",
    "staff.suspend.approve",
    "staff.role.change.approve",
    // Settings (approval policy table only; technical settings are SYSTEM_IT)
    "approvals.settings.edit",
    // Audit
    "audit.view",
    "audit.view.full",
    "access_review.view",
    "access_review.complete",
    // Approvals
    "approvals.view",
    "approvals.decide",
    // Reports
    "reports.view",
    "reports.financial",
    "reports.academic",
    // Policies
    "policies.view",
    "policies.edit",
    // Announcements (read)
    "announcements.send.all",
    // Support
    "support.submit",
    "support.view",
    // Graduands
    "graduands.prepare",
    "transcripts.generate",
    // Storage dashboard (section 10)
    "storage.view",
  ],

  // ── PRINCIPAL: full operational CRUD ──────────────────────────────────────
  PRINCIPAL: [
    // Students (full CRUD except hard-delete)
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
    // Finance (view totals; forward payment proofs to Director)
    "finance.totals.view",
    "payments.view",
    "payments.export",
    "refunds.initiate",
    "waivers.initiate",
    "fees.change.initiate",
    "reconciliation.view",
    // Courses and content (full CRUD; submit to Director for programme/course approval)
    "courses.view",
    "courses.create",
    "courses.edit",
    "content.upload",
    "content.approve",
    "lessons.edit",
    // Exams (Principal reviews Instructor marks; submits results to Director)
    "exams.create",
    "exams.mark",
    "grades.view",
    "grades.edit",
    "marks.change.approve",
    "marks.change.request",
    // Attendance
    "attendance.view",
    "attendance.view.all",
    "attendance.export",
    "attendance.sheets.view",
    // Classes
    "classes.view",
    "classes.manage",
    // Certificates (Principal requests; Director approves)
    "certificates.view",
    "certificates.issue",
    "graduands.prepare",
    "graduands.approve",
    "graduates.view",
    "transcripts.view",
    "transcripts.generate",
    // Announcements (institution-wide)
    "announcements.send.all",
    "announcements.manage",
    // Staff (creates staff below Director level; Director assigns Director/Principal)
    "staff.view",
    "staff.create.initiate",
    "staff.suspend.initiate",
    // Intakes
    "intakes.manage",
    // Approvals
    "approvals.view",
    // Audit (full view)
    "audit.view",
    "audit.view.full",
    // Reports
    "reports.view",
    "reports.financial",
    "reports.academic",
    // Policies
    "policies.view",
    "policies.edit",
    // Support
    "support.submit",
    "support.view",
    // Equipment (Principal approves equipment requests)
    "equipment.manage",
    // Venues and timetable
    "venues.manage",
    "bookings.manage",
    "practicals.manage",
    // Operational settings (Principal can edit operational settings)
    "settings.edit.operational",
    // Student documents
    "student.documents.manage",
    // User management
    "invites.resend",
    "password_reset.send",
    "students.lookup",
    // Storage (section 10)
    "storage.view",
    "storage.manage",
  ],

  // ── ADMIN: PA to Principal, day-to-day academic administration ────────────
  ADMIN: [
    // Students (create, edit, deactivate, resend invite; never delete)
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
    // Finance (view only + collect proof of payment)
    "payments.view",
    "payments.collect",
    "claims.submit",
    "claims.review",
    // Courses (view academic programmes; manage courses and classes)
    "courses.view",
    "courses.edit",         // day-to-day course management
    "content.upload",
    "lessons.edit",
    // Exams and results (process marks; submit to Principal for review)
    "exams.create",
    "exams.mark",
    "grades.view",
    "grades.edit",
    "marks.change.request",
    // Attendance
    "attendance.view",
    "attendance.view.all",
    "attendance.export",
    "attendance.sheets.view",
    // Classes
    "classes.view",
    // Certificates
    "certificates.view",
    "graduates.view",
    "transcripts.view",
    "graduands.prepare",
    // Announcements (administrative; institution-wide requires Principal approval)
    "announcements.send.own",
    "announcements.manage",
    // Staff (manage below-Admin accounts)
    "staff.view",
    "staff.create.initiate",
    "staff.suspend.initiate",
    // Intakes
    "intakes.manage",
    // Equipment (view and prepare requests)
    "equipment.manage",
    // Venues and timetable (Admin manages timetable)
    "venues.manage",
    "bookings.manage",
    "practicals.manage",
    "operational_notices.manage",
    // Student documents
    "student.documents.manage",
    // Reports
    "reports.view",
    "reports.academic",
    "reports.operational",
    // Policies
    "policies.view",
    // Support
    "support.submit",
    // User management
    "invites.resend",
    "password_reset.send",
    "students.lookup",
  ],

  // ── ACADEMIC_REGISTRAR ───────────────────────────────────────────────────
  // While ACADEMIC_REGISTRAR_ACTIVE=false the layout shows only a holding page.
  // These permissions activate once the setting is turned on; they cover the
  // full active-registrar feature set (read-only academic view + registry ops).
  ACADEMIC_REGISTRAR: [
    "support.submit",
    "policies.view",
    "students.lookup",      // needed to pass the /registrar portal guard
    "students.view",
    "students.create",
    "students.edit",
    "enrolments.view",
    "enrolments.create",
    "applications.view",
    "applications.process",
    "courses.view",
    "grades.view",
    "certificates.view",
    "transcripts.generate",
    "transcripts.view",
    "graduands.prepare",
    "classes.view",
    "announcements.manage",
    "audit.view",
    "reports.view",
    "reports.academic",
  ],

  // ── INSTRUCTOR: own assigned courses and classes only ─────────────────────
  INSTRUCTOR: [
    "students.view",       // own students only (scoped in query)
    "enrolments.view",
    "courses.view",        // own courses only
    "courses.edit",        // own courses only
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
    "transcripts.view",   // own students only
    "announcements.send.own",
    "messaging.students.own",
    "reports.view",
    "policies.view",
    "support.submit",
    "marks.change.request",
  ],

  // ── STUDENT: own learning only ─────────────────────────────────────────────
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

  // ── SYSTEM_IT: technical only, no student or finance data ─────────────────
  // Payment keys, integrations, backups: SYSTEM_IT only.
  // Approval policy settings: DIRECTOR only.
  SYSTEM_IT: [
    "settings.view",
    "settings.edit",
    "settings.edit.public",
    "settings.edit.secrets",    // payment keys, API keys, integrations
    "integrations.edit",
    "backups.manage",
    "health.view",
    "audit.view",
    "reports.view",
    "support.submit",
    "support.view",
    "support.manage",           // SYSTEM_IT manages/replies to all tickets
  ],

  // ── ARCHIVED: suspended former accounts, no permissions ──────────────────
  ARCHIVED: [],
};

// ─── Explicit denies (override any inherited permission) ──────────────────

/** Permissions that are NEVER available to these roles regardless of inheritance. */
export const ROLE_PERMISSION_DENIES: Partial<Record<UserRole, Permission[]>> = {
  // Staff roles do not join classes as students
  PRINCIPAL: ["classes.join", "learning.self.view", "payments.initiate"],
  ADMIN:     ["classes.join", "learning.self.view", "payments.initiate",
               "waivers.approve", "fees.change.approve", "refunds.approve",
               "exams.release", "staff.create.approve", "certificates.revoke",
               "ledger.view"],
  DIRECTOR: [
    // Director monitors; does not do routine admin
    "students.create",
    "students.edit",
    "students.suspend",
    "courses.create",
    "courses.edit",
    "content.upload",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "grades.edit",
    "attendance.take",
    "classes.manage",
    "classes.join",
    "learning.self.view",
    "settings.view",
    "settings.edit",
    "settings.edit.public",
    "settings.edit.secrets",
    "integrations.edit",
    "backups.manage",
  ],
  ACADEMIC_REGISTRAR: [
    // Dummy role; block everything operational
    "students.view",
    "students.create",
    "students.edit",
    "students.suspend",
    "students.export",
    "enrolments.view",
    "enrolments.create",
    "enrolments.edit",
    "applications.view",
    "applications.process",
    "payments.view",
    "payments.collect",
    "courses.view",
    "courses.create",
    "courses.edit",
    "content.upload",
    "lessons.edit",
    "exams.create",
    "exams.mark",
    "grades.view",
    "grades.edit",
    "attendance.take",
    "attendance.view",
    "classes.manage",
    "classes.view",
    "classes.join",        // Academic Registrar cannot join as a student
    "certificates.view",
    "graduands.prepare",
    "reports.view",
    "reports.academic",
    "audit.view",
    "approvals.view",
    "announcements.send.all",
    "announcements.send.own",
    "announcements.manage",
    "staff.view",
    "equipment.manage",
    "venues.manage",
    "bookings.manage",
  ],
  INSTRUCTOR: [
    "classes.join",         // Instructors do not join as students
    "payments.initiate",
    "claims.submit",
    "learning.self.view",
  ],
  STUDENT: [
    // Students cannot manage anything
    "students.create",
    "students.edit",
    "students.suspend",
    "courses.create",
    "courses.edit",
    "content.upload",
    "exams.create",
    "exams.mark",
    "exams.release",
    "grades.edit",
    "attendance.take",
    "classes.manage",
    "certificates.issue",
    "staff.view",
    "audit.view",
    "reports.view",
  ],
  SYSTEM_IT: [
    "classes.join",
    // SYSTEM_IT cannot see student or financial data
    "students.view",
    "students.create",
    "students.edit",
    "students.suspend",
    "students.export",
    "enrolments.view",
    "applications.view",
    "payments.view",
    "payments.collect",
    "payments.initiate",
    "grades.view",
    "grades.edit",
    "certificates.view",
    "graduates.view",
    "transcripts.view",
  ],
  ARCHIVED: [
    // Catch-all: archived accounts cannot do anything
    "support.submit",
    "policies.view",
  ],
};

// ─── Core checks ──────────────────────────────────────────────────────────

/**
 * Returns all roles in the tree that are equal to `role` or are descendants.
 * Used for permission inheritance: a senior role inherits all permissions
 * defined on roles beneath it in its own branch.
 */
export function getInheritedRolesFor(role: UserRole): UserRole[] {
  return Object.keys(ROLE_TREE).filter((candidate) => {
    if (candidate === role) return true;
    let parent = ROLE_TREE[candidate]?.parent ?? null;
    while (parent) {
      if (parent === role) return true;
      parent = ROLE_TREE[parent]?.parent ?? null;
    }
    return false;
  }) as UserRole[];
}

export function can(role: UserRole, permission: Permission): boolean {
  // ARCHIVED and unknown roles deny everything
  if (role === "ARCHIVED") return false;

  const denied = ROLE_PERMISSION_DENIES[role] ?? [];
  if (denied.includes(permission)) return false;

  if (role === "DIRECTOR") {
    // Director inherits across the full chain
    return Object.values(ROLE_PERMISSIONS).some((perms) =>
      perms.includes(permission),
    );
  }

  const inheritedRoles = getInheritedRolesFor(role);
  return inheritedRoles.some((inheritedRole) =>
    (ROLE_PERMISSIONS[inheritedRole] ?? []).includes(permission),
  );
}

/**
 * Returns the role via which permission is granted (for audit log "via role X").
 * Returns null if permission is denied.
 */
export function canVia(
  role: UserRole,
  permission: Permission,
): UserRole | null {
  if (!can(role, permission)) return null;
  if (role === "DIRECTOR") return "DIRECTOR";
  if ((ROLE_PERMISSIONS[role] ?? []).includes(permission)) return role;
  const inheritedRoles = getInheritedRolesFor(role).filter(
    (r) =>
      r !== role && (ROLE_PERMISSIONS[r] ?? []).includes(permission),
  );
  inheritedRoles.sort(
    (a, b) =>
      (ROLE_TREE[b]?.level ?? 99) - (ROLE_TREE[a]?.level ?? 99),
  );
  return (inheritedRoles[0] as UserRole) ?? role;
}

/** canForUser is kept for backward compatibility. The institutionSecretary flag
 *  is a legacy field and no longer grants extra permissions after the role
 *  consolidation in batch 1A. */
export function canForUser(
  role: UserRole,
  permission: Permission,
  _userFlags?: { institutionSecretary?: boolean },
): boolean {
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
    case "DIRECTOR":
      return "/director";
    case "PRINCIPAL":
      return "/principal";
    case "ADMIN":
      return "/admin";
    case "ACADEMIC_REGISTRAR":
      return "/registrar";
    case "INSTRUCTOR":
      return "/tutor";
    case "SYSTEM_IT":
      return "/system";
    case "ARCHIVED":
      return "/login?error=account_archived";
    default:
      return "/dashboard"; // STUDENT
  }
}

export function canAccessPrefix(role: UserRole, prefix: string): boolean {
  const rules: Array<{ prefix: string; permissions: Permission[] }> = [
    { prefix: "/director", permissions: ["approvals.decide"] },
    { prefix: "/principal", permissions: ["courses.publish", "content.approve"] },
    { prefix: "/admin", permissions: ["students.create", "applications.process"] },
    { prefix: "/registrar", permissions: ["students.lookup"] }, // ACADEMIC_REGISTRAR and Admin-level staff
    { prefix: "/tutor", permissions: ["classes.view"] },
    { prefix: "/system", permissions: ["integrations.edit", "support.manage"] },
    { prefix: "/dashboard", permissions: ["learning.self.view"] },
  ];
  for (const rule of rules) {
    if (prefix === rule.prefix || prefix.startsWith(`${rule.prefix}/`)) {
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

// ─── Delegation (Principal -> retained after role consolidation) ─────────

/** Permissions the Principal may delegate (no deputy in the new model,
 *  delegation is recorded as an audit event but not used in batch 1A). */
export const DELEGATABLE_TO_DEPUTY: Permission[] = [
  "exams.release",
  "graduands.approve",
  "certificates.issue",
  "courses.publish",
  "marks.change.approve",
];

export type DelegationSettings = Partial<Record<string, string>>;

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

export function canDeputyWithDelegation(
  permission: Permission,
  settings: DelegationSettings,
): boolean {
  if (isDelegatedToDeputy(permission, settings)) return true;
  return can("PRINCIPAL", permission);
}

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

export function canManageAccountRecoveryTarget(role: UserRole): boolean {
  const blockedPermissions: Permission[] = [
    "approvals.decide",
    "audit.view.full",
    "payments.view",
  ];
  return !blockedPermissions.some((permission) => can(role, permission));
}
