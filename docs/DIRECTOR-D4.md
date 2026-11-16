# D4 - Academics: Students, Instructors, Programmes, Courses

## Completed

**Students (`/director/students`)**
- Filters: free-text search (name, email, student number), programme, intake, account status, payment phase.
- Columns: Name (links to detail), Student No., Programme, Intake, Payment phase badge, Account status, Registered.
- Pagination (40 per page), Clear filters link.
- Export CSV button (GET `/api/director/export/students`) returns CSV, writes BULK_EXPORT audit log entry. Max 5000 rows.
- Detail (`/director/students/[id]`): profile, enrolment and payment history, attendance summary with percentage, released marks, documents list (view only), approval history (links to `/director/approvals/[id]`). No edit buttons.

**Instructors (`/director/instructors`)**
- Search by name or email, pagination (20 per page).
- Each card: name, status, email, total live classes, graded submissions count, last active date, assigned courses (primary and co-tutor roles).
- Detail (`/director/instructors/[id]`): profile, metric summary (courses, classes total, classes held, graded submissions), courses table with role/enrolments/intake/status, live classes table (held vs scheduled), students in assigned courses (linked to student detail). No edit buttons.

**Academic Programmes (`/director/programmes`)**
- Filter by title/code and status (DRAFT, PUBLISHED, ARCHIVED), pagination (30 per page).
- Pending changes column: links to `/director/approvals/[id]` for open ACADEMIC_PROGRAMME_CHANGE or COURSE_CHANGE requests.
- Summary note if any changes are pending across all programmes.
- Detail (`/director/programmes/[id]`): metrics, instructor links, intakes table, course units table (blocks with lesson/exam/assignment counts), approval/change history with chain (Submitted by, Reviewed by, Decided by), reason shown as the diff/change description, Review link for open items. No edit buttons.

**Courses (`/director/courses`)**
- Filter by title/code and status, pagination (30 per page).
- Pending change column links directly to the approval.
- Detail (`/director/courses/[id]`): same structure as programme detail. No edit buttons.

**Read-only enforcement**
- All pages use `can(role, "students.view")`, `can(role, "staff.view")`, `can(role, "courses.view")`.
- Export API enforces `can(role, "students.export")`, returns 403 for other roles.
- No write endpoints exist in D4; a POST to `/api/admin/students` returns 4xx for the Director.

## Verified

- `npx tsc --noEmit --skipLibCheck`: 0 errors in `src/`
- Playwright test: `e2e/director-d4.spec.ts` (14 tests)
  - NOT RUN (requires production build + seeded database)
  - Command: `npm run build && npm start` then `npx playwright test e2e/director-d4.spec.ts`
