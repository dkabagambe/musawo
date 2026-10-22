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
Level 4        HR_MANAGER           Human Resource (parallel branch)
Level 4        AUDITOR_READONLY     Legal Advisor             (read-only oversight, every view logged)

Level 5          INSTRUCTOR         Teaching Staff
Level 5        ADMINISTRATOR        School Operations (child of HR_MANAGER)

Level 6            TEACHING_ASSISTANT   Supporting Staff

Level 7              STUDENT            Student
```

`*` The Institution Secretary account is a `BOARD_MEMBER` with `institutionSecretary = true` on the `User` row. It additionally holds `policies.manage` and `board_documents.manage`, checked with `canForUser(role, permission, { institutionSecretary })`.

### Inheritance rules

- A senior role in the **academic line** (`PRINCIPAL` down through `STUDENT`) inherits the action rights of every role beneath it in its own branch.
- `SUPER_ADMIN` inherits all permissions from all roles.
- `PRINCIPAL` inherits the full academic branch below it.
- `DEPUTY_PRINCIPAL` inherits the academic branch below it. Finance and HR branches are siblings, not descendants, so DEPUTY_PRINCIPAL does NOT inherit Finance or HR powers.
- `HR_MANAGER` inherits operational permissions from its `ADMINISTRATOR` child. `ADMINISTRATOR` does not inherit HR staff creation, leave management, or staff access review.
- `AUDITOR_READONLY` is a child of `DEPUTY_PRINCIPAL` in the organogram for oversight purposes only. Its read-only audit superpowers (`audit.view.full`, `audit.comment`) are **explicitly denied** on `DEPUTY_PRINCIPAL` and `ACADEMIC_REGISTRAR` so they do not flow up the line.
- Inherited actions are logged "via role X". Use `canVia(role, permission)` from `@/lib/rbac` to get the granting role.
- Money actions (`payments.*`, `ledger.*`, `refunds.*`, `waivers.*`, `fees.change.*`) stay with `FINANCE_OFFICER` only. Even `PRINCIPAL`'s explicit deny list blocks these.
- `BOARD_MEMBER` and `SYSTEM_IT` are independent branches with no inheritance relationship to the academic line.

### Separation-of-duties overrides (override inheritance)

| Rule                                                                                | Enforcement                                                                                   |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Nobody approves their own request                                                   | `assertNotSelfApproval(initiatorId, approverId)` in approval handlers                         |
| Payment verification above the threshold needs two people                           | `claims.second_verify` permission + same-person check in `/api/bursar/claims/*/second-verify` |
| Mark changes after release need a reason and Principal approval                     | Approval request of type `MARKS_CHANGE` (pending)                                             |
| Nobody grants themselves a role                                                     | `staff.role.change.approve` gated on SUPER_ADMIN only                                         |
| Accounts are never hard-deleted                                                     | Deactivate or archive; no DELETE in any handler                                               |
| Audit log cannot be edited                                                          | No `UPDATE` or `DELETE` route for `audit_logs` table                                          |
| SUPER_ADMIN, BOARD_MEMBER and AUDITOR_READONLY accounts created only by SUPER_ADMIN | Enforced in `staff.create.approve` permission (SUPER_ADMIN only)                              |
| SUPER_ADMIN requires TOTP in production                                             | Enforced in auth middleware (`totpEnabled` check)                                             |

---

## 6. Gap Report (source audit at 2026-10-22)

This report compares the requested role capabilities with the effective role
map in `src/lib/rbac/index.ts`, including descendant inheritance and explicit
denies. It is a permission-map audit, not proof that every API route, query,
seed account, or UI control enforces the same scope.

P = present at the permission-map level; M = expected but missing; W = wrong,
overbroad, or assigned contrary to the specification; - = correctly absent or
not applicable. A P does not prove record-level scoping or approval workflow.

| Role               | Academic records                              | Applications  | Courses and content         | Live and attendance         | Exams and results             | Graduates and certificates                 | Finance                                             | Staff and HR                                    | Settings and technical                                  | Audit and oversight                                    | Communications and support       |
| ------------------ | --------------------------------------------- | ------------- | --------------------------- | --------------------------- | ----------------------------- | ------------------------------------------ | --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ | -------------------------------- |
| SUPER_ADMIN        | P                                             | P             | P                           | P                           | P                             | P                                          | P                                                   | P                                               | P                                                       | P                                                      | P                                |
| BOARD_MEMBER       | P (aggregates)                                | -             | P (aggregate only)          | -                           | -                             | P (names, course, year)                    | P (aggregates only)                                 | -                                               | W (settings.view granted)                               | W (audit.view granted)                                 | -                                |
| PRINCIPAL          | P                                             | P             | P                           | P                           | P                             | P                                          | P (totals intended)                                 | W (inherits HR support.manage)                  | W (inherits settings.view)                              | W (audit.comment inherited)                            | P                                |
| DEPUTY_PRINCIPAL   | P                                             | P             | P                           | P                           | P (release denied by default) | P (approval denied by default)             | P (totals intended)                                 | W (inherits HR support.manage)                  | W (inherits settings.view)                              | P (full audit denied)                                  | P                                |
| ACADEMIC_REGISTRAR | P                                             | P             | P                           | P                           | P                             | W (certificates.issue is directly granted) | W (waivers.initiate granted)                        | W (staff create and suspend initiation granted) | -                                                       | W (audit.view granted without a stated Registrar need) | P                                |
| INSTRUCTOR         | P (own scope required)                        | -             | P (own scope required)      | P (assigned scope required) | P (own scope required)        | P (own-course scope required)              | W (inherits payments.initiate and claims.submit)    | -                                               | -                                                       | -                                                      | P (own classes)                  |
| TEACHING_ASSISTANT | P (assigned scope required)                   | -             | P (assigned upload)         | P (assigned scope required) | -                             | -                                          | W (inherits payments.initiate and claims.submit)    | -                                               | -                                                       | -                                                      | -                                |
| FINANCE_OFFICER    | P (fee records)                               | -             | -                           | -                           | -                             | -                                          | P                                                   | -                                               | -                                                       | P (filtered audit)                                     | -                                |
| HR_SYSTEM_ADMIN    | W (students.view and enrolments.view granted) | -             | -                           | -                           | -                             | -                                          | -                                                   | P                                               | P (non-secret settings)                                 | W (audit.view granted without a stated HR need)        | P (support)                      |
| AUDITOR_READONLY   | P (read-only)                                 | P (read-only) | P (read-only)               | P (read-only)               | P (read-only)                 | P (read-only)                              | P (read-only)                                       | P (read-only)                                   | W (settings.view granted without a stated auditor need) | P                                                      | P (read-only complaints)         |
| SYSTEM_IT          | -                                             | -             | -                           | -                           | -                             | -                                          | -                                                   | -                                               | P                                                       | P (technical audit)                                    | -                                |
| STUDENT            | P (own scope required)                        | -             | P (released materials only) | P (admitted classes only)   | P (own attempts and results)  | P (own records)                            | M (no dedicated own-payment status/view permission) | -                                               | -                                                       | -                                                      | M (no support-submit permission) |

### Confirmed permission-map discrepancies

- The hierarchy makes `claims.submit` a descendant permission of STUDENT.
  INSTRUCTOR, TEACHING_ASSISTANT, ACADEMIC_REGISTRAR, DEPUTY_PRINCIPAL and
  PRINCIPAL inherit it, and the current deny lists do not block it. The student
  payment action must not be inherited by staff roles.
- `payments.initiate` is also a STUDENT descendant permission. INSTRUCTOR and
  TEACHING_ASSISTANT inherit it because their deny lists only block
  `classes.join`; this gives teaching staff a student payment action.
- ACADEMIC_REGISTRAR is directly granted `waivers.initiate`,
  `staff.create.initiate`, `staff.suspend.initiate`, and `certificates.issue`.
  These conflict with the specified finance, HR, and Principal approval
  boundaries. Remove or replace them with narrowly scoped request/issue-after-
  approval permissions during implementation.
- HR_SYSTEM_ADMIN is directly granted `students.view` and `enrolments.view`,
  despite the specified HR-only data boundary.
- BOARD_MEMBER is granted `settings.view` and `audit.view`; the specification
  limits this role to read-only governance aggregates, policies, and graduate
  names/course/year.
- PRINCIPAL and DEPUTY_PRINCIPAL inherit `support.manage` from the HR branch;
  their complaint-management need should not imply general HR support-ticket
  administration. PRINCIPAL also inherits `audit.comment` from
  AUDITOR_READONLY.
- ACADEMIC_REGISTRAR receives `audit.view` directly, but the specification
  does not assign audit-log access to that role.
- STUDENT has `payments.initiate` and `claims.submit`, but no dedicated
  permission for viewing their payment status or receipts. Route-level access
  may exist, but it is not represented by this permission map.
- STUDENT has no permission for submitting a support request, although the
  specification gives students a complaint submission path.
- `partner_pages.edit` remains in the permission type and legacy/administrator
  grants. Confirm that it is unused and remove it if it is a public-content
  editor, because public homepage content management is out of scope.
- Record-level scopes, self-approval prevention, dual verification, audit
  logging, invitation acceptance, TOTP, maximum account count, and delegation
  must be verified in their owning routes and UI. This source audit alone does
  not establish those controls.

### Existing implementation evidence

The current worktree includes role inheritance and explicit deny handling,
`canVia()`, `canForUser()`, an institution secretary flag, time-limited Deputy
delegation, marks-change approval fields and handlers, board document APIs, and
RBAC unit tests. The tests cover selected permissions and hierarchy rules, but
do not exhaustively assert the specification against every role-capability pair.
Those existing changes are evidence, not a clean implementation sign-off.

## 7. Administrator and HR Manager Gap Report (pre-implementation audit at 2026-10-22)

This is the required audit before implementing the new operational
ADMINISTRATOR role and renaming HR_SYSTEM_ADMIN to HR_MANAGER. P = present,
M = missing, W = wrong or unsafe, and Partial = reusable but incomplete.

| Capability                                 | Current state | Evidence and gap                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Distinct ADMINISTRATOR role                | W             | `ADMINISTRATOR` is a legacy UserRole alias to HR_SYSTEM_ADMIN, and `ROLE_ALIASES` canonicalizes it to HR_SYSTEM_ADMIN. It is not the new operational role.                                                                                                         |
| HR_MANAGER role and hierarchy              | M             | HR_SYSTEM_ADMIN is under DEPUTY_PRINCIPAL. There is no HR_MANAGER key or ADMINISTRATOR child node.                                                                                                                                                                 |
| Role labels                                | Partial       | `/admin/settings` edits some role labels, but the HR_SYSTEM_ADMIN label is still Human Resource and Administrator and there is no separate Administrator label.                                                                                                    |
| Shared dashboard and navigation            | Partial       | Shared widgets and permission-filtered navigation exist. Current admin widgets are registered only for HR_SYSTEM_ADMIN, with staff, student, class and audit widgets that do not fit the new role boundaries.                                                      |
| Support ticket submission                  | W             | `POST /api/support` accepts any authenticated account and notifies legacy role names. There is no category, assignment, reply, close, email reply, audit, or rate-limit workflow.                                                                                  |
| Support ticket management                  | M             | `/admin/support` is a placeholder. There is no management API for listing, assigning, replying to, or closing tickets.                                                                                                                                             |
| Pending invite resend                      | Partial       | `/api/admin/staff-invite/[id]` supports resend and revoke, and logs those actions. It authorizes using broad student or staff creation permissions, has no ADMINISTRATOR-specific permission, role-target exclusions, rate limiting, or target notification.       |
| Password reset link administration         | M             | `/api/auth/reset-password` only consumes an existing reset token. No authorized staff endpoint creates or sends reset links, and no role-specific target restrictions or audit trail exist.                                                                        |
| Student front-desk lookup                  | M             | Student list APIs require broad students.view. There is no limited-field lookup, lookup audit event, or class-list/attendance-sheet PDF workflow for the operational role.                                                                                         |
| Timetable and venue management             | M             | `/admin/timetable` is a placeholder. No venue or room model/API was found; no booking, conflict, practical-session, or printable booking workflow exists.                                                                                                          |
| Academic timetable ownership               | W             | Current HR timetable page text implies HR manages timetables. The new role may manage room logistics only; academic calendar and exam timetable remain Registrar-owned, and clash decisions remain Deputy-owned.                                                   |
| Operational notices and reminders          | M             | Existing announcement permissions are academic. There is no operational notice permission, template registry, delivery log, or channel workflow scoped to logistics.                                                                                               |
| Equipment checklist                        | M             | No skills-lab equipment or supplies model, API, or dashboard widget was found.                                                                                                                                                                                     |
| Non-secret settings                        | W             | HR_SYSTEM_ADMIN has broad settings.edit, while the public-system setting allowlist is controlled by settings.edit.public. There is no key-scoped permission for the new role's limited contacts, intake label, venues, reminder templates, and support categories. |
| HR staff operations                        | Partial       | HR_SYSTEM_ADMIN has staff.view, staff.create.initiate, staff.suspend.initiate and staff.leave.manage. There is no HR_MANAGER role, staff access-review permission for HR, or explicit separation from operational support/timetable/settings duties.               |
| HR inheritance of Administrator operations | M             | No parent-child relationship or audit metadata behavior exists for HR_MANAGER inheriting ADMINISTRATOR permissions.                                                                                                                                                |
| Staff invite role list                     | W             | Invite schemas allow HR_SYSTEM_ADMIN but not ADMINISTRATOR or HR_MANAGER. Existing ADMINISTRATOR enum handling is legacy and can be mistaken for the new role.                                                                                                     |
| Demo seed and `/dev/login`                 | M             | The visible login selector has an HR / System Admin account only. No distinct admin@mtc.ac.ug account or Administrator operational seed data was found in the selector.                                                                                            |
| Administrator and HR Manager tests         | M             | Tests cover HR_SYSTEM_ADMIN permissions and selected hierarchy rules only. There are no matrix rows or route tests for the new role, reset-link restrictions, lookups, operational settings, or inherited HR actions.                                              |
| Documentation and dashboards               | M             | The proposed role specification is present in `docs/kiro.md`, but `docs/ROLES.md`, `docs/DEMO.md`, the read-only roles page, and dashboard registry do not describe or provide the new role.                                                                       |

### Reuse and implementation boundary

Reusable pieces are the shared AppShell and dashboard registry, StaffInvite
tokens and email templates, audit helper, SiteSetting storage, and existing
class schedule data. New permission keys and data-scoped route checks are
needed for operational tickets, limited student lookup, invite resend, reset
link delivery, room logistics, equipment, and operational notices. The
Administrator must not receive student creation, staff creation, academic
calendar, exam timetable, academic announcements, payment, marks, certificate,
or audit-log permissions. The legacy ADMINISTRATOR mapping must be migrated to
HR_MANAGER before the ADMINISTRATOR key is reused.
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
| Marks change after release (request) | - | - | - | - | R | R | - | - | V | - | - | - |
| Marks change after release (approve) | P | - | P | D | - | - | - | - | V | - | - | - |
| Board documents (view) | A | V | - | - | - | - | - | - | V | - | - | - |

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

### HR_MANAGER (Human Resource)

Staff records, staff invites, leave, and quarterly staff access review. Inherits operational actions from ADMINISTRATOR, with inherited actions logged via role. Cannot create SUPER_ADMIN, BOARD_MEMBER, or AUDITOR_READONLY. No student records, finance, academic content, or secrets.

### ADMINISTRATOR (School Operations)

Runs the front desk and daily school operations. Manages support tickets, resends eligible pending invites, sends password reset links to eligible accounts, performs limited student lookup, maintains room bookings and practical sessions, checks equipment, sends logistics notices, and edits the operational settings allowlist. Cannot create student or staff accounts, change account email or phone, access payments, academic records, audit logs, secrets, or bulk exports. Academic calendar and exam timetables remain with the Academic Registrar.

### SYSTEM_IT

Technical settings, integrations, backups, health. No student or finance data without approved break-glass access.

### STUDENT

Own learning only. Account created by Registrar; approved by student via email link; login impossible before approval. Reads and watches materials inside the platform only (no downloads). Takes timed exams. Sees own results, certificates, payments and transcript.

---

## 4. Legacy Role Migration

| Old role               | Maps to            | Notes                                                             |
| ---------------------- | ------------------ | ----------------------------------------------------------------- |
| MANAGING_DIRECTOR      | SUPER_ADMIN        |                                                                   |
| BURSAR                 | FINANCE_OFFICER    | URL `/bursar` redirects to `/finance`                             |
| ACCOUNTS               | FINANCE_OFFICER    |                                                                   |
| REGISTRAR              | ACADEMIC_REGISTRAR |                                                                   |
| TUTOR                  | INSTRUCTOR         |                                                                   |
| ADMIN                  | HR_MANAGER         | Legacy enum value, migrated to HR_MANAGER                         |
| HR_SYSTEM_ADMIN        | HR_MANAGER         | Legacy canonical role, migrated to HR_MANAGER                     |
| ADMINISTRATOR          | HR_MANAGER         | Legacy accounts migrated before reusing key for School Operations |
| BUSINESS_DEV_MANAGER   | STUDENT            | Pending access review                                             |
| COMMUNICATIONS_OFFICER | STUDENT            | Pending access review                                             |
| MARKETING_COMMS        | STUDENT            | Pending access review                                             |

Migration SQL: `prisma/migrations/20261020161000_migrate_legacy_roles/migration.sql`.

Role split migrations: `prisma/migrations/20261022130000_add_hr_manager_role/`
and `prisma/migrations/20261022131000_migrate_hr_roles/`.

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

## 8. Historical Gap Log (2026-10-21)

| Area                                                                     | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role tree levels                                                         | Fixed    | Was 0-6; now matches spec (1-7)                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| AUDITOR_READONLY parent                                                  | Fixed    | Was null; now DEPUTY_PRINCIPAL (oversight branch)                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Explicit deny for audit.view.full on DEPUTY_PRINCIPAL/ACADEMIC_REGISTRAR | Added    | Prevents AUDITOR_READONLY oversight powers leaking up the line                                                                                                                                                                                                                                                                                                                                                                                                                                |
| canVia() helper                                                          | Added    | Returns granting role for audit "via role X" entries                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| canForUser() helper                                                      | Added    | Handles institutionSecretary account-level flag                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| getInheritedRolesFor()                                                   | Exported | Named export for testing and tooling                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| policies.manage permission                                               | Added    | Institution Secretary only                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| board_documents.manage permission                                        | Added    | Institution Secretary only                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| institutionSecretary field on User                                       | Added    | Migration 20261021120000                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Institution Secretary demo account                                       | Added    | secretary@mtc.ac.ug in seed and /dev/login                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Second SUPER_ADMIN                                                       | Present  | deputy@mtc.ac.ug (Beatrice Nansamba)                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Roles and Permissions page (SUPER_ADMIN)                                 | Added    | /director/roles                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Roles and Permissions page (AUDITOR_READONLY)                            | Added    | /auditor/roles (every view logged)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| AuditAction.ROLES_PERMISSIONS_VIEWED                                     | Added    | Migration 20261021121000                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| docs/ROLES.md                                                            | Added    | This file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Seed role tree levels                                                    | Fixed    | Matches corrected ROLE_TREE                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| TOTP enforcement code                                                    | Existing | In auth middleware; not part of section 1                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Delegation setting with expiry                                           | **Done** | `isDelegatedToDeputy()`, `canDeputyWithDelegation()`, `getDelegationSettings()` in `src/lib/rbac/index.ts`; `DELEGATABLE_TO_DEPUTY` list; `/api/principal/delegation` (GET/POST/DELETE); `DELEGATION_GRANTED` + `DELEGATION_REVOKED` audit actions; tests in `rbac.test.ts`                                                                                                                                                                                                                   |
| Marks-change approval workflow                                           | **Done** | `MARKS_CHANGE` added to `ApprovalRequestType`; `marks.change.request` (INSTRUCTOR, REGISTRAR) and `marks.change.approve` (PRINCIPAL, SUPER_ADMIN, DEPUTY when delegated) permissions; `GradeEntry.releasedAt` / `changeReason` / `changeApprovalId` columns; `/api/grades/change-request` (POST); `/api/principal/grades/release` (POST); approval PATCH handler applies grade update on approval; `GRADE_RELEASED` + `GRADE_CHANGE_REQUESTED` + `GRADE_CHANGE_APPROVED` audit actions; tests |
| Board documents model                                                    | **Done** | `BoardDocument` model in schema; `BoardDocumentCategory` enum; `board_documents.manage` (SUPER_ADMIN + Institution Secretary) and `board_documents.view` (BOARD_MEMBER, AUDITOR_READONLY, SUPER_ADMIN) permissions; `/api/board/documents` (GET/POST) and `/api/board/documents/[id]` (GET/PATCH/DELETE); AUDITOR_READONLY views logged; tests                                                                                                                                                |
| Max 3 SUPER_ADMIN accounts enforcement                                   | Existing | MAX_SUPER_ADMIN_ACCOUNTS check in staff create handler                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## 9. Current HR_MANAGER and ADMINISTRATOR Capability Matrix

The role-specific matrix below is current after the split. `A` means act, `V`
means view, `S` means own or scoped data, `R` means resend or request only, and
`-` means no access.

| Capability                                          | HR_MANAGER                       | ADMINISTRATOR                                                                 |
| --------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| Student lookup                                      | -                                | V (name, student number, course, intake, status, phone, email; lookup logged) |
| Create student accounts                             | -                                | -                                                                             |
| Applications inbox                                  | -                                | -                                                                             |
| Course records and materials                        | -                                | -                                                                             |
| Live schedule                                       | -                                | V                                                                             |
| Attendance sheets                                   | -                                | V (print view)                                                                |
| Exams, marks, certificates, graduates               | -                                | -                                                                             |
| Payments, receipts, ledger, holds                   | -                                | -                                                                             |
| Resend eligible pending invites                     | A (staff accounts)               | R (eligible accounts, protected roles excluded)                               |
| Send password reset links                           | A (eligible staff)               | A (eligible accounts, rate limited and audited)                               |
| Staff account creation                              | A (limited roles by invite)      | -                                                                             |
| Staff leave and access review                       | A                                | -                                                                             |
| Support tickets                                     | A (inherited from ADMINISTRATOR) | A                                                                             |
| Venues, bookings, practical sessions                | A (inherited from ADMINISTRATOR) | A                                                                             |
| Equipment checklists                                | A (inherited from ADMINISTRATOR) | A                                                                             |
| Operational notices                                 | A (inherited from ADMINISTRATOR) | A                                                                             |
| Academic announcements                              | -                                | -                                                                             |
| Operational reports                                 | A (inherited from ADMINISTRATOR) | A                                                                             |
| Operational settings allowlist                      | A (inherited from ADMINISTRATOR) | A                                                                             |
| General settings, fees, accreditation, payment keys | -                                | -                                                                             |
| Audit log and bulk export                           | -                                | -                                                                             |
