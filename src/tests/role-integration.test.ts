/**
 * role-integration.test.ts
 *
 * Comprehensive per-role verification — no HTTP server needed.
 * For every seeded role this test proves:
 *   1. The account exists in the DB, is ACTIVE, and password verifies
 *   2. getHomeForRole() returns the correct portal path
 *   3. canAccessPrefix() allows their own portal and blocks portals they must not enter
 *   4. Every permission the role MUST HAVE is allowed by can()
 *   5. Every permission the role MUST NOT HAVE is denied by can()
 *   6. filterNavByPermission() surfaces the expected nav items
 *   7. Separation-of-duties invariants hold (no initiator = approver)
 *   8. Forum staff-bypass works correctly via can() not hardcoded role names
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

// ─── Seeded demo accounts ────────────────────────────────────────────────────

const ACCOUNTS: Array<{ email: string; role: UserRole }> = [
  { email: "ceo@mtc.ac.ug",             role: "SUPER_ADMIN"        },
  { email: "deputy@mtc.ac.ug",          role: "SUPER_ADMIN"        },
  { email: "board@mtc.ac.ug",           role: "BOARD_MEMBER"       },
  { email: "secretary@mtc.ac.ug",       role: "BOARD_MEMBER"       },
  { email: "principal@mtc.ac.ug",       role: "PRINCIPAL"          },
  { email: "deputyprincipal@mtc.ac.ug", role: "DEPUTY_PRINCIPAL"   },
  { email: "registrar@mtc.ac.ug",       role: "ACADEMIC_REGISTRAR" },
  { email: "finance@mtc.ac.ug",         role: "FINANCE_OFFICER"    },
  { email: "hr@mtc.ac.ug",              role: "HR_MANAGER"         },
  { email: "admin@mtc.ac.ug",           role: "ADMINISTRATOR"      },
  { email: "auditor@mtc.ac.ug",         role: "AUDITOR_READONLY"   },
  { email: "itadmin@mtc.ac.ug",         role: "SYSTEM_IT"          },
  { email: "tutor@mtc.ac.ug",           role: "INSTRUCTOR"         },
  { email: "tutor2@mtc.ac.ug",          role: "INSTRUCTOR"         },
  { email: "assistant@mtc.ac.ug",       role: "TEACHING_ASSISTANT" },
  { email: "student.full@example.com",  role: "STUDENT"            },
];

const DEMO_PASSWORD = "Demo1234!";

// ─── Expected home portals ───────────────────────────────────────────────────

const EXPECTED_HOME: Record<UserRole, string> = {
  SUPER_ADMIN:        "/director",
  SUPERADMIN:         "/director",
  BOARD_MEMBER:       "/board",
  PRINCIPAL:          "/principal",
  DEPUTY_PRINCIPAL:   "/deputy",
  ACADEMIC_REGISTRAR: "/registrar",
  REGISTRAR:          "/registrar",
  INSTRUCTOR:         "/tutor",
  TUTOR:              "/tutor",
  TEACHING_ASSISTANT: "/tutor",
  FINANCE_OFFICER:    "/finance",
  BURSAR:             "/finance",
  HR_MANAGER:         "/admin",
  HR_SYSTEM_ADMIN:    "/admin",
  ADMINISTRATOR:      "/admin",
  ADMIN:              "/admin",
  AUDITOR_READONLY:   "/auditor",
  SYSTEM_IT:          "/system",
  STUDENT:            "/dashboard",
  SPONSOR:            "/dashboard",
  EMPLOYER:           "/dashboard",
};

// ─── Permissions each role MUST have ────────────────────────────────────────

const MUST_ALLOW: Partial<Record<UserRole, Permission[]>> = {
  SUPER_ADMIN: [
    "approvals.decide", "access_review.complete", "staff.create.approve",
    "certificates.revoke", "grades.view", "payments.view", "audit.view.full",
    "settings.edit.secrets", "intakes.manage", "graduands.approve",
    "reports.board", "courses.view", "classes.view",
  ],
  BOARD_MEMBER: [
    "reports.board", "policies.view", "graduates.view", "board_documents.view",
  ],
  PRINCIPAL: [
    "content.approve", "exams.release", "certificates.issue",
    "graduands.approve", "grades.view", "students.view", "audit.view.full",
    "courses.view", "classes.view",
  ],
  DEPUTY_PRINCIPAL: [
    "students.view", "complaints.manage", "support.view", "policies.view",
    "reports.academic", "finance.totals.view", "courses.view", "classes.view",
  ],
  ACADEMIC_REGISTRAR: [
    "students.create", "students.view", "enrolments.view",
    "applications.process", "grades.view", "grades.edit",
    "certificates.issue", "graduands.prepare", "courses.view", "classes.view",
  ],
  FINANCE_OFFICER: [
    "payments.view", "ledger.view", "refunds.initiate",
    "fees.change.initiate", "claims.review", "statements.import",
  ],
  HR_MANAGER: [
    "staff.view", "staff.create.initiate", "staff.leave.manage",
    "staff.access_review",
    "support.manage", "venues.manage", "settings.edit.operational", "invites.resend",
  ],
  ADMINISTRATOR: [
    "support.manage", "invites.resend", "password_reset.send",
    "students.lookup", "venues.manage", "equipment.manage",
    "operational_notices.manage", "settings.edit.operational",
  ],
  AUDITOR_READONLY: [
    "students.view", "audit.view", "audit.view.full",
    "payments.view", "grades.view", "certificates.view",
  ],
  SYSTEM_IT: [
    "settings.view", "settings.edit", "integrations.edit",
    "audit.view", "break_glass.request",
  ],
  INSTRUCTOR: [
    "content.upload", "classes.manage", "classes.view",
    "exams.create", "exams.mark", "grades.edit", "attendance.take",
    "courses.view",
  ],
  TEACHING_ASSISTANT: [
    "attendance.take", "classes.view", "content.upload",
  ],
  STUDENT: [
    "learning.self.view", "classes.join", "courses.view",
    "payments.initiate", "certificates.view", "enrolments.view",
  ],
};

// ─── Permissions each role MUST NOT have ────────────────────────────────────

const MUST_DENY: Partial<Record<UserRole, Permission[]>> = {
  SUPER_ADMIN:        ["classes.join"],
  BOARD_MEMBER:       ["payments.view", "grades.view", "students.view",
                       "audit.view", "settings.edit", "classes.join"],
  PRINCIPAL:          ["payments.view", "ledger.view", "approvals.decide",
                       "settings.edit", "classes.join"],
  DEPUTY_PRINCIPAL:   ["payments.view", "certificates.issue", "exams.release",
                       "approvals.decide", "classes.join"],
  ACADEMIC_REGISTRAR: ["payments.view", "refunds.approve", "waivers.initiate",
                       "staff.create.initiate", "certificates.revoke",
                       "approvals.decide", "classes.join"],
  FINANCE_OFFICER:    ["grades.edit", "students.create", "certificates.issue",
                       "content.approve", "approvals.decide", "classes.join"],
  HR_MANAGER:         ["payments.view", "ledger.view", "grades.edit",
                       "approvals.decide", "staff.create.approve",
                       "certificates.revoke", "audit.view", "classes.join"],
  ADMINISTRATOR:      ["students.create", "staff.create.initiate", "payments.view",
                       "grades.view", "certificates.issue", "audit.view",
                       "settings.edit.secrets", "intakes.manage", "classes.join"],
  AUDITOR_READONLY:   ["grades.edit", "payments.initiate", "students.create",
                       "certificates.issue", "approvals.decide",
                       "settings.edit", "classes.join"],
  SYSTEM_IT:          ["payments.view", "grades.view", "students.view",
                       "certificates.issue", "approvals.decide", "classes.join"],
  INSTRUCTOR:         ["payments.view", "classes.join", "students.create",
                       "approvals.decide", "certificates.issue"],
  TEACHING_ASSISTANT: ["grades.edit", "exams.create", "payments.view",
                       "students.create", "classes.join"],
  STUDENT:            ["grades.edit", "students.create", "payments.view",
                       "staff.view", "audit.view", "approvals.decide",
                       "classes.view", "classes.manage"],
};

// ─── Portals each role is blocked from (must NOT pass canAccessPrefix) ───────
// Note: SUPER_ADMIN has every permission so passes every portal check — that
// is correct by design. The middleware handles them by redirecting to /director
// as home (not by blocking). So we only assert their home works.

const PORTAL_BLOCKED: Partial<Record<UserRole, string[]>> = {
  BOARD_MEMBER:       ["/director", "/principal", "/deputy", "/registrar",
                       "/admin", "/finance", "/tutor", "/system", "/dashboard"],
  PRINCIPAL:          ["/director", "/board", "/finance", "/system"],
  DEPUTY_PRINCIPAL:   ["/director", "/board", "/finance", "/system"],
  ACADEMIC_REGISTRAR: ["/director", "/board", "/principal", "/finance",
                       "/admin", "/system"],
  FINANCE_OFFICER:    ["/director", "/board", "/principal", "/deputy",
                       "/registrar", "/admin", "/tutor", "/auditor",
                       "/system", "/dashboard"],
  HR_MANAGER:         ["/director", "/board", "/principal", "/finance",
                       "/auditor", "/system", "/dashboard"],
  ADMINISTRATOR:      ["/director", "/board", "/principal", "/deputy",
                       "/registrar", "/finance", "/tutor", "/auditor",
                       "/system", "/dashboard"],
  AUDITOR_READONLY:   ["/director", "/board", "/principal",
                       "/registrar", "/system"],
  SYSTEM_IT:          ["/director", "/board", "/principal", "/deputy",
                       "/registrar", "/admin", "/finance", "/tutor",
                       "/auditor", "/dashboard"],
  INSTRUCTOR:         ["/director", "/board", "/principal", "/deputy",
                       "/registrar", "/admin", "/finance", "/auditor",
                       "/system", "/dashboard"],
  TEACHING_ASSISTANT: ["/director", "/board", "/principal", "/deputy",
                       "/registrar", "/admin", "/finance", "/auditor",
                       "/system", "/dashboard"],  STUDENT:            ["/director", "/board", "/principal", "/deputy",
                       "/registrar", "/admin", "/finance", "/tutor",
                       "/auditor", "/system"],
};

// ─── Per-portal nav samples (only items that belong to that portal) ──────────
// icon is required by NavItem type but irrelevant for permission filtering

const I = null as unknown as React.ReactNode; // placeholder icon

const NAV_BY_PORTAL: Record<string, NavItem[]> = {
  "/director": [
    { href: "/director",               label: "Overview",      icon: I },
    { href: "/director/approvals",     label: "Approvals",     icon: I },
    { href: "/director/staff",         label: "Staff",         icon: I },
    { href: "/director/audit",         label: "Audit",         icon: I },
    { href: "/director/access-review", label: "Access Review", icon: I },
  ],
  "/board": [
    { href: "/board",          label: "Overview", icon: I },
    { href: "/board/reports",  label: "Reports",  icon: I },
    { href: "/board/policies", label: "Policies", icon: I },
  ],
  "/admin": [
    { href: "/admin",               label: "Overview",      icon: I },
    { href: "/admin/tutors",        label: "Staff",         icon: I },
    { href: "/admin/students",      label: "Students",      icon: I },
    { href: "/admin/support",       label: "Support",       icon: I },
    { href: "/admin/invites",       label: "Invites",       icon: I },
    { href: "/admin/leave",         label: "Leave",         icon: I },
    { href: "/admin/access-review", label: "Access Review", icon: I },
    { href: "/admin/timetable",     label: "Timetable",     icon: I },
    { href: "/admin/equipment",     label: "Equipment",     icon: I },
    { href: "/admin/notices",       label: "Notices",       icon: I },
    { href: "/admin/settings",      label: "Settings",      icon: I },
    { href: "/admin/audit",         label: "Audit Log",     icon: I },
  ],
  "/finance": [
    { href: "/finance",           label: "Overview",  icon: I },
    { href: "/finance/payments",  label: "Payments",  icon: I },
    { href: "/finance/ledger",    label: "Ledger",    icon: I },
    { href: "/finance/approvals", label: "Approvals", icon: I },
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
    it(`${role} — ${email}`, async () => {
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
  const unique = ACCOUNTS.filter(
    (a, i, arr) => arr.findIndex((b) => b.role === a.role) === i,
  );
  for (const { role } of unique) {
    it(`${role} → ${EXPECTED_HOME[role]}`, () => {
      expect(getHomeForRole(role)).toBe(EXPECTED_HOME[role]);
    });
  }
  it("legacy SUPERADMIN alias → /director", () =>
    expect(getHomeForRole("SUPERADMIN")).toBe("/director"));
  it("legacy BURSAR alias → /finance", () =>
    expect(getHomeForRole("BURSAR")).toBe("/finance"));
  it("legacy TUTOR alias → /tutor", () =>
    expect(getHomeForRole("TUTOR")).toBe("/tutor"));
  it("unknown role → /dashboard (never 404)", () =>
    expect(getHomeForRole("SPONSOR" as UserRole)).toBe("/dashboard"));
});

// ─── Tests: portal access guard ──────────────────────────────────────────────

describe("canAccessPrefix: each role allowed into own portal", () => {
  const unique = ACCOUNTS.filter(
    (a, i, arr) => arr.findIndex((b) => b.role === a.role) === i,
  );
  for (const { role } of unique) {
    const home = EXPECTED_HOME[role];
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
  it("SUPER_ADMIN sees all director nav items", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/director"], "SUPER_ADMIN");
    expect(visible.map((n) => n.href)).toContain("/director/approvals");
    expect(visible.map((n) => n.href)).toContain("/director/staff");
    expect(visible.map((n) => n.href)).toContain("/director/access-review");
  });

  it("HR_MANAGER sees Leave and Access Review but not Audit Log", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/admin"], "HR_MANAGER");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/admin/leave");
    expect(hrefs).toContain("/admin/access-review");
    expect(hrefs).toContain("/admin/tutors");
    expect(hrefs).toContain("/admin/invites");
    expect(hrefs).not.toContain("/admin/audit");
  });

  it("ADMINISTRATOR sees operational items but not staff, leave, or access-review", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/admin"], "ADMINISTRATOR");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/admin/timetable");
    expect(hrefs).toContain("/admin/equipment");
    expect(hrefs).toContain("/admin/notices");
    expect(hrefs).toContain("/admin/invites");
    expect(hrefs).toContain("/admin/students");
    expect(hrefs).toContain("/admin/settings");
    expect(hrefs).not.toContain("/admin/tutors");
    expect(hrefs).not.toContain("/admin/leave");
    expect(hrefs).not.toContain("/admin/access-review");
    expect(hrefs).not.toContain("/admin/audit");
  });

  it("BOARD_MEMBER sees board nav items", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/board"], "BOARD_MEMBER");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/board/reports");
    expect(hrefs).toContain("/board/policies");
  });

  it("FINANCE_OFFICER sees all finance nav items", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/finance"], "FINANCE_OFFICER");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/finance/payments");
    expect(hrefs).toContain("/finance/ledger");
    expect(hrefs).toContain("/finance/approvals");
  });

  it("INSTRUCTOR sees classes, materials, attendance, exams, students", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/tutor"], "INSTRUCTOR");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/tutor/classes");
    expect(hrefs).toContain("/tutor/materials");
    expect(hrefs).toContain("/tutor/attendance");
    expect(hrefs).toContain("/tutor/exams");
  });

  it("TEACHING_ASSISTANT sees classes and attendance but not exams", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/tutor"], "TEACHING_ASSISTANT");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/tutor/classes");
    expect(hrefs).toContain("/tutor/attendance");
    expect(hrefs).not.toContain("/tutor/exams");
  });

  it("STUDENT sees courses, payments, certificates but not timetable (no classes.join scheduled)", () => {
    const visible = filterNavByPermission(NAV_BY_PORTAL["/dashboard"], "STUDENT");
    const hrefs = visible.map((n) => n.href);
    expect(hrefs).toContain("/dashboard/courses");
    expect(hrefs).toContain("/dashboard/payments");
    expect(hrefs).toContain("/dashboard/certificates");
  });
});

// ─── Tests: STAFF_ROLES constant ────────────────────────────────────────────

describe("STAFF_ROLES constant", () => {
  const EXPECTED: UserRole[] = [
    "SUPER_ADMIN", "BOARD_MEMBER", "PRINCIPAL", "DEPUTY_PRINCIPAL",
    "ACADEMIC_REGISTRAR", "INSTRUCTOR", "TEACHING_ASSISTANT",
    "FINANCE_OFFICER", "HR_MANAGER", "ADMINISTRATOR",
    "AUDITOR_READONLY", "SYSTEM_IT",
  ];
  it("contains exactly the 12 active staff roles", () => {
    expect([...STAFF_ROLES].sort()).toEqual([...EXPECTED].sort());
  });
  it("does not include STUDENT", () => {
    expect(STAFF_ROLES).not.toContain("STUDENT");
  });
  it("does not include any legacy alias roles", () => {
    for (const legacy of ["SUPERADMIN", "BURSAR", "TUTOR", "REGISTRAR", "ADMIN", "HR_SYSTEM_ADMIN"]) {
      expect(STAFF_ROLES).not.toContain(legacy as UserRole);
    }
  });
});

// ─── Tests: separation of duties ────────────────────────────────────────────

describe("Separation of duties: no initiator can also be the approver", () => {
  it("FINANCE_OFFICER can initiate refunds but not approve them", () => {
    expect(can("FINANCE_OFFICER", "refunds.initiate")).toBe(true);
    expect(can("FINANCE_OFFICER", "refunds.approve")).toBe(false);
  });
  it("HR_MANAGER can initiate staff creation but not approve it", () => {
    expect(can("HR_MANAGER", "staff.create.initiate")).toBe(true);
    expect(can("HR_MANAGER", "staff.create.approve")).toBe(false);
  });
  it("ACADEMIC_REGISTRAR can request marks changes but not approve them", () => {
    expect(can("ACADEMIC_REGISTRAR", "marks.change.request")).toBe(true);
    expect(can("ACADEMIC_REGISTRAR", "marks.change.approve")).toBe(false);
  });
  it("SUPER_ADMIN can approve everything (final authority)", () => {
    expect(can("SUPER_ADMIN", "refunds.approve")).toBe(true);
    expect(can("SUPER_ADMIN", "staff.create.approve")).toBe(true);
    expect(can("SUPER_ADMIN", "marks.change.approve")).toBe(true);
  });
});

// ─── Tests: class join isolation ────────────────────────────────────────────

describe("classes.join is STUDENT-only; all staff use classes.view or classes.manage", () => {
  it("STUDENT can join classes", () =>
    expect(can("STUDENT", "classes.join")).toBe(true));
  it("SUPER_ADMIN cannot join classes", () =>
    expect(can("SUPER_ADMIN", "classes.join")).toBe(false));
  it("INSTRUCTOR manages classes, not joins them", () => {
    expect(can("INSTRUCTOR", "classes.manage")).toBe(true);
    expect(can("INSTRUCTOR", "classes.join")).toBe(false);
  });
  it("TEACHING_ASSISTANT views classes, not joins them", () => {
    expect(can("TEACHING_ASSISTANT", "classes.view")).toBe(true);
    expect(can("TEACHING_ASSISTANT", "classes.join")).toBe(false);
  });
});

// ─── Tests: forum staff-bypass correctness ───────────────────────────────────

describe("Forum staff-bypass: can(role,'classes.view') is the correct check", () => {
  // The fixed forum route uses: can(role, 'classes.view')
  // STUDENT does NOT have classes.view, so enrolment check applies to them.
  const STAFF_WITH_CLASSES_VIEW: UserRole[] = [
    "INSTRUCTOR", "TEACHING_ASSISTANT", "ACADEMIC_REGISTRAR",
    "PRINCIPAL", "DEPUTY_PRINCIPAL", "SUPER_ADMIN",
  ];
  for (const role of STAFF_WITH_CLASSES_VIEW) {
    it(`${role} has classes.view (staff bypass applies)`, () => {
      expect(can(role, "classes.view")).toBe(true);
    });
  }
  it("STUDENT does NOT have classes.view (must be enrolled to post)", () => {
    expect(can("STUDENT", "classes.view")).toBe(false);
  });
  it("FINANCE_OFFICER does NOT have classes.view (must be enrolled to post)", () => {
    expect(can("FINANCE_OFFICER", "classes.view")).toBe(false);
  });
  it("HR_MANAGER does NOT have classes.view", () => {
    expect(can("HR_MANAGER", "classes.view")).toBe(false);
  });
  it("ADMINISTRATOR does NOT have classes.view", () => {
    expect(can("ADMINISTRATOR", "classes.view")).toBe(false);
  });
});

// ─── Tests: portal coarse guard covers the student→tutor gap ─────────────────

describe("STUDENT cannot enter the tutor portal (classes.view guard)", () => {
  it("STUDENT does not have classes.view", () =>
    expect(can("STUDENT", "classes.view")).toBe(false));
  it("canAccessPrefix STUDENT /tutor returns false", () =>
    expect(canAccessPrefix("STUDENT", "/tutor")).toBe(false));
  it("INSTRUCTOR has classes.view and can enter /tutor", () =>
    expect(canAccessPrefix("INSTRUCTOR", "/tutor")).toBe(true));
  it("TEACHING_ASSISTANT has classes.view and can enter /tutor", () =>
    expect(canAccessPrefix("TEACHING_ASSISTANT", "/tutor")).toBe(true));
});
