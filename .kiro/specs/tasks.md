# Musawo Training Center — Task Specifications

Version 1.0 | 12 October 2026

---

## Phase 1 Tasks

### TASK-001: Project scaffold
- Init Next.js 14 with TypeScript and Tailwind
- Configure `next.config.js`: PWA, security headers, image domains
- Docker Compose: app, postgres, redis, caddy
- GitHub Actions CI: lint, type-check, test, build
- `.env.example` with all required keys

### TASK-002: Database schema + migrations
- Write full Prisma schema (all Phase 1 models)
- Initial migration
- Seed script: 3 courses, sample blocks/lessons, 3 users (admin, tutor, student), discount codes

### TASK-003: Authentication
- Auth.js v5 config: email+password (Argon2id), phone OTP
- Registration page with consent checkbox
- Login page (email or phone toggle)
- OTP page
- Password reset flow
- Role-based middleware protecting routes
- Session cookie config

### TASK-004: Settings system
- `SiteSetting` CRUD in admin
- Typed `getSettings()` cached in Redis (1 min TTL)
- Admin settings UI grouped by category

### TASK-005: Public landing page
- Hero section (brand colours, logo, headline)
- Courses overview (3 cards)
- Accreditation badges section
- Statistics counter (graduates, community workers)
- Scholarship section
- Support / contact section
- Enrol / Login CTA
- Footer

### TASK-006: Course pages (public)
- `/courses` index
- `/courses/[slug]` detail: curriculum accordion, tutor bio, fees, enrolment CTA
- Free lesson preview (first N% unlocked)

### TASK-007: Admin course builder
- Create/edit course, blocks, lessons (video, notes, quiz)
- Upload notes to S3; enter Bunny video ID
- Manage question banks
- Publish/unpublish

### TASK-008: Student enrolment + payment (Pesapal)
- Enrolment wizard: pick intake, select plan (full/instalment)
- Apply discount/scholarship code
- Pesapal v3 initiate API call
- Webhook handler: verify signature, confirm payment, unlock blocks
- Ledger entry creation
- Email receipt (Resend) + SMS confirmation

### TASK-009: Flutterwave adapter
- Same interface as Pesapal adapter (`initiate`, `verify`, `refund`)
- Webhook handler at `/api/webhooks/flutterwave`
- Gateway switchable via `payment.gateway` setting

### TASK-010: Student dashboard shell
- Sidebar navigation (My Courses, Timetable, Results, Payments, Certificates, Notifications, Profile)
- Mobile bottom-nav
- Notification bell

### TASK-011: Course player
- Block/lesson sidebar with lock states
- Video player (Bunny signed URL, iframe)
- Notes viewer (signed S3 link, PDF.js)
- Progress tracking (mark lesson complete)
- Next-lesson button

### TASK-012: Live classes
- Tutor: create session (title, date/time, join URL, block)
- Student: timetable view
- Email + SMS reminders (24 h + 1 h) via cron job
- Attendance: click-to-join tracking + tutor manual mark
- Recording link storage

### TASK-013: Digital exams
- Exam builder (admin/tutor): add questions from bank, set timer/attempts/pass mark
- Student exam session page: timer, question list, one-question-at-a-time option, submit
- Tab-switch detection + logging
- One-active-session enforcement (check DB on load)
- Auto-mark MCQ/T-F
- Short-answer queue for tutor review
- Results page: score, pass/fail, attempt history

### TASK-014: Certificates
- PDF generator with: name, course, date, unique ID, QR code, accreditation text, MTC logo
- Upload to S3; store key in DB
- Public verification page `/verify/[id]`
- Admin revoke action (audit logged)

### TASK-015: Notifications
- Resend email client + templates
- Africa's Talking SMS client
- In-app notification storage + bell
- Notification preferences (email, SMS, in-app per type)

### TASK-016: Admin student & tutor management
- Student list with search/filter/export CSV
- Student detail: enrolments, payments, exam results
- Create/edit/suspend
- Tutor list, assign to course

### TASK-017: Admin payment dashboard
- Payments table: filters (date range, course, status, gateway), pagination
- Per-student ledger view
- Reconciliation: compare DB records vs gateway query
- CSV export
- Refund action (audit logged)

### TASK-018: Admin reports
- Enrolment report (by course, intake, date)
- Revenue report (by course, period)
- Completion rate report
- Pass rate report
- All exportable as CSV

### TASK-019: Free resource library
- Public page listing resources (PDF, links)
- Admin: upload/manage resources (S3 storage, signed links)
- Categories

### TASK-020: Partner campaign page
- Admin builder: partner name, logo upload, heading, body, CTA
- Served at `/partner/[slug]`
- Uses same landing-page layout with partner branding

### TASK-021: PWA setup
- `manifest.json` (name, icons, theme colours)
- Service worker (next-pwa/Workbox)
- Offline page
- IndexedDB quiz answer buffer

### TASK-022: Security hardening
- CSP headers
- Rate limiting middleware (Redis)
- CSRF on API routes
- Input validation (Zod) on all endpoints
- Audit log helper used in all admin + payment actions

### TASK-023: Automated tests
- Unit: payment webhook handler (Pesapal + Flutterwave signature verify, instalment unlock logic)
- Unit: exam auto-marking
- Unit: certificate unique ID generation
- Unit: discount/scholarship code application
- E2E (Playwright): enrolment → payment → course access flow
- E2E: exam attempt → submit → result

### TASK-024: README + deployment docs
- Setup (local dev with Docker Compose)
- Environment variables reference
- Deployment guide (VPS + Caddy)
- Monthly cost breakdown
- Assumptions list
- Images-to-replace list

---

## Phase 2 Tasks (defined, not built yet)

- TASK-025: Practical-skills booking + sign-off module
- TASK-026: Sponsor-a-student + sponsor dashboard
- TASK-027: Full offline mode (lesson caching + background sync)
- TASK-028: WhatsApp notifications
- TASK-029: Discussion forums
- TASK-030: Group enrolment

## Phase 3 Tasks (defined, not built yet)

- TASK-031: Graduate profiles + employer portal
- TASK-032: AI study helper (Claude claude-sonnet-5-5, server-side RAG)
- TASK-033: Continuing-training course type
