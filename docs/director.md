# DIRECTOR DASHBOARD: MAKE EVERY TAB WORK, TO THE ROOT

Read this whole file first. It covers ONLY the DIRECTOR role (Managing Director, from the Board of Directors). It sits beside tutor.md and student.md: reuse what was built there (avatar system, widget rearranging, timetable data, messaging). If a shared piece is not built yet when you reach it, build the shared version and test it for all roles that use it. The approval table in remarks.md section 5 and the roles in remarks.md section 4 are the source of truth for what the Director decides.

## 0. Rules (apply to every section)
1. Work on ONE section at a time (D1, D2, ...). When a section is finished: write docs/DIRECTOR-D<n>.md (under 25 lines), commit, push, then STOP and wait for me to say "next".
2. Fix ROOT CAUSES, not symptoms: reproduce, find the exact file and line, fix, and prove with a test or command you ran.
3. Never write PASS or DONE for something you did not run. Write NOT RUN with the reason and the exact command for me.
4. Test against a production build (`npm run build && npm start`) with `npm run demo:reset` and `npm run seed:test`. Use two or three browser contexts whenever several people are involved (Director plus Principal, Admin, Instructor or Student).
5. "Works" means: (a) the page opens with real seeded data, (b) every button, link, menu and form does something visible, (c) data is saved and survives reload, logout and redeploy, (d) the other person sees the effect, (e) the Director sees what the role allows and nothing is editable that should be read-only, (f) it works at 390px and 1440px in light and dark theme, (g) a Playwright test covers it.
6. The Director MONITORS and APPROVES. He does not do routine administration: no creating students, no entering marks, no editing payments, no uploading materials. Every view of personal data and every export is written to the audit log.
7. No em dashes or en dashes anywhere in the UI, seed, emails or docs. Use a hyphen, comma or full stop.
8. No link anywhere may point to a removed portal (/finance, /bursar, /deputy, /board, /auditor, /registrar paths of the old model). Search the whole code base for them and fix every one.
9. Use the shared dashboard components. If a fix belongs in a shared component, fix it there and check the other roles still render.

## Reference data
- The 8 courses (codes): Certificate in Medical Home Care Course (MHC); Certificate in Basic Home Care (BHC); Basic Certificate in Babysitting, Child Care and Safety Management (BCS); Certificate in Mental Health Support and Advocacy (MHA); Basic Certificate in Care of Older Persons and Persons with Disability (COP); Certificate in Basic Life Support (BLS); Certificate in Advanced Life Support (ALS); Certificate in Advanced First Aid (AFA).
- Payment phases 50, 25, 25 percent; registration numbers per course (2026/MHC/005); times in Africa/Kampala.
- What the Director decides (default policy, from remarks.md): academic programme create, modify, archive; course or subject new or modified; examination results publication; certificate issuance; tuition payment proof (after the Principal); fee changes, waivers, refunds; equipment requests (the Principal OR the Director can approve); role assignments for Director and Principal accounts. The Director does NOT decide admissions (Principal only), marks changes after release (Principal), and is only NOTIFIED about storage clearing.
- Seed people must be unique: the same person must not appear in two roles (check "Mirembe Joel" appearing as both Principal and Instructor), and demo accounts keep correct First Last names with titles stored separately.

## D1. PROFILE, SECURITY AND IDENTITY
1. Fix the greeting: "Hello Dr.!" uses the title as the first name. Store title, first name and last name separately: greeting "Hello Mathias!", sidebar "Dr. Mathias Senyondo" (full, wrapped on two lines or with a tooltip, never cut as "Dr. Mathias Senyo..."), role label "Director" (not "DIRECTOR" in capitals, fully visible at 1280x720).
2. The avatar in the sidebar is broken (alt text "Dr. Mati" shows). Fix the root cause; every avatar falls back to initials (first and last name, titles ignored: "MS") on error. Photo upload on Profile and Settings uses the shared avatar system (database storage, crop, remove, persists after logout and restart).
3. Profile and Settings (/director/profile): edit phone, photo, password (current password required), theme, notification preferences. Locked: email and full name.
4. Security: two-factor authentication setup with QR code, backup codes shown once, and mandatory in production (and when TOTP_REQUIRED=true; relaxed only in development and staging). Active sessions list with sign-out of other sessions. The Director can reset the PRINCIPAL's 2FA from the interface (audit logged, the Principal is notified). Re-authentication (a fresh 2FA code within the last 15 minutes) is required to approve high-risk items (payment proofs above the threshold setting, role assignments, fee changes, refunds).
5. Notifications of security events to the Director: a login from a new device, repeated failed logins on Director or Principal accounts, a 2FA reset.
6. Tests: greeting and initials, broken avatar fallback, photo persists after logout and restart, locked fields rejected by direct API calls, 2FA enrol with a generated code and use a backup code once, Principal reset flow, re-auth prompt on a high-risk approval.

## D2. DASHBOARD SHELL AND WIDGETS (defects seen in the screenshots)
1. Banner: it contains an em dash. Reword to "Staging demo environment, not for real use. Data may be reset at any time." with a dismiss button.
2. Sidebar: a "General" wrapper holds 13 items while Approvals, Finance and Graduates float loose and the user block is clipped. Replace with flat collapsible groups, important items first (the Director's most important tabs are Dashboard, Approvals, Reports and Analytics, Audit Logs):
 - Overview: Dashboard, Approvals, Reports and Analytics, Audit Logs
 - Academics: Students, Instructors, Academic Programmes, Courses, Examinations and Results, Certificates, Graduates
 - Finance: Finance (payment approvals and revenue)
 - Governance: Staff Accounts (read only), Roles and Permissions (read only), Access Review, Policies and Settings, Storage
 - Communication: Announcements, Messages, Notifications
 - Account: Profile
 The group with the active page opens automatically; a badge with the number of pending approvals on Approvals; no horizontal scrollbar; logo block fixed at the top, user block fixed at the bottom.
3. Dashboard tabs General, Academics, Finance, Staff, Approvals, Reports must each show real, populated widgets (no empty tabs):
 - General: Pending approvals (count by type, oldest first with age), Key numbers (active students, enrolment this intake, pass rate, attendance rate, revenue collected, outstanding), Alerts (security events, failed payment checks, system health), Today (live classes now, exams today), Recent decisions.
 - Academics: enrolment by programme (chart), pass rates by course, results awaiting approval, certificates awaiting approval, instructor activity.
 - Finance: revenue by month (chart), collected versus outstanding by phase, payment proofs waiting for the Director, fee changes pending, recent payments with method, phase and status.
 - Staff: staff list with photo, role, last login, 2FA status; access review alerts.
 - Approvals: waiting, recently decided, by type, oldest.
 - Reports: quick exports and saved reports.
4. "Edit My Widgets" must really rearrange (drag handle plus Move to top, up, down and bottom, show or hide, column choice, Reset to default), saved per user per tab in the database, applied after reload and on another device.
5. Data defects seen in the screenshots:
 - "Pending Approvals" shows raw lowercase types ("admission", "results publication", "storage clearing", "marks change", "payment proof") with no requester, student, course or amount. Show a readable title, who prepared it, the subject, the amount if any and the age.
 - It includes items the Director must not decide (admission, marks change, storage clearing). Filter by the approval policy above.
 - The To Dos say "16 approvals requiring your decision" while the widget lists 6. One query and one definition feed every count, widget and badge, so they always agree.
 - "2 payment claims awaiting verification" and "2 payment claims to review" link to /finance/payments, an old removed route. Link to the Director's approvals or finance pages.
 - Revenue Summary says "Revenue this month: UGX 0" and "Outstanding: UGX 0" while payments of UGX 1,150,000 and more are listed. Compute revenue (approved payments), outstanding (approved fees minus approved payments) and show amounts with a period selector; add a seed with realistic values.
 - Payment rows: add the payment method, phase and status; student names with titles must be shown consistently.
6. Dark theme contrast AA; theme remembered per user.
7. Tests: sidebar structure at 1280x720 and 390px, every tab has widgets, counts agree everywhere, no link to a removed route, widget move persists after reload.

## D3. APPROVALS (the core of the role)
1. List (/director/approvals): only items that need the Director's decision per the policy; filters by type, age, requester, amount and status (waiting, approved, rejected, sent back); sort oldest first; aging colours (over 3 days amber, over 7 days red); the count matches the dashboard badge.
2. Detail page per item: what it is, who prepared it and who reviewed it (the chain, for example Admin then Principal then Director) with dates and comments, the supporting data (see D5 and D6 for each type), a comment thread, and the buttons Approve, Reject (comment required) and Send back for changes (comment required). A warning if the underlying data changed after submission.
3. After approval the action applies automatically (state APPLIED) and the preparer is notified in the app and by demo email; after rejection the preparer sees the reason. Nobody can approve their own item. Every step is in the audit log with before and after values.
4. Approval types and what the Director sees: programme or course (what changed, old versus new, with a diff); results publication (summary and the full list of marks, pass rate, distribution); certificate issuance (eligibility checklist per student, batch approve); payment proof (proof image or transaction ID, amount, phase, student, automatic checks for duplicate transaction ID, duplicate image, amount mismatch); fee change, waiver and refund (amounts, reason, effect); equipment request; role assignment for Director and Principal accounts.
5. Batch actions only for homogeneous low-risk items (certificates, results for one course), with a confirmation dialog listing every item.
6. Tests (three contexts): Principal creates a course change, the Director approves with a comment, the course becomes live; the Director rejects and the Principal sees the reason; the Director cannot approve an admission or his own item; counts match; the audit log records each decision; high-risk items ask for 2FA re-authentication.

## D4. ACADEMICS: STUDENTS, INSTRUCTORS, PROGRAMMES, COURSES
1. Students (/director/students): read-only list with search, filters (programme, intake, status, payment phase) and pagination; student detail with profile, registration number, programme, attendance, marks, payment phase status, documents (view only), approval history. No edit buttons. Export (CSV) is audit logged.
2. Instructors (/director/instructors): list with courses assigned, classes held versus scheduled, roll calls recorded, assignments marked on time, exam results submitted on time, last active; detail page with the same data and the students per class. Read only.
3. Academic Programmes and Courses (/director/programmes, /director/courses): list with status (draft, submitted, approved, rejected, archived) and the approval actions from D3; detail pages with course units, instructors, intake; modifications show a diff.
4. Tests: read-only enforced (a direct write request returns 403); data matches the seed; exports logged; every link resolves.

## D5. EXAMINATIONS AND RESULTS, CERTIFICATES, GRADUATES
1. Examinations and Results (/director/examinations): exams per course with schedule and status; results submissions awaiting approval with analytics (average, pass rate, distribution, per question unit), the chain (Instructor submits, Principal reviews, Director approves). Approve or reject with comment; approved results become visible to the students immediately. The Director cannot edit marks.
2. Certificates (/director/certificates): eligibility list with the requirements checklist per student (lessons complete, exams passed, practicals signed, log book signed, attendance met, fees at 100 percent); approve one or a batch; on approval the certificates are generated with unique numbers and QR codes, visible to students, and verifiable on the public page; revoke only through an approval with a reason.
3. Graduates (/director/graduates): register with name, course, year of graduation, certificate number, status, employment follow-up summary; filters and CSV or PDF export (audit logged).
4. Tests (three contexts): results flow end to end and the student sees them only after approval; certificate approval generates the certificate, the student downloads it and the public verification page confirms it; revoked certificates show as revoked.

## D6. FINANCE AND PAYMENT APPROVALS
1. Finance (/director/finance): revenue by month (chart), collected versus outstanding by phase and by course, payments by method (MTN, Airtel), refunds and waivers, reconciliation status (read only), recent payments. Amounts formatted UGX with thousands separators; a period selector; export (audit logged).
2. Payment proof approvals: the full chain Admin (collected), Principal (forwarded), Director (final). The Director sees the proof and the automatic checks (unique transaction ID, duplicate image hash, amount against the phase, time window). Approve unlocks the student's phase; reject returns it with the reason. Reversal of an approved payment only through a new approval with a reason. Fee changes, waivers and refunds follow the same pattern.
3. Tests (three contexts): the student submits proof, the Admin forwards, the Principal forwards, the Director approves and the content unlocks for the student; a duplicate transaction ID is flagged; the revenue and outstanding figures change correctly after approval.

## D7. REPORTS AND ANALYTICS, AUDIT LOGS, STORAGE
1. Reports and Analytics (/director/reports): enrolment (by programme, intake, month), academic performance (pass rates, average marks per course unit), attendance, finance (collected, outstanding, by phase), certificates and graduates, applications funnel (applied, admitted, active), instructor activity. Date, programme and intake filters; charts that work on mobile; drill-down to the underlying list; export to CSV and PDF (audit logged); all numbers come from the same queries used on the dashboard.
2. Audit Logs (/director/audit): append-only list of who did what and when in plain sentences ("Nankya Shanita submitted results for BLS Block 2"), with role, entity, IP, before and after for important changes; filters by user, role, action type, date range and entity; search; failed logins and security events; export. Links open the related record.
3. Storage (/director/storage): used and total, by course, recordings versus notes; the scheduled clearing at the new intake (preview with sizes, the Principal confirms, 14 day trash), with the Director notified and able to see history; a warning at 80 percent.
4. Tests: numbers on reports match the dashboard and the database; filters and exports work; the audit log shows entries from the approval flows; the Director cannot edit or delete log rows.

## D8. STAFF, ROLES, POLICIES, COMMUNICATION
1. Staff Accounts (/director/staff): all staff with photo, role, last login, 2FA status, status. Read only except approving role assignments for Director and Principal accounts and requesting deactivation (through the approval flow). Access Review: staff not logged in for 30 days, accounts without 2FA in production, roles changed recently.
2. Roles and Permissions: read-only matrix of the six roles plus IT Admin, generated from the real permission code (not hard coded). It must not mention any removed role (Board Member, Deputy Principal, Teaching Assistant, Finance Officer, HR, Auditor, Administrator).
3. Policies and Settings (/director/policies): the approval policy (who prepares, who reviews, who approves each item type, amount thresholds, re-authentication threshold) editable by the Director with 2FA re-authentication, audit logged, and rules the system never lets anyone break (nobody approves their own item; the Admin cannot edit payments); policy documents (fees, refunds, terms, privacy) with version history and last updated date.
4. Announcements: the Director can read all announcements and post to all staff or all students (audit logged). Messages: the Director messages staff (Principal, Admin, Instructors), with unread badge and delivery within 10 seconds; students cannot message the Director. Notifications: approvals waiting, payment proofs, results submitted, certificates ready, storage clearing scheduled, security events; marks read; counts match the bell; every item opens the right page.
5. Tests: role matrix equals the code; policy edits take effect and are audited; a staff role assignment approval works; messages and notifications reach the right people.

## D9. SPEED, SECURITY AND FINAL PROOF
1. Fix scripts/click-audit.mjs for the Director: click every sidebar item, tab, button, link, menu item and form (skip only sign out), record results in docs/CLICK-AUDIT-DIRECTOR.md. Zero failures required.
2. Speed: every Director page under 1 second at p95 on a production build with the seed; fix N+1 queries and add indexes; large lists paginated; reports cached for 60 seconds where safe.
3. Security checks: every Director API route rejects other roles (403), the Director cannot reach editing endpoints for students, marks, payments or materials, exports and views of personal data are audit logged, and 2FA mandatory in production.
4. Cross-role proof, one Playwright story with Student, Admin, Principal, Instructor and Director: a payment proof moves Admin to Principal to Director and unlocks content; results move Instructor to Principal to Director and the student sees them; a course change is approved and goes live; a certificate is approved and verified publicly.
5. Update docs/DIRECTOR-STATUS.md with one honest table (section, status, evidence).

START WITH D1 ONLY. Stop after D1 and wait for "next".
