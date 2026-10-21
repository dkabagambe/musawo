/**
 * RolesPermissionsView
 *
 * Read-only page showing the role tree (organogram) and the capability matrix.
 * Accessible to SUPER_ADMIN and AUDITOR_READONLY.
 * Every view by AUDITOR_READONLY is logged in the calling server component.
 */

import {
  ROLE_TREE,
  ROLE_PERMISSIONS,
  can,
  type Permission,
} from "@/lib/rbac";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleNode {
  role: string;
  label: string;
  parent: string | null;
  level: number;
  children: RoleNode[];
}

// ─── Role display labels ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:        "MD / CEO / ED / CFO",
  BOARD_MEMBER:       "Board Member / Institution Secretary",
  PRINCIPAL:          "Principal",
  DEPUTY_PRINCIPAL:   "Deputy Principal",
  ACADEMIC_REGISTRAR: "Academic Registrar",
  INSTRUCTOR:         "Teaching Staff",
  TEACHING_ASSISTANT: "Supporting Staff",
  FINANCE_OFFICER:    "Accounts / Audit",
  HR_SYSTEM_ADMIN:    "Human Resource and Administrator",
  AUDITOR_READONLY:   "Legal Advisor (Read-only)",
  SYSTEM_IT:          "Technical",
  STUDENT:            "Student",
};

// ─── Capability groups for the matrix display ─────────────────────────────────

const CAPABILITY_GROUPS: Array<{
  group: string;
  capabilities: Array<{ key: Permission; label: string }>
}> = [
  {
    group: "Students and Enrolments",
    capabilities: [
      { key: "students.view",          label: "View student records" },
      { key: "students.create",        label: "Create student accounts" },
      { key: "students.edit",          label: "Edit student records" },
      { key: "students.suspend",       label: "Suspend students" },
      { key: "students.export",        label: "Export student data" },
      { key: "students.view.contacts", label: "View student contacts" },
      { key: "applications.view",      label: "View applications inbox" },
      { key: "applications.process",   label: "Process applications" },
      { key: "enrolments.create",      label: "Create enrolments" },
    ],
  },
  {
    group: "Courses and Content",
    capabilities: [
      { key: "courses.create",   label: "Create courses (draft)" },
      { key: "courses.edit",     label: "Edit courses" },
      { key: "courses.publish",  label: "Publish / approve courses" },
      { key: "courses.delete",   label: "Delete courses" },
      { key: "content.upload",   label: "Upload materials (PDF, slides, video)" },
      { key: "content.approve",  label: "Approve content" },
      { key: "lessons.edit",     label: "Edit lessons" },
    ],
  },
  {
    group: "Live Classes and Attendance",
    capabilities: [
      { key: "classes.manage",         label: "Start, admit, moderate, stop classes" },
      { key: "classes.join",           label: "Join a live class" },
      { key: "attendance.take",        label: "Take roll call" },
      { key: "attendance.view.all",    label: "View all attendance" },
      { key: "attendance.export",      label: "Download attendance" },
    ],
  },
  {
    group: "Exams, Marks and Results",
    capabilities: [
      { key: "exams.create",   label: "Build and schedule exams" },
      { key: "exams.mark",     label: "Mark exams" },
      { key: "exams.release",  label: "Publish final results (Principal only)" },
      { key: "grades.edit",    label: "Enter and change marks" },
      { key: "grades.view",    label: "View marks" },
    ],
  },
  {
    group: "Certificates and Graduates",
    capabilities: [
      { key: "graduands.prepare", label: "Prepare graduands list" },
      { key: "graduands.approve", label: "Approve graduands (Principal)" },
      { key: "certificates.issue",  label: "Issue certificates" },
      { key: "certificates.revoke", label: "Revoke certificates (Super Admin)" },
      { key: "graduates.view",      label: "Access graduates register" },
      { key: "transcripts.generate","label": "Generate transcripts" },
    ],
  },
  {
    group: "Finance",
    capabilities: [
      { key: "payments.view",       label: "View payment records" },
      { key: "payments.hold",       label: "Place or lift payment holds" },
      { key: "ledger.view",         label: "View ledger" },
      { key: "finance.totals.view", label: "View finance totals (read-only)" },
      { key: "refunds.initiate",    label: "Request refund" },
      { key: "refunds.approve",     label: "Approve refund (Super Admin)" },
      { key: "waivers.approve",     label: "Approve waiver (Super Admin)" },
      { key: "fees.change.approve", label: "Approve fee change (Super Admin)" },
      { key: "reconciliation.view", label: "Reconciliation" },
    ],
  },
  {
    group: "Staff Accounts",
    capabilities: [
      { key: "staff.view",              label: "View staff list" },
      { key: "staff.create.initiate",   label: "Invite staff (HR or Super Admin)" },
      { key: "staff.create.approve",    label: "Approve staff creation (Super Admin)" },
      { key: "staff.suspend.initiate",  label: "Initiate staff suspension" },
      { key: "staff.role.change.approve","label": "Approve role change (Super Admin)" },
      { key: "staff.leave.manage",       label: "Manage leave (HR)" },
    ],
  },
  {
    group: "Governance and Audit",
    capabilities: [
      { key: "policies.view",          label: "View policies" },
      { key: "policies.edit",          label: "Edit policies" },
      { key: "policies.manage",        label: "Manage and version policies (Inst. Secretary)" },
      { key: "board_documents.manage", label: "Manage board documents (Inst. Secretary)" },
      { key: "audit.view",             label: "View audit log" },
      { key: "audit.view.full",        label: "View full audit log" },
      { key: "audit.comment",          label: "Flag or comment on audit items" },
      { key: "approvals.decide",       label: "Decide approval requests (Super Admin)" },
      { key: "access_review.complete", label: "Complete access review" },
    ],
  },
  {
    group: "Settings and System",
    capabilities: [
      { key: "settings.edit",         label: "Edit non-secret settings" },
      { key: "settings.edit.public",  label: "Edit public system data" },
      { key: "settings.edit.secrets", label: "Edit secrets and keys" },
      { key: "integrations.edit",     label: "Manage integrations" },
      { key: "backups.manage",        label: "Manage backups" },
      { key: "health.view",           label: "View system health" },
      { key: "break_glass.request",   label: "Request break-glass access" },
      { key: "break_glass.approve",   label: "Approve break-glass (Super Admin)" },
    ],
  },
  {
    group: "Reports and Announcements",
    capabilities: [
      { key: "reports.financial",        label: "Financial reports" },
      { key: "reports.academic",         label: "Academic reports" },
      { key: "reports.board",            label: "Board aggregates" },
      { key: "announcements.send.all",   label: "Send announcements to all" },
      { key: "announcements.send.own",   label: "Send announcements to own classes" },
      { key: "support.manage",           label: "Manage support tickets" },
    ],
  },
];

// ─── Active roles in display order ────────────────────────────────────────────

const ACTIVE_ROLES = [
  "SUPER_ADMIN",
  "BOARD_MEMBER",
  "PRINCIPAL",
  "DEPUTY_PRINCIPAL",
  "ACADEMIC_REGISTRAR",
  "FINANCE_OFFICER",
  "HR_SYSTEM_ADMIN",
  "AUDITOR_READONLY",
  "INSTRUCTOR",
  "TEACHING_ASSISTANT",
  "SYSTEM_IT",
  "STUDENT",
] as const;

type ActiveRole = typeof ACTIVE_ROLES[number];

// ─── Build the tree ───────────────────────────────────────────────────────────

function buildTree(): RoleNode[] {
  const nodes: Record<string, RoleNode> = {};
  for (const role of ACTIVE_ROLES) {
    nodes[role] = {
      role,
      label: ROLE_LABELS[role] ?? role,
      parent: ROLE_TREE[role]?.parent ?? null,
      level: ROLE_TREE[role]?.level ?? 99,
      children: [],
    };
  }
  const roots: RoleNode[] = [];
  for (const role of ACTIVE_ROLES) {
    const node = nodes[role];
    if (node.parent && nodes[node.parent]) {
      nodes[node.parent].children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ─── Components ───────────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0 }: { node: RoleNode; depth?: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 py-1.5"
        style={{ paddingLeft: `${depth * 28}px` }}
      >
        {depth > 0 && (
          <span className="text-[#6B7280]" aria-hidden="true">
            {depth === 1 ? "└" : "└"}
          </span>
        )}
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: depth === 0 ? "#0B6B5D" : "#E3EDEA",
            color: depth === 0 ? "#fff" : "#1F2937",
            border: depth === 0 ? "none" : "1px solid #D9E3E0",
          }}
        >
          Level {node.level}: {node.role}
        </span>
        <span className="text-sm text-[#1F2937]">{node.label}</span>
      </div>
      {node.children.length > 0 && (
        <ul className="list-none p-0 m-0">
          {node.children.map((child) => (
            <TreeNode key={child.role} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Legend cell ──────────────────────────────────────────────────────────────

type CellMark = "full" | "readonly" | "scoped" | "denied";

function cellMark(role: ActiveRole, permission: Permission): CellMark {
  const granted = can(role as Parameters<typeof can>[0], permission);
  if (!granted) return "denied";

  // Scoped roles (instructors and TAs see only own courses)
  if (
    (role === "INSTRUCTOR" || role === "TEACHING_ASSISTANT") &&
    (permission.startsWith("students.") ||
      permission.startsWith("grades.") ||
      permission.startsWith("courses.") ||
      permission.startsWith("attendance.") ||
      permission.startsWith("classes."))
  ) {
    return "scoped";
  }

  // Read-only roles
  if (
    role === "AUDITOR_READONLY" ||
    role === "BOARD_MEMBER"
  ) {
    return "readonly";
  }

  return "full";
}

const CELL_CONFIG: Record<CellMark, { bg: string; text: string; label: string; abbr: string }> = {
  full:     { bg: "#0B6B5D", text: "#fff",     label: "Allowed",          abbr: "A" },
  readonly: { bg: "#E3EDEA", text: "#0B6B5D",  label: "View only",        abbr: "V" },
  scoped:   { bg: "#FEF9C3", text: "#92400E",  label: "Scoped to own",    abbr: "S" },
  denied:   { bg: "#F9FAFB", text: "#D1D5DB",  label: "Not permitted",    abbr: "\u2013" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function RolesPermissionsView() {
  const roots = buildTree();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#1F2937]">Roles and Permissions</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Read-only view of the role hierarchy and capability matrix. Labels are editable
          in system settings. Permission checks in code always use stable permission keys,
          never role names. Every view of this page by the auditor is logged.
        </p>
      </div>

      {/* Role tree */}
      <section aria-labelledby="organogram-heading">
        <h2
          id="organogram-heading"
          className="text-base font-semibold text-[#1F2937] mb-4"
        >
          Role Hierarchy (Organogram)
        </h2>
        <div className="rounded-lg border border-[#D9E3E0] bg-white p-5">
          <ul className="list-none p-0 m-0 space-y-0.5">
            {roots.map((root) => (
              <TreeNode key={root.role} node={root} depth={0} />
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-[#D9E3E0] text-xs text-[#6B7280] space-y-1">
            <p>
              <strong>Inheritance rule:</strong> a senior role in the academic line inherits
              the action rights of every role beneath it. Inherited actions are logged
              "via role X". Money actions stay with Finance Officer only.
            </p>
            <p>
              <strong>Override rules:</strong> nobody approves their own request; payment
              verification above the threshold needs two people; mark changes after release
              need Principal approval; nobody grants themselves roles; accounts are never
              hard-deleted; the audit log cannot be edited.
            </p>
            <p>
              <strong>SUPER_ADMIN</strong> requires TOTP in production. Maximum 3 accounts.
              SUPER_ADMIN, BOARD_MEMBER and AUDITOR_READONLY accounts are created only by
              SUPER_ADMIN (CLI or seed for the first).
            </p>
          </div>
        </div>
      </section>

      {/* Legend */}
      <section aria-labelledby="legend-heading">
        <h2 id="legend-heading" className="sr-only">Legend</h2>
        <div className="flex flex-wrap gap-3 text-xs">
          {(Object.entries(CELL_CONFIG) as [CellMark, typeof CELL_CONFIG[CellMark]][]).map(
            ([mark, cfg]) => (
              <span
                key={mark}
                className="inline-flex items-center gap-1.5 rounded px-2 py-1"
                style={{ background: cfg.bg, color: cfg.text, border: "1px solid #D9E3E0" }}
              >
                <strong>{cfg.abbr}</strong> {cfg.label}
              </span>
            )
          )}
        </div>
      </section>

      {/* Capability matrix */}
      <section aria-labelledby="matrix-heading">
        <h2
          id="matrix-heading"
          className="text-base font-semibold text-[#1F2937] mb-4"
        >
          Capability Matrix
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[#D9E3E0]">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#E3EDEA]">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-[#E3EDEA] px-3 py-3 text-left font-semibold text-[#1F2937] min-w-[220px]"
                >
                  Capability
                </th>
                {ACTIVE_ROLES.map((role) => (
                  <th
                    key={role}
                    scope="col"
                    className="px-2 py-3 text-center font-semibold text-[#1F2937] min-w-[80px]"
                  >
                    <span className="block leading-tight">{ROLE_LABELS[role]?.split(" / ")[0] ?? role}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_GROUPS.map(({ group, capabilities }) => (
                <>
                  <tr key={group} className="bg-[#F3F7F6]">
                    <td
                      colSpan={ACTIVE_ROLES.length + 1}
                      className="sticky left-0 px-3 py-2 font-semibold text-[#1F2937] bg-[#F3F7F6]"
                    >
                      {group}
                    </td>
                  </tr>
                  {capabilities.map(({ key, label }) => (
                    <tr
                      key={key}
                      className="border-t border-[#D9E3E0] hover:bg-[#F3F7F6]"
                    >
                      <td className="sticky left-0 bg-white px-3 py-2 text-[#1F2937] hover:bg-[#F3F7F6]">
                        <span className="block">{label}</span>
                        <span className="text-[#6B7280] font-mono">{key}</span>
                      </td>
                      {ACTIVE_ROLES.map((role) => {
                        const mark = cellMark(role, key);
                        const cfg = CELL_CONFIG[mark];
                        return (
                          <td
                            key={role}
                            className="px-2 py-2 text-center"
                            title={`${ROLE_LABELS[role]}: ${cfg.label}`}
                          >
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold"
                              style={{ background: cfg.bg, color: cfg.text }}
                              aria-label={cfg.label}
                            >
                              {cfg.abbr}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Notes on inheritance and exceptions */}
      <section aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="text-base font-semibold text-[#1F2937] mb-3">
          Implementation Notes
        </h2>
        <div className="rounded-lg border border-[#D9E3E0] bg-white p-5 text-sm text-[#1F2937] space-y-3">
          <p>
            <strong>Permission-based checks only.</strong> Code calls{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">
              can(role, &quot;permission.key&quot;)
            </code>{" "}
            or{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">
              requirePermission(role, &quot;permission.key&quot;)
            </code>
            . Role names are never used in business logic.
          </p>
          <p>
            <strong>Inherited actions.</strong> When a senior role acts via an inherited
            permission, the audit log records{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">
              via role X
            </code>{" "}
            in the action metadata. Use{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">canVia(role, permission)</code>{" "}
            from{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">@/lib/rbac</code>{" "}
            to get the granting role.
          </p>
          <p>
            <strong>Institution Secretary.</strong> A BOARD_MEMBER account with the{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">institutionSecretary</code>{" "}
            flag also holds{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">policies.manage</code>{" "}
            and{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">board_documents.manage</code>.
            Check with{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">
              canForUser(role, permission, &#x7B; institutionSecretary &#x7D;)
            </code>.
          </p>
          <p>
            <strong>Record-level scoping.</strong> A permission does not remove the need to
            scope records to assigned courses, intakes or accounts. Instructor and Teaching
            Assistant queries must go through the teaching-scope helpers in{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">
              @/lib/teaching/scope
            </code>.
          </p>
          <p>
            <strong>Delegation.</strong> The Principal may delegate{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">exams.release</code>,{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">graduands.approve</code>,{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">certificates.issue</code>{" "}
            and{" "}
            <code className="font-mono text-xs bg-[#F3F7F6] px-1 rounded">courses.publish</code>{" "}
            to the Deputy Principal via a time-limited setting. Delegation is checked in
            the relevant approval handlers.
          </p>
        </div>
      </section>
    </div>
  );
}
