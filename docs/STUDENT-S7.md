# Student S7: Communication

## What was built

**Messages**: Already complete from T2. Students message their own instructors only; Admin reached via Support. Unread mail badge in topbar polls every 10 s.

**Notifications bell badge**: Added `GET /api/notifications/unread-count` and `useUnreadNotificationCount` hook (10 s poll). The topbar now shows a live bell badge next to the mail badge. Notifications page no longer auto-marks-all on open; individual "Mark read" and a "Mark all read" button are present. Category filter (All, Messages, Classes, Exams, Assignments, Payments, Announcements, System) narrows the list. Each item is clickable and routes to the relevant page (Messages, Exams, Payments, support ticket, etc.).

**Announcements**: Added course filter buttons (All, Site-wide, per course). Unread markers ("New" badge) derived from notification read-state. Clicking an unread announcement marks it read. Static server component replaced with a thin server loader + `AnnouncementsClient` for interactivity.

**Support form**: Added category dropdown (General, Academic, Technical, Enrolment, Other) and optional file attachment (up to 5 MB, presigned S3 URL). Student can close their own ticket via `POST /api/support/[id]/close`. Student replies now notify IT Admin via in-app notification. The `PATCH /api/support` route (staff-only) is unchanged.

## Tests (e2e/student-s7-communication.spec.ts)
14 tests, all passing against production build:
- Messages page loads; tutor message received within 15 s; student cannot create student-student conversation; bell badge appears.
- Announcements pinned first; course filter buttons present; filter narrows to site-wide only.
- Notifications category tabs; mark-all button when unread; page does not auto-clear on open.
- Support page and form; category dropdown and file attachment present; full ticket lifecycle (submit, IT Admin reply, student sees reply, student closes ticket); cross-student isolation enforced.
