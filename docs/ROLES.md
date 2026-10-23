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

**Additional responsibilities:**
- Sets the institution's strategic direction and approves institutional policies before publication.
- Approves the annual academic calendar and any mid-year timetable changes.
- Reviews and approves the annual fee structure before the Finance Officer publishes it.
- Receives escalated complaints that could not be resolved at Principal or Deputy level.
- Grants and revokes time-limited delegation of Principal powers to the Deputy Principal.
- Authorises emergency break-glass access for SYSTEM_IT.
- Approves all bulk personal-data exports before they leave the platform.
- Manages the maximum three-account cap and ensures TOTP is active on all SUPER_ADMIN accounts.

### BOARD_MEMBER (Board of Directors / Institution Secretary)

Read-only governance. Sees aggregate reports, policies, graduate names with course and year. No individual student contacts or payment details. The Institution Secretary account additionally manages policies and board documents (`institutionSecretary = true`).

**Additional responsibilities:**
- Reviews governance reports presented at board meetings (enrolment trends, financial summaries, graduate outcomes).
- Reads and monitors institutional policies and compliance documents.
- Tracks the graduate register to assess programme outcomes.
- The Institution Secretary additionally drafts, versions and publishes board-level policies and meeting documents.

### PRINCIPAL

All academic privileges. Approves new courses and content, approves lecturers and assignments, publishes final results, approves graduands and certificates, sends announcements, reads finance totals and full audit data, reviews applications. Inherits everything a Registrar, Instructor or TA can do (logged "via role").

**Additional responsibilities:**
- Sets and communicates academic standards and instructional expectations to all teaching staff.
- Approves the academic calendar, intake dates, and examination schedule before the Registrar publishes them.
- Conducts or oversees regular course and programme quality reviews; may require a course to be revised before it is published.
- Reviews and approves instructor assignments and co-tutor appointments before they take effect.
- Reviews student disciplinary appeals that the Deputy Principal has escalated.
- Signs off on the institution's academic reports submitted to regulatory or accreditation bodies.
- Delegates time-limited powers (result release, graduation approval, course publishing) to the Deputy Principal when absent; those delegations are tracked and expire automatically.
- Monitors finance totals to spot fee-collection shortfalls and escalates to the Finance Officer or SUPER_ADMIN; does not handle individual payment transactions.
- Reviews complaints lodged against teaching staff or academic decisions and may escalate to SUPER_ADMIN.
- Approves marks-change requests submitted after result release.

### DEPUTY_PRINCIPAL

Day-to-day operations. Student complaints, teaching staff attendance, timetable clashes, exam supervision, class observation. Inherits Registrar, Instructor and TA powers. Cannot archive or delete; cannot publish results, approve graduands or approve courses unless Principal delegates (setting with expiry).

**Additional responsibilities:**
- Acts as Principal in the Principal's absence; all delegated actions are logged "via delegation".
- Monitors daily attendance rates across all courses and flags persistent absenteeism to the Registrar for follow-up.
- Coordinates exam room allocation with the Registrar and ensures invigilators are briefed.
- Reviews and resolves timetable clashes flagged by the Registrar; escalates irresolvable clashes to the Principal.
- Receives first-level student disciplinary cases and issues decisions; escalates appeals to the Principal.
- Reviews academic performance reports per course and flags underperforming courses to the Principal.
- Observes live classes and teaching activities across all courses for quality-assurance purposes.
- Coordinates extracurricular programmes and special academic events.
- Reviews and forwards student complaints about academic matters to the Principal or SUPER_ADMIN where required.
- May approve marks-change requests if the Principal has explicitly delegated that permission.

### ACADEMIC_REGISTRAR

Creates student accounts, applications, admissions, enrolments, class groups, course records for Principal approval, academic calendar and exam timetables, transcripts and progress reports, graduates register, alumni follow-up, certificates after Principal approval. Sees payment status only; cannot publish results or change marks.

**Additional responsibilities:**
- Manages the full student lifecycle from application receipt through to graduation clearance.
- Maintains the official academic calendar: intake dates, lecture start/end dates, examination windows, result-release dates and graduation date; all changes require Principal sign-off.
- Builds and maintains the exam timetable; coordinates with instructors on question submission deadlines.
- Verifies that all graduation requirements are met before preparing the graduand list for Principal approval.
- Maintains the alumni register and coordinates alumni follow-up communications.
- Processes transfer-credit applications and records equivalent credits against the student's academic record.
- Generates official transcripts and progress reports on request; verifies their accuracy before release.
- Sends institution-wide academic announcements (timetable changes, intake notices, exam alerts).
- Manages course catalogue for the current intake: creates draft course records, links instructors, sets unit counts; each course goes to the Principal for approval and publishing.
- Prepares periodic enrolment and academic-performance reports for the Principal, Deputy and SUPER_ADMIN.
- Requests marks changes after result release (Principal must approve before any change is applied).

### INSTRUCTOR (Teaching Staff)

Assigned courses and units only. Uploads materials; creates and teaches live classes (moderator); takes roll call; builds and marks exams; manages practical assessments and log books; chats with own students; announces to own classes; sees graduates of own courses.

**Additional responsibilities:**
- Plans the teaching schedule for each unit: lesson sequence, weekly topics and assessment calendar.
- Uploads and organises course materials (notes, videos, readings) within the platform; materials are visible to enrolled students immediately on upload.
- Designs, sets and marks exams and assignments; submits results by the Registrar's deadline.
- Takes roll call at the start of each session and flags persistent absence to the Registrar.
- Provides written feedback on assessments and communicates it to students via the messaging feature.
- Manages practical assessments and log book sign-offs for vocational or skills-based units.
- Monitors student progress per unit; may submit a progress report to the Registrar on request.
- Handles first-line academic queries from students through the in-platform messaging tool.
- Sends announcements to their own class group (session changes, assignment reminders, result notifications).
- Can request a marks change after results are released by submitting a reason; Principal must approve before the change is applied.

### TEACHING_ASSISTANT (Supporting Staff)

Helps upload materials (instructor publishes); takes roll call when assigned; helps students. Cannot set final marks.

**Additional responsibilities:**
- Assists the assigned Instructor with preparing and uploading course materials; the Instructor reviews and publishes before students can see them.
- Takes roll call and monitors class attendance in sessions where the Instructor is absent or has assigned the task.
- Provides in-class support to students on practical exercises and answers routine course queries.
- Assists with setting up the live class environment (screen sharing, breakout rooms, student admission).
- Reports student welfare concerns or misconduct observed during class to the Instructor or Registrar.
- Does not create, edit or publish exams, set grades, or issue certificates.

### FINANCE_OFFICER (Accounts / Audit)

Fee status per student, payment holds with reason, records and verifies payments, reconciliation, receipts, financial reports. Requests refunds, waivers and fee changes (SUPER_ADMIN approves). Cannot see exam questions or edit marks.

**Additional responsibilities:**
- Maintains the fee schedule and payment plan options for each intake; changes to published fees require SUPER_ADMIN approval.
- Sends fee reminders and outstanding-balance notices to students (via the operational notices channel; content is financial, not academic).
- Places and lifts payment holds on student accounts with a recorded reason.
- Records manual (bank-transfer) payment claims and triggers the dual-verification workflow before marking a payment complete.
- Reconciles payment gateway records (Pesapal, Flutterwave, manual) against the internal ledger on a regular cycle; flags discrepancies to the SUPER_ADMIN.
- Prepares monthly and term-end financial reports showing income by intake, course and payment method.
- Submits refund, waiver and fee-change requests with supporting documents; the SUPER_ADMIN gives final approval.
- Maintains documentation for annual financial audits and liaises with the AUDITOR_READONLY when they inspect finance records.
- Does not see exam content, student marks, certificates, or any academic record beyond payment status.

### AUDITOR_READONLY (Legal Advisor)

Read-only on policies, student records, graduates, finance, audit logs and complaints. May add flags or comments on audit items. Edits nothing. Every view logged.

**Additional responsibilities:**
- Reviews the full audit log to verify that system actions (grade releases, payment holds, staff suspensions, delegation grants) are properly authorised and recorded.
- Checks that policies are current, signed by the appropriate authority, and that the effective dates are correct.
- Reviews complaints registers and outcome records for compliance with the institution's disciplinary procedures.
- Reviews student and graduate records for data accuracy and legal compliance (data protection, enrolment eligibility).
- Reviews financial records and transaction logs for irregularities; may flag specific entries with a comment for SUPER_ADMIN follow-up.
- Adds comments and flags to individual audit records to indicate items that require management attention; cannot edit or delete the underlying data.
- Every page view by the Auditor is logged automatically; the Auditor is aware that their session is fully recorded.
- Board documents viewed by the Auditor are also individually logged.

### HR_MANAGER (Human Resource)

Staff records, staff invites, leave, and quarterly staff access review. Inherits operational actions from ADMINISTRATOR, with inherited actions logged via role. Cannot create SUPER_ADMIN, BOARD_MEMBER, or AUDITOR_READONLY. No student records, finance, academic content, or secrets.

**Additional responsibilities:**
- Manages the full staff lifecycle: initiates new staff invitations (SUPER_ADMIN approves and activates), records role changes and suspensions.
- Maintains staff personal records and contract details within the HR data boundary (no academic or finance data).
- Manages leave requests: records applications, checks against staffing levels and confirms or escalates for approval.
- Conducts the quarterly staff access review: verifies that every account's role still matches the staff member's current duties and flags mismatches to the SUPER_ADMIN.
- Coordinates staff onboarding: sends the account invitation, confirms acceptance and ensures the TOTP requirement is communicated to SUPER_ADMIN-level staff.
- Manages staff induction and probationary review schedules; records outcomes.
- Coordinates staff professional-development and training tracking (records completion; does not control academic content).
- Handles disciplinary and grievance procedures at HR level; escalates to the Principal or SUPER_ADMIN as required.
- Prepares HR reports: staff headcount by role, leave utilisation, access-review outcomes.
- Cannot create SUPER_ADMIN, BOARD_MEMBER or AUDITOR_READONLY accounts; those must be created directly by the SUPER_ADMIN.

### ADMINISTRATOR (School Operations)

Runs the front desk and daily school operations. Manages support tickets, resends eligible pending invites, sends password reset links to eligible accounts, performs limited student lookup, maintains room bookings and practical sessions, checks equipment, sends logistics notices, and edits the operational settings allowlist. Cannot create student or staff accounts, change account email or phone, access payments, academic records, audit logs, secrets, or bulk exports. Academic calendar and exam timetables remain with the Academic Registrar.

**Additional responsibilities:**
- Operates the student-facing front desk: looks up a student's name, student number, course, intake, status, phone and email to answer day-to-day queries; each lookup is audit-logged.
- Books and manages physical rooms and venues: assigns rooms to class sessions, records bookings, checks for conflicts, and generates a printable daily room schedule.
- Manages practical-session bookings for skills-lab activities and links them to the timetable.
- Maintains the equipment and supplies checklist: logs items in/out, records condition, and flags items that need repair or replacement.
- Sends logistics and operational notices to the relevant groups (e.g. "Lab session moved to Room 3", "Library closed Thursday"); these are not academic announcements.
- Resends pending account invitations for eligible (non-protected) staff and student accounts; each resend is logged.
- Sends password-reset links to eligible accounts that cannot self-serve; rate-limited and audit-logged.
- Manages support ticket workflow: receives, assigns, replies to and closes tickets within the configured SLA.
- Updates the operational settings allowlist (venue names, room capacities, reminder templates, support categories); cannot edit academic, financial or secret settings.
- Has no access to payments, marks, certificates, audit logs, staff creation, or bulk exports.

### SYSTEM_IT

Technical settings, integrations, backups, health. No student or finance data without approved break-glass access.

**Additional responsibilities:**
- Manages all platform technical settings: environment variables (non-secret visible, secret editable), integration keys, API credentials and third-party service connections.
- Monitors system health dashboards: uptime, error rates, queue depths, database performance, storage usage.
- Manages database and file-store backup schedules; verifies that recent backups have completed successfully.
- Reviews the technical audit log for unexpected access patterns, failed logins, unusual API call volumes and infrastructure errors.
- Responds to automated alerts (on-call); documents incident timelines in the audit log.
- Submits a break-glass access request when urgent direct data access is needed for incident resolution; SUPER_ADMIN must approve before access is granted.
- Manages user identity infrastructure: password-reset configuration, TOTP enforcement rules, session timeout policy.
- Coordinates third-party integrations (payment gateways, email delivery, SMS, video conferencing); tests webhooks and monitors delivery logs.
- Does not access student records, academic grades, financial transactions or certificates in normal operations; all such access requires an approved break-glass grant.

### STUDENT

Own learning only. Account created by Registrar; approved by student via email link; login impossible before approval. Reads and watches materials inside the platform only (no downloads). Takes timed exams. Sees own results, certificates, payments and transcript.

**Additional responsibilities:**
- Completes the account approval step by confirming personal details via the email link sent by the Registrar; disputes any incorrect details before activating the account.
- Browses the course catalogue and views lesson materials, notes and videos within the platform for enrolled courses only.
- Joins scheduled live classes when admitted by the Instructor; cannot start or manage classes.
- Submits timed exam attempts within the allowed window; cannot re-attempt without Registrar approval.
- Views their own results, grades, and feedback from the Instructor.
- Requests and views their official transcript.
- Views and downloads their own certificates.
- Initiates payment for enrolment (online gateway or manual bank transfer); views payment status and receipts for their own account only.
- Submits a support or complaint request; receives updates on ticket status.
- Reads institution-wide announcements and policies.

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
