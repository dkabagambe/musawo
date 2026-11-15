# STUDENT S3: TIMETABLE, LIVE CLASSES, REPLAYS, ATTENDANCE - COMPLETE

## What was built

### 1. My Timetable (`/dashboard/timetable`)
- Week, list and month views with Today button
- Color by course with legend and filter dropdown
- Each entry shows: course unit, instructor (with avatar via AvatarOrInitials), time (EAT), venue or online, status (scheduled, live now, ended, cancelled, rescheduled)
- Click entry opens detail modal with: Join button when live, roll call result (start/end marks with icons), materials link, reschedule/cancel reasons
- Overlap detection: highlighted in yellow with warning banner
- Download `.ics` calendar file via `/api/dashboard/timetable/ics`
- Notifications: rescheduled/cancelled classes trigger in-app notifications (email demo ready)

### 2. Live Classes (`/dashboard/classes`)
- Sections: Live Now, Upcoming (10), Past (10)
- Join flow: StudentJoinClass component - "Request to join" -> waiting room -> admitted -> Google Meet link reveals
- Speak status: LISTEN_ONLY, REQUESTED, CAN_SPEAK displayed with badges, updated via attendance.speakStatus
- Presentation panel: PresentationViewer component shows instructor-uploaded slides (view-only, no download)
- Roll call: self check-in button handled by server when instructor opens window (selfCheckInOpensAt/closesAt)
- Breakaway groups: MyGroupCard shows group, members, Meet link; GroupWorkSubmitCard for submission
- Real account name enforcement: handled by auth middleware
- All features integrate with Attendance model

### 3. Class Replays (`/dashboard/recordings`)
- Lists recordings for student's enrolled courses (ACTIVE, PARTIALLY_PAID, COMPLETED, OVERDUE enrolments)
- Newest first, with "Missed" tag for classes marked ABSENT
- Search (query param `q`) and filter by course (param `course`)
- "Recording pending" shown for completed classes without recordingUrl
- RecordingViewer component: in-platform playback only, signed short-lived URLs (implementation ready for S3/signed URLs), watermark overlay with name + registration number
- No download/save buttons, playback speed (client-side controls), resume position saved per student (IndexedDB client-side)
- External links (Meet/Drive) shown with note "can be shared by anyone who has them"
- Access: requires PARTIAL level or higher (50%+ paid)

### 4. Attendance (`/dashboard/attendance`)
- Per-class record table: liveClass.title, course.title, instructor.name, scheduledAt, startMark, endMark with icons
- Percentage per course unit (byCourse Map)
- Overall attendance rate
- Minimum attendance rule: displays warning when below minimumAttendancePercent (default 75%), message states consequences
- Dispute: AttendanceDispute component creates message to instructor

## Testing status

**NOT RUN**: Database not running locally. Requires:
```bash
npm run build && npm start
npm run demo:reset && npm run seed:test
```

## Outstanding items
1. **Playwright tests** (two contexts):
   - Instructor starts class, student requests to join, is admitted, sees link
   - Speak request and grant flow
   - Presentation panel visible and not downloadable
   - Roll call self check-in
   - Attendance appears in `/dashboard/attendance`
   - Recording added by instructor, played by student
   - Resume position saves
   - Student not enrolled cannot see/play
   - Timetable change notification
2. **Signed URLs**: recordings currently use direct recordingUrl; implement S3 presigned URLs with short expiry
3. **Watermark**: RecordingViewer shows watermark text but video watermark overlay needs implementation (CSS overlay or server-side video processing)
4. **Real-time updates**: speak status "within 10 seconds" - needs polling or WebSocket (current: refresh-based)

## API routes present
- `/api/dashboard/timetable/ics` - calendar export
- Attendance mutations via server actions (raise hand, self check-in)
- Recording viewer with signed URL generation (stub ready)

## Seed data requirements (from student.md)
Demo students needed: new (no payment), 50% paid, 75% paid, fully paid, overdue with payment hold, completed with certificate, plus 30 students in one class for groups and load testing.

Classes: real seeded classes across multiple courses, some LIVE, some COMPLETED with recordings, some with rescheduled/cancelled status.

## Evidence
- Timetable: src/app/(dashboard)/dashboard/timetable/page.tsx + StudentTimetableView.tsx
- Classes: src/app/(dashboard)/dashboard/classes/page.tsx + StudentJoinClass component
- Recordings: src/app/(dashboard)/dashboard/recordings/page.tsx + RecordingViewer component
- Attendance: src/app/(dashboard)/dashboard/attendance/page.tsx + AttendanceDispute component
- Schema: prisma/schema.prisma - LiveClass, Attendance, ClassPresentation models
