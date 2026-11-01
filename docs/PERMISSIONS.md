# Role and permission matrix

Authorization uses stable permission keys from `src/lib/rbac/index.ts`. Routes and server actions must call `can()` or `requirePermission()`. A permission does not remove the need to scope records to an assigned course, intake, or account.

| Role | Scope and primary actions | Explicit limits |
|---|---|---|
| SUPER_ADMIN | All records, settings, account lifecycle, final approvals, audit, access review. Sets institutional strategy and policy. Approves annual fee structure, bulk exports, and break-glass requests. Grants and revokes Deputy delegation. | Maximum three accounts, TOTP required in production |
| BOARD_MEMBER | Aggregate reports, policies, graduate names, course and year. Reviews governance reports and tracks programme outcomes. The Institution Secretary additionally drafts, versions and publishes board-level policies and meeting documents. | Read only, no student contacts or finance details |
| PRINCIPAL | Academic records, course and content approval, result release, graduands and certificates, internal announcements, finance totals. Sets academic standards, oversees course quality reviews, approves instructor assignments, reviews student disciplinary appeals, signs off accreditation reports, approves marks-change requests. Delegates time-limited powers to Deputy Principal when absent. | Does not see payment or ledger detail; cannot manage technical settings or HR operations |
| DEPUTY_PRINCIPAL | Academic operations, complaints, timetable clash resolution, attendance monitoring, exam coordination, class observation, performance reports. Acts as Principal in the Principal's absence. First-level student disciplinary decisions. Coordinates extracurricular programmes. | Cannot delete records, release results, approve graduands, or issue certificates by default; no finance detail; no HR staff management |
| ACADEMIC_REGISTRAR | Applications, student records, enrolments, course catalogue setup, academic calendar, exam timetables, transcripts, graduand preparation, alumni register, transfer-credit processing, institution-wide academic announcements. Prepares enrolment and performance reports. Can request a marks change (Principal must approve). | Payment status only - no payment or ledger detail; cannot release results or approve graduands independently |
| INSTRUCTOR | Assigned courses and units only. Plans teaching schedule, uploads materials, designs and marks exams, takes roll call, manages practical log books, provides student feedback, sends announcements to own class, chats with own students. Can request a marks change after release (Principal must approve). | No finance; no other instructors' records; no result release; no graduation approval |
| TEACHING_ASSISTANT | Assists assigned Instructor with material uploads (Instructor publishes), takes roll call, supports students in class, helps set up live sessions. Reports welfare concerns to Instructor or Registrar. | Cannot create, edit or publish exams; cannot set or edit grades; no certificates; no finance |
| FINANCE_OFFICER | Payments, fee schedule maintenance, payment holds with reason, manual payment dual-verification, reconciliation, receipts, financial reports. Sends fee reminders. Submits refund, waiver and fee-change requests with supporting documents. Liaises with Auditor during inspections. | No exam content or grade editing; refunds, waivers and fee changes require SUPER_ADMIN approval; no academic records beyond payment status |
| HR_MANAGER | Staff lifecycle (invites, role changes, suspensions), personal records, leave management, quarterly access review, onboarding, probationary review tracking, professional-development records, disciplinary and grievance handling, HR reports. Inherits all ADMINISTRATOR operational actions. | Cannot create SUPER_ADMIN, BOARD_MEMBER or AUDITOR_READONLY accounts; no student records; no academic content; no finance; no secrets |
| ADMINISTRATOR | Front-desk student lookup, room and venue booking, practical-session booking, equipment checklist, logistics notices, support ticket management, pending-invite resend, password-reset link dispatch, operational settings allowlist. | Cannot create student or staff accounts; no payments; no academic records; no audit logs; no secrets; no bulk exports |
| AUDITOR_READONLY | Read-only on policies, student and graduate records, finance, audit logs and complaints. Reviews authorisation trail for key actions. Checks policy currency and data compliance. Flags entries for SUPER_ADMIN follow-up with comments. Every view is logged. | No data changes; every page view individually logged |
| SYSTEM_IT | Technical settings, integrations (payment gateways, email, SMS, video), backup management, health monitoring, incident response, identity infrastructure (password-reset config, TOTP rules, session timeouts). Submits break-glass requests for emergency data access. | No student, grade or finance detail in normal operations; all such access requires SUPER_ADMIN-approved break-glass grant |
| STUDENT | Own learning materials (in-platform only), live class attendance when admitted, timed exam attempts, own results and feedback, transcript, certificates, payment initiation and status, support or complaint submission, institutional announcements and policies. Completes account approval by confirming details via email link. | No access to another learner's data; cannot download materials; cannot self-re-attempt exams without Registrar approval |

## Hierarchy

The role tree is stored in the `rbac.roleTree` setting and mirrored in `ROLE_TREE` for permission evaluation. SUPER_ADMIN inherits all permissions. PRINCIPAL inherits the academic branch below it. DEPUTY_PRINCIPAL inherits the Registrar, Instructor, Assistant and Student views, plus separate Finance Officer and HR System Admin branches. BOARD_MEMBER, AUDITOR_READONLY and SYSTEM_IT are separate oversight or technical branches.

Sensitive permissions have explicit deny overrides. Initiators cannot approve their own requests, payments above the configured threshold require a second verifier, changes to released marks require a reason and Principal approval, and nobody can grant themselves a role. Inherited actions should record the acting role and the permission path in the audit metadata.

Legacy account migration maps MANAGING_DIRECTOR to SUPER_ADMIN, BURSAR and ACCOUNTS to FINANCE_OFFICER, REGISTRAR to ACADEMIC_REGISTRAR, TUTOR to INSTRUCTOR, ADMIN and HR_SYSTEM_ADMIN and ADMINISTRATOR to HR_MANAGER, and BUSINESS_DEV_MANAGER, COMMUNICATIONS_OFFICER and MARKETING_COMMS to STUDENT pending an access review.

## Teaching assignment scope

Instructor and Teaching Assistant queries must scope through the primary course assignment or a `CoTutor` assignment. Student lists and materials must be filtered by those assigned courses. `courses.view`, `content.upload`, `attendance.take`, and other permissions are necessary but do not grant global course access. Student material handlers verify enrolment and the course payment threshold on every request.

## Verification

`src/tests/rbac.test.ts` tests role permissions and inheritance. Route tests should also cover record scoping, self-approval denial, and access to another instructor's course. The current teaching portal implements primary and co-teaching scope for its dashboard, course, materials, exam, student, class and attendance views.
## Batch B live class access

- `classes.join` is granted to the student capability only. Staff roles explicitly deny it, including staff roles that inherit student permissions elsewhere in the tree.
- `attendance.view.all` lets the Registrar, Principal, Deputy Principal and Super Admin see cross-course presence. Instructor and teaching assistant presence remains scoped to assigned courses.
- `classes.manage` scopes class creation, start, stop, admission and interaction actions to assigned courses for teaching staff.
