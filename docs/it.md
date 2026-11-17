# IT ADMIN DASHBOARD: MAKE EVERY TAB WORK, TO THE ROOT

Read this whole file first. It covers ONLY the SYSTEM_IT role, shown as "IT Admin" (Daniel Kabagambe in the demo). The IT Admin keeps the platform healthy, secure and recoverable, and answers support tickets. It sits beside tutor.md, student.md, director.md, principal.md and admin.md: reuse what was built there (avatar system, widget rearranging, approval workflow, messaging). If a shared piece is not built yet when you reach it, build the shared version and test it for every role that uses it. The IT Admin parts of remarks.md (sections 1, 4, 11, 12) are the source of truth.

## 0. Rules (apply to every section)
1. Work on ONE section at a time (I1, I2, ...). When a section is finished: write docs/IT-I<n>.md (under 25 lines), commit, push, then STOP and wait for me to say "next".
2. Fix ROOT CAUSES, not symptoms: reproduce, find the exact file and line, fix, and prove with a test or command you ran.
3. Never write PASS or DONE for something you did not run. Write NOT RUN with the reason and the exact command for me.
4. Test against a production build (`npm run build && npm start`) with `npm run demo:reset` and `npm run seed:test`. Use several browser contexts whenever several people are involved (IT Admin plus a Student, Instructor, Admin or Director).
5. "Works" means: (a) the page opens with real data, (b) every button, link, menu and form does something visible, (c) data is saved and survives reload, logout and redeploy, (d) the other person sees the effect, (e) the IT Admin can do what the role allows and nothing more, (f) it works at 390px and 1440px in light and dark theme, (g) a Playwright test covers it.
6. THE IT ADMIN SEES NO BUSINESS DATA. No student marks, results, payments, documents, messages, forum posts, exam content or fees. Counts and technical metadata only. Support tickets show only the ticket content, the person's name, role, account status and last login. The IT Admin cannot impersonate anyone, cannot see or set a password, cannot approve business items, and cannot change fees, merchant codes, approval policy or academic data. Emergency access to business data is only through "break-glass" (I7), time limited and approved by the Director.
7. Secrets (API keys, database URL, encryption keys) live only in environment variables and are never displayed, logged or stored in the database. The dashboard shows status (configured or missing, last test result) and has test buttons. Rotating a secret is a documented runbook step, not a UI field.
8. No em dashes or en dashes anywhere in the UI, seed, emails or docs. Use a hyphen, comma or full stop. No link may point to a removed portal or to another role's portal.
9. Use the shared dashboard components. Every action is audit logged (technical audit stream).

## Reference data
- Stack: Next.js 14, PostgreSQL, Redis, S3-compatible storage, Resend for email (demo mode until a domain exists), optional SMS, Google Meet links for live classes, hosted on Render. The Render disk is ephemeral: anything the app must keep is in the database or S3.
- Environments: development, staging, production (APP_ENV). In production the demo features are off and 2FA is mandatory for DIRECTOR, PRINCIPAL and SYSTEM_IT.
- Scheduled jobs that exist or must exist: class reminders, live class housekeeping, recording fetch, storage retention, nightly paid-percent integrity check, nightly backup, email retry.
- Support tickets from every role reach the IT Admin. The IT Admin answers them.

## I1. PROFILE, SECURITY AND IDENTITY
1. Identity: store title, first name and last name separately; initials use first and last name only, ignoring titles. The avatar at the bottom of the sidebar is broken (alt text "Da" shows cut off): fix the root cause and fall back to initials ("DK") on any load error. Role label "IT Admin" fully visible at 1280x720.
2. Profile (/system/profile): phone, photo (shared avatar system: database storage, crop, remove, persists after logout and restart), password (current password required), theme, notification preferences including alert channels. Locked: email and full name.
3. Security: two-factor authentication with QR code and backup codes, MANDATORY in production (add SYSTEM_IT to the roles that must enrol; relaxed only in development and staging when TOTP_REQUIRED=false); active sessions list with sign out of others; login notifications for new devices. Recovery of the IT Admin account is a documented server procedure approved by the Director, never a UI shortcut.
4. Tests: initials, avatar fallback, photo persists after logout and restart, 2FA enrol and backup code, locked fields rejected by a direct API call, the role cannot read any business data endpoint (403 on student, results, payment and message APIs).

## I2. DASHBOARD SHELL AND WIDGETS (defects seen in the screenshot)
1. Banner: it contains an em dash. Reword to "Staging demo environment, not for real use. Data may be reset at any time." with a dismiss button.
2. Sidebar: only "System Health", "Support Tickets", "Profile", "Settings" and "System Logs" exist, in a mixed arrangement. Build flat collapsible groups:
 - Overview: System Health, Alerts
 - Operations: Support Tickets, Scheduled Jobs, Email and SMS Queue
 - Data safety: Backups, Database, Storage
 - Security: Security Events, Account Support, Break-glass Requests
 - Configuration: Settings, Integrations, Maintenance Mode, Feature Flags
 - Releases: Deployments and Versions, Runbook
 - Logs: System Logs
 - Account: Profile
 The active group opens automatically; badges for open tickets and unacknowledged alerts; no horizontal scrollbar; logo block fixed at the top and user block fixed at the bottom.
3. Dashboard tabs General, System and Logs must each show real, populated widgets:
 - General: System status now (app, database, Redis, storage, email, jobs, each green, amber or red with last check time), Alerts (unacknowledged), Support tickets waiting (oldest first), Last backup (time, size, result), Scheduled jobs (failures in the last 24 hours), Current load (users online, live classes now, exam sessions running).
 - System: response times (p50 and p95, last hour and last 24 hours), error rate by route, database pool usage, Redis memory, storage used, process memory and event loop lag, email queue backlog.
 - Logs: recent errors grouped, security events, job runs, deployments.
4. "Edit My Widgets" must really rearrange (drag handle plus Move to top, up, down and bottom, show or hide, column choice, Reset to default), saved per user per tab in the database.
5. Data defects seen in the screenshot:
 - "Recent System Events" shows five identical rows "update by Mirembe Joel" (an instructor's business update). The IT Admin must see SYSTEM events only: deployments, job runs, errors, backups, setting changes, alerts, each as a readable sentence with time and the affected component ("Nightly backup finished, 42 MB, 14 Nov 02:00"). Business audit events never appear here.
 - "To Dos: 2 settings not yet configured" does not say which. Each missing setting is a row that opens it (for example "Email sending domain not configured").
 - "System Status" shows business numbers (54 users registered, 8 courses published, 64 settings configured). Replace them with the technical health tiles above; counts may remain in a small "Usage" widget (users, active sessions, files stored) with no names.
6. Dark theme contrast AA; theme remembered per user.
7. Tests: sidebar structure at 1280x720 and 390px, every tab has widgets, status tiles reflect real checks (stop Redis in the test and see it turn red), widget move persists after reload, no business audit event appears for the IT Admin.

## I3. SUPPORT TICKET DESK (cross-role)
1. Every role has a Support page (Student, Instructor, Admin, Principal, Director) where a person creates a ticket (category: login, classes, exams, payments, materials, other; priority; description; optional screenshot up to 5 MB) and sees their own tickets and replies.
2. IT Admin queue (/system/support): filters (status, category, priority, assignee, age), search, oldest first, SLA timers (first response target is a setting, default 4 working hours; overdue in amber and red), assign, change status (new, in progress, waiting for user, resolved, closed), internal notes, reply thread, canned replies, attachments (private signed URLs), merge duplicates, link to the user's technical profile (name, role, account status, last login, locked state, no business data), resolution summary on close.
3. The person who raised the ticket is notified in the app (and demo email) at every reply and status change and can reply back, reopen within 7 days, or close.
4. Reports: tickets by category, average first response and resolution time, repeat issues; CSV export.
5. Tests (two or three contexts): a student creates a ticket, the IT Admin answers, the student sees the reply and the notification; tickets from each of the five roles arrive in the queue; an SLA breach is flagged; the IT Admin cannot open a student's grades from a ticket link; a user sees only their own tickets.

## I4. MONITORING: HEALTH, PERFORMANCE, LOGS, ALERTS, JOBS
1. System Health page: live status of the application, database (latency, pool usage), Redis, storage, email provider, scheduled jobs; version, commit, environment, uptime; history of the last 24 hours as a simple timeline.
2. Performance: record request duration, status and route for every request in a lightweight metrics table or Redis (no personal data); show p50, p95 and error rate per route; slowest pages; users online; running exam sessions; live classes now; flag when p95 goes over 1 second or errors exceed 1 percent.
3. System Logs (/system/logs): structured logs of level WARN and ERROR and key events stored in a SystemLog table with 30 days retention (the Render log stream is not readable by the app), searchable by level, time, route and request id; error grouping with counts; no personal data or secrets in log lines (add a redaction test); export.
4. Alerts: rules with thresholds (job failed, backup failed or older than 26 hours, error rate over 2 percent for 5 minutes, p95 over 2 seconds, database connections over 80 percent, storage over 80 percent, email failures over 5 percent, repeated failed logins on privileged accounts); in-app alert list with acknowledge and resolve, email notification to the IT Admin (demo mode in /dev/mail), quiet hours setting.
5. Scheduled Jobs page: every job with schedule, last run, next run, duration, status, last error; Run now for safe jobs (audited); a job failing twice in a row raises an alert. Add the missing nightly jobs (backup, paid-percent integrity check, email retry) and a heartbeat for each.
6. Tests: stop Redis or lock the database in a test and see the health tile and an alert; a failing job appears with its error; log redaction removes emails and tokens; metrics numbers match a k6 sample.

## I5. DATA SAFETY: BACKUPS, DATABASE, STORAGE
1. Backups (/system/backups): a nightly logical backup of the database (pg_dump compressed and encrypted) uploaded to S3-compatible storage, keeping 30 daily and 12 monthly copies, plus the managed provider's backups where available; the page shows each backup (time, size, checksum, result) and a "Back up now" button (rate limited, audited). A backup verification step restores the latest backup into a scratch database weekly and reports success. Downloading a backup is NOT offered in the UI.
2. Restore: documented in docs/RUNBOOK.md with exact commands and run as a monthly drill; the UI shows the last drill date and result; a real restore requires Director approval and is recorded.
3. Database (/system/database): read only diagnostics: version, size, table sizes and growth, connection pool, top 10 slow queries, migration status (applied versus pending), unused or missing index hints; no SQL console and no row access.
4. Storage (/system/storage): bucket reachable, used space, growth per week, largest categories (recordings, notes, avatars, documents) without file names of business data, a test upload and signed URL check, alert at 80 percent; oversight of the retention job (last run, items cleared, trash contents count, restores) without access to the files.
5. Tests: backup runs and records a checksum; restoring into a scratch database succeeds in the test; the download of a backup is impossible; the database page shows no row data; a full storage test raises the alert.

## I6. CONFIGURATION: SETTINGS, INTEGRATIONS, EMAIL AND SMS, MAINTENANCE, FEATURE FLAGS
1. Settings (/system/settings): TECHNICAL settings editable by the IT Admin: time zone, session lifetime, rate limit numbers, upload size limits, retention days, job schedules, email sender name, alert thresholds. BUSINESS settings are shown read only (fees, merchant codes and names, approval policy, intake label) with a note on who changes them. Every change validated, audited (before and after) and visible to the Director.
2. Integrations (/system/integrations): one card per integration (database, Redis, storage, email provider, SMS provider, Google Meet link adapter, payment gateway adapters) with status (configured, missing, working, failing), last check, a Test button (send a test email to the IT Admin, test upload, test SMS to a number the IT Admin enters), error text, and the DNS verification status for email (SPF and DKIM) once a domain exists. Secrets are never shown.
3. Email and SMS queue (/system/messaging): sent, queued and failed counts, failed items with the error (recipient shown masked), Retry and Retry all failed, bounce and complaint counts, rate limit usage; templates list with Preview and Send test; demo mode banner while no provider is configured.
4. Maintenance Mode: toggle (and schedule) with a message and expected end time; while active students and instructors see a maintenance page, the Director, Principal, Admin and IT Admin can still log in; health checks stay green; audited and announced in advance by a banner.
5. Feature Flags: list of flags (scholarships, registrar active, demo mode, read-only mode, new features) with description, current value and who changed it last; production-unsafe flags (DEMO_MODE, TOTP relaxation) cannot be enabled when APP_ENV=production.
6. Tests: a bad provider key turns the integration red and the test button reports the error; email retry delivers; maintenance mode blocks a student and lets the Principal in; a read-only setting cannot be changed by the IT Admin; unsafe flags are refused in production mode.

## I7. ACCOUNT SUPPORT, SECURITY EVENTS, BREAK-GLASS
1. Account Support (/system/accounts): look up a user by name or email and see technical data only (role, status, last login, 2FA enrolled, locked state, active sessions). Actions: unlock an account locked by the rate limiter, send a password reset link or resend an invitation to the registered email (the IT Admin never sees or sets a password and cannot change the email), force sign out of all sessions, and in an emergency disable an account (the Principal and Director are notified; re-enabling needs their approval). Director and Principal 2FA resets are done by the Director as designed, and account recovery for the Director or Principal follows the documented procedure with a second approver. Everything audited, rate limited, and the user is notified.
2. Security Events (/system/security): failed logins, lockouts, rate limit hits, logins from new devices for privileged roles, 2FA events, suspicious patterns (many failures from one IP, one account from many IPs); filters; link to the account support page; alerts for privileged accounts.
3. Break-glass Requests (/system/break-glass): when the IT Admin must see business data to fix a fault, she or he requests access with a reason, scope (one record or one table) and duration (maximum 60 minutes); the Director approves (re-authenticates with 2FA); the access is read only, expires automatically, and every query is logged and shown to the Director afterwards.
4. Tests: unlock and reset link flow for a student; the IT Admin cannot change an email or read a password; emergency disable notifies the Principal and Director; break-glass is impossible without approval, expires on time and logs access; privileged login alerts fire.

## I8. RELEASES, RUNBOOK AND DATA PROTECTION REQUESTS
1. Deployments and Versions (/system/releases): current version, commit hash, build time, environment, migration status, previous releases with notes (rendered from CHANGELOG.md), the rollback steps (documented, executed outside the UI), and a "Known issues" list. No deploy button in the UI.
2. Runbook (/system/runbook): renders docs/RUNBOOK.md read only: deploy, roll back, restore a backup, rotate each secret, add the production domain and email DNS records, add a user, handle an incident, capacity and scaling notes, and the monthly checklist (restore drill, dependency updates, audit review). Write the missing parts of docs/RUNBOOK.md.
3. Data protection requests (Uganda Data Protection and Privacy Act): a Data Requests page where requests to access, correct or delete personal data are logged (created by the Admin or Principal); the Director approves; the IT Admin runs the export (a package of the person's own data, delivered to the Admin through a signed expiring link, never kept) or the anonymisation job for deletions, honouring records that must be kept (results, certificates, payments); all steps audited with deadlines and reminders.
4. Tests: release page shows the real commit; runbook renders; a data request goes through approval, export and expiry; anonymisation keeps the required records.

## I9. SPEED, SECURITY AND FINAL PROOF
1. Fix scripts/click-audit.mjs for the IT Admin: click every sidebar item, tab, button, link, menu item and form (skip only sign out), record results in docs/CLICK-AUDIT-IT.md. Zero failures required.
2. Speed: every IT page under 1 second at p95 on a production build with the seed; heavy diagnostics (database sizes, slow queries) cached for 60 seconds and loaded without blocking the page.
3. Security: every IT route rejects other roles; the IT Admin gets 403 on every business data API (students, results, payments, documents, messages, forum, exams) proven with direct requests; no secret appears in any response, page source or log.
4. Cross-role proof, one Playwright story: a student cannot log in, raises a ticket from the login help link, the IT Admin finds the account, unlocks it and sends a reset link, the student logs in and the ticket is closed; a job failure raises an alert that the IT Admin acknowledges.
5. Update docs/IT-STATUS.md with one honest table (section, status, evidence).

START WITH I1 ONLY. Stop after I1 and wait for "next".
