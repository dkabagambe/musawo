# Musawo Training Center - Demo Presentation Guide

A 10-minute walkthrough of the full platform. Each step lists which account to use and what to click.

---

## Quick start

```bash
# Full reset (wipes DB and reseeds everything - use before a presentation)
npm run demo:reset

# Or just start if DB is already seeded
npm run demo:start
```

Then open **http://localhost:3000** and **http://localhost:3000/dev/login** in your browser.

---

## Demo accounts

All accounts use password: **`Demo1234!`**

| Role                    | Email                              | Portal        |
| ----------------------- | ---------------------------------- | ------------- |
| CEO / Super Admin       | `ceo@mtc.ac.ug`                    | `/director`   |
| Deputy Director         | `deputy@mtc.ac.ug`                 | `/director`   |
| Board Member            | `board@mtc.ac.ug`                  | `/board`      |
| Principal               | `principal@mtc.ac.ug`              | `/principal`  |
| Deputy Principal        | `deputyprincipal@mtc.ac.ug`        | `/deputy`     |
| Academic Registrar      | `registrar@mtc.ac.ug`              | `/registrar`  |
| Finance Officer         | `finance@mtc.ac.ug`                | `/finance`    |
| HR / System Admin       | `hr@mtc.ac.ug`                     | `/admin`      |
| Auditor (read-only)     | `auditor@mtc.ac.ug`                | `/auditor`    |
| IT Admin                | `itadmin@mtc.ac.ug`                | `/system`     |
| Instructor              | `tutor@mtc.ac.ug`                  | `/tutor`      |
| Instructor 2 (dual)     | `tutor2@mtc.ac.ug`                 | `/tutor`      |
| Teaching Assistant      | `assistant@mtc.ac.ug`              | `/tutor`      |
| Student (new)           | `student.new@example.com`          | `/dashboard`  |
| Student (pending)       | `student.pending@example.com`      | `/dashboard`  |
| Student (25% paid)      | `student.25@example.com`           | `/dashboard`  |
| Student (50% paid)      | `student.50@example.com`           | `/dashboard`  |
| Student (75% paid)      | `student.75@example.com`           | `/dashboard`  |
| Student (active)        | `student.full@example.com`         | `/dashboard`  |
| Student (overdue)       | `student.overdue@example.com`      | `/dashboard`  |
| Student (completed)     | `student.completed@example.com`    | `/dashboard`  |

Use **http://localhost:3000/dev/login** for one-click sign-in during the demo.

---

## 10-minute presentation walkthrough

### 1 - Public site (1 min)

**No login needed**

1. Open **http://localhost:3000** - show the homepage hero, stats, and course cards.
2. Click **Courses** in the nav - browse the 3 courses.
3. Click **Certified Nursing Care Assistant** - show the curriculum, blocks, free-preview lessons, instalment pricing, and live seat count from the database.
4. Click a free-preview lesson - it plays without signing in.

---

### 2 - Student registration (1 min)

**No login needed**

1. Click **Register** (top-right).
2. Fill in a name, email, phone and password. Watch the password strength meter.
3. Submit. Land on **Check your inbox** (in demo, email is logged to console).

---

### 3 - Student login and payment (2 min)

**Account:** `student.new@example.com` / `Demo1234!`

1. Go to **http://localhost:3000/dev/login** and click **Sign in** next to "Student (new)".
2. Dashboard shows the enrolment stepper: step 1 (registered), pending payment.
3. Click **Payments** then **Pay now**.
4. Choose MTN Mobile Money, full payment.
5. See the **Demo payment** banner. Click **Confirm demo payment**.
6. After 3 seconds the gateway simulates success. Redirected back to Payments with a green "Paid" badge.
7. Return to **My Courses** - CNA is now unlocked. Open a lesson.

---

### 4 - Learning (30 s)

**Account:** `student.full@example.com` (fully active student with progress)

1. Switch to **http://localhost:3000/dev/login** and pick Student (active).
2. Open **My Courses**, then CNA, then Block 3. Watch a lesson (progress bar advances).
3. Click **Discussion** - see forum thread "Vital signs tips". Reply.
4. Click **Assignments** - see Personal Care Reflection. Click **Submit assignment**, type text and submit.

---

### 5 - Exam (1 min)

**Account:** `student.full@example.com`

1. Click **Results** - no results yet for this student.
2. Navigate to the exam via **My Courses**, then CNA, then Block 2, then Block Exam.
3. Answer questions (MCQ auto-marked; short answer goes to tutor).
4. Submit - see score and pass/fail result instantly for MCQ.

---

### 6 - Tutor marks a submission (30 s)

**Account:** `tutor@mtc.ac.ug`

1. **http://localhost:3000/dev/login**, then Tutor (Grace).
2. Click **Exams** - see pending short-answer reviews from Ronald Mugisha.
3. Click review, enter score and feedback, then submit mark.

---

### 7 - Academic Registrar issues a certificate (30 s)

**Account:** `registrar@mtc.ac.ug`

1. **http://localhost:3000/dev/login**, then Academic Registrar.
2. Go to **Registrar**, then **Students**. Open James Ssemwogerere.
3. Show completed status, then click **Certificates** - MTC-2026-CNA-00001 is already issued.
4. Switch to student `student.completed@example.com`, then **Certificates**, then **Download PDF**.

---

### 8 - Principal approves exam results (30 s)

**Account:** `principal@mtc.ac.ug`

1. **http://localhost:3000/dev/login**, then Principal.
2. Click **Results** - see pending results awaiting release.
3. Click **Release results** for a recent exam. Students can now see their marks.

---

### 9 - Certificate QR verification (30 s)

**No login needed**

1. Open **http://localhost:3000/verify/MTC-2026-CNA-00001** - shows full verified certificate details.
2. Open **http://localhost:3000/verify/MTC-2026-CNA-00002-REVOKED** - shows revoked warning.

---

### 10 - Finance Officer: verify a manual claim (1 min)

**Account:** `finance@mtc.ac.ug`

1. **http://localhost:3000/dev/login**, then Finance Officer.
2. Dashboard shows pending claims and outstanding fees.
3. Click **Payments**, then the **Claims** tab. Open the "Under Review" claim from Moses Okello.
4. Review the transaction ID and amount. Click **Verify claim**.
5. Student's enrolment status updates to Partially Paid.

---

### 11 - CEO dashboard and approvals (2 min)

**Account:** `ceo@mtc.ac.ug`

1. **http://localhost:3000/dev/login**, then CEO.
2. Executive dashboard: show revenue chart, active students, pending approvals count.
3. Click **Approval Inbox** - 6 pending items (2 refunds, 1 waiver, 2 scholarships, 1 fee change).
4. Click the scholarship for Harriet Namutebi. Read the reason. Click **Approve** and add a comment.
5. Click **Refund** for Grace Nalubega. Click **Reject** with a reason.
6. Click **Staff Accounts** - see all staff with last login dates.
7. Click **Full Audit Log** - 100+ entries: logins, payments, role changes, exports, reversals.
8. Click **Access Review** - last review 30 days ago, mark a new review complete.

---

### 12 - RBAC demo (30 s)

1. While logged in as CEO, visit `/finance` - works (SUPER_ADMIN sees all portals).
2. Sign in as `student.full@example.com`, then try visiting `/admin` - redirected to `/dashboard`.
3. Try visiting `/director` - redirected to `/dashboard`.
4. The **403 page** shows for any truly forbidden access.

---

### 13 - IT Admin and settings (30 s)

**Account:** `itadmin@mtc.ac.ug`

1. **http://localhost:3000/dev/login**, then IT Admin.
2. **Settings** - all platform settings visible; sensitive keys masked.
3. Change the support phone. Save. Audit log entry created automatically.
4. **System Logs** - filtered to system-level events only (no student or payment data).

---

## Mobile view

Resize to 390 px (or use browser dev tools). Every page is fully responsive:

- Student dashboard collapses to a bottom nav bar.
- Auth pages show the slim photo banner and form card.
- Course pages and tables scroll horizontally on small screens.

---

## Useful commands during the demo

```bash
# Reset everything to a clean demo state
npm run demo:reset

# One-click dev login page (local only)
open http://localhost:3000/dev/login

# Prisma Studio - browse/edit data live
npx prisma studio

# Type-check
npx tsc --noEmit

# Run unit tests
npm test
```

---

## Notes for presenters

- **Payments are fully simulated.** No real money moves. The gateway reads `DEMO_MODE=true` in `.env` and shows a 3-second simulated confirmation.
- **SMS and email** are logged to the console only (no real Africa's Talking or Resend calls in demo mode).
- **TOTP** is disabled for all demo accounts (`totpEnabled: false` in seed). Enable it per-user via `/2fa-setup` to demo 2FA.
- The `/dev/login` page **404s in production** - it only exists when `NODE_ENV !== "production"`.
- **Roles:** SUPERADMIN (CEO/Deputy), ADMINISTRATOR (intake and course setup), PRINCIPAL (content and results approval), ACADEMIC_REGISTRAR (student records), BURSAR (finance), TUTOR, SYSTEM_IT.
- **Accreditation:** The accreditation page and badge are hidden by default. Fill in the `site.accreditationText` setting in Admin to enable them.
