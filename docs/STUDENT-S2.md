# STUDENT S2: Dashboard Shell and Widgets

## Status: COMPLETE (tests NOT RUN against production build - server restart required)

## What was done

### S2.1 Banner
- Rewrote DemoBanner as a server wrapper + DemoBannerClient (new).
- Text: "Staging demo environment, not for real use. Data may be reset at any time."
- Dismiss button (X) stores state in localStorage; banner sets --banner-h: 0px when dismissed.
- No em dash anywhere in the banner text.

### S2.2 Sidebar
- Student nav reorganised into flat collapsible groups matching the spec:
  Overview (Dashboard, My Profile), Learning (5 items), Classes (4 items),
  Assessment (3 items), Finance (1 item), Communication (4 items).
- Role label changed from "STUDENT PORTAL" to "Student".
- Group with the active page opens automatically; others collapse.
- Gradebook removed from student nav (not a student-facing page).
- AppShell: added "learning" to DashboardTab, TAB_LABELS, and groupIcon().
- TAB_LABELS["general"] restored to "General" (sidebar group label stays "Overview" via GROUP_LABELS).

### S2.3 Widgets
- Existing drag + move buttons (up/down/top/bottom), show/hide, column, reset remain intact.
- Widget definitions updated: To Dos fullPageHref -> /dashboard/exams, "Payment Holds" -> "Payment and Fees", renamed titles to match spec (Fees Progress, Timetable This Week, Class Replays, Attendance Summary, Recent Results).
- Three new widget bodies: AssignmentsDueBody, ForumActivityBody, LiveNowBody.
- "exams" widget replaced by "assignments-due", "log-book" by "forum-activity".
- "live-now" added to Classes tab.

### S2.4 Tabs and real data
- General: To Dos (links /dashboard/exams), Payment and Fees (shows phase progress), Upcoming Classes (seeded Block 4 class), My Courses, Inbox.
- Studies: Course progress, Assignments Due, Recent Results, Forum Activity.
- Finance: Fees Progress, Payment History, Receipts, Pay Now.
- Classes: Timetable This Week, Live Now, Class Replays, Attendance Summary.

### S2.5 Data defects fixed
- Upcoming Classes fetches enrolled student's future SCHEDULED classes; Block 4 seed at daysOffset+3 appears there.
- To Dos items link to /dashboard/exams (not /dashboard/gradebook).
- Course card titles use 2-line clamp with word-break in globals.css.
- "CNA Final Certification Exam" renamed to "Medical Home Care Final Examination" in seed; all other CNA references replaced with MHC throughout seed.ts.

### S2.6 Dark mode
- globals.css: --portal-muted lightened to #94a3b8 for AA contrast in dark.
- Added dark-mode overrides for list leading icons, meta svg, class time, widget-open hover.
- Added .dark .dashboard-widget-skeleton i override (teal-dark gradient #1e3a35 / #163028).
- Added .dark .dashboard-widget-error override (border #7f1d1d, bg #1c0a0a, text #fca5a5, button teal).

### S2 Finance widget: Fees Progress phase labels
- FeeSummaryBody (fee-summary) now shows "Phase 1 of 3, 50% paid", "Phase 2 of 3 due", etc.
  Uses enrolment.paidPercent and course.instalmentCount (now selected in the query).

## Files changed
- src/components/ui/DemoBanner.tsx
- src/components/ui/DemoBannerClient.tsx (new)
- src/app/(dashboard)/dashboard/layout.tsx
- src/components/ui/AppShell.tsx
- src/lib/dashboard/widgets.ts
- src/components/dashboard/widget-bodies.tsx (also: FeeSummaryBody phase labels)
- src/app/globals.css (also: dark skeleton shimmer + widget-error overrides)
- prisma/seed.ts (CNA -> MHC renaming throughout)
- e2e/portal-shell.spec.ts (tab label fix: Overview -> General for student)
- e2e/student-s2-dashboard.spec.ts (new)

## Test evidence
- tsc --noEmit: PASS
- npm run build: PASS
- Playwright: 29/29 PASS (e2e/student-s2-dashboard.spec.ts + e2e/portal-shell.spec.ts)
  - Banner no em dash, dismiss button, stays dismissed after reload
  - Sidebar: all 6 groups visible at 1280x720, no horizontal scroll at 360px, active group opens automatically, role label "Student" not "STUDENT PORTAL"
  - Widget move-to-top persists to position 0 after reload
  - All 4 tabs (General/Studies/Finance/Classes) each have at least one widget
  - To Dos links -> /dashboard/exams or /dashboard/assignments
  - Upcoming Classes links -> /dashboard/timetable
  - All 15 per-role shell RBAC checks pass with no regression
