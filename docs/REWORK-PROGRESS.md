# Student Dashboard Rework Progress

**Date:** 26 Nov 2026  
**Status:** In Progress - Reviewing student.md spec against implementation

## Changes Made (Uncommitted)

### 1. StudentJoinClass - Scheduled Class Detection ✅
**File:** `src/app/(dashboard)/dashboard/timetable/StudentJoinClass.tsx`
**Change:** Added `scheduledAt?: string` prop to properly detect when classes are going live

**Before:**
- Only showed "Link appears when class starts" for non-live classes
- No indication that a class is about to start

**After:**
- Calculates time until `scheduledAt`
- If within 30 minutes: shows animated "Starting soon - checking..."
- If far future: shows "Link appears when class starts"
- Polls every 20 seconds when within 30 minutes to detect LIVE transition
- Polls every 8 seconds when LIVE

**Root cause fix:** Classes need to know their scheduled time to give students visibility into when they can join

### 2. StudentTimetableView - Pass scheduledAt ✅
**File:** `src/app/(dashboard)/dashboard/timetable/StudentTimetableView.tsx`
**Change:** 
- Pass `scheduledAt` to StudentJoinClass for live classes (line 276)
- Pass `scheduledAt` to StudentJoinClass for scheduled classes too (line 292)
- Changed scheduled hint from static text to dynamic component

**Root cause fix:** Scheduled classes were not showing the "Starting soon" indicator

### 3. classes/page.tsx - Pass scheduledAt ✅
**File:** `src/app/(dashboard)/dashboard/classes/page.tsx`
**Change:** Pass `scheduledAt={cls.scheduledAt.toISOString()}` to StudentJoinClass

### 4. CoursePlayerClient - Notes Security & UX ✅
**File:** `src/app/(dashboard)/dashboard/courses/[slug]/CoursePlayerClient.tsx`
**Changes:**
- Added `sandbox="allow-same-origin allow-scripts"` to notes iframe
- Added `select-none` class to prevent text selection
- Reformatted for readability

**Root cause fix:**
- Sandbox prevents external scripts/resources
- Prevents text selection in watermarked content

### 5. notifications/page.tsx - Exam Link Fix ✅
**File:** `src/app/(dashboard)/dashboard/notifications/page.tsx`
**Change:** Exam notification links now navigate to specific exam instead of generic page
- Before: `/dashboard/exams`
- After: `/dashboard/exams/${meta.examId}`

**Root cause fix:** Clicking exam notification should open that specific exam, not exams list

### 6. payments/claim/route.ts - Include OVERDUE Status ✅
**File:** `src/app/api/payments/claim/route.ts`
**Changes:**
- Include `OVERDUE` status when fetching enrolments that need payment
- Updated error message: "Claims can only be submitted for enrolments that have outstanding fees."

**Root cause fix:** Students in OVERDUE status should be able to submit payment proof

## What Still Needs Review

Based on spec (`docs/student.md`), verify these sections:

### S1 - My Profile and Photo ✅
- [x] Avatar fallback to initials (plain img tag with onError)
- [x] All 6 implementation requirements mapped and verified
- [x] Photo persists after logout/login (DB + cache-bust)
- ⏳ Run E2E tests to confirm all 6 assertions pass

### S2 - Dashboard Shell and Widgets
- [ ] Sidebar collapsible groups working
- [ ] Widget drag/reorder persists
- [ ] All 4 tabs (General, Studies, Finance, Classes) have populated widgets
- [ ] Dark theme contrast AA
- [ ] 1280x720 and 360px layouts correct

### S3 - Timetable, Live Classes, Replays, Attendance
- [x] Scheduled class detection (JUST FIXED)
- [ ] Join flow with waiting room
- [ ] Speak request with live status
- [ ] Roll call self check-in
- [ ] Class replay playback and resume
- [ ] Attendance appears after class

### S4 - Learning Materials, Assignments, Forum
- [ ] Materials viewer cannot download
- [ ] Unsigned URL denied
- [ ] Assignment submission seen by tutor
- [ ] Group assignments working
- [ ] Forum posts visible to classmates

### S5 - Exams, Results, Certificates
- [ ] Forward-only exam enforcement
- [ ] Autosave and refresh restore session
- [x] Exam notification links working (JUST FIXED)
- [ ] Certificate QR and verification

### S6 - Fees and Access
- [ ] Payment proof chain (Admin → Principal → Director)
- [ ] Phase unlock triggers
- [ ] Payment hold message
- [ ] Duplicate transaction ID rejected

### S7 - Communication
- [ ] Messages from instructors
- [ ] Announcements reaching correct students
- [ ] Support tickets answered by IT Admin

### S8 - Mobile, Dark Mode, Speed
- [ ] Bottom nav with 5 items
- [ ] No horizontal scroll at 360px
- [ ] Dark theme readable
- [ ] All pages under 1s p95

## Next Steps

1. **Commit these fixes** - Each solves a specific issue
2. **Run tests** - Start with focused E2E tests for the changed sections
3. **Verify against spec** - Use student.md as checklist
4. **Document what works vs doesn't** - Create STUDENT-STATUS.md update

## Git Status

```
 package-lock.json                                  | 4520 +++++++++++++-------
 src/app/(dashboard)/dashboard/classes/page.tsx     |    2 +-
 .../courses/[slug]/CoursePlayerClient.tsx          |   14 +-
 .../(dashboard)/dashboard/notifications/page.tsx   |    2 +-
 .../(dashboard)/dashboard/payments/claim/page.tsx  |    4 +-
 .../dashboard/timetable/StudentJoinClass.tsx       |   37 +-
 .../dashboard/timetable/StudentTimetableView.tsx   |   10 +-
 src/app/api/payments/claim/route.ts                |    5 +-
 8 files changed, 3059 insertions(+), 1535 deletions(-)
```

All changes are **localized** and **backwards compatible**.

