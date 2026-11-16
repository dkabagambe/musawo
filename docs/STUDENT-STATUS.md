# Student Dashboard - Status

| Section | Status | Evidence |
|---------|--------|----------|
| S1 My Profile and Photo | DONE | Playwright: upload, reload, initials fallback, locked fields, password change. See docs/STUDENT-S1.md |
| S2 Dashboard Shell and Widgets | DONE | Sidebar groups, widget drag/reorder, 4 tabs with real data, dark-mode contrast. See docs/STUDENT-S2.md |
| S3 Timetable, Live Classes, Replays, Attendance | DONE | Join flow, speak request, roll call, recording playback, resume position. See docs/STUDENT-S3.md |
| S4 Learning: Programmes, Courses, Materials, Assignments, Forum | DONE | Signed-URL viewer, download blocked, group submissions, forum CRUD. See docs/STUDENT-S4.md |
| S5 Examinations, Results, Certificates | DONE | Forward-only exam, autosave, server-clock, cert QR and verification. See docs/STUDENT-S5.md |
| S6 My Fees and Access | DONE | Payment proof chain, phase unlock, hold message, duplicate ID rejected. See docs/STUDENT-S6.md |
| S7 Communication | DONE | Messages, announcements, notifications, support tickets. See docs/STUDENT-S7.md |
| S8 Mobile, Dark Mode, Speed, Final Proof | DONE | 14/14 Playwright tests pass. See docs/STUDENT-S8.md |

## S8 detail

| Item | Status | Evidence |
|------|--------|----------|
| Mobile bottom nav (5 items, 44px targets) | DONE | Test: "bottom nav visible at 360px" - 14/14 pass |
| No horizontal scroll at 360px | DONE | Test: "no horizontal scroll at 360px on dashboard" |
| Bottom nav active state | DONE | Test: "Dashboard nav item is active" |
| Bottom nav Learn navigates correctly | DONE | Test: "Learn nav item navigates to /dashboard/materials or enrolled" |
| Bottom nav More opens drawer | DONE | Test: "More button opens the sidebar drawer" |
| Dark mode readable (no invisible text) | DONE | Test: "dashboard is usable in dark mode" |
| Theme toggle present in topbar | DONE | Test: "theme toggle button is present in topbar" |
| Performance indexes (grade_entries, assignments, forum_replies, announcements, assignment_submissions) | DONE | Migration 20261116020000_s8_performance_indexes applied - 10 indexes created |
| All student pages under 3 s (local) | DONE | 6 pages tested under 3 s each |
| Cross-role Playwright story | DONE | Test: "full teaching and learning cycle" - tutor and student contexts |
