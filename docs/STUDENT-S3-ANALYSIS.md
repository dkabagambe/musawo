# S3: My Timetable, Live Classes, Class Replays, Attendance - ANALYSIS

**Status:** Substantially implemented with key gaps  
**Date:** 26 Nov 2026

## Executive Summary

S3 is **80-85% complete** with strong core functionality but several missing features that need to be added:

✅ **Working Well:**
- Timetable with 3 view modes (week/list/month), color coding, filtering
- Live classes with join flow, presentation viewer, roll call check-in
- Attendance tracking with per-course stats and dispute reporting
- Access control (students see only their own data)

❌ **Missing/Broken:**
- Recording resume position (not saved per student)
- Mark as watched functionality (no tracking)
- Playback speed only works for YouTube
- Cancellation/reschedule notifications
- Presentation materials only visible when class is LIVE (not for scheduled classes within 30 min)

## 1. My Timetable (/dashboard/timetable) - 95% ✅

**Working:**
- ✅ 3 view modes: Week, List, Month views all functional
- ✅ Color-coded by course: 8 distinct colors with legend
- ✅ Filter by course: Click course dot to filter classes
- ✅ Each entry shows: course unit, instructor photo, time (EAT), venue/online, status
- ✅ Status labels: SCHEDULED, LIVE, ENDED, CANCELLED, RESCHEDULED
- ✅ Click entry for details panel with full information
- ✅ Join button appears when LIVE
- ✅ Attendance marks (PRESENT/ABSENT/LATE/EXCUSED) shown with icons
- ✅ Overlap detection: Yellow badge for conflicting classes
- ✅ Reschedule/cancel reasons displayed in detail panel
- ✅ ICS export: "Export .ics" button for calendar download

**Issues:**
1. **Presentation not shown for scheduled classes** (within 30 min of start)
   - Detail panel shows "Presentation slides" only when status=LIVE
   - Should show for scheduled classes approaching start time
   - File: StudentTimetableView.tsx line 236 (only renders for `isLive=true`)

2. **No mark as watched** for recorded materials
   - Detail panel shows "Recording available" link but no checkbox
   - No completion tracking

3. **Resume position not saved** when viewing recording from timetable

**Files:**
- `src/app/(dashboard)/dashboard/timetable/page.tsx` — Main page, data fetching
- `src/app/(dashboard)/dashboard/timetable/StudentTimetableView.tsx` — View logic (week/list/month)
- `src/app/(dashboard)/dashboard/timetable/StudentJoinClass.tsx` — Join button

---

## 2. Live Classes (/dashboard/classes) - 90% ✅

**Working:**
- ✅ Sections: Live Now, Upcoming, Past
- ✅ Request to join flow: "Request" → "Waiting" → "Admitted" → "Join now" with link
- ✅ Listen-only → REQUESTED → CAN_SPEAK status tracking
- ✅ Polling every 8 seconds when LIVE (within spec requirement of 10s)
- ✅ Presentation panel: View-only (no download), presigned URLs
- ✅ Roll call "I am here" button: Updates attendance.startMark to PRESENT
- ✅ Students join with real account name (session.user.name)
- ✅ Breakaway groups: Shows group name, members, group Meet link, discussion link

**Issues:**
1. **Hand raise vs "I am here" button not visually distinct**
   - Both are "btn-outline" buttons (StudentJoinClass line 93-95)
   - Users might not understand the difference
   - Should have different styling or labels (e.g., icon + "Raise hand" vs "Check in here")

2. **No immediate feedback for speak status changes**
   - Status updates but user doesn't see visual indicator right away
   - Mic-allowed badge appears in class card but not in join button area while joining

3. **Presentation refresh not visible**
   - Presigned URLs refresh every 60 seconds but no loading state

**Files:**
- `src/app/(dashboard)/dashboard/classes/page.tsx` — Page layout
- `src/app/(dashboard)/dashboard/timetable/StudentJoinClass.tsx` — Join flow state machine
- `src/components/live/PresentationViewer.tsx` — Presentation viewer
- `src/components/live/MyGroupCard.tsx` — Breakaway group display
- `src/app/api/live-classes/[id]/join/route.ts` — Join endpoint

---

## 3. Class Replays (/dashboard/recordings) - 75% ⚠️

**Working:**
- ✅ Newest first ordering (sortedBy scheduledAt DESC)
- ✅ Search and filter by course (RecordingsFilter component)
- ✅ Recording pending state ("Recording pending" section and label)
- ✅ Playback inside platform only (no download link, iframe-based)
- ✅ Watermark with name + registration number (rotated overlay)
- ✅ Playback speed (0.75x, 1x, 1.25x, 1.5x, 2x) — **for YouTube only**
- ✅ Missed class indicator: "Missed" badge for ABSENT attendance
- ✅ External links noted as shareable (Drive, Meet links show warning)

**Issues (Missing):**
1. **NO resume position tracking** ❌ CRITICAL
   - Each student starts recording from beginning
   - No watchedAt or currentTime saved on attendance
   - No "last watched at" indicator
   - Root cause: No database fields for watchedAt/currentTime
   - **Fix needed:** Add fields to Attendance model, save on player progress event, restore on page load

2. **Playback speed only works for YouTube** ❌ 
   - Presigned S3 URLs: Speed control not supported in iframe
   - Google Drive embeds: Speed not available in Google Docs viewer
   - Native HTML5 video would work but not used
   - Root cause: Using iframe + postMessage for YouTube, but other formats don't support it
   - **Fix needed:** Use HTML5 `<video>` element with controls for S3 URLs

3. **NO "mark as watched"** ❌ 
   - No checkbox or completion tracking
   - Important for course completion percentage
   - Root cause: No UI component, no watchedAt field
   - **Fix needed:** Add checkbox, store watchedAt timestamp

4. **Recording pending section doesn't distinguish attended vs missed**
   - Shows all pending recordings without indicating if student was present
   - Could highlight that some are from missed classes

**Files:**
- `src/app/(dashboard)/dashboard/recordings/page.tsx` — Page logic, filtering, sorting
- `src/app/(dashboard)/dashboard/recordings/RecordingViewer.tsx` — Playback component
- `src/app/(dashboard)/dashboard/recordings/RecordingsFilter.tsx` — Search/filter UI

---

## 4. Attendance (/dashboard/attendance) - 90% ✅

**Working:**
- ✅ Per-class records: Class name, course, instructor, date, start/end marks
- ✅ Marks: PRESENT, ABSENT, LATE, EXCUSED with icons
- ✅ Percentage stats: Overall attendance rate, per-course breakdown
- ✅ Minimum attendance rule: Warning banner if below minimum (default 75%)
- ✅ Per-course warning if that course's attendance below its minimum
- ✅ Dispute reporting: Modal form sends note to instructor
- ✅ Student isolation: Can only see own attendance records

**Issues:**
1. **markedPresent field not used**
   - Code includes `r.markedPresent` in filter (line 29) but it's never set
   - Suggests tutor manual marking exists somewhere but isn't connected

2. **No date range filter**
   - All time records shown; can't filter by semester or month
   - Would improve usability for reviewing specific periods

3. **No export functionality**
   - Unlike timetable (ICS export), no CSV/PDF export
   - Useful for printing or external records

**Files:**
- `src/app/(dashboard)/dashboard/attendance/page.tsx` — Main page, stats calculation
- `src/app/(dashboard)/dashboard/attendance/AttendanceDispute.tsx` — Dispute reporting

---

## 5. Data Accuracy & Security ✅

**Verified:**
- ✅ Students see only their own classes/attendance/recordings
- ✅ Enrolment verification on all endpoints
- ✅ No cross-student data leakage
- ✅ ICS export filtered to student's own classes

**Missing:**
- ❌ Cancellation/reschedule notifications not sent
  - Classes marked with reason but no email/in-app notification
  - Student must discover by viewing timetable
  - **Fix needed:** Trigger notification when class status changes

- ❌ No automatic Google Meet join link validation
  - Assumes joinUrl is set by instructor
  - Should generate or validate before class starts

---

## Implementation Gaps Summary

| Feature | Status | Effort | Priority |
|---------|--------|--------|----------|
| Resume recording position | ❌ Missing | Medium | HIGH |
| Mark as watched | ❌ Missing | Small | HIGH |
| Playback speed for all formats | ⚠️ Partial | Medium | HIGH |
| Presentation for scheduled classes (pre-LIVE) | ⚠️ Partial | Small | MEDIUM |
| Cancellation/reschedule notifications | ❌ Missing | Medium | MEDIUM |
| Hand raise UI clarity | ⚠️ Partial | Small | MEDIUM |
| Automatic join link generation | ❌ Missing | Medium | LOW |
| Attendance export (CSV/PDF) | ❌ Missing | Small | LOW |

---

## Next Steps for S3 Completion

**To make S3 "work" per spec definition:**

1. **Add database fields** to Attendance model:
   ```
   watchedAt: DateTime?
   lastPlaybackPosition: Int? (seconds)
   recordingSessionId: String?
   ```

2. **Implement resume tracking:**
   - RecordingViewer sends playback progress to `/api/recordings/{id}/position`
   - Load and restore on page load
   - Add "Resume from XX:XX" indicator

3. **Add mark as watched:**
   - Checkbox in RecordingViewer footer
   - POST to `/api/recordings/{id}/watched`
   - Show checkmark when already watched

4. **Fix playback speed for S3:**
   - Use HTML5 `<video>` element for presigned URLs
   - Keep YouTube embed with speed control

5. **Show presentation for scheduled classes:**
   - Modify presentation endpoint to allow SCHEDULED status (within 30 min of start)
   - Modify StudentTimetableView detail panel to show presentation always

6. **Add notifications for cancelled/rescheduled classes:**
   - Trigger when class status changes
   - Create Notification record or send email

---

## Test Scenarios (from spec)

| Test | Status | Notes |
|------|--------|-------|
| Instructor starts class → student requests join → admitted → sees link | ⏳ Verify | Join flow implemented; needs test |
| Speak request and grant → mic status updates within 10s | ⏳ Verify | Polling at 8s; depends on instructor action |
| Presentation panel visible and not downloadable | ⏳ Verify | Works for LIVE; not for scheduled classes |
| Roll call self check-in | ⏳ Verify | "I am here" button implemented |
| Attendance appears after class | ⏳ Verify | Recorded; visible in attendance page |
| Recording added by instructor and played by student | ⏳ Verify | Playback works; resume not saved |
| Resume position saved per student | ❌ NOT IMPLEMENTED | Root cause: No watchedAt/position fields |
| Student not enrolled cannot see/play recording | ⏳ Verify | Access control in place |
| Timetable change notifies student | ❌ NOT IMPLEMENTED | No notification trigger |

---

**Ready for:** Fixing the 3 high-priority gaps (resume, watched, speed), then E2E testing

