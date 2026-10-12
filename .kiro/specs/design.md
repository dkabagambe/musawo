# Musawo Training Center — Design Document

Version 1.0 | 12 October 2026

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────┐
│                  Caddy (HTTPS/2)                  │
└───────────────────┬──────────────────────────────┘
                    │
          ┌─────────▼──────────┐
          │  Next.js App Router │  (Node 20, Docker)
          │  + PWA manifest     │
          └──┬──────────┬──────┘
             │          │
   ┌──────────▼──┐  ┌───▼──────────┐
   │  PostgreSQL  │  │  Redis       │
   │  (Prisma)   │  │  (rate-limit,│
   └─────────────┘  │   sessions)  │
                    └──────────────┘

External services
  Bunny Stream   → signed video delivery
  S3-compatible  → notes, certificates
  Pesapal v3     → payments (webhook)
  Flutterwave    → payment fallback
  Resend         → email
  Africa's Talking → SMS
  WhatsApp Business Cloud → Phase 2
  Claude API     → Phase 3
```

## 2. Technology Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 App Router + TypeScript | SSR + RSC for fast mobile load |
| Styling | Tailwind CSS v3 | Utility-first, small bundle |
| ORM | Prisma + PostgreSQL 16 | Type-safe, migrations |
| Auth | Auth.js v5 (NextAuth) | Email + OTP, role support |
| Payments | Pesapal v3 SDK + Flutterwave adapter | MTN MoMo + Airtel + cards |
| Video | Bunny Stream | CDN-backed, signed URLs |
| Storage | S3-compatible (MinIO locally, any S3 in prod) | Signed expiring links |
| Email | Resend | Simple API, Uganda deliverability |
| SMS | Africa's Talking | Strong Uganda coverage |
| PDF | `@react-pdf/renderer` | Certificates + receipts |
| QR codes | `qrcode` npm | Certificate verification QR |
| PWA | `next-pwa` + Workbox | Offline caching |
| Testing | Vitest + Playwright | Unit + E2E |
| CI | GitHub Actions | Build → test → Docker push |
| Containers | Docker Compose + Caddy | VPS deployment |
| Backups | pg_dump → S3 (nightly cron) | Encrypted with age |

---

## 3. Database Schema

### Core tables (Prisma model names)

```
User            id, name, email, phone, passwordHash, role, status, createdAt
Session         (Auth.js managed)
OtpCode         id, userId, code, purpose, expiresAt, usedAt

Course          id, title, slug, description, status, freePreviewPercent, thumbnailUrl, tutorId
Block           id, courseId, order, title, description
Lesson          id, blockId, order, title, type(VIDEO|NOTES|QUIZ), bunnyVideoId, notesKey, isFree, duration
QuizQuestion    id, lessonId/examId, text, type(MCQ|TF|SHORT), options JSON, correctAnswer, points
LessonProgress  id, userId, lessonId, completedAt, watchPercent
Intake          id, courseId, label, startDate, endDate, seats, scholarshipSeats

Enrolment       id, userId, courseId, intakeId, status, scholarshipCode, discountCode, createdAt
Payment         id, enrolmentId, amount, currency, method, gateway, gatewayRef, status, paidAt, receiptUrl
Instalment      id, enrolmentId, number, amount, dueDate, paidAt, unlocksBlockId, paymentId
DiscountCode    id, code, type(SCHOLARSHIP|DISCOUNT), value, uses, maxUses, expiresAt
Ledger          id, enrolmentId, type, amount, balanceAfter, description, createdAt

LiveClass       id, courseId, blockId, tutorId, title, scheduledAt, durationMin, joinUrl, recordingUrl, status
Attendance      id, liveClassId, userId, joinedAt, markedPresent

Exam            id, courseId, blockId, title, timeLimitMin, attemptLimit, passPercent, shuffle, status
ExamAttempt     id, examId, userId, startedAt, submittedAt, score, maxScore, passed, tabSwitches, answers JSON
ShortAnswerReview id, attemptId, questionId, tutorId, score, feedback, reviewedAt

Certificate     id, userId, courseId, uniqueId, issuedAt, revokedAt, revokedReason, fileKey
CertificateVerification id, certificateId, checkedAt, ipAddress

Notification    id, userId, type, subject, body, readAt, createdAt
NotificationPref id, userId, channel(EMAIL|SMS|WHATSAPP), type, enabled

Resource        id, title, description, fileKey, category, isPublic, createdAt

PartnerPage     id, slug, partnerName, logoKey, heading, body, ctaText, ctaUrl, active
SiteSetting     id, key, value, updatedAt, updatedBy

AuditLog        id, actorId, action, entityType, entityId, metadata JSON, createdAt, ip
```

---

## 4. URL Structure

```
/                           Landing page
/courses                    All courses
/courses/[slug]             Course detail (with free preview)
/courses/[slug]/enrol       Enrolment + payment flow
/resources                  Free resource library
/partner/[slug]             Campaign landing page
/verify/[certId]            Certificate verification

/auth/login                 Login (email or phone)
/auth/register              Registration
/auth/otp                   Phone OTP entry
/auth/forgot-password       Password reset

/dashboard                  Student dashboard (redirect to role)
/dashboard/courses          My courses
/dashboard/courses/[slug]   Course player
/dashboard/exams/[id]       Exam session
/dashboard/timetable        Live classes
/dashboard/results          Exam results
/dashboard/payments         Payment history + receipts
/dashboard/certificates     My certificates
/dashboard/notifications    Notifications
/dashboard/profile          Profile settings

/tutor                      Tutor dashboard
/tutor/courses              Courses I teach
/tutor/classes              Live class management
/tutor/exams                Exam creation + marking
/tutor/students             My students

/admin                      Admin overview
/admin/courses              Course builder
/admin/students             Student management
/admin/tutors               Tutor management
/admin/intakes              Intake management
/admin/payments             Payment dashboard
/admin/scholarships         Scholarship/discount codes
/admin/reports              Reports
/admin/settings             Site settings
/admin/partner-pages        Campaign page builder
/admin/audit                Audit log

/api/auth/[...nextauth]     Auth.js handler
/api/webhooks/pesapal       Pesapal webhook
/api/webhooks/flutterwave   Flutterwave webhook
/api/webhooks/sms           SMS delivery receipts
```

---

## 5. Component Architecture

```
app/
  layout.tsx                Root layout (PWA head, analytics)
  (public)/                 Public pages group
  (auth)/                   Auth pages group (no nav)
  (dashboard)/layout.tsx    Student shell with sidebar
  (tutor)/layout.tsx        Tutor shell
  (admin)/layout.tsx        Admin shell
  api/                      Route handlers

components/
  ui/                       Headless / design-system atoms
    Button, Input, Select, Modal, Badge, Tabs, Table, etc.
  layout/
    Navbar, Footer, Sidebar, MobileNav
  course/
    CourseCard, LessonPlayer, ProgressBar, BlockAccordion
  exam/
    ExamTimer, QuestionCard, ExamGuard
  payment/
    PaymentForm, InstalmentPlan, ReceiptCard
  certificate/
    CertificateView, QrCode
  notifications/
    NotificationBell, NotificationList

lib/
  auth/         Auth.js config + adapters
  db/           Prisma client singleton
  payments/     Pesapal + Flutterwave clients
  bunny/        Bunny Stream signed URL helpers
  s3/           S3 client + signed URL helpers
  email/        Resend templates
  sms/          Africa's Talking client
  pdf/          Certificate + receipt PDF generators
  cert/         Certificate ID generation
  settings/     SiteSetting cache + typed getters
  audit/        Audit log helper
  validators/   Zod schemas
```

---

## 6. Security Design

- **Passwords**: Argon2id, cost params: memory 65536 KB, iterations 3, parallelism 1.
- **Sessions**: Auth.js JWT, httpOnly + Secure cookie, SameSite=Lax.
- **CSRF**: Next.js Server Actions use built-in CSRF token; API routes validate Origin.
- **Rate limiting**: Redis sliding window on `/api/auth/*`, `/api/payments/*`, `/api/exams/*`.
- **Signed URLs**: Bunny Stream `token` param + expiry; S3 pre-signed 30 min.
- **Headers**: Content-Security-Policy, Strict-Transport-Security (Caddy), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin.
- **Input validation**: Zod on all API route inputs + Server Actions.
- **Audit log**: Immutable append-only table; no UPDATE/DELETE permitted by application code.
- **Webhook verification**: Pesapal and Flutterwave signatures verified before processing.
- **Role enforcement**: Middleware checks session role; fine-grained in route handlers.

---

## 7. Payment Flow

```
Student selects plan (full / instalment)
  → POST /api/payments/initiate
    → create Payment record (status: PENDING)
    → call Pesapal initiate API
    → return redirect URL
  → Student redirected to Pesapal hosted page
  → Student pays on MTN MoMo / Airtel / card
  → Pesapal POSTs to /api/webhooks/pesapal
    → verify signature
    → query Pesapal for transaction status
    → if COMPLETED:
        → update Payment status = COMPLETED
        → create Ledger entry
        → if instalment: unlock next Block
        → if fully paid: activate Enrolment
        → send email receipt + SMS confirmation
    → if FAILED: update Payment status = FAILED
```

---

## 8. PWA / Offline Strategy

- Service worker via `next-pwa` + Workbox.
- Cache strategy:
  - Shell (HTML, CSS, JS): CacheFirst
  - API (course content): NetworkFirst with fallback to cache
  - Images: StaleWhileRevalidate
  - Lesson notes (PDF): CacheFirst on first open
  - Video: Not cached (Bunny CDN edge); manifest cached
- Offline quiz: answers stored in IndexedDB; synced via Background Sync API on reconnect.
- Install prompt shown on dashboard after 2nd visit.

---

## 9. Brand & Design Tokens

```css
/* Extracted from musawo.ug */
--color-primary:    #111A3F;   /* deep navy (banner overlay) */
--color-accent:     #FF6900;   /* orange (CTA buttons) */
--color-success:    #00D084;   /* green */
--color-warning:    #FCB900;   /* amber */
--color-danger:     #FE2D2D;   /* red */
--color-text:       #313131;   /* body text */
--color-bg:         #FFFFFF;
--color-surface:    #F5F7FA;
--color-border:     #E5E7EB;

/* Typography */
--font-heading: 'Inter', system-ui, sans-serif;
--font-body:    'Inter', system-ui, sans-serif;
```

---

## 10. Infrastructure & Running Costs (Monthly Estimate)

| Service | Tier | Est. UGX/mo |
|---------|------|-------------|
| VPS (4 vCPU, 8 GB RAM, 100 GB SSD) | Hetzner CX31 or DigitalOcean | ~150,000 |
| S3-compatible storage (10 GB) | Cloudflare R2 | ~7,500 |
| Bunny Stream (50 GB watched) | Bunny.net | ~75,000 |
| Resend email (5,000/mo free, then per 1k) | Free tier initially | ~0–15,000 |
| Africa's Talking SMS (1,000 msgs/mo) | ~UGX 70/SMS | ~70,000 |
| Domain (.ug or .com) | Annual ÷ 12 | ~5,000 |
| GitHub Actions (free for public / cheap private) | — | ~0 |
| **Total estimate** | | **~300,000–400,000 UGX/mo** |

*Costs scale with student numbers. Review at 500+ active students.*
