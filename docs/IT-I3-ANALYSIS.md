# IT Admin I3: Support Ticket Desk - Analysis & Implementation Plan

**Status:** 🟡 PARTIAL (40% Complete)  
**Analysis Date:** 2026-11-18  
**Priority:** HIGH

---

## Current State Assessment

### ✅ What Exists (40%)

1. **Database Schema** ✅
   - `SupportTicket` model with all required fields
   - `SupportReply` model for threaded conversations
   - `TicketStatus` enum: OPEN, IN_PROGRESS, RESOLVED, CLOSED
   - `TicketPriority` enum: LOW, NORMAL, HIGH, URGENT
   - Relations: user, assignee, replies
   - File attachment support via `fileS3Key`

2. **API Routes** ✅
   - `GET /api/support` - Lists tickets (filtered by role)
   - `POST /api/support` - Create new ticket
   - `PATCH /api/support` - Update ticket (assign, reply, status)
   - Role-based access control implemented
   - Email notifications to IT Admin on new tickets
   - Email notifications to user on replies

3. **Basic UI (SupportDesk.tsx)** ✅
   - Filter tabs: OPEN, MINE, WAITING, CLOSED
   - Assign to me functionality
   - Status dropdown (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
   - Reply thread display
   - Reply input and submission
   - Refresh button

4. **User-Facing Pages** ✅
   - Students, Instructors, Admin, Principal, Director can create tickets
   - Users see only their own tickets
   - Forms exist for ticket creation

### ❌ What's Missing (60%)

#### Critical Missing Features

1. **Advanced Filtering** ❌
   - No filter by category
   - No filter by priority
   - No filter by assignee (only "MINE" preset)
   - No filter by age/date range
   - No search functionality

2. **SLA Timers** ❌
   - No first response target setting
   - No SLA tracking on tickets
   - No overdue indicators (amber/red)
   - No SLA calculations

3. **Sorting** ❌
   - Current sort: `[{ status: "asc" }, { updatedAt: "desc" }]`
   - Requirement: "oldest first" option
   - No user-controlled sort options

4. **Canned Replies** ❌
   - No canned/template replies system
   - IT Admin must type every response

5. **Internal Notes** ❌
   - No internal notes separate from replies
   - All communication visible to user

6. **User Technical Profile Link** ❌
   - No link from ticket to user's account info
   - Should show: name, role, account status, last login, locked state
   - Must exclude business data

7. **Resolution Summary** ❌
   - No resolution summary field
   - No required summary when closing tickets

8. **Merge Duplicates** ❌
   - No duplicate detection
   - No merge functionality

9. **Attachment Handling** ❌
   - Backend supports S3 uploads via presigned URLs
   - Frontend doesn't show attachments
   - No download links for IT Admin
   - No file upload UI for users

10. **User Reopen Capability** ❌
    - Users cannot reopen tickets within 7 days
    - No time-based reopen logic

11. **Reports & Analytics** ❌
    - No tickets by category report
    - No average first response time
    - No average resolution time
    - No repeat issues tracking
    - No CSV export

12. **UI Improvements Needed** ❌
    - No priority badge display
    - No assignee display improvement
    - No last updated time display
    - No reply count badge
    - Poor mobile responsiveness
    - No pagination (100 ticket limit could be an issue)

---

## Implementation Plan

### Phase 1: Core Filtering & Search (Priority 1)

**Files to Modify:**
- `src/app/(system)/system/support/page.tsx`
- `src/app/(admin)/admin/support/SupportDesk.tsx`
- `src/app/api/support/route.ts`

**Tasks:**
1. Add advanced filter controls:
   - Category dropdown (GENERAL, ACADEMIC, TECHNICAL, ENROLMENT, OTHER)
   - Priority dropdown (LOW, NORMAL, HIGH, URGENT)
   - Assignee dropdown (All, Unassigned, Me, specific users)
   - Age/date range picker
   - Status checkboxes (allow multiple)

2. Add search input:
   - Search by ticket number (id)
   - Search by subject
   - Search by user name
   - Search by ticket body

3. Add sort controls:
   - Oldest first
   - Newest first
   - Priority high to low
   - Recently updated

4. Update API to accept filter parameters
5. Add pagination (replace 100 limit)

### Phase 2: SLA Tracking & Timers (Priority 1)

**Files to Create/Modify:**
- Add `firstResponseAt` DateTime? field to SupportTicket
- Add `firstResponseTargetMinutes` Int field (default from setting)
- `src/lib/settings.ts` - Add SLA settings
- `src/app/api/support/route.ts` - Calculate SLA breach
- `src/app/(admin)/admin/support/SupportDesk.tsx` - Display SLA indicators

**Tasks:**
1. Add system setting: `support.slaFirstResponseHours` (default: 4)
2. Calculate working hours (exclude weekends, or 24/7?)
3. Track first response timestamp
4. Display SLA timer on each ticket:
   - Green: under 50% of SLA
   - Amber: 50-100% of SLA
   - Red: overdue
5. Show time remaining/overdue in human-readable format

### Phase 3: Canned Replies & Internal Notes (Priority 2)

**Files to Create:**
- `prisma/schema.prisma` - Add CannedReply model
- `prisma/schema.prisma` - Add `isInternal` boolean to SupportReply
- `src/app/api/support/canned-replies/route.ts`
- `src/components/support/CannedReplyPicker.tsx`

**Schema:**
```prisma
model CannedReply {
  id        String   @id @default(cuid())
  title     String
  body      String   @db.Text
  category  String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Modify SupportReply to add:
isInternal Boolean @default(false) // Internal notes not visible to user
```

**Tasks:**
1. Create canned replies management UI (in Settings or Support page)
2. Add canned reply picker in reply form
3. Add "Internal Note" checkbox on reply form
4. Filter internal notes from user view
5. Style internal notes differently in IT Admin view

### Phase 4: User Profile Link & Resolution Summary (Priority 2)

**Files to Create/Modify:**
- `src/app/(system)/system/support/[id]/page.tsx` (new detailed view)
- `src/components/support/UserTechnicalProfile.tsx`
- Add `resolutionSummary` String? @db.Text to SupportTicket

**Tasks:**
1. Create ticket detail page with:
   - Full ticket history
   - User technical profile sidebar:
     * Name, role
     * Account status
     * Last login
     * Locked state
     * 2FA enrolled
     * Active sessions count
     * NO business data
   - Resolution summary form (required when closing)

2. Update ticket list to link to detail page
3. Add resolution summary field to close action

### Phase 5: Attachments & Advanced Features (Priority 3)

**Files to Create/Modify:**
- `src/components/support/AttachmentUpload.tsx`
- `src/app/api/support/[id]/attachment/route.ts`
- Add merge duplicate functionality

**Tasks:**
1. **Attachments:**
   - Display file upload in user ticket form
   - Show attachment download link for IT Admin (presigned URL)
   - Show attachment indicator in ticket list
   - Validate 5MB limit on frontend

2. **Merge Duplicates:**
   - UI to select tickets to merge
   - Merge logic: combine replies, keep oldest ticket
   - Audit log merge action

3. **Reopen Logic:**
   - Add `closedAt` DateTime? to SupportTicket
   - Allow reopen if < 7 days since closed
   - Only ticket creator can reopen
   - Reopening changes status to OPEN

### Phase 6: Reports & Analytics (Priority 3)

**Files to Create:**
- `src/app/(system)/system/support/reports/page.tsx`
- `src/app/api/support/reports/route.ts`

**Tasks:**
1. Build reports dashboard:
   - Tickets by category (chart)
   - Tickets by status (chart)
   - Average first response time
   - Average resolution time
   - Repeat issues (same user, similar subject)
   - Top categories
   - Busiest days/hours

2. CSV export functionality:
   - Export filtered tickets
   - Include all fields
   - Include reply count

---

## Database Schema Changes Required

### Add to SupportTicket:
```prisma
model SupportTicket {
  // ... existing fields ...
  firstResponseAt           DateTime?
  firstResponseTargetMinutes Int?     @default(240) // 4 hours
  resolutionSummary         String?   @db.Text
  closedAt                  DateTime?
  mergedIntoId              String?
  mergedInto                SupportTicket?  @relation("MergedTickets", fields: [mergedIntoId], references: [id])
  mergedTickets             SupportTicket[] @relation("MergedTickets")
  
  @@index([firstResponseAt])
  @@index([mergedIntoId])
}
```

### Add SupportReply isInternal:
```prisma
model SupportReply {
  // ... existing fields ...
  isInternal Boolean @default(false)
}
```

### New Model:
```prisma
model CannedReply {
  id        String   @id @default(cuid())
  title     String
  body      String   @db.Text
  category  String?
  active    Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([active, category])
  @@map("canned_replies")
}
```

---

## Testing Requirements

### Manual Tests (per requirement I3.5):
1. ✅ Student creates ticket → IT Admin sees it
2. ✅ IT Admin replies → Student sees reply and notification
3. ✅ Tickets from all 5 business roles arrive in queue
4. ❌ SLA breach is flagged (amber/red)
5. ❌ IT Admin cannot open student's grades from ticket link
6. ❌ User sees only their own tickets (already works)
7. ❌ Search filters work correctly
8. ❌ Canned reply insertion works
9. ❌ Internal notes invisible to user
10. ❌ Resolution summary required on close
11. ❌ Attachment upload and download
12. ❌ Merge duplicates functionality
13. ❌ Reopen within 7 days
14. ❌ Reports show accurate data
15. ❌ CSV export contains all data

### Playwright Tests Needed:
```typescript
// e2e/it-i3-support-desk.spec.ts
- Advanced filtering by category, priority, assignee
- Search by ticket number, subject, user name
- SLA timer display (mock time passage)
- Canned reply selection and insertion
- Internal note creation (invisible to user)
- Resolution summary required validation
- User profile link shows correct technical data (no business data)
- Attachment upload and download
- Merge duplicate tickets
- Reopen ticket within 7 days
- CSV export
```

---

## Estimated Effort

- Phase 1 (Filtering & Search): 4-6 hours
- Phase 2 (SLA Tracking): 3-4 hours
- Phase 3 (Canned Replies & Internal Notes): 4-5 hours
- Phase 4 (Profile Link & Resolution Summary): 3-4 hours
- Phase 5 (Attachments & Advanced): 5-6 hours
- Phase 6 (Reports): 4-5 hours
- Testing & Polish: 3-4 hours

**Total: 26-34 hours** (3-4 days full-time)

---

## Priority Recommendations

**Must Have (Blocking I3 completion):**
1. ✅ Advanced filtering (category, priority, assignee, status)
2. ✅ Search functionality
3. ✅ SLA timers with amber/red indicators
4. ✅ Canned replies
5. ✅ Internal notes
6. ✅ User technical profile link
7. ✅ Resolution summary on close

**Should Have (Important but deferrable):**
8. ⚠️ Merge duplicates
9. ⚠️ Reopen within 7 days
10. ⚠️ Attachment download UI
11. ⚠️ Better mobile responsiveness

**Nice to Have (Phase 2):**
12. 📊 Reports & analytics
13. 📊 CSV export
14. 📊 Repeat issue detection

---

## Next Steps

**Immediate action:** Decide on implementation order:
1. Start with Phase 1 (filtering) + Phase 2 (SLA) together?
2. Or prioritize based on user pain points?

**Question for clarification:**
- SLA calculation: 24/7 or working hours only (Mon-Fri 9-5)?
- Should there be a "Waiting for user" status separate from IN_PROGRESS?
- Can any IT Admin user manage canned replies, or just a specific admin?

