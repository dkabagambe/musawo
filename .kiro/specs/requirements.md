# Musawo Training Center (MTC) — Requirements

Version 1.0 | 12 October 2026

---

## 1. Product Vision

Musawo Training Center (MTC) is a standalone, fully online learning platform operated by Musawo / Allied Doctors and Friends of Uganda (ADFA), Kampala, Uganda. It is independent of musawo.ug — its own domain, server, and database. It delivers certified short health-care courses to Ugandan learners, primarily on mobile devices with limited data, via a progressive web app (PWA).

The student experience is modelled on VU's VClass: learn anywhere on any device; interactive discussion; credible digital exams; free resource library; short focused blocks with live classes; work-integrated placement; single student login; visible online-student support.

---

## 2. Stakeholders

| Role | Description |
|------|-------------|
| Student | Enrolled learner; primary user |
| Tutor | Teaches courses, marks exams, schedules live classes |
| Admin | Manages the full platform |
| Sponsor | Funds scholarship seats; views progress reports |
| Employer | Searches graduates, makes placement requests (Phase 3) |

---

## 3. Functional Requirements

### 3.1 Public / Marketing

- **REQ-P-01** Public landing page: courses, fees, accreditation logos, scholarship info, graduate stats, support contact, enrol/login CTA.
- **REQ-P-02** Reusable campaign landing-page template configurable per partner (name, logo, custom message) via admin, served at `/partner/[slug]`.
- **REQ-P-03** Free resource library accessible without login.
- **REQ-P-04** Certificate public verification page at `/verify/[id]`.

### 3.2 Authentication & Roles

- **REQ-A-01** Auth.js with email/password (Argon2id) and phone OTP (6-digit, 5-min TTL).
- **REQ-A-02** Roles: `student`, `tutor`, `admin`, `sponsor`, `employer`.
- **REQ-A-03** Single login, redirects to role-appropriate dashboard.
- **REQ-A-04** Session expiry: 30 days rolling; remembered device option.
- **REQ-A-05** Rate limiting on auth endpoints (5 attempts per 15 min per IP).

### 3.3 Course Structure

- **REQ-C-01** Courses are divided into Blocks → Lessons. Lesson types: video, notes (PDF/HTML), quiz.
- **REQ-C-02** Configurable free-preview percentage per course (default 12%; setting: `course.freePreviewPercent`).
- **REQ-C-03** Video served via Bunny Stream signed URLs; audio-only version available (Phase 2).
- **REQ-C-04** Notes served via S3-compatible signed links (30-min TTL).
- **REQ-C-05** Course published status; draft courses invisible to students.
- **REQ-C-06** Tutor assigned per course; co-tutors supported.
- **REQ-C-07** Admin can create continuing-training courses without code (Phase 3).

### 3.4 Payments

- **REQ-PAY-01** Primary gateway: Pesapal v3 (MTN MoMo, Airtel Money, cards).
- **REQ-PAY-02** Fallback gateway adapter: Flutterwave (switchable in admin settings).
- **REQ-PAY-03** Payment confirmation via server-side webhook only; no client-trust.
- **REQ-PAY-04** Payment options: full payment; instalment plan (N equal parts, configurable per course).
- **REQ-PAY-05** Instalment logic: each payment unlocks the next block. Block 1 unlocked after first payment.
- **REQ-PAY-06** Scholarship codes and discount codes; admin creates them.
- **REQ-PAY-07** Per-student ledger: all transactions visible to student and admin.
- **REQ-PAY-08** Admin payment dashboard: filters by date, course, status; CSV export; reconciliation against gateway records.
- **REQ-PAY-09** Receipts emailed (Resend) and available for download from portal.
- **REQ-PAY-10** Refund workflow: admin initiates, audit logged.
- **REQ-PAY-11** Currency: UGX. All amounts stored as integers (shillings).

### 3.5 Live Classes

- **REQ-LC-01** Tutors create live-class sessions attached to a course block (Google Meet / Zoom / Jitsi link stored).
- **REQ-LC-02** Students see timetable; receive email + SMS reminder 24 h and 1 h before.
- **REQ-LC-03** Attendance recorded (join-link click + tutor manual mark).
- **REQ-LC-04** Session recording link stored after class; visible to enrolled students.

### 3.6 Digital Exams

- **REQ-EX-01** Question bank per course; types: MCQ, true/false, short answer.
- **REQ-EX-02** Exam settings: time limit, attempt limit (default 2), pass mark (%), shuffle questions.
- **REQ-EX-03** One active exam session per student at a time (anti-cheating).
- **REQ-EX-04** Tab-switch events logged; tutor alerted after N switches (default 3).
- **REQ-EX-05** MCQ and T/F auto-marked; short answer queued for tutor marking.
- **REQ-EX-06** Results stored with attempt history; student sees score and pass/fail; detailed breakdown after all attempts used.
- **REQ-EX-07** Pass mark must be reached before certificate is issued.

### 3.7 Certificates

- **REQ-CERT-01** Certificate generated as PDF after all required exams passed (and practical sign-off where applicable).
- **REQ-CERT-02** Unique alphanumeric ID + QR code linking to public verification page.
- **REQ-CERT-03** Admin can revoke a certificate with reason (audit logged).
- **REQ-CERT-04** Certificates carry accreditation text: "Accredited by Uganda Ministry of Health and Ministry of Education and Sports".

### 3.8 Notifications

- **REQ-N-01** Email via Resend for: registration, payment receipt, live-class reminder, exam result, certificate issued, password reset.
- **REQ-N-02** SMS for: OTP, live-class reminders, payment confirmation.
- **REQ-N-03** WhatsApp Business Cloud API (opt-in) for: reminders, welcome, announcements (Phase 2).
- **REQ-N-04** In-app notification bell; unread count badge.

### 3.9 Admin Panel

- **REQ-ADM-01** Manage courses, blocks, lessons, question banks.
- **REQ-ADM-02** Manage students: view, edit roles, suspend, export.
- **REQ-ADM-03** Manage tutors and staff.
- **REQ-ADM-04** Manage intakes (cohort start/end dates per course).
- **REQ-ADM-05** Manage scholarship codes, discount codes.
- **REQ-ADM-06** Reports: enrolment, revenue, completion, pass rate — CSV/PDF export.
- **REQ-ADM-07** Site settings (all configurable defaults documented in section 4).
- **REQ-ADM-08** Audit log of all admin and payment actions.
- **REQ-ADM-09** Partner campaign page builder.

### 3.10 Phase 2 Features

- **REQ-P2-01** Practical-skills module: students book practical days at Lungujja; tutors sign off each skill.
- **REQ-P2-02** Sponsor-a-student: donor funds seats; sponsor dashboard with learner progress.
- **REQ-P2-03** Offline-first lessons (PWA + service worker) with offline quiz sync.
- **REQ-P2-04** WhatsApp notifications.
- **REQ-P2-05** Discussion forum per course.
- **REQ-P2-06** Group enrolment with single invoice.

### 3.11 Phase 3 Features

- **REQ-P3-01** Graduate profiles; employer portal (shortlist, placement requests).
- **REQ-P3-02** AI study helper: Claude claude-sonnet-5-5 API, server-side only, answers only from course notes, refuses clinical advice, logs questions.
- **REQ-P3-03** Continuing-training courses (admin-created, no code).

---

## 4. Configurable Settings (Admin Panel)

| Key | Default | Description |
|-----|---------|-------------|
| `site.domain` | `learn.musawotraining.ug` | Platform domain |
| `site.name` | `Musawo Training Center` | Displayed name |
| `site.supportEmail` | `training@musawo.ug` | Support email |
| `site.supportPhone` | `+256 700 000000` | Support phone |
| `course.freePreviewPercent` | `12` | % of lessons free before payment |
| `payment.gateway` | `pesapal` | Active payment gateway (`pesapal` / `flutterwave`) |
| `payment.currency` | `UGX` | Currency code |
| `payment.pesapalConsumerKey` | _(empty)_ | Pesapal v3 consumer key |
| `payment.pesapalConsumerSecret` | _(empty)_ | Pesapal v3 consumer secret |
| `payment.pesapalCallbackUrl` | `/api/webhooks/pesapal` | Webhook endpoint |
| `payment.flutterwaveSecretKey` | _(empty)_ | Flutterwave secret key |
| `video.bunnyStreamApiKey` | _(empty)_ | Bunny Stream API key |
| `video.bunnyLibraryId` | _(empty)_ | Bunny Stream library ID |
| `video.bunnySigningKey` | _(empty)_ | Bunny signed-URL key |
| `storage.s3Endpoint` | _(empty)_ | S3-compatible endpoint |
| `storage.s3Bucket` | `mtc-files` | Bucket name |
| `storage.s3AccessKey` | _(empty)_ | Access key |
| `storage.s3SecretKey` | _(empty)_ | Secret key |
| `email.resendApiKey` | _(empty)_ | Resend API key |
| `sms.provider` | `africas-talking` | SMS provider slug |
| `sms.apiKey` | _(empty)_ | SMS API key |
| `sms.senderId` | `MUSAWO` | SMS sender ID |
| `whatsapp.accessToken` | _(empty)_ | WhatsApp Business Cloud token |
| `whatsapp.phoneNumberId` | _(empty)_ | WhatsApp Business phone ID |
| `partner.defaultName` | `Musawo` | Default partner name on campaign pages |
| `exam.tabSwitchAlertThreshold` | `3` | Switches before tutor alert |
| `exam.defaultAttemptLimit` | `2` | Default exam attempt limit |
| `certificate.issuerName` | `Musawo Training Center` | Certificate issuer text |

---

## 5. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | First Contentful Paint < 2 s on 3G; images served as WebP; lazy-loaded |
| Offline | PWA; lesson content (video manifest, notes) cached; quiz answers synced on reconnect |
| Mobile-first | All UI designed for 320 px viewport upward |
| Security | Argon2id passwords; CSRF tokens; secure/httpOnly cookies; CSP, HSTS, X-Frame-Options headers; signed content URLs; rate limiting |
| Accessibility | WCAG 2.1 AA; ARIA labels; sufficient colour contrast |
| Data privacy | Uganda Data Protection and Privacy Act 2019 compliance; consent on registration; data deletion on request |
| Availability | 99.5% uptime; nightly encrypted backup |
| Scalability | Docker Compose on VPS; horizontal-ready Prisma schema |
| Audit | Immutable audit log for all admin and payment actions |

---

## 6. Out of Scope (Phase 1)

- Live video streaming (pre-recorded + external links only)
- Native iOS/Android apps
- Multi-language (English only)
- Integration with musawo.ug WordPress site
