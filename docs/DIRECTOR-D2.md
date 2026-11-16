# D2 - Dashboard Shell and Widgets

## Completed

**Banner (D2.1)**
- Already correct: no em dash, text reads "Staging demo environment, not for real use. Data may be reset at any time."
- Dismiss button present in `DemoBannerClient.tsx`.

**Sidebar (D2.2)**
- Structure confirmed correct in `src/app/(director)/director/layout.tsx`:
  - Overview: Dashboard, Approvals (with pending badge), Reports and Analytics, Audit Logs
  - Academics: Students, Instructors, Academic Programmes, Courses, Examinations and Results, Certificates, Graduates
  - Finance: Finance
  - Governance: Staff Accounts, Roles and Permissions, Access Review, Policies and Settings, Storage
  - Communication: Announcements, Messages, Notifications
  - Account: Profile and Settings
- Group auto-open on active page is handled by `AppShell` using `collapsedGroups` state.
- Approval badge on sidebar is a numeric count from the same query used in widget bodies.

**Widget registry (D2.3) - all tabs now have real widgets**
- General tab: To Dos, Pending Approvals (full-width), Key Numbers, Alerts, Today, Recent Decisions, Revenue Summary
- Academics tab: Enrolment by Programme, Students (full-width), Results Awaiting Approval, Certificates, Instructor Activity, Graduands
- Finance tab: Recent Payments (full-width), Revenue (30 days), Payment Proofs Awaiting Review, Collections by Phase, Fee Changes and Waivers, Financial Summary
- Staff tab: Staff (full-width), Audit Log (full-width)
- Approvals tab: Pending Approvals (full-width), Recent Decisions
- Reports tab: Financial Reports, Academic Reports

**New widget bodies added (`src/components/dashboard/widget-bodies.tsx`)**
- `DirectorKeyNumbersBody`: active students, enrolments this month, pass rate, attendance rate, collected, outstanding
- `DirectorAlertsBody`: recent login events, rejected payment claims, payment proofs pending
- `DirectorTodayBody`: live classes and exams scheduled for today
- `DirectorRecentDecisionsBody`: last 5 approval decisions (approved or rejected)
- `DirectorEnrolmentByProgrammeBody`: active enrolments per published course
- `DirectorInstructorActivityBody`: instructors with class counts in last 30 days
- `DirectorCertificatesAwaitingBody`: pending certificate batches and recently issued count
- `DirectorPaymentProofsBody`: payment proof approval requests oldest-first
- `DirectorFinanceByPhaseBody`: collections vs outstanding with phase breakdown
- `DirectorFeeChangesBody`: pending fee change, waiver, refund requests
- `DirectorAcademicReportsBody`: enrolments, graduates, pass rate, courses published

**Count consistency fix (D2.5)**
- `layout.tsx` badge and `DirectorTodosBody` both typed as `ApprovalRequestType[]` with the same 10 types and statuses - single definition, same filter everywhere.
- `ApprovalListBody` fixed to use `ApprovalRequestType[]` (was `as never[]`).

**No links to removed routes (D2.5)**
- Director-specific widget bodies link only to `/director/*` routes.
- Old `/finance/payments` and `/finance/approvals` only appear in `FinanceTodosBody` (Finance Officer role, not used by Director).

**Edit My Widgets (D2.4)**
- Existing `WidgetCustomizer` with drag-and-drop (dnd-kit), Move to top/up/down/bottom, show/hide, column toggle, Reset to default - already complete from student sprint. Works for Director tabs.

## Verified

- `npx tsc --noEmit --skipLibCheck`: 0 errors in src/
- Playwright test: `e2e/director-d2.spec.ts`
  - NOT RUN (requires production build + seeded database)
  - Command: `npm run build && npm start` then `npx playwright test e2e/director-d2.spec.ts`
