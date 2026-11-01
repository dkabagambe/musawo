/**
 * role-integration.test.ts
 *
 * Comprehensive per-role verification for the 6-role model (remarks.md s1):
 *   DIRECTOR, PRINCIPAL, ADMIN, ACADEMIC_REGISTRAR (dummy), INSTRUCTOR, STUDENT, SYSTEM_IT, ARCHIVED
 *
 * For every seeded role this test proves:
 *   1. The account exists in the DB, is ACTIVE, and password verifies
 *   2. getHomeForRole() returns the correct portal path
 *   3. canAccessPrefix() allows their own portal and blocks portals they must not enter
 *   4. Every permission the role MUST HAVE is allowed by can()
 *   5. Every permission the role MUST NOT HAVE is denied by can()
 *   6. filterNavByPermission() surfaces the expected nav items
 *   7. Separation-of-duties invariants hold
 *
 * Run:  npx vitest run src/tests/role-integration.test.ts
 */

import { describe, it, expect, afterAll } from "vitest";
import React from "react";
import { PrismaClient } from "@prisma/client";
import { verifyPassword } from "@/lib/auth/password";
import {
  can,
  canAccessPrefix,
  getHomeForRole,
  STAFF_ROLES,
  type Permission,
} from "@/lib/rbac";
import { filterNavByPermission } from "@/lib/rbac/navigation";
import type { NavItem } from "@/components/ui/AppShell";
import type { UserRole } from "@prisma/client";

const db = new PrismaClient();
afterAll(() => db.$disconnect());

// ─── Seeded demo accounts (remarks.md s13 + batch 1A) ───────────────────────

const ACCOUNTS: Array<{ email: string; role: UserRole }> = [
  { email: "director@mtc.ac.ug",  role: "DIRECTOR"          },
  { email: "principal@mtc.ac.ug", role: "PRINCIPAL"         },
  { email: "admin@mtc.ac.ug",     role: "ADMIN"             },
  { email: "registrar@mtc.ac.ug", role: "ACADEMIC_REGISTRAR"},
  { email: "itadmin@mtc.ac.ug",   role: "SYSTEM_IT"         },
  { email: "tutor@mtc.ac.ug",     role: "INSTRUCTOR"        },
  { email: "tutor2@mtc.ac.ug",    role: "INSTRUCTOR"        },
  { email: "tutor3@mtc.ac.ug",    role: "INSTRUCTOR"        },
  { email: "student.full@example.com", role: "STUDENT"      },
];

const DEMO_PASSWORD = "Demo1234!";

// ─── Expected home portals ───────────────────────────────────────────────────

const EXPECTED_HOME: Record<UserRole, string> = {
  DIRECTOR:           "/director",
  PRINCIPAL:          "/principal",
  ADMIN:              "/admin",
  ACADEMIC_REGISTRAR: "/registrar",
  INSTRUCTOR:         "/tutor",
  STUDENT:            "/dashboard",
  SYSTEM_IT:          "/system",
  ARCHIVED:           "/login?error=account_archived",
};

// ─── Permissions each role MUST have ────────────────────────────────────────

const MUST_ALLOW: Partial<Record<UserRole, Permission[]>> = {
  DIRECTOR: [
    "approvals.decide", "access_review.complete", "staff.create.approve",
    "certificates.revoke", "grades.view", "payments.view", "audit.view.full",
    "approvals.settings.edit", "graduands.approve", "courses.view", "classes.view",
    "reports.financial", "reports.academic",
  ],
  PRINCIPAL: [
    "content.approve", "certificates.issue",
    "graduands.approve", "grades.view", "students.view", "audit.view.full",
    "courses.view", "classes.view", "intakes.manage", "payments.view",
    "students.create", "staff.create.initiate",
  ],
  ADMIN: [
    "students.create", "students.edit", "students.suspend",
    "applications.process", "payments.collect", "payments.view",
    "claims.submit", "claims.review", "venues.manage", "bookings.manage",
    "equipment.manage", "student.documents.manage", "invites.resend",
    "intakes.manage", "staff.view", "staff.create.initiate",
    "grades.view", "grades.edit",
  ],
  ACADEMIC_REGISTRAR: [
    "support.submit", "policies.view",
  ],
  INSTRUCTOR: [
    "content.upload", "classes.manage", "classes.view",
    "exams.create", "exams.mark", "grades.edit", "attendance.take",
    "courses.view", "students.view", "support.submit",
  ],
  STUDENT: [
    "learning.self.view", "classes.join", "courses.view",
    "payments.initiate", "certificates.view", "enrolments.view",
    "support.submit",
  ],
  SYSTEM_IT: [
    "settings.view", "settings.edit", "integrations.edit",
    "audit.view", "support.manage", "health.view", "backups.manage",
    "settings.edit.secrets",
  ],
};

// ─── Permissions each role MUST NOT have ────────────────────────────────────

const MUST_DENY: Partial<Record<UserRole, Permission[]>> = {
  DIRECTOR: [
    "classes.join", "settings.edit", "settings.edit.secrets",
    "students.create", "classes.manage", "attendance.take",
    "exams.mark", "content.upload",
  ],
  PRINCIPAL: [
    "payments.initiate", "ledger.view", "approvals.decide",
    "settings.edit", "staff.create.approve", "certificates.revoke",
    "classes.join", "exams.release",
  ],
  ADMIN: [
    "approvals.decide", "settings.edit.secrets", "certificates.revoke",
    "ledger.view", "staff.create.approve", "payments.hold",
    "waivers.approve", "fees.change.approve", "classes.join",
  ],
  ACADEMIC_REGISTRAR: [
    "students.view", "students.create", "payments.view", "ledger.view",
    "courses.view", "grades.view", "audit.view", "approvals.view",
    "attendance.take", "classes.view", "classes.join",
    "certificates.view", "reports.view", "staff.view",
    "equipment.manage", "approvals.decide",
  ],
  INSTRUCTOR: [
    "payments.view", "classes.join", "students.create",
    "approvals.decide", "certificates.issue", "settings.edit",
    "students.suspend", "students.view.contacts",
  ],
  STUDENT: [
    "grades.edit", "students.create", "payments.view",
    "staff.view", "audit.view", "approvals.decide",
    "classes.manage", "content.upload", "exams.create",
  ],
  SYSTEM_IT: [
    "payments.view", "grades.view", "students.view",
    "certificates.issue", "approvals.decide", "classes.join",
    "approvals.settings.edit",
  ],
  ARCHIVED: [
    "support.submit", "policies.view", "learning.self.view",
    "classes.join", "courses.view", "grades.view",
  ],
};

// ─── Portals each role is blocked from ──────────────────────────────────────

const PORTAL_BLOCKED: Partial<Record<UserRole, string[]>> = {
  ACADEMIC_REGISTRAR: ["/director", "/principal", "/admin", "/system"],
  INSTRUCTOR:         ["/director", "/principal", "/admin", "/system", "/dashboard"],
  STUDENT:            ["/director", "/principal", "/admin", "/registrar",
                       "/tutor", "/system"],
  SYSTEM_IT:          ["/director", "/principal", "/admin", "/registrar",
                       "/tutor", "/dashboard"],
};

// ─── Per-portal nav samples ──────────────────────────────────────────────────

const I = null as unknown as React.ReactNode;

const NAV_BY_PORTAL: Record<string, NavItem[]> = {
  "/director": [
    { href: "/director",               label: "Overview",      icon: I },
    { href: "/director/approvals",     label: "Approvals",     icon: I },
    { href: "/director/staff",         label: "Staff",         icon: I },
    { href: "/director/audit",         label: "Audit",         icon: I },
    { href: "/director/access-review", label: "Access Review", icon: I },
  ],
  "/admin": [
    { href: "/admin",               label: "Overview",  icon: I },
    { href: "/admin/tutors",        label: "Staff",     icon: I },
    { href: "/admin/students",      label: "Students",  icon: I },
    { href: "/admin/support",       label: "Support",   icon: I },
    { href: "/admin/invites",       label: "Invites",   icon: I },
    { href: "/admin/timetable",     label: "Timetable", icon: I },
    { href: "/admin/equipment",     label: "Equipment", icon: I },
    { href: "/admin/settings",      label: "Settings",  icon: I },
    { href: "/admin/audit",         label: "Audit Log", icon: I },
  ],
  "/tutor": [
    { href: "/tutor",            label: "Overview",   icon: I },
    { href: "/tutor/classes",    label: "Classes",    icon: I },
    { href: "/tutor/materials",  label: "Materials",  icon: I },
    { href: "/tutor/attendance", label: "Attendance", icon: I },
    { href: "/tutor/exams",      label: "Exams",      icon: I },
    { href: "/tutor/students",   label: "Students",   icon: I },
  ],
  "/dashboard": [
    { href: "/dashboard",              label: "Home",         icon: I },
    { href: "/dashboard/courses",      label: "Courses",      icon: I },
    { href: "/dashboard/payments",     label: "Payments",     icon: I },
    { href: "/dashboard/certificates", label: "Certificates", icon: I },
    { href: "/dashboard/timetable",    label: "Timetable",    icon: I },
  ],
};

// ─── Tests: DB authentication ────────────────────────────────────────────────

describe("All demo accounts exist, are active, and can authenticate", () => {
  for (const { email, role } of ACCOUNTS) {
    it(`${role} -- ${email}`, async () => {
      const user = await db.user.findUnique({ where: { email } });
      expect(user, `No DB record for ${email}`).toBeTruthy();
      expect(user!.role, `Wrong role for ${email}`).toBe(role);
      expect(user!.status, `${email} must be ACTIVE`).toBe("ACTIVE");
      expect(user!.passwordHash, `No password hash for ${email}`).toBeTruthy();
      const ok = await verifyPassword(DEMO_PASSWORD, user!.passwordHash!);
      expect(ok, `Password verification failed for ${email}`).toBe(true);
    });
  }
});

// ─── Tests: home portal routing ──────────────────────────────────────────────

describe("getHomeForRole: every role routes to the correct portal", () => {
  const roles = Object.keys(EXPECTED_HOME) as UserRole[];
  for (const role of roles) {
    it(`${role} -> ${EXPECTED_HOME[role]}`, () => {
      expect(getHomeForRole(role)).toBe(EXPECTED_HOME[role]);
    });
  }
  it("unknown role -> /dashboard (never 404)", () =>
    expect(getHomeForRole("UNKNOWN" as UserRole)).toBe("/dashboard"));
});

// ─── Tests: portal access guard ──────────────────────────────────────────────

describe("canAccessPrefix: each role allowed into own portal", () => {
  const roles = Object.keys(EXPECTED_HOME) as UserRole[];
  for (const role of roles) {
    const home = EXPECTED_HOME[role];
    // ARCHIVED has no home portal, skip
    if (home.startsWith("/login")) continue;
    it(`${role} passes ${home}`, () => {
      expect(canAccessPrefix(role, home)).toBe(true);
    });
  }
});

describe("canAccessPrefix: each role is blocked from portals it must not enter", () => {
  for (const [role, blocked] of Object.entries(PORTAL_BLOCKED) as [UserRole, string[]][]) {
    for (const portal of blocked) {
      it(`${role} blocked from ${portal}`, () => {
        expect(canAccessPrefix(role, portal)).toBe(false);
      });
    }
  }
});

// ─── Tests: RBAC permissions ─────────────────────────────────────────────────

describe("RBAC: allowed permissions per role", () => {
  for (const [role, perms] of Object.entries(MUST_ALLOW) as [UserRole, Permission[]][]) {
    for (const perm of perms) {
      it(`${role} CAN ${perm}`, () => {
        expect(can(role, perm)).toBe(true);
      });
    }
  }
});

describe("RBAC: denied permissions per role", () => {
  for (const [role, perms] of Object.entries(MUST_DENY) as [UserRole, Permission[]][]) {
    for (const perm of perms) {
      it(`${role} CANNOT ${perm}`, () => {
        expect(can(role, perm)).toBe(false);
      });
    }
  }
});

// ─── Tests: navigation filter ────────────────────────────────────────────────

describe("filterNavByPermission: correct nav items per role", () => {
  it("DIRECTOR sees all director nav items", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/director"], "DIRECTOR");
    expect(visible.map((n) => n.href)).toContain("/director/approvals");
    expect(visible.map((n) => n.href)).toContain("/director/staff");
    expect(visible.map((n) => n.href)).toContain("/director/access-review");
  });

  it("ADMIN sees operational items including timetable, equipment, support", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/admin"], "ADMIN");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/admin/timetable");
    expect(hrefs).toContain("/admin/equipment");
    expect(hrefs).toContain("/admin/invites");
    expect(hrefs).toContain("/admin/students");
  });

  it("INSTRUCTOR sees classes, materials, attendance, exams, students", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/tutor"], "INSTRUCTOR");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/tutor/classes");
    expect(hrefs).toContain("/tutor/materials");
    expect(hrefs).toContain("/tutor/attendance");
    expect(hrefs).toContain("/tutor/exams");
  });

  it("STUDENT sees courses, payments, certificates", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/dashboard"], "STUDENT");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/dashboard/courses");
    expect(hrefs).toContain("/dashboard/payments");
    expect(hrefs).toContain("/dashboard/certificates");
  });
});

// ─── Tests: STAFF_ROLES constant ─────────────────────────────────────────────

describe("STAFF_ROLES constant (new 6-role model)", () => {
  it("contains the 6 business roles plus SYSTEM_IT and ACADEMIC_REGISTRAR", () => {
    const expected: UserRole[] = [
      "DIRECTOR", "PRINCIPAL", "ADMIN", "ACADEMIC_REGISTRAR",
      "INSTRUCTOR", "SYSTEM_IT",
    ];
    for (const role of expected) {
      expect(STAFF_ROLES).toContain(role);
    }
  });
  it("does not include STUDENT", () => {
    expect(STAFF_ROLES).not.toContain("STUDENT");
  });
  it("does not include ARCHIVED", () => {
    expect(STAFF_ROLES).not.toContain("ARCHIVED");
  });
});

// ─── Tests: separation of duties ────────────────────────────────────────────

describe("Separation of duties: no initiator can also be the approver", () => {
  it("PRINCIPAL can initiate refunds but not approve them (Director only)", () => {
    expect(can("PRINCIPAL", "refunds.initiate")).toBe(true);
    expect(can("PRINCIPAL", "refunds.approve")).toBe(false);
  });
  it("PRINCIPAL can initiate staff suspension but not approve it", () => {
    expect(can("PRINCIPAL", "staff.suspend.initiate")).toBe(true);
    expect(can("PRINCIPAL", "staff.suspend.approve")).toBe(false);
  });
  it("ADMIN can collect payments but not verify or delete payment records", () => {
    expect(can("ADMIN", "payments.collect")).toBe(true);
    expect(can("ADMIN", "payments.hold")).toBe(false);
    expect(can("ADMIN", "waivers.approve")).toBe(false);
  });
  it("DIRECTOR is the final approver for all decisions", () => {
    expect(can("DIRECTOR", "approvals.decide")).toBe(true);
    expect(can("DIRECTOR", "refunds.approve")).toBe(true);
    expect(can("DIRECTOR", "staff.create.approve")).toBe(true);
  });
});

// ─── Tests: class join isolation ─────────────────────────────────────────────

describe("classes.join is STUDENT-only", () => {
  it("STUDENT can join classes", () =>
    expect(can("STUDENT", "classes.join")).toBe(true));
  it("DIRECTOR cannot join classes", () =>
    expect(can("DIRECTOR", "classes.join")).toBe(false));
  it("INSTRUCTOR manages classes, not joins them", () => {
    expect(can("INSTRUCTOR", "classes.manage")).toBe(true);
    expect(can("INSTRUCTOR", "classes.join")).toBe(false);
  });
});

// ─── Tests: portal coarse guard ──────────────────────────────────────────────

describe("STUDENT cannot enter the tutor portal", () => {
  it("STUDENT does not have classes.view", () =>
    expect(can("STUDENT", "classes.view")).toBe(false));
  it("canAccessPrefix STUDENT /tutor returns false", () =>
    expect(canAccessPrefix("STUDENT", "/tutor")).toBe(false));
  it("INSTRUCTOR has classes.view and can enter /tutor", () =>
    expect(canAccessPrefix("INSTRUCTOR", "/tutor")).toBe(true));
});

// ─── Tests: no removed role names in live RBAC logic ─────────────────────────

describe("Removed role keys do not appear in active RBAC or nav logic", () => {
  const REMOVED_ROLES = [
    "SUPER_ADMIN", "SUPERADMIN", "BOARD_MEMBER", "DEPUTY_PRINCIPAL",
    "FINANCE_OFFICER", "HR_SYSTEM_ADMIN", "HR_MANAGER", "ADMINISTRATOR",
    "AUDITOR_READONLY", "TEACHING_ASSISTANT",
  ] as const;

  it("every removed role has no permissions via can() (falls back to deny or unknown)", () => {
    for (const role of REMOVED_ROLES) {
      // They should not throw; they should just return false for key permissions
      expect(can(role as UserRole, "students.view")).toBe(false);
      expect(can(role as UserRole, "classes.join")).toBe(false);
    }
  });
});
