# Roles, Hierarchy and Permissions

Source of truth for the MTC role system. Stable permission keys live in
`src/lib/rbac/index.ts`. All code must call `can()`, `requirePermission()` or
`canForUser()` and never check role names directly.

---

## 1. Role Tree (Organogram)

```
Level 1  SUPER_ADMIN          MD / CEO / ED / CFO           (max 3 accounts, TOTP required in production)
Level 1  BOARD_MEMBER         Board Member / Institution Secretary (read-only oversight; see note *)
Level 1  SYSTEM_IT            Technical                      (outside the academic chain)

Level 2    PRINCIPAL          Principal

Level 3      DEPUTY_PRINCIPAL Deputy Principal

Level 4        ACADEMIC_REGISTRAR   Academic Registrar
Level 4        FINANCE_OFFICER      Accounts / Audit          (parallel branch)
Level 4        HR_SYSTEM_ADMIN      Human Resource and Administrator (parallel branch)
Level 4        AUDITOR_READONLY     Legal Advisor             (read-only oversight, every view logged)

Level 5          INSTRUCTOR         Teaching Staff

Level 6            TEACHING_ASSISTANT   Supporting Staff

Level 7              STUDENT            Student
```

`*` The Institution Secretary account is a `BOARD_MEMBER` with `institutionSecretary = true` on the `User` row. It additionally holds `policies.manage` and `board_documents.manage`, checked with `canForUser(role, permission, { institutionSecretary })`.

### Inheritance rules

- A senior role in the **academic line** (`PRINCIPAL` down through `STUDENT`) inherits the action rights of every role beneath it in its own branch.
- `SUPER_ADMIN` inherits all permissions from all roles.
- `PRINCIPAL` inherits the full academic branch below it.
- `DEPUTY_PRINCIPAL` inherits the academic branch below it. Finance and HR branches are siblings, not descendants, so DEPUTY_PRINCIPAL does NOT inherit Finance or HR powers.
- `AUDITOR_READONLY` is a child of `DEPUTY_PRINCIPAL` in the organogram for oversight purposes only. Its read-only audit superpowers (`audit.view.full`, `audit.comment`) are **explicitly denied** on `DEPUTY_PRINCIPAL` and `ACADEMIC_REGISTRAR` so they do not flow up the line.
- Inherited actions are logged "via role X". Use `canVia(role, permission)` from `@/lib/rbac` to get the granting role.
- Money actions (`payments.*`, `ledger.*`, `refunds.*`, `waivers.*`, `fees.change.*`) stay with `FINANCE_OFFICER` only. Even `PRINCIPAL`'s explicit deny list blocks these.
- `BOARD_MEMBER` and `SYSTEM_IT` are independent branches with no inheritance relationship to the academic line.

### Separation-of-duties overrides (override inheritance)

| Rule | Enforcement |
|---|---|
| Nobody approves their own request | `assertNotSelfApproval(initiatorId, approverId)` in approval handlers |
| Payment verification above the threshold needs two people | `claims.second_verify` permission + same-person check in `/api/bursar/claims/*/second-verify` |
| Mark changes after release need a reason and Principal approval | Approval request of type `MARKS_CHANGE` (pending) |
| Nobody grants themselves a role | `staff.role.change.approve` gated on SUPER_ADMIN only |
| Accounts are never hard-deleted | Deactivate or archive; no DELETE in any handler |
| Audit log cannot be edited | No `UPDATE` or `DELETE` route for `audit_logs` table |
| SUPER_ADMIN, BOARD_MEMBER and AUDITOR_READONLY accounts created only by SUPER_ADMIN | Enforced in `staff.create.approve` permission (SUPER_ADMIN only) |
| SUPER_ADMIN requires TOTP in production | Enforced in auth middleware (`totpEnabled` check) |

---

## 2. Capability Matrix

A = Act (full write); V = View (read-only); S = Scoped to own records; D = only when delegated; R = Request only; L = Limited fields; - = No access

| Capability | SUPER | BOARD | PRINC | DEPUTY | REGIS | INSTR | TA | FIN | AUDIT | HR | IT | STUD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Student accounts (create, edit, deactivate) | A | - | A | A | A | V,S | V,S | L | V | - | - | S |
| Applications inbox | V | - | V | V | A | - | - | - | V | - | - | - |
| Course records (create, edit) | V | - | P | D | A (draft) | S | S | - | V | - | - | - |
| Course content and materials | V | - | A | A | V | A,S | A,S (draft) | - | V | - | - | V (read/watch only) |
| Live classes: start, admit, moderate, stop, record | V | - | A | A | V | A,S | A (assigned) | - | V | - | - | join when allowed |
| Roll call and attendance download | V | - | A | A | V | A,S | A (assigned) | - | V | - | - | S (own) |
| Online presence ("who is online") | V | - | V | V | V | V,S | V,S | - | - | - | - | - |
| Exams and tests (build, schedule, mark) | V | - | A | V | V (timetable A) | A,S | - | - | V | - | - | take |
| Marks entry and change before release | V | - | A | V | - | A,S | - | - | V | - | - | S |
| Marks change after release | V | - | P | R | - | R | - | - | V | - | - | - |
| Publish final results | V | - | P | D | - | - | - | - | V | - | - | - |
| Transcripts, certificates, graduates register | V | V (L) | P | D | A | V,S | - | - | V | - | - | S (own) |
| Practical exams, log books, simulations | V | - | A | V | V | A,S | A,S | - | V | - | - | S |
| Payments, ledger, receipts, reconciliation | V | V (totals) | V | V (status) | V (status) | - | - | A | V | - | - | S |
| Refunds, waivers, fee changes | P | - | R | - | - | - | - | R | V | - | - | - |
| Payment holds (block or unblock) | A | - | A | V | - | - | - | A | V | - | - | - |
| Staff accounts (invite, deactivate, archive) | A | - | V | V | - | - | - | - | V | A (limited) | - | - |
| Roles and permissions | A | - | V | - | - | - | - | - | V | - | - | - |
| Policies | A | V | A | V | V | V | V | V | V | V | - | V |
| Internal announcements | A | - | A | A | A | A,S | - | - | - | - | - | V |
| Messaging (instructor and own students) | - | - | A | A | - | A,S | A,S | - | - | - | - | A,S |
| Complaints register | V | - | A | A | V | - | - | - | V | - | - | S (submit) |
| Timetable, calendar, venues | V | - | V | A (clashes) | A | V | V | - | V | A | - | V |
| Support tickets | V | - | V | V | A | - | A | - | V | A | - | S (submit) |
| Alumni follow-up | V | V (aggregate) | V | V | A | - | - | - | V | - | - | - |
| Reports and dashboards | all | aggregates | all | academic+ops | academic | own classes | - | financial | all read-only | HR | system | own |
| Audit log | V | - | V (academic+staff) | - | - | - | - | - | V | - | V (technical) | - |
| System settings and integrations | A | - | - | - | - | - | - | - | - | A (non-secret) | A | - |
| Backups, logs, health | V | - | - | - | - | - | - | - | - | - | A | - |
| Bulk export of personal data | P | - | A (scoped) | - | A (scoped) | - | - | A (finance) | A | - | - | - |
| Policies manage (Institution Secretary) | A | IS only | - | - | - | - | - | - | - | - | - | - |
| Board documents (Institution Secretary) | A | IS only | - | - | - | - | - | - | - | - | - | - |

IS = Institution Secretary account only (BOARD_MEMBER with `institutionSecretary = true`).

---

## 3. Role Descriptions

### SUPER_ADMIN (MD / CEO / ED / CFO)
Sees everything. Decision dashboard (enrolment, income, performance, pending approvals). Gives final approval of refunds, waivers, fee changes, role changes and bulk exports. Creates, deactivates and archives any account. Controls settings and policies. Reads the full audit log. Maximum 3 accounts. TOTP required in production.

### BOARD_MEMBER (Board of Directors / Institution Secretary)
Read-only governance. Sees aggregate reports, policies, graduate names with course and year. No individual student contacts or payment details. The Institution Secretary account additionally manages policies and board documents (`institutionSecretary = true`).

### PRINCIPAL
All academic privileges. Approves new courses and content, approves lecturers and assignments, publishes final results, approves graduands and certificates, sends announcements, reads finance totals and full audit data, reviews applications. Inherits everything a Registrar, Instructor or TA can do (logged "via role").

### DEPUTY_PRINCIPAL
Day-to-day operations. Student complaints, teaching staff attendance, timetable clashes, exam supervision, class observation. Inherits Registrar, Instructor and TA powers. Cannot archive or delete; cannot publish results, approve graduands or approve courses unless Principal delegates (setting with expiry).

### ACADEMIC_REGISTRAR
Creates student accounts, applications, admissions, enrolments, class groups, course records for Principal approval, academic calendar and exam timetables, transcripts and progress reports, graduates register, alumni follow-up, certificates after Principal approval. Sees payment status only; cannot publish results or change marks.

### INSTRUCTOR (Teaching Staff)
Assigned courses and units only. Uploads materials; creates and teaches live classes (moderator); takes roll call; builds and marks exams; manages practical assessments and log books; chats with own students; announces to own classes; sees graduates of own courses.

### TEACHING_ASSISTANT (Supporting Staff)
Helps upload materials (instructor publishes); takes roll call when assigned; helps students. Cannot set final marks.

### FINANCE_OFFICER (Accounts / Audit)
Fee status per student, payment holds with reason, records and verifies payments, reconciliation, receipts, financial reports. Requests refunds, waivers and fee changes (SUPER_ADMIN approves). Cannot see exam questions or edit marks.

### AUDITOR_READONLY (Legal Advisor)
Read-only on policies, student records, graduates, finance, audit logs and complaints. May add flags or comments on audit items. Edits nothing. Every view logged.

### HR_SYSTEM_ADMIN (Human Resource and Administrator)
Staff records, staff invites, leave, support tickets, timetable and venues, non-secret settings. Cannot create SUPER_ADMIN, BOARD_MEMBER or AUDITOR_READONLY. No academic content, finance or secrets.

### SYSTEM_IT
Technical settings, integrations, backups, health. No student or finance data without approved break-glass access.

### STUDENT
Own learning only. Account created by Registrar; approved by student via email link; login impossible before approval. Reads and watches materials inside the platform only (no downloads). Takes timed exams. Sees own results, certificates, payments and transcript.

---

## 4. Legacy Role Migration

| Old role | Maps to | Notes |
|---|---|---|
| MANAGING_DIRECTOR | SUPER_ADMIN | |
| BURSAR | FINANCE_OFFICER | URL `/bursar` redirects to `/finance` |
| ACCOUNTS | FINANCE_OFFICER | |
| REGISTRAR | ACADEMIC_REGISTRAR | |
| TUTOR | INSTRUCTOR | |
| ADMIN | HR_SYSTEM_ADMIN | |
| ADMINISTRATOR | HR_SYSTEM_ADMIN | |
| BUSINESS_DEV_MANAGER | STUDENT | Pending access review |
| COMMUNICATIONS_OFFICER | STUDENT | Pending access review |
| MARKETING_COMMS | STUDENT | Pending access review |

Migration SQL: `prisma/migrations/20261020161000_migrate_legacy_roles/migration.sql`.

---

## 5. Implementation Notes

### Checking permissions in code

```ts
import { can, requirePermission, canForUser, canVia } from "@/lib/rbac";

// Gate a server action
requirePermission(session.user.role, "students.create");

// Conditional check
if (can(role, "grades.edit")) { ... }

// Account-level flags (Institution Secretary)
if (canForUser(role, "policies.manage", { institutionSecretary: user.institutionSecretary })) { ... }

// Audit log "via role X"
const via = canVia(role, "graduands.prepare"); // e.g. "ACADEMIC_REGISTRAR"
await audit({ ..., metadata: { via } });
```

### Record-level scoping

A permission does not remove the need to scope records to assigned courses, intakes or accounts. Instructor and TA queries use `teachingCourseWhere()` or `canAccessTeachingCourse()` from `@/lib/teaching/scope`.

### Delegation

The Principal may delegate `exams.release`, `graduands.approve`, `certificates.issue` and `courses.publish` to the Deputy Principal via a time-limited site setting. Delegation is checked in the relevant approval handlers.

### SUPER_ADMIN TOTP

`totpEnabled` on the User row. The auth flow enforces TOTP verification for SUPER_ADMIN accounts in production. TOTP setup is at `/profile/security`.

---

## 6. Gap Report (audit vs spec at 2026-10-21)

| Area | Status | Notes |
|---|---|---|
| Role tree levels | Fixed | Was 0-6; now matches spec (1-7) |
| AUDITOR_READONLY parent | Fixed | Was null; now DEPUTY_PRINCIPAL (oversight branch) |
| Explicit deny for audit.view.full on DEPUTY_PRINCIPAL/ACADEMIC_REGISTRAR | Added | Prevents AUDITOR_READONLY oversight powers leaking up the line |
| canVia() helper | Added | Returns granting role for audit "via role X" entries |
| canForUser() helper | Added | Handles institutionSecretary account-level flag |
| getInheritedRolesFor() | Exported | Named export for testing and tooling |
| policies.manage permission | Added | Institution Secretary only |
| board_documents.manage permission | Added | Institution Secretary only |
| institutionSecretary field on User | Added | Migration 20261021120000 |
| Institution Secretary demo account | Added | secretary@mtc.ac.ug in seed and /dev/login |
| Second SUPER_ADMIN | Present | deputy@mtc.ac.ug (Beatrice Nansamba) |
| Roles and Permissions page (SUPER_ADMIN) | Added | /director/roles |
| Roles and Permissions page (AUDITOR_READONLY) | Added | /auditor/roles (every view logged) |
| AuditAction.ROLES_PERMISSIONS_VIEWED | Added | Migration 20261021121000 |
| docs/ROLES.md | Added | This file |
| Seed role tree levels | Fixed | Matches corrected ROLE_TREE |
| TOTP enforcement code | Existing | In auth middleware; not part of section 1 |
| Delegation setting with expiry | Pending | Approval handler integration (Batch E) |
| Marks-change approval workflow | Pending | Batch D |
| Board documents model | Pending | Schema model for board_documents table (Batch E) |
| Max 3 SUPER_ADMIN accounts enforcement | Existing | MAX_SUPER_ADMIN_ACCOUNTS check in staff create handler |
