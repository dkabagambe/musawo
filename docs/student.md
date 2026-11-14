# STUDENT DASHBOARD: MAKE EVERY TAB WORK, TO THE ROOT

Read this whole file first. It covers ONLY the STUDENT role. It sits beside tutor.md: reuse what was built there (avatar system, messaging, widget rearranging, timetable data, live class module). If a shared piece is not built yet when you reach it, build the shared version and test it for BOTH roles.

## 0. Rules (apply to every section)
1. Work on ONE section at a time (S1, S2, ...). When a section is finished: write docs/STUDENT-S<n>.md (under 25 lines), commit, push, then STOP and wait for me to say "next".
2. Fix ROOT CAUSES, not symptoms: reproduce, find the exact file and line, fix, and prove with a test or command you ran.
3. Never write PASS or DONE for something you did not run. Write NOT RUN with the reason and the exact command for me.
4. Test against a production build (`npm run build && npm start`) with `npm run demo:reset` and `npm run seed:test` (35 students). Use two browser contexts whenever two people are involved (student plus tutor, Admin or IT Admin).
5. "Works" means: (a) the page opens with real seeded data, (b) every button, link, menu and form does something visible, (c) data is saved in the database and survives reload, logout and redeploy, (d) the other person sees the effect, (e) a student sees ONLY their own data and their own classes, (f) it works at 360px and 1440px in light and dark theme, (g) a Playwright test covers it.
6. Students never download learning materials. Their own certificate, receipts and results statement may be downloaded.
7. No em dashes or en dashes anywhere in the UI, seed, emails or docs. Use a hyphen, comma or full stop.
8. The server disk is ephemeral on Render: store user files in the database or S3-compatible storage only.
9. Use the shared dashboard components. If a fix belongs in a shared component, fix it there and check that the other roles still render.

## Reference data (use everywhere, seed and UI)
- The 8 courses (codes in brackets): Certificate in Medical Home Care Course (MHC); Certificate in Basic Home Care (BHC); Basic Certificate in Babysitting, Child Care and Safety Management (BCS); Certificate in Mental Health Support and Advocacy (MHA); Basic Certificate in Care of Older Persons and Persons with Disability (COP); Certificate in Basic Life Support (BLS); Certificate in Advanced Life Support (ALS); Certificate in Advanced First Aid (AFA). Remove old names such as "CNA Final Certification Exam".
- Registration numbers: per course, for example 2026/MHC/005.
- Payment phases: 50 percent before reporting, then 25, then 25. Access: 50 percent starts the course, 75 percent opens the next phase and practical booking, 100 percent opens the final exam and certificate. Locked items show the exact reason ("Pay 25 percent more to unlock the final exam").
- Times are Africa/Kampala (EAT).
- Demo students needed (seed:test): new (no payment), 50 percent paid, 75 percent paid, fully paid, overdue with a payment hold, completed with a certificate, plus 30 students in one class for groups and load.

## S1. MY PROFILE AND PHOTO
1. /dashboard/profile: edit phone, address, emergency contact, notification preferences, theme (system, light, dark), photo, and change password (current password required). LOCKED (read-only in the UI and rejected by the API): email, full name, registration number, programme. Show them clearly with the note "contact the Admin to change".
2. Photo: reuse the avatar system (processed WebP stored in the database, 256 and 64 pixel versions, served through the authenticated avatar route). Crop step, remove photo, content check, 5 MB limit.
3. The screenshot shows a broken avatar at the bottom of the sidebar (alt text "Ron" cut off). Fix the root cause. Every avatar must fall back to initials (first and last name, titles ignored) when the image is missing or fails to load, with onError handling. Show the photo in the sidebar, top bar, profile, messages, forum, rosters and roll call.
4. Photo, bio-style fields and theme persist after logout, login and server restart.
5. Tests: upload, logout, login, photo still there; broken image falls back to initials; locked fields rejected by a direct API call; password change requires the current password.

## S2. DASHBOARD SHELL AND WIDGETS (defects seen in the screenshots)
1. Banner: it contains an em dash. Reword to "Staging demo environment, not for real use. Data may be reset at any time." with a dismiss button.
2. Sidebar: the "General" wrapper holds 12 items, and "My Fees" and "Class Replays" float loose; the user block at the bottom is clipped. Replace with flat collapsible groups:
 - Overview: Dashboard, My Profile
 - Learning: My Programmes, My Courses, Learning Materials, Assignments, Discussion Forum
 - Classes: My Timetable, Live Classes, Class Replays, Attendance
 - Assessment: Examinations, My Results, Certificates
 - Finance: My Fees
 - Communication: Messages, Announcements, Notifications, Support
 The section with the active page opens automatically; icons are unique per group; no horizontal scrollbar; the logo block fixed at the top and the user block fixed at the bottom showing the avatar, "Ronald Mugisha" and the label "Student" (not "STUDENT PORTAL" in capitals), fully visible at 1280x720.
3. Widgets: "Edit My Widgets" must really rearrange (same root-cause approach as tutor.md T3): drag handle plus Move to top, up, down and bottom buttons, show or hide, column choice, Reset to default; saved per user per tab in the database; applied after reload and on another device; cache invalidated on save. Test: move "Upcoming Classes" to the top, reload, assert the DOM order.
4. Tabs General, Studies, Finance and Classes must each show real, populated widgets:
 - General: To Dos, Upcoming Classes, Payment and Fees summary, My Courses, Inbox
 - Studies: Course progress, Assignments due, Recent results, Forum activity
 - Finance: Fees progress (phase 1 of 3, 50 percent paid), Payment history, Receipts, Pay now
 - Classes: Timetable this week, Live now, Class Replays, Attendance summary
5. Data defects in the screenshots:
 - "Upcoming Classes" says none, while the Inbox says "Block 4 live class this Thursday at 6pm". Seed real classes for the student's courses so both agree.
 - "To Dos" items link to /dashboard/gradebook. Each exam item must open that exam, each assignment its assignment page; show date and time.
 - The course card shows "Certificate in Medical Home..." cut off: let titles wrap to two lines with a tooltip.
 - "CNA Final Certification Exam" is not one of the 8 courses: use real course exam names. Use full course names in the Inbox instead of "MHC".
 - Add a Payment Holds widget that also shows the fee phase progress when there is no hold.
6. Dark theme: contrast AA for muted text, links, chips and pills; theme remembered per user.
7. Tests: sidebar structure at 1280x720 and 360px, widget move persists, every tab has widgets, every widget link opens the right page.

## S3. MY TIMETABLE, LIVE CLASSES, CLASS REPLAYS, ATTENDANCE
1. My Timetable (/dashboard/timetable): real data from the single classes source: week, list and month views, Today button, colour by course, filter by course, each entry shows course unit, instructor (with photo), time (EAT), venue or online, status (scheduled, live now, ended, cancelled, rescheduled). Click an entry for details with a Join button when live, materials and the roll call result. Rescheduled or cancelled classes notify the student (in-app and demo email). Downloading the student's OWN timetable as an .ics file is allowed.
2. Live Classes (/dashboard/classes): sections Live now, Upcoming, Past. Join flow: press "Request to join", wait in the waiting room until the instructor admits you, then the Google Meet link appears (never visible before admission). Listen-only status until the instructor allows speaking; "Request to speak" (raise hand) with the live status LISTEN_ONLY, REQUESTED, CAN_SPEAK updating within 10 seconds. A view-only Presentation panel with the slides the instructor uploaded (no download). A roll call self check-in button ("I am here") when the instructor opens the window. Students join only under their real account name. Breakaway groups: show "Your group", members, the group's Meet link, the group thread and the group submission area.
3. Class Replays (/dashboard/recordings): list recordings of classes the student is enrolled in, newest first, with course unit, date, duration and a "Missed" tag for classes marked absent; search and filter by course. A class with no recording yet shows "Recording pending". Playback is inside the platform only: signed short-lived URLs, no download or save buttons, a watermark with name and registration number, playback speed (0.75 to 2x), resume where you stopped (saved per student), mark as watched. If the recording is a Meet or Drive link, open it in an embedded viewer when possible and show the note that external links can be shared by anyone who has them.
4. Attendance (/dashboard/attendance): per class record (present, late, absent, excused) with date, course unit and instructor; percentage per course unit and overall; the minimum attendance rule with a warning when below it; a disputed record can be reported to the instructor (creates a message).
5. Tests (two browser contexts): the instructor starts a class, the student requests to join, is admitted, sees the link; speak request and grant; presentation panel visible and not downloadable; roll call self check-in; attendance appears; recording added by the instructor and played by the student; resume position saved; a student not enrolled cannot see or play it; timetable change notifies the student.

## S4. LEARNING: PROGRAMMES, COURSES, MATERIALS, ASSIGNMENTS, FORUM
1. My Programmes (/dashboard/enrolled): enrolled programmes with intake, registration number, instructor, overall progress, the payment phase status, and a requirements checklist (lessons complete, exams passed, practicals signed, log book signed, attendance met, fees 100 percent). My Courses (/dashboard/courses): course units with progress and a Continue button; a unit locked by the payment phase shows the exact unlock message.
2. Learning Materials (/dashboard/materials): filter by course and unit, search, "New" badge, completion tick, resume where you stopped. PDFs, notes and slides open in the in-browser viewer (pdf.js) with short-lived signed URLs, NO download, print, save or copy, right-click blocked, and a watermark with name, registration number and date on every page. Videos stream by signed URLs with no download link and the same watermark overlay; external video links are marked "can be shared by anyone with the link". Items scheduled for later or hidden are not listed. Prove that a direct request for the file URL without a valid signature fails.
3. Assignments (/dashboard/assignments): lists Due soon, Submitted, Graded, Late. Open an assignment, read instructions, submit text and files (allowed types and size limits stated), resubmit until the due date, group assignments submit once for the whole breakaway group, see the grade and feedback, late flags, due dates in EAT. The instructor sees the submission.
4. Discussion Forum (/dashboard/forum): one forum per class and one per breakaway group; create a thread, reply, edit and delete own posts, search, unread markers, pinned posts, the instructor moderates. Notifications for replies to your thread.
5. Tests: materials viewer cannot download; unsigned URL denied; locked unit shows the right message at 50 and 75 percent; assignment submission seen by the tutor and graded back; group submission by one member counts for the group; forum post visible to classmates and the instructor.

## S5. EXAMINATIONS, MY RESULTS, CERTIFICATES
1. Examinations (/dashboard/exams): schedule with start time, duration, course unit, status. The exam page before the start shows a waiting screen "Exam starts in 00:04:12". At the instructor's start time the countdown begins. Questions appear ONE AT A TIME, forward only, each with its own minutes; an answered or timed-out question disappears and cannot be reopened. Answers autosave; a refresh restores the session without resetting any clock (the server is the clock authority); warnings at 5 and 1 minute; tab-switch logging; one active session; at time up the exam closes, submits and objective questions are marked instantly; the student sees the score immediately only when the instructor allows it. Exams locked by the payment phase show the reason. A student cannot open an exam early or twice beyond the attempt limit.
2. My Results (/dashboard/results): only results published by the Principal and approved by the Director; per course unit with marks, grade, comments, and status chips; results awaiting approval are NOT visible. A printable results statement (own data) is allowed.
3. Certificates (/dashboard/certificates): each course shows eligible or not eligible with the requirements checklist; once the Director approves, the certificate appears with a PDF download (own certificate allowed), a QR code and a public verification link (name, course, year, status). A revoked certificate shows as revoked.
4. The "Upcoming exam" To Dos open the exact exam.
5. Tests (two contexts): the instructor starts an exam, 30 students take it (seed:test); forward-only enforced by the server (direct request for an earlier question fails); refresh keeps the clock; auto-submit at expiry; score and instructor marks match; results appear only after publication and approval; certificate verification works.

## S6. MY FEES AND ACCESS
1. My Fees (/dashboard/payments): total fees shown as phases (50, 25, 25 percent) with status for each (not due, due, submitted, with Admin, with Principal, with Director, approved, rejected with reason). How to pay: only Mobile Money merchant codes and names from settings (MTN MoMo and Airtel Money); no bank details. A "Submit proof of payment" form (transaction ID, amount, date and time, optional screenshot of up to 5 MB) creates a claim for the Admin; the unique transaction ID rule applies; the student can follow the claim through the chain Admin, Principal, Director. Receipts (PDF) after approval. A payment hold set by the Admin shows with the reason and the next step.
2. Access follows only approved payments (phase thresholds above) and never the screenshot. Locked areas throughout the app show the exact unlock message and a link to My Fees.
3. Tests (two contexts): the student submits proof; the Admin sees it and forwards it; Principal and Director approve; content unlocks for the student within the page refresh; a duplicate transaction ID is rejected; a hold blocks access with the right message; the student cannot see another student's payments.

## S7. COMMUNICATION: MESSAGES, ANNOUNCEMENTS, NOTIFICATIONS, SUPPORT
1. Messages: the student side of the messaging module (see tutor.md T2). The student sees messages from their own instructors, replies, gets an unread badge in the top bar, new messages appear within 10 seconds, and can message only their own instructors. The Admin is reached through Support.
2. Announcements: institution-wide, course, class or group announcements; pinned first; unread markers; mark as read; filter by course; announcements appear on the dashboard Inbox.
3. Notifications: list with categories (classes, exams, assignments, payments, messages, system), mark read, mark all read, preferences per channel; the bell count matches the list; every item opens the right page.
4. Support: create a ticket to the IT Admin (category, description, optional attachment), see status and replies, reply back, close; the IT Admin sees and answers it; the student is notified.
5. Tests (two contexts): the tutor sends a message and the student receives it within 15 seconds; an announcement reaches only the intended students; a support ticket is answered by the IT Admin and seen by the student; notification links all resolve.

## S8. MOBILE, DARK MODE, SPEED, FINAL PROOF
1. Mobile first (most students use phones): bottom navigation with Dashboard, Classes, Learn, Fees, More; every page usable at 360px; tap targets of at least 44px; no horizontal scroll; low data friendly (lazy loading, no video autoplay, small images); dark and light theme both readable.
2. Fix scripts/click-audit.mjs for the student role: click every sidebar item, tab, button, link, menu item and form; record results in docs/CLICK-AUDIT-STUDENT.md. Zero failures required, including for the student states new, 50 percent, 75 percent, full, overdue and completed.
3. Speed: every student page under 1 second at p95 on a production build with the seed; remove N+1 queries; add indexes. Run `npm run load:30` with 30 students studying at the same time (login, dashboard, materials, timetable, forum, class join, exam) and report p50, p95, p99, error rate and 5xx. Targets: errors under 1 percent, p95 under 1 second, login p95 under 2 seconds.
4. Cross-role proof: one Playwright story with a tutor and a student: tutor uploads material, creates a class and an assignment, the student reads, joins, submits, takes the exam, gets results after approval, sees the certificate.
5. Update docs/STUDENT-STATUS.md with one honest table (section, status, evidence).

START WITH S1 ONLY. Stop after S1 and wait for "next".
