# Student Dashboard Rework Progress

**Date:** 26 Nov 2026  
**Status:** S2 Complete - Ready for E2E Testing

## Completed Sections

### S1 - My Profile and Photo ✅ COMPLETE
- Avatar fallback to initials with onError handler
- Locked fields protected (UI + API 403)
- Photo upload/delete with persistence
- Password change with current password validation
- Theme preference stored in database
- All 6 test assertions implemented

**Documentation:** `docs/STUDENT-S1.md`

### S2 - Dashboard Shell and Widgets ✅ COMPLETE
- Sidebar collapsible groups: Overview, Learning, Classes, Assessment, Finance, Communication
- Unique icons per group
- Banner text correct (no em-dashes)
- 4 tabs: general, studies, finance, classes
- 17 student widgets (5+4+4+4)
- Widget customization: drag, reorder, show/hide, reset, column choice
- All widget fullPageHref links correct
- Course title wrapping with 2-line clamp + tooltip
- Payment holds widget in General tab
- Real data filtering (students see only their enrolled courses)

**Fixed:** Added missing sidebar group display names (learning, classes, finance)

**Documentation:** `docs/STUDENT-S2.md`

## Changes Made (All Committed)

1. **S1 Fixes:**
   - StudentJoinClass: Added scheduledAt for "Starting soon" indicator
   - StudentTimetableView: Pass scheduledAt prop
   - classes/page.tsx: Pass scheduledAt prop
   - CoursePlayerClient: Iframe sandbox + select-none
   - notifications/page.tsx: Exam notification links to specific exam
   - payments/claim/route.ts: Include OVERDUE status

2. **S2 Fixes:**
   - AppShell.tsx: Added sidebar group display names (learning, classes, finance)

## What Needs Testing

Both S1 and S2 require E2E test verification:

**S1 Tests (6 assertions):**
1. Upload avatar, persist after logout/login
2. Remove photo falls back to initials
3. Broken avatar falls back to initials in sidebar
4. Bio and theme persist after reload
5. Locked fields rejected by API (403)
6. Password change requires current password

**S2 Tests (6 assertions):**
1. Sidebar structure at 1280x720 and 360px
2. Widget move persists after reload
3. Every tab has widgets
4. Every widget link opens right page
5. Dark theme readable (AA contrast)
6. Course card wrap + tooltip visible

## Remaining Sections

- **S3:** Timetable, Live Classes, Class Replays, Attendance
- **S4:** Programmes, Courses, Materials, Assignments, Forum
- **S5:** Exams, Results, Certificates
- **S6:** Fees and Payment Flow
- **S7:** Messages, Announcements, Notifications, Support
- **S8:** Mobile, Dark Mode, Speed, Final Proof

## Ready for Next Steps

✅ S1 complete (needs E2E test confirmation)
✅ S2 complete (needs E2E test confirmation)
⏳ Awaiting direction on which section to test or implement next
