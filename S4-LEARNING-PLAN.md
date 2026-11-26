# S4: Learning - Implementation Plan

## Overview
S4 covers the learning content delivery system: programs, courses, materials, assignments, and forum.

## Status Quo Assessment

### What Exists (From Previous Phases)
- Database schema: User, Course, Block, Lesson, Assignment, ForumThread, etc.
- Seed data: 8 courses with blocks and lessons
- Payment phase access control system

### What Needs to be Built/Fixed

**4 Pages (Priority 1):**
1. `/dashboard/enrolled` - My Programmes (view programs + requirements)
2. `/dashboard/courses` - My Courses (course units + progress + continue)
3. `/dashboard/materials` - Learning Materials (search, filter, viewer with signed URLs)
4. `/dashboard/assignments` - Assignments (submit, resubmit, view feedback)

**1 Module (Priority 2):**
5. `/dashboard/forum` - Discussion Forum (threads, replies, moderation)

**Key Features:**
- Material viewer: PDF/notes with signed URLs, NO download, watermark overlay
- Access control: Payment phase determines what's visible
- Progress tracking: resume where you stopped
- Group submissions: entire group submits together
- Notifications: assignment due, forum reply

---

## Implementation Steps

### Step 1: My Programmes (/dashboard/enrolled)
**Files to Create/Update:**
- `src/app/(dashboard)/dashboard/enrolled/page.tsx` (NEW or update)
- Query: Get all enrolments for student with:
  - Course title, code
  - Intake label
  - Registration number
  - Instructor info + photo
  - Overall progress %
  - Payment phase status (phase 1 of 3: 50% paid)
  - Requirements checklist:
    - Lessons complete? ✓/✗
    - Exams passed? ✓/✗
    - Practicals signed? ✓/✗
    - Log book signed? ✓/✗
    - Attendance >= 75%? ✓/✗
    - Fees 100%? ✓/✗

**Components:**
- EnrolmentCard: Shows course + phase progress + checklist
- PhaseIndicator: Shows "Phase 1 of 3: 50% paid"
- RequirementsChecklist: Visual checklist of completion items

**Tests:**
- Render enrolled programmes (if any)
- Display payment phase correctly
- Checklist items accurate

---

### Step 2: My Courses (/dashboard/courses)
**Files to Create/Update:**
- `src/app/(dashboard)/dashboard/courses/page.tsx` (NEW or update)
- Query: Get all enrolled courses with:
  - Course title, code
  - Course progress % (lessons viewed / total lessons)
  - Continue button (links to first incomplete lesson)
  - Lock message if payment phase locked

**Components:**
- CourseCard: Shows progress bar + continue button
- LockedOverlay: "Pay 25% more to unlock the next phase"
- ProgressIndicator: "3 of 8 lessons completed"

**Tests:**
- Display courses with real progress
- Continue button goes to first incomplete lesson
- Locked course shows exact unlock reason

---

### Step 3: Learning Materials (/dashboard/materials)
**Files to Create/Update:**
- `src/app/(dashboard)/dashboard/materials/page.tsx` (NEW or update)
- `src/components/live/MaterialViewer.tsx` (NEW - embedded PDF/video viewer)
- `src/app/api/materials/[id]/view/route.ts` (NEW - signed URL endpoint)

**Features:**
- Filter by course + unit
- Search materials by name
- "New" badge for recent items
- Completion tick (✓)
- Resume where you stopped
- Material types: PDF, video, notes
- Payment phase access control

**Material Viewer:**
- **PDFs:** Use pdf.js with:
  - Signed short-lived URLs (1 hour)
  - NO download, print, save buttons
  - Right-click blocked
  - Watermark: "Name, Registration#, Date" on every page
  - Page navigation, zoom controls only

- **Videos:** Signed S3 URLs with:
  - NO download link
  - Watermark overlay
  - Playback speed (0.75-2x)
  - Resume position
  - Play controls only

- **External Links:** Show warning badge "Can be shared by anyone with the link"

**Signed URL Verification:**
- Test: Try accessing file without valid signature → 403 Forbidden
- Test: Signed URL expires after 1 hour → 403 Forbidden

**Components:**
- MaterialListTable: Search, filter, sort, type badge
- MaterialViewer: PDF/video/notes viewer
- AccessLockedMessage: "Pay 25% more to unlock"

**Tests:**
- Materials list loads with real data
- Filter by course works
- Search works
- PDF viewer blocks download/print
- Unsigned URL rejected
- Watermark visible
- Locked material shows exact unlock reason

---

### Step 4: Assignments (/dashboard/assignments)
**Files to Create/Update:**
- `src/app/(dashboard)/dashboard/assignments/page.tsx` (NEW or update)
- `src/app/(dashboard)/dashboard/assignments/[id]/page.tsx` (NEW - assignment detail)
- `src/components/AssignmentSubmitForm.tsx` (NEW)
- `src/app/api/assignments/[id]/submit/route.ts` (NEW)

**Lists:**
- Due soon (sorted by due date)
- Submitted (awaiting grade)
- Graded (with grade + feedback)
- Late (submitted after due date)

**Assignment Detail Page:**
- Instructions (from instructor)
- Due date + time (EAT)
- Submission area:
  - Text input
  - File upload (types + size limits displayed)
  - "Resubmit" button (until due date)
  - For groups: "Submit for group" (1 member submits for all)

- Feedback area (after grading):
  - Grade
  - Instructor feedback
  - Late indicator if applicable

**Components:**
- AssignmentCard: Shows title, due date, status
- SubmitForm: Text + file upload
- FeedbackSection: Grade + comments

**Tests:**
- Assignment due soon shows in list
- Submit text + file works
- Group member submits once for entire group
- Instructor sees submission
- Resubmit works until due date
- Grade appears after instructor grades
- Late submission flagged

---

### Step 5: Discussion Forum (/dashboard/forum)
**Files to Create/Update:**
- `src/app/(dashboard)/dashboard/forum/page.tsx` (NEW or update)
- `src/app/(dashboard)/dashboard/forum/[classId]/page.tsx` (NEW - class forum)
- `src/app/(dashboard)/dashboard/forum/[groupId]/page.tsx` (NEW - group forum)
- `src/components/ForumThread.tsx` (NEW)
- `src/app/api/forum/threads/route.ts` (NEW - create thread)
- `src/app/api/forum/replies/route.ts` (NEW - reply to thread)

**Features:**
- One forum per class (all students in class can see)
- One forum per breakaway group (members only)
- Create thread
- Reply to thread
- Edit own posts (before instructor locks it)
- Delete own posts (before first reply)
- Search threads
- Unread markers
- Pinned posts (instructor only)
- Instructor moderation controls

**Components:**
- ForumThreadList: Pinned first, sort by newest/active
- ThreadDetail: Replies in chronological order
- CreateThreadForm: Title + body text
- ReplyForm: Reply text
- ModeratorControls: Pin, lock, delete (instructor only)

**Notifications:**
- When someone replies to your thread → Inbox notification
- Student can mark as read

**Tests:**
- Create thread in class forum
- Reply to thread
- Edit own post
- Delete own post (before reply)
- Instructor pins post
- Student gets notification on reply
- Student marks notification read

---

## Database Schema Changes

### New/Updated Tables
```
Assignment
  ✓ Already exists: id, courseId, title, instructions, dueDate, etc.

AssignmentSubmission
  ✓ Already exists: id, assignmentId, submittedBy, groupId, etc.
  ADD: submittedAt, gradeReceivedAt, isLate (boolean)

LessonProgress
  ✓ Already exists: id, userId, lessonId, completedAt, watchPercent

ForumThread
  ✓ Already exists: id, classId, groupId, createdById, title, body, pinnedAt

ForumReply
  ✓ Already exists: id, threadId, authorId, body, createdAt, deletedAt

MaterialViewer
  ADD: Track last position for materials (similar to lesson progress)
```

---

## API Endpoints to Create

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/enrolments/[userId]/courses` | GET | Get student's enrolled courses |
| `/api/materials/search` | GET | Search materials by name |
| `/api/materials/[id]/view` | GET | Generate signed URL for material |
| `/api/materials/[id]/position` | POST | Save/restore material playback position |
| `/api/assignments/[id]/submit` | POST | Submit assignment |
| `/api/assignments/[id]/resubmit` | POST | Resubmit assignment |
| `/api/forum/threads` | POST | Create thread |
| `/api/forum/threads` | GET | List threads for class/group |
| `/api/forum/replies` | POST | Add reply |
| `/api/forum/threads/[id]/pin` | POST | Pin thread (instructor) |
| `/api/forum/threads/[id]/lock` | POST | Lock thread (instructor) |

---

## Access Control Rules

### Payment Phase Locks
- **50% locked:** Course info visible, materials/assignments/exams hidden
- **75% locked:** Previous + practicals and final exam hidden, next phase materials visible
- **100% locked:** Everything visible, certificate available

### Material Access
- Only visible to enrolled students in paid phase
- Cannot download: PDF viewer blocks it, video has no download option
- Cannot print: PDF print blocked, right-click disabled

### Assignment Access
- Visible to enrolled students in correct phase
- Resubmit blocked after due date
- Group: 1 member submits for entire group

### Forum Access
- Class forum: Only enrolled students can see
- Group forum: Only group members can see
- Instructor can moderate (pin, lock, delete)

---

## Signed URL Implementation

### For PDFs/Materials:
```typescript
// Generate signed URL valid for 1 hour
const signedUrl = await generateSignedUrl(
  s3Key: "materials/course-1/lesson-5/notes.pdf",
  expirySeconds: 3600
);

// URL includes: signature, timestamp, expiry
// Signature prevents tampering

// API endpoint validates:
// 1. Signature is valid
// 2. Timestamp + expiry not exceeded
// 3. User is enrolled in course
// 4. Payment phase allows access
```

---

## Watermark Implementation

### For PDFs:
```typescript
// Render watermark on every page using pdf.js:
// "Ronald Mugisha"
// "2026/MHC/005"
// "26 Nov 2026"
// Semi-transparent, diagonal, behind text
```

### For Videos:
```typescript
// Overlay using CSS:
// Position: fixed, bottom-right
// Opacity: 0.3
// Behind video controls
// "Ronald Mugisha | 2026/MHC/005 | 26 Nov 2026"
```

---

## Testing Strategy

### Unit Tests
- Material viewer blocks download
- Unsigned URL rejected
- Watermark renders correctly
- Payment phase lock works
- Assignment submission creates record

### E2E Tests (Playwright)
- Student views enrolled courses
- Student filters materials by course
- Student views PDF (watermark visible)
- Student submits assignment + file
- Instructor sees submission
- Student replies in forum
- Instructor pins thread
- Student gets notification on reply

### Manual Tests
- 50%, 75%, 100% paid students see correct content
- Locked materials show exact unlock message
- Material viewer doesn't allow download
- Resume position works for videos
- Group assignment: 1 member submits for all
- Forum: students see replies within 10 seconds

---

## Files to Create/Modify

### New Pages (4)
- `src/app/(dashboard)/dashboard/enrolled/page.tsx`
- `src/app/(dashboard)/dashboard/courses/page.tsx`
- `src/app/(dashboard)/dashboard/materials/page.tsx`
- `src/app/(dashboard)/dashboard/assignments/page.tsx`
- `src/app/(dashboard)/dashboard/assignments/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/forum/page.tsx`

### New Components (8+)
- `src/components/live/EnrolmentCard.tsx`
- `src/components/live/MaterialViewer.tsx`
- `src/components/live/AssignmentCard.tsx`
- `src/components/live/ForumThread.tsx`
- `src/components/live/PhaseIndicator.tsx`
- `src/components/live/RequirementsChecklist.tsx`
- `src/components/live/LockedOverlay.tsx`
- `src/components/live/WatermarkOverlay.tsx`

### New API Routes (12+)
- `src/app/api/enrolments/[userId]/courses/route.ts`
- `src/app/api/materials/search/route.ts`
- `src/app/api/materials/[id]/view/route.ts`
- `src/app/api/materials/[id]/position/route.ts`
- `src/app/api/assignments/[id]/submit/route.ts`
- `src/app/api/forum/threads/route.ts`
- `src/app/api/forum/replies/route.ts`
- `src/app/api/forum/[id]/pin/route.ts`
- etc.

### Updated Files
- `prisma/schema.prisma` - Add fields if needed
- Sidebar navigation - Link to S4 pages
- Tests - Add E2E tests for S4

---

## Effort Estimate

| Component | Complexity | Time |
|-----------|-----------|------|
| My Programmes | Low | 1-2 hours |
| My Courses | Low | 1-2 hours |
| Materials Viewer | High | 3-4 hours |
| Assignments | Medium | 2-3 hours |
| Forum | Medium | 2-3 hours |
| **Total** | | **9-14 hours** |

---

## Success Criteria

✅ All 4 pages render with real seeded data
✅ Material viewer blocks download/print
✅ Signed URLs required for content access
✅ Watermark visible on PDFs and videos
✅ Payment phase access control enforced
✅ Assignment submission recorded in database
✅ Forum threads and replies visible to relevant students
✅ Notifications sent for assignment due and forum replies
✅ All pages work at 360px and 1440px
✅ E2E tests pass for all S4 features

---

## Next Action

Review this plan. Ready to start S4 implementation? 

**Recommended start:**
1. Build My Programmes first (simplest, quick win)
2. Build My Courses (builds on programmes)
3. Build Learning Materials (most complex, needs signed URLs)
4. Build Assignments (depends on submission system)
5. Build Forum (most social, least critical)

Ready? Say "start S4" and I'll begin implementation.

