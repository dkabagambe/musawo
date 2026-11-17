# PRINCIPAL P6 (PARTIAL): TEACHING AND ASSESSMENT OVERSIGHT

## Completed (P6.1-6.4)

### P6.1: Attendance ✅
- **Multiple View Modes**:
  - By Class: View attendance for specific classes with student roster
  - By Course: Aggregate attendance statistics per course
  - By Instructor: Attendance records grouped by instructor
  - By Student: Individual student attendance history with overall rate
  - Low Attendance: Students below 75% threshold (minimum 3 classes)

- **Edit Functionality**:
  - Edit attendance records (Present ↔ Absent)
  - Mandatory reason field (minimum 10 characters)
  - All edits are audited with before/after states
  - Restricted to users with `students.edit` permission

- **Statistics**:
  - Present/Absent counts per class
  - Attendance rates calculated as percentages
  - Color-coded indicators (green ≥75%, yellow ≥50%, red <50%)
  - Low attendance alerts for intervention

- **Export**:
  - CSV export for all views
  - Includes student details, class info, course, instructor, dates
  - Special export format for low attendance report
  - All exports are audit logged

- **API Routes**:
  - PATCH /api/principal/attendance (edit attendance with reason)
  - GET /api/principal/attendance/export (CSV export with view parameters)

- **UI Features**:
  - Tab-based navigation between views
  - Sidebar lists for classes/courses/instructors/students
  - Modal form for editing attendance
  - Real-time attendance calculations
  - Responsive design (mobile and desktop)

### P6.2: Class Monitor ✅
- **Individual Class Monitoring Page** (`/principal/classes/[classId]`)
  - Accessible from dashboard and classes list
  - Real-time class status (SCHEDULED, LIVE, COMPLETED)
  - Instructor information with avatar
  - Class details (duration, venue, course, scheduled time)

- **Live Statistics Dashboard**:
  - Total students registered
  - Students admitted to class
  - Currently online count
  - Roll call progress (marked present vs total)
  - Visual progress bar for roll call completion

- **Attendance Tab**:
  - Full student roster with avatars
  - Admission timestamps
  - Online/offline status
  - Roll call status (Present/Not marked)
  - Student numbers display

- **Breakaway Groups Tab**:
  - Display all configured groups for the class
  - Group names and member lists with avatars
  - Empty state when no groups configured

- **Recording Tab**:
  - Live recording status indicator (animated pulse)
  - Link to recording for completed classes
  - Recording availability status

- **Observer Join Feature**:
  - "Join as Observer" button (only visible when class is LIVE)
  - Opens meeting link in new tab
  - **Audited**: Every observer join creates audit log entry
  - Audit log includes: principal name, class title, course, instructor, timestamp
  - Permission-gated (students.view required)

- **Past Classes**:
  - Show recordings when available
  - Display attendance summary
  - Access to full attendance records

- **API Routes**:
  - POST /api/principal/classes/observe (log observer join, audited)

## Remaining (P6.3-6.8)
- Page per live class with real-time status
- Instructor info, students admitted and online
- Roll call progress, recording status
- Group assignments display
- "Join as observer" button (Meet link, audited)
- Past classes show recordings and attendance

### P6.3: Examinations ✅
- **Exam Builder** (Same as Instructors):
  - Create/edit exams with full question management
  - Three question types: MCQ, True/False, Short Answer
  - Question editor with options management
  - Reorder questions (move up/down)
  - Edit/delete questions
  - Real-time points calculation

- **Exam Settings**:
  - Course and block assignment
  - Total time limit (minutes)
  - Per-question time limit (seconds)
  - Attempt limit (1-5)
  - Pass mark percentage
  - Start window (schedule exam availability)
  - Shuffle questions option
  - Status: DRAFT, PUBLISHED, ARCHIVED

- **Exam Timetable View**:
  - Shows upcoming published exams
  - Date and time display
  - Quick overview of exam settings

- **Live Monitoring Dashboard** 🔴:
  - Real-time view of all in-progress attempts
  - Student information display
  - Progress tracking (current question)
  - **Tab switch detection** (academic integrity flags)
  - Started/end times
  - Link to detailed monitoring

- **Individual Attempt Monitor**:
  - Real-time countdown timer
  - Live statistics (student number, attempt, question, tab switches)
  - Time remaining alerts (warnings at 5min, 1min)
  - Student and exam details
  - Tab switch violation alerts
  - **Emergency Controls** (audited):
    - ⏱️ Extend Time: Add minutes with reason
    - 🛑 Stop Session: Force-submit with reason

- **Download Features**:
  - 📊 **Download Results**: CSV export with all attempt data
  - 📄 **Download Question Paper**: Formatted text export

### P6.4: Results and Grading ✅
- **Grading System Settings**:
  - Configure per-course grade boundaries
  - Pass mark percentage (0-100%)
  - Grade A, B, C, D minimum percentages
  - Below D is F (fail)
  - Letter grades calculated automatically
  - Create/edit settings
  - Audit logged

- **Five-Tab Interface**:
  - **Grading Settings**: Manage grade boundaries per course
  - **Submitted**: Results awaiting instructor scoring
  - **Ready to Publish**: Scored results, ready for Director
  - **Awaiting Director**: Publication approval requests
  - **Published Results**: Live results visible to students

- **Results Review**:
  - View submitted exam attempts
  - Filter by course
  - Student details (name, number, email)
  - Exam and course information
  - Submission timestamps

- **Forward to Director**:
  - Group results by exam
  - Forward button per exam
  - Creates RESULTS_PUBLICATION approval request
  - Includes student count and scores in metadata
  - Confirmation dialog
  - Audit logged

- **Published Results View**:
  - All published results with grades
  - Score, percentage, letter grade
  - Pass/fail status
  - Filter by course
  - Calculated using grading settings

- **Database**:
  - GradingSystemSetting model (per-course settings)
  - Migration: 20261117130000_add_grading_system_settings
  - Unique constraint on courseId

- **API Routes**:
  - POST /api/principal/results/grading-settings (create)
  - PATCH /api/principal/results/grading-settings (update)
  - POST /api/principal/results/forward (forward to Director)

## Remaining (P6.5-6.8)

### P6.5: Certificates ✅
- **Eligibility Checker with Requirements Checklist**:
  - Comprehensive per-student requirements display
  - Six requirements tracked:
    1. ✅ Lessons Complete (enrolment COMPLETED)
    2. ✅ Exams Passed (all course exams)
    3. ✅ Practicals Signed
    4. ✅ Log Book Signed
    5. ✅ Attendance ≥75% (calculated from live classes)
    6. ✅ Fees 100% (totalAmountUgx vs paidAmountUgx)
  - Visual indicators (✓/✗) for each requirement
  - Detailed metrics shown (e.g., "Attendance ≥75% (82%, 18/22)")
  - Card-based layout replacing table

- **Batch Certificate Issuance**:
  - Select multiple eligible students
  - Request button with reason field
  - Creates CERTIFICATE_ISSUANCE approval requests
  - Forwards to Director for approval
  - Audit logged

- **Status Tracking**:
  - Five tabs: Eligibility, Issued, Pending Approval, Revoked, Verification
  - Course filter on relevant tabs
  - Pending approvals show status and age
  - Issued certificates with revoke button

- **Certificate Revocation**:
  - Revoke button on issued certificates
  - Reason required (minimum 10 characters)
  - Creates CERTIFICATE_REVOCATION approval request
  - Requires Director approval
  - Revoked certificates show reason and date

- **Public Verification Page** (`/verify/[certificateId]`):
  - Beautiful gradient design
  - Valid certificate: Green checkmark with full details
  - Revoked certificate: Red X with reason
  - Displays: certificate ID, student, course, dates
  - Every verification logged to cert_verifications

- **Verification API** (`/api/certificates/verify/[certificateId]`):
  - JSON API for programmatic verification
  - Returns valid/revoked status
  - Used by inline verification tool
  - Logs all attempts

- **Inline Verification Tool**:
  - Input certificate ID in Verification tab
  - Instant lookup with result display
  - Public verification link shown

- **Database**:
  - Uses existing Certificate and CertVerification models
  - No new migrations required

- **API Routes**:
  - POST /api/principal/certificates/request-batch
  - POST /api/principal/certificates/revoke
  - GET /api/certificates/verify/[certificateId]

## Remaining (P6.6-6.8)

### P6.6: Learning Materials ✅
- **Browse and Search**:
  - View all materials across all courses
  - Search by title and transcript content
  - Advanced filters: course, type (VIDEO/NOTES/QUIZ), status
  - Grouped by "[CourseCode] - [Block Title]"
  - Shows duration, progress count, free preview badge

- **Protected Viewer** (Preview without Download):
  - Preview modal for each material
  - Video: Shows Bunny Video ID (player placeholder)
  - Notes/PDF: Shows S3 key (viewer placeholder)
  - Clear notice: streaming only, no downloads
  - All views tracked (audit logged)

- **Upload Materials**:
  - Select any course and block
  - Type-specific fields (VIDEO/NOTES/QUIZ)
  - Bunny Video ID for videos
  - S3 key for notes/PDFs
  - Optional transcript for searchability
  - Free preview toggle
  - Auto-assigns order number in block

- **Archive and Restore**:
  - Archive button (requires reason, minimum 10 chars)
  - Restore button (requires reason, minimum 10 chars)
  - Archived filter to view archived materials
  - Both actions audit logged
  - Soft delete with archivedAt timestamp

- **Streaming Only Policy**:
  - Videos: Bunny Stream (no download)
  - PDFs: S3 presigned URLs (view only)
  - Policy explained throughout UI
  - Students never download, only stream

- **Database**:
  - Uses existing Lesson model with archivedAt field
  - No new migrations required

- **API Routes**:
  - POST /api/principal/materials/upload
  - POST /api/principal/materials/[materialId]/archive
  - POST /api/principal/materials/[materialId]/restore

## Remaining (P6.7-6.8)

### P6.7: Discussion Forum Moderation ✅
- **Read Any Forum Thread**:
  - View all threads across all courses
  - Search by title and body content
  - Filter by course, status (pinned, locked)
  - Thread list with metadata: author, course, replies, date
  - Status badges displayed

- **Pin Threads**:
  - Pin/unpin button on each thread
  - Pinned threads shown at top
  - "📌 Pinned" badge
  - Audit logged (FORUM_THREAD_PINNED/UNPINNED)

- **Lock Threads**:
  - Lock/unlock button on each thread
  - Prevents new replies, thread remains visible
  - "🔒 Locked" badge
  - Audit logged (FORUM_THREAD_LOCKED/UNLOCKED)

- **Delete Posts** (Replies):
  - Delete button on each reply
  - **Reason required** (minimum 10 characters)
  - Confirmation dialog
  - Soft delete (deletedAt timestamp)
  - Hidden from students, visible to moderators
  - Audit logged with reason, author, body preview

- **Thread Detail View** (`/principal/forum/[threadId]`):
  - Full thread and all replies
  - Inline moderation actions
  - Deleted posts section (moderator-only)
  - Chronological reply order

- **Database**:
  - Uses existing ForumThread (pinned, locked fields)
  - Uses existing ForumReply (deletedAt field for soft delete)
  - No new migrations required

- **API Routes**:
  - POST /api/principal/forum/threads/[threadId]/pin
  - POST /api/principal/forum/threads/[threadId]/lock
  - POST /api/principal/forum/replies/[replyId]/delete

## Remaining (P6.8)

### P6.8: Integration Tests
Three-context test scenarios:
- Instructor submits results → Principal reviews/forwards → Director approves → Student sees
- Principal extends exam session (emergency)
- Observer join is audited
- Below-threshold students appear in low attendance
- Certificate request approved → student receives certificate

## Database

### Existing Models Used
- **Attendance**: liveClassId, userId, markedPresent, joinedAt, admittedAt, etc.
- **LiveClass**: For class context in attendance
- **User**: Students, instructors, course assignments
- **Course**: For attendance grouping

### Schema Notes
- Attendance.endComment used to store edit reasons
- No new migrations required for P6.1
- Future: Consider dedicated `attendanceEditReason` field and `attendanceEditedBy` FK

## API Routes Created

### P6.1 Routes
- **PATCH /api/principal/attendance**
  - Edit attendance record (markedPresent field)
  - Requires editReason (min 10 chars)
  - Creates audit log with before/after
  - Returns updated attendance record

- **GET /api/principal/attendance/export**
  - Query params: view, classId, courseId, instructorId, studentId
  - Returns CSV file
  - Different formats for different views
  - Audit logs all exports

### P6.2 Routes
- **POST /api/principal/classes/observe**
  - Log Principal joining live class as observer
  - Creates audit log with class, course, instructor details
  - Required before opening meeting link
  - Returns success confirmation

### P6.3 Routes
- **POST /api/principal/examinations**
  - Create new exam with questions
  - Validates all exam settings and questions
  - Creates audit log
  
- **PATCH /api/principal/examinations/[examId]**
  - Update exam and questions
  - Replaces all questions on update
  - Creates audit log

- **POST /api/principal/examinations/attempts/[attemptId]/extend**
  - Extend exam time (emergency, audited)
  - Requires extensionMinutes and reason
  - Updates timeLimitEndsAt
  - Creates detailed audit log

- **POST /api/principal/examinations/attempts/[attemptId]/stop**
  - Stop exam session (emergency, audited)
  - Force-submits the attempt
  - Requires reason
  - Creates detailed audit log

- **GET /api/principal/examinations/[examId]/results**
  - Download exam results as CSV
  - Includes all attempts with scores, tab switches
  - Audit logged

- **GET /api/principal/examinations/[examId]/questions**
  - Download question paper as formatted text
  - Includes answers for review
  - Audit logged

## Testing Required

Per principal.md P6 tests:
- **P6.1**: Edit attendance record → appears in audit log with reason
- **P6.1**: Export attendance for class → CSV contains all students
- **P6.1**: Low attendance view → shows only students below 75%
- **P6.1**: By student view → attendance rate calculated correctly
- **P6.1**: Edit audit log includes before/after states
- **P6.2**: Observer join button visible only when class is LIVE
- **P6.2**: Observer join creates audit log entry
- **P6.2**: Class monitor shows correct statistics (admitted, online, roll call)
- **P6.2**: Breakaway groups display correctly
- **P6.2**: Recording status updates appropriately
- **P6.3**: Create exam with questions → saved and appears in list
- **P6.3**: Edit exam → questions reordered and updated
- **P6.3**: Live monitoring shows in-progress attempts
- **P6.3**: Tab switches flagged correctly
- **P6.3**: Extend time creates audit log with reason
- **P6.3**: Stop session creates audit log and force-submits
- **P6.3**: Download results CSV contains all data
- **P6.3**: Download questions includes all Q&A
- Build passes: npm run build
- Works at 390px and 1440px in light/dark theme
- Playwright tests for P6.1-6.2 flows

## Notes
- **P6.1**: All attendance edits require explicit reason (audit trail)
- **P6.1**: Minimum attendance threshold: 75% (configurable)
- **P6.1**: Minimum classes for low attendance flag: 3
- **P6.1**: CSV exports include comprehensive student and class details
- **P6.2**: Observer join is always audited (principal.md requirement)
- **P6.2**: Join button only appears for LIVE classes with joinUrl
- **P6.2**: Class monitor accessible via `/principal/classes/[classId]`
- **P6.2**: Real-time statistics calculated on page load
- **P6.3**: Exam builder uses same interface as instructors
- **P6.3**: Emergency controls (extend/stop) require reason and are audited
- **P6.3**: Tab switches tracked automatically during exam attempts
- **P6.3**: Question paper download includes correct answers for review
- **P6.3**: Results export includes comprehensive attempt data
- Permission checks: students.view (read), students.edit (edit), exams.mark (exams)
- Principal role has both permissions by default

