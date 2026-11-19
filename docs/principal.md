# PRINCIPAL DASHBOARD: MAKE EVERY TAB WORK, TO THE ROOT

Read this whole file first. It covers ONLY the PRINCIPAL role (the headmaster). It sits beside tutor.md, student.md and director.md: reuse what was built there (avatar system, widget rearranging, approval workflow, timetable data, messaging, live class module). If a shared piece is not built yet when you reach it, build the shared version and test it for every role that uses it. The approval table in remarks.md section 5 and the roles in remarks.md section 4 are the source of truth.

## 0. Rules (apply to every section)
1. Work on ONE section at a time (P1, P2, ...). When a section is finished: write docs/PRINCIPAL-P<n>.md (under 25 lines), commit, push, then STOP and wait for me to say "next".
2. Fix ROOT CAUSES, not symptoms: reproduce, find the exact file and line, fix, and prove with a test or command you ran.
3. Never write PASS or DONE for something you did not run. Write NOT RUN with the reason and the exact command for me.
4. Test against a production build (`npm run build && npm start`) with `npm run demo:reset` and `npm run seed:test`. Use two or three browser contexts whenever several people are involved (Principal plus Admin, Instructor, Student or Director).
5. "Works" means: (a) the page opens with real seeded data, (b) every button, link, menu and form does something visible, (c) data is saved and survives reload, logout and redeploy, (d) the other person sees the effect, (e) the Principal can do everything his role allows and nothing more, (f) it works at 390px and 1440px in light and dark theme, (g) a Playwright test covers it.
6. The Principal has full operational access to all data and full CRUD on operational modules. "Delete" is archive (soft delete) with a reason, a visible Archived filter and a Restore button, for students, results, payments, certificates, courses and logs; nothing critical is hard deleted. Actions that need the Director enter the approval workflow and do NOT take effect until approved. Every create, update, archive, view of personal data and export is audit logged.
7. No em dashes or en dashes anywhere in the UI, seed, emails or docs. Use a hyphen, comma or full stop.
8. No link may point to a removed portal or to another role's portal (for example the Principal's page linking to /director/approvals). Search the code base and fix every one.
9. Use the shared dashboard components. If a fix belongs in a shared component, fix it there and check the other roles still render.

## Reference data
- The 8 courses (codes): Certificate in Medical Home Care Course (MHC); Certificate in Basic Home Care (BHC); Basic Certificate in Babysitting, Child Care and Safety Management (BCS); Certificate in Mental Health Support and Advocacy (MHA); Basic Certificate in Care of elderly and Persons with Disability (diatric) (COP); Certificate in Basic Life Support (BLS); Certificate in Advanced Life Support (ALS); Certificate in Advanced First Aid (AFA).
- Registration numbers: per course AND per year, for example 2026/MHC/005 (the first student of a course in a year gets 001). Payment phases 50, 25, 25 percent. Times in Africa/Kampala.
- What the Principal decides alone: admissions (created by the Admin); marks changes after release; storage clearing confirmation; equipment requests (the Principal OR the Director). What the Principal prepares and the DIRECTOR approves: academic programme create, modify, archive; course or subject new or modified; results publication; certificate issuance; tuition payment proof (the Principal forwards it); fee changes, waivers, refunds; role assignments for Director and Principal accounts.
- Programme structure: Programme = each of the 8 courses; Course unit = a block or module inside it; Class = a cohort per intake and programme; Academic Year and Semester = an intake period; Departments (editable placeholders): Home Care, Child Care and Safety, Mental Health, Emergency and Life Support.

## P1. PROFILE, SECURITY AND IDENTITY
1. Names: store title, first name and last name separately. Initials use first and last name only, ignoring titles including Dr., Prof., Eng., Hon., Mr., Mrs., Ms., Nurse, Sr. The avatar in the sidebar shows "N" for Nankya Shanita; it must show "NS". Role label "Principal" (not "PRINCIPAL" in capitals), fully visible at 1280x720.
2. Profile and Settings (/principal/profile): edit phone, photo (shared avatar system: database storage, crop, remove, persists after logout and restart), password (current password required), theme, notification preferences. Locked: email and full name. Institution settings (intake label, contact details display, retention settings, grading defaults) live in a separate "Institution settings" tab of the same page, audit logged.
3. Security: two-factor authentication with QR code and backup codes, mandatory in production (and when TOTP_REQUIRED=true; relaxed only in development and staging). Active sessions list. The Director can reset the Principal's 2FA (the Principal is notified).
4. Tests: initials, broken avatar fallback, photo persists after logout and restart, locked fields rejected by a direct API call, 2FA enrol and backup code.

## P2. DASHBOARD SHELL AND WIDGETS (defects seen in the screenshots)
1. Banner: it contains an em dash. Reword to "Staging demo environment, not for real use. Data may be reset at any time." with a dismiss button.
2. Sidebar: a single "General" group holds 25 items, there is a horizontal scrollbar inside the sidebar, "Academic Years and Semeste..." is cut off, Students sits far from Admissions, and the Approvals Inbox is buried near the bottom. Replace with flat collapsible groups, no horizontal scroll, short labels from one label map:
 - Overview: Dashboard, Approvals Inbox, Approval Tracking, Reports and Analytics, Audit Logs
 - People: Students, Admissions, Instructors, User Management
 - Academics: Academic Programmes, Departments, Courses and Subjects, Classes and Groups, Terms (Academic Years and Semesters), Academic Calendar, Timetable
 - Teaching and Assessment: Attendance, Examinations, Results and Grading, Certificates, Learning Materials, Discussion Forum
 - Operations: Finance and Fees, Equipment, Storage, Support
 - Communication: Announcements, Messages, Notifications
 - Account: Profile and Settings
 The active group opens automatically; a badge on the Approvals Inbox with the count awaiting the Principal; the logo block fixed at the top, the user block fixed at the bottom.
3. Dashboard tabs General, Academics, Approvals, Reports must each show real, populated widgets:
 - General: Needs my decision (the Principal's own inbox, counts by type), Live now and today (classes with instructor, students online and enrolled, link to the class monitor), Admissions awaiting, Results awaiting review, Alerts (attendance below threshold, exams starting soon, storage over 80 percent), Recent admissions.
 - Academics: enrolment by programme (chart), class monitor, attendance below the minimum, upcoming exams, courses and programmes in draft.
 - Approvals: Approvals Inbox (what needs me) and Approval Tracking (waiting for the Director, with age).
 - Reports: quick exports and saved reports.
4. "Edit My Widgets" must really rearrange (drag handle plus Move to top, up, down and bottom, show or hide, column choice, Reset to default), saved per user per tab in the database, applied after reload and on another device.
5. Data defects seen in the screenshots:
 - The To Dos item "16 approvals pending your decision" links to /director/approvals, the Director's page, and shows the same number the Director sees. The Principal's inbox is its own query (items awaiting the PRINCIPAL) and links to /principal/approvals-inbox. One definition feeds every count, widget and badge.
 - Every "View" button in Upcoming Classes opens /principal/students. Each must open that class (details, roster, roll call so far, recording status). The widget shows Live now and Upcoming, the instructor as a separate field (not inside the title, remove "- Tutor Joel"), and students online and enrolled.
 - Recent Students: the registration numbers 2026/AFA/135, 2026/ALS/134, 2026/COP/133, 2026/BLS/132 and 2026/BLS/131 look like one global counter. Verify the generator numbers per course and per year (first student of a course in a year is 001), regenerate the seed through the generator, and add a test. Titles ("Nurse Sarah Arach", "Dr. James Lubega") come from the title field, not the name.
 - A Recent Admissions widget should show the status (awaiting approval, approved, active).
6. Dark theme contrast AA; theme remembered per user.
7. Tests: sidebar structure at 1280x720 and 390px without horizontal scroll, every tab has widgets, counts agree everywhere, no link to another portal, widget move persists after reload, registration number sequence per course and year.

## P3. APPROVALS INBOX AND APPROVAL TRACKING (the core of the role)
1. Approvals Inbox (/principal/approvals-inbox): items awaiting the Principal, with filters by type, age, requester and status, sorted oldest first with aging colours; the badge count matches the dashboard.
 - Admissions (Admin created the student record): the Principal sees the applicant details, uploaded documents (view only), eligibility (professional courses need professional title and registration number), and decides Approve, Reject (reason required) or Request more information. On approval the student is emailed that the account was created with a set-password link and becomes ACTIVE; the Admin is notified.
 - Payment proofs (collected by the Admin): the proof, the automatic checks (unique transaction ID, duplicate image, amount against the phase, time window), then Forward to the Director or Return to the Admin with a reason.
 - Results submissions (from instructors): see marks, pass rate, distribution, missing marks and outliers; Send back with comment, or Forward to the Director.
 - Marks changes after release: Approve or Reject with reason (the Principal decides alone).
 - Equipment requests (prepared by the Admin): Approve, or Forward to the Director (either may approve).
 - Storage clearing: confirm after the preview (the Director is notified).
 - Institution-wide announcements prepared by the Admin: approve or return.
 - Certificate lists prepared by the Admin: review and Request issuance from the Director.
2. Approval Tracking (/principal/approval-tracking): everything the Principal submitted to the Director with status, age and comments; a "Remind Director" button (rate limited); decided items; rejected items return to the Principal with the reason to fix and resubmit.
3. Every decision requires the data shown on the detail page, writes to the audit log, notifies the preparer in the app (and demo email), and applies automatically once the final approver acts. Nobody approves their own item. A warning appears when the data changed after submission.
4. Tests (three contexts): Admin creates a student and the Principal approves, then the student receives the email and can log in; the Principal rejects with a reason and the Admin sees it; a payment proof moves Admin to Principal to Director; a results submission is sent back and forwarded; a marks change is approved; tracking shows the right statuses; counts equal the dashboard badge.

## P4. PEOPLE: STUDENTS, ADMISSIONS, INSTRUCTORS, USER MANAGEMENT
1. Students (/principal/students): all students with search, filters (programme, intake, class, status, payment phase), pagination; create, edit, archive and restore; student detail with profile, registration number, documents, attendance, marks, payments status, approvals history. Registration numbers are generated by the system per course and year, unique and not editable. Export (CSV) audit logged.
2. Admissions (/principal/admissions): applications and admission records with status (submitted, created by Admin, awaiting approval, approved, rejected, withdrawn); the Principal can also register a student directly (same form as the Admin's); bulk approve for clean records; filters by course and intake.
3. Instructors (/principal/instructors): create instructors by invitation (email with set-password link; staff numbers), edit, archive and restore, assign to courses and course units; performance view (classes held versus scheduled, roll calls recorded, marks submitted on time, student pass rate, last active); detail page with their classes and students.
4. User Management (/principal/user-management): all user accounts with role, status, last login, 2FA status; invite, resend invite, send password reset link (never see or set a password), deactivate, archive and restore; role assignment for Admin, Instructor and Student roles takes effect immediately; role assignment for Director and Principal accounts goes to the Director for approval; cannot create or edit a Director account; the dummy Academic Registrar shows as inactive with the ACADEMIC_REGISTRAR_ACTIVE switch.
5. Tests: create, edit, archive and restore a student; the registration number sequence per course and year; instructor invitation and acceptance; a role change for an Instructor applies at once and one for a Principal waits for the Director; every link resolves.

## P5. ACADEMIC STRUCTURE
1. Academic Programmes (/principal/programmes): the 8 programmes with code, duration, category (Professionals or Open to all), eligibility, department, fee phases in percent, status. Create, edit, archive; a create, modify or archive goes to the Director (draft, submitted, approved or rejected, with a diff of what changed) and only takes effect once approved.
2. Departments: create and manage; assign programmes and a head.
3. Courses and Subjects (/principal/courses): course units (blocks) per programme with lessons, hours, assigned instructor; new or modified courses follow the Director approval flow.
4. Classes and Groups (/principal/classes): cohort per intake and programme; assign students (individually or in bulk) and instructors; default breakaway group size 5; class roster with photos.
5. Terms (/principal/semesters): intake periods with start, end, status, current intake; closing an intake shows the storage clearing preview.
6. Academic Calendar (/principal/calendar): events (intake dates, exam periods, holidays), visible to all roles; create, edit, delete; .ics export.
7. Timetable (/principal/timetable): week, month and list views of all classes (the single classes source also used by instructors and students); create, move, cancel; conflict detection for instructor and venue; changes notify instructors and students.
8. Tests: create a draft programme, the Director approves it and it goes live; a course change shows the diff; assigning students to a class shows them in the instructor's roster; a timetable change reaches the instructor and the student; the calendar event is visible to a student.

## P6. TEACHING AND ASSESSMENT OVERSIGHT
1. Attendance (/principal/attendance): by class, course, instructor and student; students below the minimum attendance; edit a record with a reason (audited); export.
2. Class monitor: a page per live class (opened from the dashboard) with instructor, students admitted and online, roll call so far, recording status, group assignments; a Join as observer button (Meet link, audited); past classes show recordings and attendance.
3. Examinations (/principal/examinations): create and manage exams across courses with the same builder as instructors (window, duration, per-question minutes, shuffle); exam timetable; live monitoring (sessions, progress, tab-switch flags); extend or stop a session in an emergency (audited); download results and the question paper.
4. Results and Grading (/principal/results): grading system settings (boundaries, pass mark per course); review submitted results; marks changes after release; forward to the Director; published results; progress reports and transcripts (PDF) for students.
5. Certificates (/principal/certificates): eligibility with the requirements checklist per student; request issuance from the Director in batches; certificate template and signatories; track status; verification page; revoke only through an approval with a reason.
6. Learning Materials (/principal/materials): browse, search, preview (the protected viewer) and manage all materials; upload materials to any course; archive and restore; students never download them.
7. Discussion Forum: read and moderate any forum (pin, lock, delete posts with a reason).
8. Tests (three contexts): the instructor submits results, the Principal reviews and forwards, the Director approves, the student sees them; the Principal extends an exam session; observer join is audited; below-threshold students appear; a certificate request is approved and the student gets the certificate.

## P7. FINANCE, EQUIPMENT, STORAGE, SUPPORT
1. Finance and Fees (/principal/finance): fee structure per programme as percent phases (a change goes to the Director); per student fee status, outstanding balances, phases paid; payment records (view); payment proofs forwarded to the Director; place or lift a payment hold with a reason (audited, the student sees it); refunds and waivers prepared and sent to the Director; reconciliation view; reports. The Principal cannot approve payments; only the Director does.
2. Equipment (/principal/equipment): equipment per practical session; requests prepared by the Admin; approve or forward; stock levels and missing items; history.
3. Storage (/principal/storage): used and total, by course, recordings versus notes; the previous-semester clearing preview with sizes; Confirm (the Director is notified); 14 day trash with Restore; warning at 80 percent.
4. Support (/principal/support): view all tickets (the IT Admin handles them), see status, comment, escalate.
5. Tests: a fee change goes to the Director and waits; a hold blocks a student with the reason; a payment proof is forwarded; clearing preview and confirmation work with the trash and restore; an equipment request is approved.

## P8. REPORTS, AUDIT, COMMUNICATION
1. Reports and Analytics (/principal/reports): enrolment, academic performance, attendance, finance (collected, outstanding by phase), certificates and graduates, applications funnel, instructor activity; date, programme and intake filters; drill-down; charts that work on mobile; export CSV and PDF (audit logged); the same numbers as the dashboard.
2. Audit Logs (/principal/audit): activity across the whole institution in plain sentences with role, entity, IP and before and after; filters by user, role, action, date and entity; search; export; append-only.
3. Announcements: publish institutional announcements to all, a course, an intake, a class or staff; schedule and pin; recipients see them in the Inbox and notifications. Messages: the Principal messages staff and students, unread badge, delivery within 10 seconds; a safeguarding moderation view of conversations with an audit entry for each view. Notifications: approvals awaiting, exams starting, low attendance, storage, security events; counts match the bell; each item opens the right page.
4. Tests: numbers on reports match the dashboard and the database; filters and exports work; an announcement reaches only its audience; a message is delivered and the badge clears.

## P9. SPEED, SECURITY AND FINAL PROOF
1. Fix scripts/click-audit.mjs for the Principal: click every sidebar item, tab, button, link, menu item and form (skip only sign out), record results in docs/CLICK-AUDIT-PRINCIPAL.md. Zero failures required.
2. Speed: every Principal page under 1 second at p95 on a production build with the seed; fix N+1 queries and add indexes; large lists paginated; reports cached for 60 seconds where safe.
3. Security: every Principal route rejects other roles, the Principal cannot approve items that need the Director, cannot approve his own items, cannot edit audit logs, and 2FA is mandatory in production.
4. Cross-role proof, one Playwright story with Student, Admin, Principal, Instructor and Director: admission, payment proof, results, course change and certificate each complete their chain.
5. Update docs/PRINCIPAL-STATUS.md with one honest table (section, status, evidence).

START WITH P1 ONLY. Stop after P1 and wait for "next".
