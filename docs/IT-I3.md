# IT Admin I3: Support Ticket Desk - COMPLETE

**Status:** COMPLETE  
**Completion Date:** 2026-11-19  
**Phase:** IT Admin Portal Implementation

---

## What was built

### New component: ITSupportDesk

Replaces the basic `SupportDesk` shared component at `/system/support`.

**Filtering and search**
- Debounced full-text search across subject, body, user name and email
- Filter by status (All / Open and in progress / Open / In progress / Resolved / Closed)
- Filter by priority (All / Urgent / High / Normal / Low)
- Filter by category (all categories including new ones: Timetable, Account Access, Front Desk, Attendance)
- Filter by assignee (All / Mine / Unassigned)
- Sort: newest first, oldest first, by priority, last updated
- Paginated results, 20 per page, with page navigation

**SLA timers**
- Each ticket shows a green / amber / red SLA badge
- Green: under 50% of target time elapsed
- Amber: 50-100% elapsed (due soon)
- Red: target exceeded (overdue)
- Met: first response already recorded (checkmark)
- SLA target is read from the `support.slaFirstResponseHours` setting (default: 4 hours)
- `firstResponseAt` is stamped on the ticket when the first non-internal staff reply is sent
- SLA target minutes are written per-ticket at creation time from the setting

**Internal notes**
- Reply form has an "Internal note" checkbox
- Internal notes are stored with `isInternal: true` on `SupportReply`
- Internal notes are never shown to the ticket owner (filtered in GET /api/support)
- Internal notes are styled in yellow to distinguish them from public replies

**Canned replies**
- "Use canned reply" button above the reply form shows a dropdown picker
- Clicking a canned reply inserts its body into the reply textarea
- "Manage canned replies" modal: add new and delete existing canned replies
- Canned replies are stored in the `CannedReply` database model

**Close with resolution summary**
- Selecting "Close (requires summary)" from the status dropdown opens a modal
- Resolution summary is required (minimum 5 characters)
- Summary is stored on the ticket and shown to the user via in-app notification
- Summary is displayed in the ticket detail view

**User technical profile**
- "User profile" button in the action row loads the requester's technical info
- Shows: name, email, role, account status, 2FA enrolled, active session count, joined date
- Never shows grades, payments, enrolments, results, documents, or any business data

**Analytics (Reports)**
- "Reports" button opens a modal with:
  - Total tickets
  - SLA breach count and SLA target
  - Average first response time
  - Average resolution time
  - Open tickets with no reply yet
  - Counts by status, category, priority (with bar chart for category)

### New route: /system/support/[id]

Full ticket detail page for IT Admin:
- Two-column layout: thread on the left, sidebar on the right
- Thread shows all replies with internal / public / staff distinction
- Internal notes shown in yellow with "Internal note" badge
- Reply form with internal note toggle
- Close button (requires resolution summary)
- Assign / unassign and priority change in sidebar
- User technical profile displayed in sidebar (no business data)
- Ticket metadata: category, first response time, reply counts

### New API routes

**GET /POST /PATCH `/api/support/canned-replies`**
- GET: list all active canned replies (managers only)
- POST: create a new canned reply
- PATCH: update or delete a canned reply

**GET `/api/support/[id]/user-profile`**
- Returns technical profile of the ticket owner (managers only)
- Explicitly excludes all business data

**GET `/api/support/reports`**
- Returns ticket analytics for the IT Admin dashboard

### Extended `/api/support` PATCH

New actions added:
- `priority` - change ticket priority
- `close` - close ticket with required resolution summary (also notifies user)
- `reply` now accepts `isInternal: boolean` - internal notes not visible to user
- `reply` now stamps `firstResponseAt` on the first non-internal staff reply
- Status `assign` no longer forces IN_PROGRESS when unassigning

### Seed data

- 7 canned replies seeded (account access, payment, timetable, attendance, technical, certificates, closing)
- `support.slaFirstResponseHours` setting: default 4 hours
- `support.ticketCategories` setting: expanded with Timetable, Account Access, Front Desk, Attendance

### Fix: otplib build error

Added `otplib` to `serverComponentsExternalPackages` in `next.config.mjs` so the ESM-only package resolves correctly through webpack. This fixed the pre-existing build failure that blocked I1 2FA from being testable.

---

## What still works (regressions checked)

- Student, Instructor, Admin, Principal support ticket creation unchanged
- Ticket detail pages for student and instructor unchanged
- Principal AllTicketsView unchanged
- SupportDesk (admin) unchanged
- GET /api/support for non-managers returns only own tickets, filters internal notes out

---

## Limitations

- Merge duplicate tickets: schema supports it (mergedIntoId) but no UI/API built
- User reopen within 7 days: not implemented (schema has closedAt but no reopen logic)
- Attachment download link: S3 key is stored; a download URL can be added in Phase 2
- Widget drag-and-drop: deferred from I2, still deferred

---

## Files created

- `src/app/(system)/system/support/ITSupportDesk.tsx`
- `src/app/(system)/system/support/[id]/page.tsx`
- `src/app/(system)/system/support/[id]/ITTicketDetail.tsx`
- `src/app/api/support/canned-replies/route.ts`
- `src/app/api/support/[id]/user-profile/route.ts`
- `src/app/api/support/reports/route.ts`

## Files modified

- `src/app/(system)/system/support/page.tsx` - uses ITSupportDesk
- `src/app/api/support/route.ts` - extended PATCH, SLA tracking, pagination, filters
- `next.config.mjs` - added otplib to serverComponentsExternalPackages
- `prisma/seed.ts` - canned replies, SLA setting, expanded categories
