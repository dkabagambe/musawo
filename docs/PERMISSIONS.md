# Role and permission matrix

Authorization uses stable permission keys from `src/lib/rbac/index.ts`. Routes and server actions must call `can()` or `requirePermission()`. A permission does not remove the need to scope records to an assigned course, intake, or account.

| Role | Scope and primary actions | Explicit limits |
|---|---|---|
| SUPER_ADMIN | All records, settings, account lifecycle, final approvals, audit, access review | Maximum three accounts, TOTP required in production |
| BOARD_MEMBER | Aggregate reports, policies, graduate names, course and year | Read only, no student contacts or finance details |
| PRINCIPAL | Academic records, course and content approval, result release, graduands and certificates, internal announcements, finance totals | Does not see payment or ledger detail |
| DEPUTY_PRINCIPAL | Academic operations, complaints, timetable, attendance, exports, delegated approvals | Cannot delete, release results, approve graduands, or issue certificates by default |
| ACADEMIC_REGISTRAR | Applications, student records, enrolments, course and intake setup, timetables, transcripts, graduand preparation | Payment status only, cannot release results or approve graduands |
| INSTRUCTOR | Assigned courses and units, teaching materials, exams and marking, attendance, own class announcements and messages | No finance, student contact exports, other course records, final result release, or graduation approval |
| TEACHING_ASSISTANT | Assigned course support, material uploads, class viewing, roll call | Cannot mark exams, edit grades, create exams, manage classes, or see finance |
| FINANCE_OFFICER | Payments, fee status, holds, receipts, reconciliation and financial reports | No exam questions or grade editing; refunds, waivers and fee changes require SUPER_ADMIN approval |
| HR_SYSTEM_ADMIN | Staff records, staff invites, leave, support and non-secret settings | Cannot create oversight roles or edit secrets |
| AUDITOR_READONLY | Read-only policy, student, graduate, finance and audit views; flags | No data changes; sensitive views must be logged |
| SYSTEM_IT | Technical settings, integrations, backups and health | No student, grade or finance detail without approved break-glass access |
| STUDENT | Own learning, payments, results and certificates | No access to another learner's data; learning materials are in-platform only |

## Hierarchy

The role tree is stored in the `rbac.roleTree` setting and mirrored in `ROLE_TREE` for permission evaluation. SUPER_ADMIN inherits all permissions. PRINCIPAL inherits the academic branch below it. DEPUTY_PRINCIPAL inherits the Registrar, Instructor, Assistant and Student views, plus separate Finance Officer and HR System Admin branches. BOARD_MEMBER, AUDITOR_READONLY and SYSTEM_IT are separate oversight or technical branches.

Sensitive permissions have explicit deny overrides. Initiators cannot approve their own requests, payments above the configured threshold require a second verifier, changes to released marks require a reason and Principal approval, and nobody can grant themselves a role. Inherited actions should record the acting role and the permission path in the audit metadata.

Legacy account migration maps MANAGING_DIRECTOR to SUPER_ADMIN, BURSAR and ACCOUNTS to FINANCE_OFFICER, REGISTRAR to ACADEMIC_REGISTRAR, TUTOR to INSTRUCTOR, ADMIN and ADMINISTRATOR to HR_SYSTEM_ADMIN, and BUSINESS_DEV_MANAGER, COMMUNICATIONS_OFFICER and MARKETING_COMMS to STUDENT pending an access review.

## Teaching assignment scope

Instructor and Teaching Assistant queries must scope through the primary course assignment or a `CoTutor` assignment. Student lists and materials must be filtered by those assigned courses. `courses.view`, `content.upload`, `attendance.take`, and other permissions are necessary but do not grant global course access. Student material handlers verify enrolment and the course payment threshold on every request.

## Verification

`src/tests/rbac.test.ts` tests role permissions and inheritance. Route tests should also cover record scoping, self-approval denial, and access to another instructor's course. The current teaching portal implements primary and co-teaching scope for its dashboard, course, materials, exam, student, class and attendance views.
## Batch B live class access

- `classes.join` is granted to the student capability only. Staff roles explicitly deny it, including staff roles that inherit student permissions elsewhere in the tree.
- `attendance.view.all` lets the Registrar, Principal, Deputy Principal and Super Admin see cross-course presence. Instructor and teaching assistant presence remains scoped to assigned courses.
- `classes.manage` scopes class creation, start, stop, admission and interaction actions to assigned courses for teaching staff.
