Apply the decisions below to the MTC learning system. Audit first and report what exists; reuse working code; use permission-based checks (never role names in code); update the demo seed, tests and docs/DEMO.md. No em dashes or en dashes anywhere. Unknown values become admin settings with sensible defaults. Migrate old role names (MANAGING_DIRECTOR, BURSAR, REGISTRAR, ACCOUNTS, BUSINESS_DEV_MANAGER, COMMUNICATIONS_OFFICER, MARKETING_COMMS) to the set below. Stop after each batch and wait for "next".

PRINCIPLES

- This is a learning SYSTEM, not a website: no homepage CMS, no news or gallery, no marketing role. Public pages are fixed and generated from system data; only SUPER_ADMIN or SYSTEM_IT edit these settings: contacts, intake label, fee display, accreditation text (empty by default), flyer file. Announcements are internal in-platform notifications only.
- Students NEVER download materials. PDFs, notes, slides and videos open only inside the platform (see Batch C). Document that screenshots cannot be fully prevented.

BATCH A: CONTENT, ROLES, ACCOUNTS
A1. Replace ALL dummy courses with the 7 real courses (flyer, November 2026 intake): Medical Home Care (3 months, Professionals); Basic Certificate in Babysitting, Childcare and Safety Management (2 months, Open to all); Mental Health Support and Advocacy Certificate (3 months, Open to all); Basic Certificate in Care of Older Persons and Persons with Disability (Geriatric) (3 months, Open to all); Basic Life Support and First Aid Certificate (1 month, Open to all); Advanced Life Support (1 month, Professionals). Each has slug, duration, category, target audience, eligibility (Professional courses need professional title and registration number), draft description and 4 to 6 module placeholders marked "draft for Principal review", delivery "hybrid and online classes with 70% hands-on practicals in our skills lab", taught by doctors, nurses and clinicians. Registrar creates courses, Principal approves. Fees show "Fee: contact admissions" until FINANCE_OFFICER sets them (SUPER_ADMIN approves changes); DEMO_MODE only: labelled placeholder fees (3-month Open to all UGX 1,800,000; Medical Home Caregiver 2,300,000; Babysitting 1,200,000; Basic Life Support 600,000; Advanced Life Support 900,000); keep instalments with the 25/50/75/100 access thresholds and the note "We do not provide accommodation".
Copy: remove "100% online" claims; use hybrid and online classes, 70% hands-on practicals in our skills lab, taught by doctors, nurses and clinicians, job placement support in Uganda, job opportunities abroad through licensed recruitment agencies with pre-departure preparation; tagline "Learn · Serve · Transform"; eyebrow "Now enrolling: November 2026 intake". Remove every claim of Ministry of Health or Education accreditation and "nationally recognised" everywhere. Scholarships OFF behind SCHOLARSHIPS_ENABLED=false (hide pages, links, forms, codes, approvals, seed, text).
Contacts from the flyer (settings): phones 0709 184 468 and 0790 192 270 (replace +256 785 423 523 everywhere), emails info@musawo.ug and admissions@musawo.ug, www.musawo.ug, address "Luggala Trading Center, Lubaga Division, Kampala (near Pr. Namutebi's Church)", WhatsApp https://wa.me/256709184468. Update the map to this address: look up and verify the coordinates, keep the key-free Leaflet or OpenStreetMap map with fallback card; replace "Lungujja clinic" wording with "skills lab". Show public/assets/flyer-nov-2026.jpeg as a static "Call for applications" section and a flyer download on course pages. Apply form fields: full name, email, phone, course, intake, category, professional title and registration number (Professional courses), highest qualification, how you heard about us.
A2. Roles (labels editable, data driven): SUPER_ADMIN (MD/CEO/ED/CFO), BOARD_MEMBER, PRINCIPAL, DEPUTY_PRINCIPAL, ACADEMIC_REGISTRAR, INSTRUCTOR (Teaching Staff), TEACHING_ASSISTANT (Supporting Staff), FINANCE_OFFICER (Accounts/Audit), HR_SYSTEM_ADMIN (Human Resource and Administrator), AUDITOR_READONLY (Legal Advisor), SYSTEM_IT (technical), STUDENT. No marketing role.
HIERARCHY (store a role tree with parent and level; the top has more privileges than the lower): SUPER_ADMIN > PRINCIPAL > DEPUTY_PRINCIPAL > [ACADEMIC_REGISTRAR > INSTRUCTOR > TEACHING_ASSISTANT > STUDENT views], with FINANCE_OFFICER and HR_SYSTEM_ADMIN as separate branches under the Deputy Principal; BOARD_MEMBER and AUDITOR_READONLY are read-only oversight; SYSTEM_IT is technical. A senior role inherits every permission of the roles beneath it in its own branch (view, supervise and, where allowed, act), SUPER_ADMIN inherits all. Inherited actions are logged "via role X". These rules override inheritance: initiators cannot approve their own requests; payment verification above the threshold needs two people; marks changes after release need a reason and Principal approval; nobody grants themselves roles; secrets and payment keys stay with SUPER_ADMIN and SYSTEM_IT.
Powers (default deny, data scoped): SUPER_ADMIN sees everything, decision dashboard, creates, deactivates and archives accounts (never hard delete), final approvals (refunds, waivers, fee and role changes), settings, audit log (max 3 accounts, seed or CLI only, TOTP in production). BOARD_MEMBER read-only aggregates, policies, graduate names, course and year. PRINCIPAL approves courses, lecturers and assignments, publishes final results, approves graduands and certificates, internal announcements, sees all academic data and finance totals. DEPUTY_PRINCIPAL same as Principal but no delete, and no publishing or graduand approval unless delegated; handles complaints, teaching staff attendance, timetable clashes. ACADEMIC_REGISTRAR creates student accounts, applications, admissions, enrolment, class groups, course allocation, calendar and exam timetables, transcripts, graduates register, certificate issue after approval; sees payment status only; cannot publish results. INSTRUCTOR: own courses and units only. TEACHING_ASSISTANT: helps upload materials and take roll call when assigned, cannot set final marks. FINANCE_OFFICER: fee status, payment holds (block or unblock access with reason), payments, receipts, reconciliation, reports; refunds, waivers and fee changes need SUPER_ADMIN; cannot see exam questions or edit marks. HR_SYSTEM_ADMIN: staff records, staff accounts by invite, deactivate leavers, leave, support tickets, timetable and venues, non-secret settings; cannot create SUPER_ADMIN, BOARD_MEMBER or AUDITOR_READONLY. AUDITOR_READONLY: read-only policies, student records, graduates, finance and audit logs, complaints, may flag items, every view logged. STUDENT: own learning, payments, results, certificate.
Update nav, each role's dashboard and redirects, permission matrix doc, 403 tests per role and per hierarchy rule, audit alerts, access review, one demo account per role, /dev/login.
A3. No self-registration. Redirect /register to /apply; remove "Create account"; buttons become "Apply now". Apply creates an Application only (email confirmation to applicant; Registrar notified; Principal and Deputy can view). Registrar "Create student" screen (also from an application, and CSV import with preview and duplicate checks): full name as on ID, email (unique), phone, course and intake, category with eligibility checks, date of birth, gender, district, highest qualification, optional encrypted ID number, emergency contact. STUDENT NUMBER: report the format currently generated (earlier seed data had values like MTC-2026-00002) and confirm it is generated automatically by the system when the Registrar creates the student record (not at payment or login), unique, sequential per year, never reused, not editable; make the pattern a setting, default {PREFIX}-{YYYY}-{SEQ:5} (MTC-2026-00001); I will confirm if my required format differs. Flow: PENDING_ACCEPTANCE, then an emailed expiring single-use link (7 days, resend and revoke); the student reviews details, can press "These details are wrong" (DETAILS_DISPUTED) or Approve (accept policies and data consent, set a password, optional phone OTP); then ACTIVE and login works; login is impossible before acceptance. Staff use the same invite and accept flow. After acceptance the student sees "Complete your enrolment" until payment is verified (existing percentage access) with preview lessons visible. /dev/mail shows emails in development. Seed demo students (mostly ACTIVE, two pending, one disputed) and Playwright flow for create, accept, login, pay, unlock.

BATCH B: LIVE CLASSES, PRESENCE, RECORDINGS, ROLL CALL
Provider-agnostic live module: adapter "link" (Meet, Zoom or other URL; default and fallback) and a BigBlueButton adapter (create meeting, join as MODERATOR or VIEWER using the account's full name, guestPolicy ASK_MODERATOR, mute on start, mic lock settings, recording, fetch recordings); Jitsi stub off by default.

1. The instructor moderates. The join link stays hidden until "Start class". Students press "Request to join" and appear in the instructor's waiting room; admit one by one or "Admit all enrolled". Only enrolled, paid-up, admitted students get the link or a signed join token. Students join only with their real account name.
2. PRESENCE: show the instructor "Online now" for their students (in class, logged in elsewhere on the platform, offline with last seen) with counts; Registrar, Principal and Deputy see online counts and lists; heartbeat every 30 seconds via WebSocket or SSE with Redis. Support many concurrent users: stateless app, connection pooling, indexes, caching; target 500 concurrent logged-in users and 500 concurrent exam sessions; add k6 load tests and a docs/CAPACITY.md with results, limits (live video capacity depends on the provider and server size) and recommended server sizes.
3. Interaction: per-class "students may speak", raise hand, instructor allow or mute per student or all, and "Give presenter rights" and revoke (screen share or present slides), mapped to the provider where supported, otherwise shown as clear instructions.
4. ROLL CALL at the start, the end, or both: list of enrolled students with Present, Late, Absent, Excused, "Mark all present", comments, timestamps; optional self check-in window ("I am here" or a code). Platform join and leave times are recorded automatically; the instructor's roll call is the final record (edits audited). "Download attendance" any time before, during or after class as CSV and PDF (names, student numbers, status at start and end, join and leave times, minutes, percentage). Minimum attendance rule per course feeds graduation clearance.
5. "Stop class" closes the room and ends admission.
6. RECORDINGS: per class "record" (default on). BigBlueButton recordings are fetched automatically; with link providers the instructor starts recording in that tool, then adds the link or uploads the file after class; show "Recording pending" and remind the instructor at class end. A "Missed a class? Watch the recording" area streams recordings inside the platform (no download, signed short-lived URLs, name watermark) to enrolled students, especially those marked absent.
7. Reminders by email, SMS or WhatsApp; timetable shows Starting soon, Live now, Replay. Seed classes with roll calls, attendance and recordings; tests.

BATCH C: MATERIALS AND SELF-PACED CLASSES (READ AND WATCH ONLINE ONLY)

1. Instructors (and assigned assistants) upload PDFs, notes and slides, upload videos, or add a video link, and create classes. Visibility per item (enrolled only, intake or group, release date, hidden) and view tracking; students see only what is released and what their paid percentage allows.
2. NO DOWNLOADS for students: PDFs open in an in-browser viewer (pdf.js) with short-lived signed URLs, no download, print or save buttons, blocked right-click and text copy, and a watermark with the student's name, student number and date on every page; notes and slides render in-page the same way; uploaded videos stream by signed URLs (Bunny) with no download link, domain lock and the same watermark overlay; external video links are allowed but flagged "can be shared by anyone with the link". Log views. Instructors, Principal and Registrar can download their own uploads.
3. Self-paced classes with no teacher: lessons with video, reading and post-lesson tests, progress tracking, optional "pass the test to unlock the next lesson", all inside the platform.
4. Messaging between instructors and their own students; internal announcements by Principal, Deputy and Registrar (all students, course, intake, staff) and by instructors (own classes), delivered as notifications with optional email, SMS or WhatsApp.

BATCH D: EXAMS AND PRACTICALS (benchmark Moodle quiz sequential navigation with time limits and Canvas "one question at a time" and "lock questions after answering")

1. Exam setup by the instructor: start date and time, duration, attempts, pass mark, and for EVERY question its own time allowance in minutes (the sum must equal the exam duration; show a total while building). Question types: multiple choice, true or false, matching, numeric (auto-marked); short answer and essay (manual marking queue).
2. Exam portal: students log in to a waiting screen with "Exam starts in 00:04:12". At the tutor's start time the countdown starts for everyone (setting for a grace period for late joiners, who get only the remaining time). Questions appear ONE AT A TIME, forward only: after a question is answered (or its minutes run out) it disappears and cannot be revisited, so nobody can copy it for people who have not reached it. Shuffled question and option order, name watermark on the exam screen, copy and paste and right-click blocked, tab-switch logging, one active session, autosave, recovery after a refresh without resetting any clock. The server is the clock authority; a visible total timer plus a per-question timer; warnings at 5 and 1 minute.
3. When time is up the system closes the exam, submits answers and auto-generates marks in real time; students see their score immediately for tests and exams (setting: instant, or held until the Principal publishes for final exams); the instructor sees live progress and marks while the exam runs.
4. Instructors can download exams: results per exam (CSV and PDF), student answer sheets, the question paper (PDF), per-question analysis; Principal and Registrar can too within their scope; the Principal publishes FINAL results and transcripts.
5. Practical exams: OSCE-style checklists with weighted steps, critical steps and pass marks, scored in person or from a submitted video, retakes allowed, results feed certification. Digital log books with required procedures and minimum counts, instructor signature, complete and signed before certification, signed PDF export. Simulations: branching patient scenarios, step sequencing, image hotspots, scored and tracked, plus sandboxed HTML5 or H5P embeds; one seeded simulation per course topic.

BATCH E: GRADUATES, ALUMNI, OPERATIONS, POLICIES

1. GRADUATES REGISTER: student number, full name, course, intake, year and date of graduation, certificate number with QR verification, result and score, attendance, practical and log book completion, fees-cleared status, approved by and date, certificate status (valid, revoked, reissued), transcript link, contacts, employment follow-up (employed, seeking, studying, employer, country), consent for public name display. Filters by year, course, intake and status; search; export CSV and PDF; charts of graduates per year and course. Graduands list per intake with a clearance checklist (fees cleared, lessons complete, exams passed, practicals passed, log book signed, attendance met): Registrar prepares, Principal approves, certificates issue in bulk and graduates appear in the register. Access: Registrar manages everything; Principal views and approves; Deputy views and exports; Super Admin and Auditor view all (auditor views logged); Board sees names, course, year and counts only; Instructors see graduates of their own courses (name, course, year); Finance, HR, IT and assistants have no access; students see only their own certificate and transcript; the public verification page shows name (if consent), course, year and status for a certificate number.
2. ALUMNI FOLLOW-UP: the Registrar maintains an alumni list with graduation date and course; automated follow-up by email or WhatsApp at 1, 3 and 6 months with a short employment survey; reports for Super Admin and Board.
3. Academic calendar and exam timetable, transcripts and progress reports, class groups, timetable clash detector, teaching staff attendance report from live classes, student complaints register. Policy pages (Fees and tuition, Refunds, Terms, Privacy, Code of conduct, Attendance and exams) editable by Principal or Super Admin with version history, placeholder text marked "to be supplied by Dr Joel Mirembe and approved". Payments by bank or mobile money with the system-generated reference number on bank instructions, claim form, receipts and Finance search.

AFTER EACH BATCH
Run prisma migrate, npm run demo:reset, tsc --noEmit, all tests and Playwright; update docs and docs/DEMO.md; report what changed, what is unfinished and your assumptions.

## Batch B implementation notes (2026-10-20)

- Added provider selection for link meetings, BigBlueButton meeting creation and joining, start/stop, default recording, recording synchronization, and Jitsi disabled by default.
- Added admitted-student join access, waiting room, admit requests or all enrolled students, speaking policy, raised hands, self check-in, start and end roll calls, comments, audited microphone and presenter controls, and attendance CSV/PDF exports.
- Added Redis-backed 30-second platform presence heartbeats, instructor SSE updates, central academic presence panels, replay pages with identity watermarking, configurable minimum attendance defaults, and scheduled reminder and recording jobs.
- Corrected instructor/student separation in tutor rosters and attendance, and removed the seeded instructor payment scenario that could be mistaken for a learner enrolment. Tutor materials accept PDF uploads within the documented file-size limit.
- Link providers cannot be ended remotely or controlled through this app, so the instructor gets instructions to end and manage the room in its provider. BigBlueButton must be configured with `BBB_URL` and `BBB_SECRET`. SMS/WhatsApp delivery requires its provider configuration and approved template.
- Apply the new migration before using these routes. Configure a once-per-minute scheduler for the three `/api/cron` routes. Load testing and Playwright require a running staged app and are not represented as completed until run.

## Batch Z implementation notes (2026-10-20)

Restyle ALL logged-in portals (student, instructor, teaching assistant, registrar, principal, deputy principal, finance, HR and system admin, auditor, board, super admin, system IT) to match the attached dashboard screenshot in structure, spacing and behaviour. The public website is NOT changed. Keep MTC brand colours: teal replaces the screenshot's blue; amber only for primary action buttons. Keep all RBAC, data and features; this is a presentation change plus a widget system. Audit existing dashboards first, reuse working code. No em dashes or en dashes in any text.

NAMES (use these component names): AppShell, Sidebar, Topbar, PageHeader, TabBar, WidgetGrid, Widget, ListRow, MiniCard, ProfileCard, ViewMoreLink, WidgetCustomizer.

DESIGN TOKENS (Tailwind, defined once)

- Sidebar background #0B6B5D (brand teal); page background #F3F7F6; widget panel background #E3EDEA; inner cards white with 1px border #D9E3E0; text #1F2937; muted #6B7280; links and active tab underline teal; hover on rows: border teal and a very light teal background; unread icon teal, read icon gray.
- Font: Inter (or Plus Jakarta Sans for headings), base 8px spacing scale.
- Radii: widget 8px, inner cards and buttons 6px, sidebar pill 6px, avatars full circle.

1. SIDEBAR (left, full height, solid teal)

- Width 240px on desktop. Top: logo (my existing logo badge plus short wordmark) with a hamburger collapse button on the right. Menu items: height 40px, icon 18px (lucide) plus 14px label, padding 0 12px, 4px gap between items; groups have a chevron and expand inline with sub-items indented 28px; items without sub-items have no chevron.
- Active item: solid white pill with teal text and icon. Inactive: white text at 90 percent. Hover: white at 12 percent background.
- Bottom (pinned): user block with 32px avatar, full name, and a chevron that opens a menu (Profile, Switch role, Log out). The menu items are built from the user's permissions only.
- Collapsed rail (tablet, 768 to 1023px, and when the user presses the hamburger): width 72px, icons only, active icon in a white rounded square, tooltips on hover, avatar only at the bottom.
- Phone (under 768px): sidebar hidden; hamburger in the top bar opens a 280px drawer from the left over a dim scrim, with the same items, closing on item tap, Esc or scrim tap, focus trapped.

2. TOPBAR (white, 64px high, bottom border)

- Left: hamburger (phone and tablet) and the page title ("Dashboard") 18px semibold. Right: a 40px rounded-6 outlined settings (gear) button opening a menu (Profile, Notifications settings, Change password). No other items.

3. PAGE HEADER

- Desktop: one row: greeting "Hello {first name}!" with a waving hand emoji (32px, semibold), then the TabBar inline to its right, and the "Edit My Widgets" button (outlined, light gray, sliders icon plus label) at the far right.
- Tablet: first row greeting plus the "Edit My Widgets" button; second row the TabBar spread evenly across the full width with a thin gray line under all tabs and a 3px teal underline under the active tab.
- Phone: greeting (24px) with an icon-only sliders button; below it the TabBar in one row (horizontally scrollable if more tabs than fit), active tab teal text with underline.
- Tabs: 15px, 12px vertical padding, active tab semibold teal; each tab shows its own widget set; the active tab is kept in the URL (?tab=studies).

4. WIDGET GRID AND WIDGET ANATOMY

- Content area padding 24px (16px on phone). Two independent columns that stack widgets top to bottom (a masonry layout, NOT row-aligned, so different heights are fine), 24px gap between columns and 16px between widgets. Two columns from 768px content width up, one column below.
- Widget panel: background #E3EDEA, radius 8px, padding 16px. Header row: title 18px semibold on the left (an optional lighter gray part on the same line, for example "Course Cart" followed by "November 2026 intake"), a 24px "open in full page" icon button on the right that links to that widget's full page. Content below the header with 8px gaps. Footer: a right-aligned teal "View 5 more" link when there are more items (links to the full list).
- ListRow: white, 1px border, radius 6px, height 44px, padding 0 12px, 14px text with ellipsis truncation, chevron at the right; clickable; Inbox rows have a leading envelope icon and the date in 13px gray at the right.
- MiniCard (inside a widget): white, border, radius 6px, padding 12px, centred title 14px semibold, code or subtitle in gray 13px, then a full-width outlined "Open" button (36px high, 6px radius). Mini cards are 2 per row when the widget is at least 440px wide (use container queries), otherwise 1 per row.
- Label and value rows ("Status: Waiting", "Position: 1"): label gray on the left, value dark on the right.
- ProfileCard: 40px round avatar, name semibold, ID in gray underneath; phone and email as teal links with small icons; a full-width outlined action button. Do NOT build "Act as a user" (impersonation); use "Message" or "View profile" instead.
- States: skeleton placeholders per widget while loading, friendly empty state with a next action, per-widget error boundary with a retry button. Widgets load independently with Suspense.

5. EDIT MY WIDGETS

- The button opens a drawer or modal listing the widgets of the current tab with show and hide switches and drag handles (dnd-kit) to reorder, including moving between the two columns, plus "Reset to default". The layout is saved per user and per tab in the database. A user can only enable widgets they have permission for. Build a widget registry: {id, title, requiredPermission, defaultTab, defaultColumn, component}.

6. TABS AND WIDGETS PER ROLE (starting set; each is a registered widget fed by existing data)

- STUDENT: tabs General, Studies, Finance, Classes. General: To Dos (complete enrolment, upcoming exam, assignment due), Holds (payment hold, overdue fees), Upcoming Classes, My Courses (mini cards with Open), Inbox (announcements and messages). Studies: Course progress, Exams, Results, Log book, Simulations. Finance: Fees summary, Payment history, Receipts, Pay now. Classes: Timetable, Recordings (missed a class), Attendance.
- INSTRUCTOR: General, Teaching, Students, Assessment. To Dos (marking, recordings pending, attendance to submit), Today's Classes (Start class and Roll call buttons), My Courses, My Students (profile cards with Message), Exams and marking queue, Inbox.
- TEACHING_ASSISTANT: General, Support, Materials.
- ACADEMIC_REGISTRAR: General, Admissions, Students, Academics. To Dos (pending acceptances, disputed details, new applications), Applications, Students pending acceptance, Graduands, Calendar.
- PRINCIPAL and DEPUTY_PRINCIPAL: General, Academics, Approvals, Reports.
- FINANCE_OFFICER: General, Payments, Reconciliation, Reports.
- HR_SYSTEM_ADMIN: General, Staff, Support, Settings.
- AUDITOR_READONLY and BOARD_MEMBER: General, Reports, Audit.
- SUPER_ADMIN: General, Academics, Finance, Staff, Approvals.
- SYSTEM_IT: General, System, Logs.
  Each portal's sidebar items come from the user's permissions and are grouped with expandable sections.

7. QUALITY

- Responsive checks at 1440, 1024, 820 and 390px against the screenshot: sidebar full, rail and drawer behaviour, tabs layout, two columns versus one, mini card columns, truncation with ellipsis.
- Subtle animation only (framer-motion, 150 to 250 ms): sidebar collapse, drawer slide, widget fade-in, drag feedback; respect prefers-reduced-motion. Accessibility: landmarks, keyboard navigation for sidebar and tabs, focus rings, AA contrast.
- Add Playwright tests for the three breakpoints, tab switching, widget hide and reorder persistence, and a 403 check that hidden widgets and menu items are not reachable by URL. Update docs/DESIGN-SYSTEM.md with the dashboard components, run tsc --noEmit and all tests, and report the files changed.

Refine the dashboards to match the reference screenshot (the widget dashboard with the sidebar, tab bar and tinted widgets) more exactly. The foundation is right; apply the corrections below on the instructor dashboard first, then every role's dashboard. No em dashes or en dashes anywhere. Keep RBAC and data. Compare your result with the reference at 1440px, 820px and 390px before finishing.

1. PAGE HEADER

- Remove the second block ("Welcome, {name}!" plus the date). Keep only "Hello {first name}!" with the waving hand. Greeting 28px, weight 600, colour #1F2937. Put today's date as small gray text at the right of the top bar, or leave it out.
- The greeting, tab bar and widget grid must share one left edge: content area padding 24px (16px on phone); no extra indent for any section.
- Desktop: greeting, tab bar inline, and the outlined "Edit My Widgets" button at the far right, vertically centred on one row. Tab text 15px; active tab semibold teal with a 3px teal underline; thin gray line under the whole tab bar.

2. REMOVE THE ALERT BANNER AND KPI ROW FROM THE DEFAULT LAYOUT

- Replace the amber banner with a "To Dos" widget: each pending item is a white ListRow (44px, 1px border, 6px radius, text left and chevron right, a small leading status icon). Fix the grammar: "1 exam submission awaits your review". Rows link to the right page.
- Remove the four KPI tiles from the default layout. Register them as an optional widget "At a glance" (off by default, available in Edit My Widgets). If shown, make the four tiles equal height, labels on one line (shorten: Courses, Students, Classes, Reviews), numbers aligned on the same baseline, and the same chevron colour.

3. WIDGET ANATOMY (all widgets)

- Panel background #E3EDEA, radius 8px, padding 16px, 16px between widgets in a column, 24px between the two columns.
- Header: title 18px semibold in dark slate (not teal), an optional lighter gray part after it, and on the right a 24px "open in full page" icon button (replace the text links "All classes >" and "All students >").
- Footer: right-aligned teal link "View N more" when there are more items than shown.
- Inner items are WHITE with a 1px border #D9E3E0 and 6px radius: ListRow (44px) or MiniCard. Row text is dark slate 14px; only links and icons are teal. Hover: teal border and very light teal background.

4. UPCOMING CLASSES WIDGET

- Use MiniCards, two per row when the widget is at least 440px wide (container query), otherwise one: centred title 14px semibold, course name in gray 13px, date and time with duration in gray 13px (for example "Wed 22 Oct, 09:00 to 10:30 EAT"), and a full-width outlined 36px "Manage" button. Remove the large date badge and the tall row layout. Maximum card height about 130px.

5. STUDENTS WIDGET (rename "Recent Students" to "My Students")

- Use two ProfileCards per row (container query): 40px round avatar (photo or initials on a teal circle), full name as "First Last", student number in gray, status pill (Active, Completed, On hold) at the top right, and a full-width outlined "Message" button. Show phone and email links only if the role has the permission to see student contacts. Rounded circle avatars everywhere instead of squares.

6. SIDEBAR

- Remove the uppercase section captions (GENERAL, TEACHING, ASSESSMENT, SUPPORT, STUDENTS). Make a flat list of items; items with children (Teaching, Assessment, and similar) show an icon and a chevron and expand inline with sub-items indented 28px; items without children have no chevron.
- The active item is a white pill with teal text and icon and NO chevron. Item height 40px, 4px gap, icon 18px, label 14px. Keep the logo block, collapse button and the user block at the bottom.

7. COLOURS AND TEXT

- Dark slate for titles and row text, muted gray for secondary text, teal for links, icons and the active tab. Remove bold teal titles from rows and cards. Status pills: Active (teal tint), Completed (green tint), On hold (amber tint), 12px text, 6px radius; replace the label "Done" with "Completed".

8. DATA FIXES VISIBLE ON THIS SCREEN

- Student numbers: the seed shows values like 2026/BHC/099 and 2026/MHC/009, but registration produced MTC-2026-00002. Use ONE generator and one format everywhere (setting, default {PREFIX}-{YYYY}-{SEQ:5}, for example MTC-2026-00001); change the seed so every student number comes from the generator; remove any other format and update tests. I will confirm the final format.
- Course names must be exactly the 7 flyer courses (for example "Medical Home Caregiver Course", not "Certificate in Medical Home Care"); update the seed, widgets and any hard-coded labels.
- Show names as "First Last" everywhere, and sort lists by last name.
- Seed class times should be realistic and varied (for example 09:00, 14:00, 18:30 EAT), with durations.

9. OTHER ROLES AND TABS

- Apply the same widget system to the student, registrar, principal, deputy principal, finance, HR and system admin, auditor, board, super admin and system IT dashboards. Each tab (General, Teaching, Assessment, Support, Students and the others) must show real widgets populated with seed data; no empty tabs; the active tab is kept in the URL (?tab=...).
- Verify the tablet layout (820px: icon-only sidebar, tabs on their own row spread across the width, one mini card per row if narrow) and the phone layout (390px: top bar with hamburger and drawer, icon-only Edit button, one column), and compare with the reference.

10. VERIFY

- Run tsc --noEmit, all tests and Playwright; update the Playwright checks for the changed widgets; update docs/DESIGN-SYSTEM.md; report the files changed and attach before and after screenshots at 1440, 820 and 390 px for the instructor and student dashboards.
  Important rule for ALL the dashboard work: every role must use the SAME implementation. There must be one shared dashboard system, not one per role.

1. ONE SHARED SET OF COMPONENTS used by every portal (student, instructor, teaching assistant, academic registrar, principal, deputy principal, finance officer, HR and system admin, auditor, board member, super admin, system IT): AppShell, Sidebar, Topbar, PageHeader, TabBar, WidgetGrid, Widget, ListRow, MiniCard, ProfileCard, ViewMoreLink, WidgetCustomizer. One layout file renders the shell for all roles. Delete or merge any role-specific layout, sidebar, topbar or card components that duplicate these (for example separate tutor, admin, bursar, director or student layouts), and migrate every page to the shared shell.
2. Roles differ ONLY in data, never in markup or styles:

- Sidebar items come from one navigation config, filtered by the user's permissions.
- Tabs and widgets come from one widget registry: {id, title, requiredPermission, tab, defaultColumn, component}; each role's default layout is just a list of widget ids per tab.
- Colours, spacing, typography, radii, shadows and breakpoints come from the shared design tokens only; no hard-coded sizes or colours in role folders.

3. Apply every refinement from my last message (single greeting, no alert banner or KPI row by default, widget anatomy with the "open in full page" icon and "View N more" footer, white rows and mini cards inside tinted widgets, round avatars, flat sidebar without caption headings, expandable items with chevrons, active white pill without chevron, status pills, data fixes) to ALL roles, not only the instructor.
4. Every role must have working, populated tabs (no empty tabs) with realistic seed data for its widgets, and each role must look identical in structure at 1440px, 820px and 390px.
5. Existing pages that are not widgets (full lists, detail pages, forms, tables) must sit inside the same shell with the same page header pattern (page title, breadcrumb or back link, primary action on the right), spacing and card style.
6. Add a lint check or test that fails if a role folder defines its own layout, sidebar or card components, and a Playwright test that logs in as each demo account (student, tutor, assistant, registrar, principal, deputy, finance, HR and system admin, auditor, board, super admin, system IT) and checks that: the shell is the same, the sidebar shows only permitted items, the tabs and widgets render with data, the active tab is in the URL, the tablet and phone layouts work, and URLs the role may not open return the 403 page.
7. Report: the list of removed or merged duplicate components, the widget registry per role, and screenshots of every role at 1440px and 390px.

The dashboard layout is right but the text looks crowded and not polished. Refine typography, spacing, balance and small details on the SHARED dashboard components, so the change applies to ALL roles (no role-specific styling). Compare with the reference screenshot (light, airy, small text, one bold line per card) and check at 1440, 820 and 390px. No em dashes or en dashes anywhere.

1. TYPOGRAPHY (define as tokens, use everywhere in portals)

- UI font: Inter, weights 400, 500, 600 only. Remove weights 700 and 800 from the dashboards. Plus Jakarta Sans only for the greeting and page titles, weight 600.
- Scale (size / line-height / weight): greeting 28/36/600, page title 20/28/600, tab 15/20/500 (active 600), widget title 16/24/600, card title 14/20/600, body and row text 14/20/400, meta text 13/18/400 colour #5B6770, caption and pills 12/16/500. Letter spacing normal. Greeting colour #1F2937.
- Card titles: one line with ellipsis (full text in a tooltip), text-wrap balance for headings, tabular numbers for counts. Meta text must have AA contrast on white and on the tinted panel.

2. SPACING

- Widget panel: padding 20px; header to content 16px; 20px between widgets in a column; 24px between columns.
- MiniCard: padding 16px (not 12px); 12px between cards; title to first meta line 4px, between meta lines 2px, then 14px before the button; button height 36px. Text stays centred as in the reference, but with this padding no text may touch the card edges.
- ListRow: height 48px, 8px gap between rows, 12px horizontal padding, 10px between icon and text.
- ProfileCard: padding 16px; avatar 44px; name 14/600; student number 13 gray; the status pill is positioned top-right with a 12px inset and must not overlap the name (grid layout, the name truncates first); 12px above the Message button.

3. BALANCE

- Place widgets by shortest column (balanced masonry) instead of fixed columns, unless the user pinned a column.
- No widget may look half empty or orphaned: show 2 or 4 mini cards per widget (never a lone third card); put the rest behind "View N more". The To Dos widget shows up to 5 rows and the seed must provide 3 or 4 real to-dos (take roll call for today's class, add the pending recording, review 1 exam submission, mark an assignment). Compact empty states.
- The tab bar underline runs the full width between the greeting block and the "Edit My Widgets" button.

4. POLISH

- White cards: radius 10px, 1px border #DCE6E3, shadow 0 1px 2px rgba(16,24,40,0.06); on hover the shadow becomes 0 4px 12px rgba(16,24,40,0.08), translateY(-1px), 150ms, disabled under prefers-reduced-motion.
- Small 16px line icons (stroke 1.75, muted teal) in meta lines: users beside student counts, calendar beside dates, clock beside times.
- Class cards get a small status chip at the top: "Today", "In 2 days", "Live now" (teal, amber, green tints). Course cards show "8 students" with the users icon and a thin 4px progress bar for completed lessons or classes.
- Avatars are circles with soft pastel backgrounds picked consistently from the name, initials 14/600. Status pills have tinted backgrounds and rounded ends: Active (teal), Completed (green), On hold (amber).
- Sidebar: remove icons from sub-items and show them as plain text 14/400 indented 40px with a thin vertical guide line (white at 20%); parents keep icon plus chevron; fix duplicated icons so every parent has a unique one; inactive text white at 88%; item height 40px with 2px gaps and 8px between groups; the active item is a white pill with weight 600; hover white at 10%.

5. TEXT AND DATA FIXES

- Use a pluralisation helper (Intl.PluralRules) everywhere: "1 student", "8 students", "1 class", "2 classes". Fix "1 students" and search for similar strings.
- Dates and times: "Thu 22 Oct, 09:00 to 10:30" (the timezone goes in a tooltip). Seed realistic varied times (09:00, 14:00, 18:30) and durations.
- Course names are exactly the 7 flyer courses (for example "Medical Home Caregiver Course", never "Certificate in Medical Home Care"). Update the seed and every hard-coded label.
- Student numbers come only from the single generator, one format everywhere (setting, default {PREFIX}-{YYYY}-{SEQ:5}, such as MTC-2026-00001); remove old values like 2026/MHC/005 from the seed and tests.
- Names are shown as "First Last" everywhere (never "Last First").

6. VERIFY

- Apply and verify on the student, instructor, registrar, principal, finance, HR and system admin, auditor, board, super admin and IT dashboards. Take before and after screenshots at 1440, 820 and 390px for at least the instructor and student dashboards. Run npm run demo:reset, tsc --noEmit, all tests and Playwright, update docs/DESIGN-SYSTEM.md, and report the files changed.
