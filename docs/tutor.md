# TUTOR (INSTRUCTOR) DASHBOARD: MAKE EVERYTHING WORK, TO THE ROOT

Read this whole file first. It covers ONLY the INSTRUCTOR role (called Tutor in conversation). Other roles come later, one at a time.

## 0. Rules (apply to every section)-some sections may say edit courses but no need to change course names,those are the ones we should have 8 courses as it is not 7

1. Work on ONE section at a time (T1, T2, ...). When a section is finished: write docs/TUTOR-T<n>.md (under 25 lines), commit, push, then STOP and wait for me to say "next".
2. Fix ROOT CAUSES, not symptoms. For every defect: reproduce it, find the exact cause (file and line), fix it, and prove it with a test or command you actually ran.
3. Never write PASS or DONE for something you did not run. Write NOT RUN with the reason and the command for me.
4. Test against a production build (`npm run build && npm start`) with `npm run demo:reset`, plus `npm run seed:test` where 30 or more students are needed. Use two browser contexts when two people are involved (tutor and student).
5. "Works" means all of this: (a) the page opens with real seeded data, (b) every button, link, menu and form does something visible, (c) data is saved in the database and survives reload, logout and redeploy, (d) the other person sees the effect, (e) only permitted data is visible (a tutor sees only own courses, classes and students), (f) it works at 390px and 1440px in light and dark theme, (g) a Playwright test covers it.
6. Use the shared dashboard components. If a fix belongs in a shared component, fix it there and check that other roles still render.
7. No em dashes or en dashes anywhere in the UI, seed, emails or docs. Use a hyphen, comma or full stop.
8. The server filesystem is ephemeral on Render: never store user files on local disk. Use the database or S3-compatible storage only.

## T1. PROFILE AND PROFILE PICTURE (persistent)

Problem: the profile picture must be editable, stored, and still present after logout, login and redeploy.

1. Profile page (/tutor/profile): edit phone, short bio, notification preferences, theme (light or dark), photo, and change password (current password required). Email is locked; full name and registration or staff number are locked (changed only by the Admin). Validation, success toasts, saved to the database.
2. Photo upload: JPEG, PNG or WebP up to 5 MB. Process on the server with sharp: auto-rotate, centre-crop square, resize to 256x256 and a 64x64 thumbnail, convert to WebP, strip metadata, reject non-images by checking file contents (not only the extension). Add a crop and zoom step in the UI. "Remove photo" button.
3. Storage: store the processed bytes in the database (table UserAvatar: userId unique, contentType, bytes, thumbBytes, updatedAt, sizeBytes), never on local disk. Serve through GET /api/avatar/[userId]?size=thumb|full with authentication, ETag and Cache-Control (private, revalidate) so a changed photo shows immediately. Only logged-in users may read avatars.
4. Show the photo everywhere: sidebar user block, top bar, greeting card, student cards, rosters, roll call, forum posts, messages, class lists, approvals. Fallback when there is none: initials built from FIRST and LAST name only, ignoring titles (Dr., Prof., Eng.). Example: "Dr. Esther Achen" shows "EA", not "DA".
5. Tests: upload, log out, log in, photo still shown (Playwright); wrong file type and oversized file rejected; photo visible to a student in the messages screen; removal falls back to initials; photo survives `npm run build` restart.

## T2. MESSAGING (tutor to student and student to tutor)

Problem: the Message button on a student card must really send a message that the student receives.

1. Data: Conversation (participants), ConversationParticipant (lastReadAt), Message (conversationId, senderId, body up to 2000 characters, createdAt), plus notification records. Migration and indexes.
2. Tutor side: "Message" on every student card opens a conversation panel (drawer on mobile, split view on desktop; also a full page at /tutor/messages). Conversation list with search, unread counts, last message preview, time, photo. Send with Enter, newline with Shift+Enter, optimistic UI with retry on failure, mark as read on open.
3. Student side: add "Messages" to the student navigation and a bell or badge with the unread count in the top bar. The student sees the tutor's message, can reply, and the tutor sees the reply. Students can message ONLY their own instructors (and the Admin through Support); tutors only students in their own courses or classes.
4. Delivery: new messages appear within 10 seconds without refresh (poll every 10 seconds, or SSE with fallback to polling); create an in-app notification; email notification in demo mode goes to /dev/mail and is throttled (at most one email per conversation per 15 minutes). Real email sending stays off until a domain exists.
5. "Message class": the tutor can send one message to a whole class, course or breakaway group (stored as individual conversations or a clearly labelled broadcast; replies come back privately to the tutor).
6. Safety: rate limit 20 messages per minute per user, HTML escaped, links not auto-executed, a student cannot message a student they do not share a class with, participants only can read a conversation, and the Principal can open a moderation view for safeguarding with an audit log entry on every view.
7. Tests (two browser contexts): tutor sends, student sees the badge and the message within 15 seconds, student replies, tutor sees it; read receipts clear the badge; a tutor cannot message another tutor's student (403); rate limit works.

## T3. WIDGETS: "EDIT MY WIDGETS" MUST REALLY REARRANGE

Problem: the screen opens and switches work, but widgets do not move.

1. Find the root cause (check each): saved order not read when rendering; masonry or column layout ignoring the order field; preferences keyed per tab wrongly; optimistic state overwritten by stale server data; Redis or unstable_cache serving old preferences; drag events not firing (pointer sensors, touch, handle element); order written but never persisted; layout JSON shape mismatch. Report which one it was.
2. Behaviour: in Edit My Widgets each widget has a drag handle AND buttons "Move to top", "Move up", "Move down", "Move to bottom" (keyboard and screen reader friendly), plus a show or hide switch and a column choice (left, right, full width). Changes apply instantly on the page and are saved to the database per user per tab (Done or auto-save with a "Layout saved" toast). "Reset to default" restores the role default.
3. The saved layout is applied on reload, after logout and login, and on another device; invalidate any cache on save; new widgets added later appear at the bottom without breaking saved layouts.
4. Tests: move "Upcoming Classes" to the top, reload, assert the DOM order; hide a widget and reload; reset; works on the General and Teaching tabs; works on a touch viewport.

## T4. TIMETABLE (real data, real actions)

1. One source of truth for classes and sessions: course unit, block, date, start and end (Africa/Kampala time), venue or Meet link, instructor, class or group, status (scheduled, live, ended, cancelled, rescheduled). The timetable page, the "Upcoming Classes" widget, the student timetable, the Admin timetable and class reminders all read from it.
2. Instructor timetable (/tutor/timetable): week view and list view, previous and next, Today button, day, week and month navigation, colour by course, filter by course, highlight overlaps, click an entry to open details (course unit, students count, link, materials, roll call, Start class).
3. Actions: create a class (course unit, class or group, date, time, duration, Meet link, repeat weekly option), edit, reschedule, cancel (with reason). Rescheduling or cancelling notifies enrolled students (in-app plus email demo) and shows to the Admin and Principal. Conflict detection for the same instructor and the same venue. Downloading the instructor's own timetable as an .ics calendar file is allowed.
4. Students see only their own classes; instructors see only their own; the Admin sees all. Seed three instructors with overlapping times and past, live and upcoming classes with varied times and the 7 real course names.
5. Tests: create, reschedule and cancel; student sees the change; conflicts blocked; ics file valid; entries match the dashboard widget.

## T5. THE REMAINING TABS (one by one, to the dot)

Sidebar and tabs for the instructor: Dashboard, My Courses, My Classes, Students, Timetable, Attendance, Learning Materials, Assignments, Examinations, Marks and Results, Announcements, Reports, Notifications, Profile, Discussion Forum, Messages, Support. For each, the page must work as described, with an end-to-end test.

- My Courses: assigned courses only (we have 8 courses real course names), course unit list, student count, progress, materials and upcoming classes; open a course for details.
- My Classes: list live, upcoming and past classes; create; Start class; waiting room and admit students (one or all); grant and revoke speak rights; presentation panel upload (tutor only, students view-only); roll call at start, at end or both with Present, Late, Absent, Excused and "mark all present"; stop class; download attendance CSV and PDF at any time (name, registration number, course unit); add recording link or file; breakaway groups (default 5, random or by name, move students, group threads and one submission per group).
- Students: list from assigned classes with search, filters (course, class, status), photo, registration number, attendance percentage, latest marks, last active, Message button, export list. A student detail page.
- Attendance: history per class, edit with audit trail, download, attendance percentage per student.
- Learning Materials: upload PDF, notes, slides or video file, or add a video link; title, course unit, visibility (enrolled only, class or group, release date, hidden); replace, archive; "Preview as student" shows the protected viewer with watermark and NO download; the student sees it after release.
- Assignments: create (title, instructions, due date, individual or group, attachments), publish, list submissions, open and grade, comment, return, late flags; the student sees it, submits, and sees the grade.
- Examinations: create (start window, duration, per-question minutes, question types, shuffle), publish, monitor live sessions, auto-marking, download results, answer sheets and the question paper.
- Marks and Results: enter or import marks, see auto-marked results, submit for Principal review; status chips (draft, submitted, in review, approved); the tutor cannot publish.
- Announcements: write to own classes; students receive an in-app notification and see it on their dashboard.
- Reports: class performance and attendance with charts and CSV or PDF export.
- Notifications: list, mark read, mark all read, preferences; counts match the bell.
- Discussion Forum: forum per class and per breakaway group; post, reply, pin, delete own posts, moderate own classes.
- Support: create a ticket to the IT Admin, attach a file, see replies and status.
  Each tab must pass: opens with data, every control works, saved data persists, the student or other party sees the effect, no access to other tutors' data.

## T6. DASHBOARD DEFECTS SEEN IN THE SCREENSHOT (fix all)

1. Greeting says "Hello Mirembe!". It must use the FIRST name: "Hello Joel!". Names are stored as title, first name, last name; the sidebar shows "Joel Mirembe" (First Last), never "Mirembe Joel". Check seed data and every parser.
2. The staging banner contains an em dash. Reword: "Staging demo environment, not for real use. Data may be reset at any time." Dismiss button.

3. Avatar initials ignore titles (see T1).
4. Sidebar: the "General" wrapper still exists and the nav is cut off at the bottom ("Students" section hidden, role label clipped). Use flat collapsible groups (Overview, Teaching, Students, Assessment, Communication), no horizontal scrollbar, the logo block fixed at the top, the user block fixed at the bottom with the full role label "Instructor" visible at 1280x720. The active section opens automatically.
5. Dark theme: the "View 31 more" link and other muted text have poor contrast; status pills, chips and widget titles must meet AA contrast in dark and light themes. Remember the theme choice per user.
6. "View 31 more" should show a count that matches the real number of students, and open the Students page.
7. Verify the Students widget shows real photos, the registration number format (2026/MHC/005) and a working Message button.

## T7. PERFORMANCE AND FINAL PROOF FOR THE TUTOR

1. Fix `scripts/click-audit.mjs` for the instructor (use the seeded instructor login and Demo1234!): click every sidebar item, tab, button, link, menu item and form, record results in docs/CLICK-AUDIT-INSTRUCTOR.md. Zero failures required.
2. Page speed: with seed data each instructor page opens in under 1 second at p95 on a production build; remove N+1 queries and add indexes where needed.
3. Run the complete tutor Playwright suite plus the unit tests, tsc and the build, and update docs/TUTOR-STATUS.md with one honest table (section, status, evidence).

START WITH T1 ONLY. Stop after T1 and wait for "next".
