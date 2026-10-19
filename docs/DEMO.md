# Musawo Training Center - Demo Presentation Guide

A walkthrough of the full platform for presentations and stakeholder reviews.

---

## Quick start

```bash
# Full reset (wipes DB and reseeds - use before a presentation)
docker compose down -v && docker compose up -d postgres redis
sleep 5
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open **http://localhost:3000** and **http://localhost:3000/dev/login**.

---

## Dev tools (local only, 404 in production)

| Tool | URL | Purpose |
|------|-----|---------|
| One-click login | `/dev/login` | Sign in as any demo account instantly |
| Email preview | `/dev/mail` | See all emails sent by the platform |
| Prisma Studio | `npx prisma studio` | Browse and edit database records live |

---

## Demo accounts

All accounts use password: **`Demo1234!`**

| Role | Email | Portal |
|------|-------|--------|
| CEO / Super Admin | `ceo@mtc.ac.ug` | `/director` |
| Deputy Director | `deputy@mtc.ac.ug` | `/director` |
| Board Member | `board@mtc.ac.ug` | `/board` |
| Principal | `principal@mtc.ac.ug` | `/principal` |
| Deputy Principal | `deputyprincipal@mtc.ac.ug` | `/deputy` |
| Academic Registrar | `registrar@mtc.ac.ug` | `/registrar` |
| Finance Officer | `finance@mtc.ac.ug` | `/finance` |
| HR / System Admin | `hr@mtc.ac.ug` | `/admin` |
| Auditor (read-only) | `auditor@mtc.ac.ug` | `/auditor` |
| IT Admin | `itadmin@mtc.ac.ug` | `/system` |
| Instructor | `tutor@mtc.ac.ug` | `/tutor` |
| Instructor 2 (dual) | `tutor2@mtc.ac.ug` | `/tutor` |
| Teaching Assistant | `assistant@mtc.ac.ug` | `/tutor` |
| Student (new, pending payment) | `student.new@example.com` | `/dashboard` |
| Student (25% paid) | `student.25@example.com` | `/dashboard` |
| Student (50% paid) | `student.50@example.com` | `/dashboard` |
| Student (active, 100%) | `student.full@example.com` | `/dashboard` |
| Student (overdue) | `student.overdue@example.com` | `/dashboard` |
| Student (completed) | `student.completed@example.com` | `/dashboard` |

---

## Walkthrough

### 1. Public site (no login needed)

1. Open **http://localhost:3000** - hero slider (3 images), stats, all 7 real course cards.
2. Click **Apply now** - application form with all 7 courses, category eligibility checks.
3. Click **Courses** - all 7 courses. Fees show "Fee: contact admissions" until set.
4. Click **Medical Home Caregiver Course** - curriculum blocks, free-preview lessons, eligibility.
5. Click a free-preview lesson - plays without signing in.
6. Check **Contact** - correct address (Luggala Trading Center, Lubaga Division, Kampala).

### 2. Application flow (no login needed)

1. Go to `/apply`, fill in details, pick Medical Home Caregiver (Professional category).
2. Professional fields appear: title and registration number.
3. Submit - confirmation email visible at `/dev/mail`. Registrar notified too.

### 3. Registrar processes application

**Account:** `registrar@mtc.ac.ug`

1. Sign in at `/dev/login`.
2. **Applications** in the sidebar - badge shows pending count.
3. Open the application, click **Accept and create account**.
4. Invite email sent - visible at `/dev/mail`.
5. **Students** - new student with status `PENDING_ACCEPTANCE` and auto-generated student number (e.g. `MTC-2026-00009`). Student number is assigned at creation, never at payment or login.
6. Or click **+ New student** to create an account directly with full fields: name, DOB, gender, district, qualification, emergency contact, course, intake, category.

### 4. Student accepts invite

1. Open `/dev/mail`, click the invite email, follow the link.
2. Student confirms details, sets password, accepts data consent. Status becomes `ACTIVE`.

### 5. Student dashboard and payment

**Account:** `student.new@example.com`

1. Sign in at `/dev/login`.
2. Dashboard shows enrolment stepper: registered, pending payment.
3. Click **Payments**, **Pay now**, select MTN Mobile Money, full payment.
4. Demo payment completes - green "Paid" badge. Course unlocked.

### 6. Learning

**Account:** `student.full@example.com`

1. Sign in at `/dev/login`. Browse **My Courses**, watch a lesson, progress updates.
2. **Assignments** - submit Personal Care Reflection.
3. **Timetable** - upcoming live classes.

### 7. Tutor: mark submissions

**Account:** `tutor@mtc.ac.ug`

1. **Exams** - pending short-answer reviews. Open one, enter score, submit.

### 8. Certificate verification

No login needed. Open `/verify/MTC-2026-CNA-00001` - verified certificate details.

### 9. Finance Officer: approve claim

**Account:** `finance@mtc.ac.ug`

1. Dashboard - pending claims. **Payments > Claims** - open claim, verify, confirm.
2. Student enrolment updates to Partially Paid.

### 10. Director: approvals and audit

**Account:** `ceo@mtc.ac.ug`

1. Dashboard: revenue chart, active students, pending approvals.
2. **Approval Inbox** - 4 pending (2 refunds, 1 waiver, 1 fee change). Approve one, reject one.
3. **Full Audit Log** - every action timestamped.

### 11. RBAC check

- As CEO, visit `/finance` - works (SUPER_ADMIN inherits all portals).
- As `student.full@example.com`, try `/admin` - redirected to `/dashboard`.

### 12. IT Admin

**Account:** `itadmin@mtc.ac.ug`

1. **Settings** - all platform settings, sensitive keys masked.
2. Change support phone, save - audit log entry created.

---

## Notes for presenters

- **Payments** are fully simulated. `payment.gateway=demo` in settings.
- **Emails** are captured at `/dev/mail` when no real `RESEND_API_KEY` is set.
- **SMS** goes to console only in demo mode.
- **TOTP** is off for all demo accounts. Enable via `/2fa-setup`.
- **No self-registration.** `/register` redirects to `/apply`. All accounts created by the Registrar.
- **Student numbers** auto-generated at account creation: `MTC-{YYYY}-{NNNNN}`. Pattern configurable in settings (`student.numberPattern`).
- **Accreditation** is off by default. Set `site.accreditationText` in Admin settings to enable.
- **Scholarships** are off (`feature.scholarships=false`). No pages, links or codes exist.
- **Fees** show "Fee: contact admissions" until Finance Officer sets them. Demo seed has placeholder fees.
- `/dev/login` and `/dev/mail` return 404 in production.

---

## Useful commands

```bash
npm run dev           # start dev server
npm test              # run Vitest unit tests
npx tsc --noEmit      # type-check
npx prisma studio     # browse database on localhost:5555
npx prisma db seed    # reseed without wiping
docker compose logs -f app  # tail app logs
```
