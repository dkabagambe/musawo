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

To sign in, open `/dev/login` and click **Sign in** on the account row. The
Administrator account is `admin@mtc.ac.ug`. All accounts use the shared demo
password `Demo1234!`. To sign in manually, use the email address and password
on `/login`.

The authenticated portals share the responsive teal navigation shell. On a portal dashboard, use the tabs to open section shortcuts and **Edit My Widgets** to save your layout. See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) for portal components and responsive sizes.

---

## Dev tools (local only, 404 in production)

| Tool            | URL                 | Purpose                               |
| --------------- | ------------------- | ------------------------------------- |
| One-click login | `/dev/login`        | Sign in as any demo account instantly |
| Email preview   | `/dev/mail`         | See all emails sent by the platform   |
| Prisma Studio   | `npx prisma studio` | Browse and edit database records live |

---

## Demo accounts

All accounts use password: **`Demo1234!`**

| Role                           | Email                           | Portal       |
| ------------------------------ | ------------------------------- | ------------ |
| Director                       | `director@mtc.ac.ug`            | `/director`  |
| Principal                      | `principal@mtc.ac.ug`           | `/principal` |
| Admin                          | `admin@mtc.ac.ug`               | `/admin`     |
| Academic Registrar (dummy)     | `registrar@mtc.ac.ug`           | `/registrar` |
| IT Admin                       | `itadmin@mtc.ac.ug`             | `/system`    |
| Instructor 1                   | `tutor@mtc.ac.ug`               | `/tutor`     |
| Instructor 2                   | `tutor2@mtc.ac.ug`              | `/tutor`     |
| Instructor 3                   | `tutor3@mtc.ac.ug`              | `/tutor`     |
| Student (new, pending payment) | `student.new@example.com`       | `/dashboard` |
| Student (25% paid)             | `student.25@example.com`        | `/dashboard` |
| Student (50% paid)             | `student.50@example.com`        | `/dashboard` |
| Student (active, 100%)         | `student.full@example.com`      | `/dashboard` |
| Student (overdue)              | `student.overdue@example.com`   | `/dashboard` |
| Student (completed)            | `student.completed@example.com` | `/dashboard` |

**Staff names:** Director is Dr. Mathias Senyondo. Principal is Nankya Shanita.
Admin is Rahiima Nakiyimba (greeting "Hello Rahiima!"). IT Admin is Daniel
Kabagambe. Instructor 1 is Mirembe Joel. Instructor 2 is Muwanga Charles.
Instructor 3 is Atim Jennifer.

---

## Walkthrough

### 1. Public site (no login needed)

1. Open **http://localhost:3000** - hero slider (3 images), stats, all 7 real course cards.
2. Click **Apply now** - application form with all 7 courses, category eligibility checks.
3. Click **Courses** - all 7 courses. Fees show "Fee: contact admissions" until set.
4. Click **Medical Home Care Course** - curriculum blocks, free-preview lessons, eligibility.
5. Click a free-preview lesson - plays without signing in.
6. Check **Contact** - correct address (Luggala Trading Center, Lubaga Division, Kampala).

### 2. Application flow (no login needed)

1. Go to `/apply`, fill in details, pick Medical Home Care (Professional category).
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
7. Use **Import students from CSV** to upload a file, review per-row duplicate and validation results, then create only the valid rows. Optional ID numbers are encrypted before storage.

The CSV header names are `name,email,phone,courseId,intakeId,category,professionalTitle,registrationNumber,dateOfBirth,gender,district,highestQualification,emergencyContact,idNumber`. Course and intake columns use database IDs.

### 4. Student accepts invite

1. Open `/dev/mail`, click the invite email, follow the link.
2. Student sees their details: name, email, phone, student number.
3. **Happy path:** Click **Accept and continue** - student sets password, accepts data consent. Status becomes `ACTIVE`.
4. **Dispute path:** Click **These details are wrong** - student explains what is wrong, submits dispute. Status becomes `DETAILS_DISPUTED`. Registrar receives email notification.
5. To demo disputed state: use `student.disputed@example.com` in the Registrar portal - visible with red "Details disputed" badge.
6. Registrar can resend an expired or lost invite, or revoke an unused invite from the Students page.

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
3. **Timetable** - upcoming live classes. Select **Class replays** for authenticated replay pages, with absent students listed first.

### 7. Tutor: mark submissions

**Account:** `tutor@mtc.ac.ug`

1. **Exams** - pending short-answer reviews. Open one, enter score, submit.
2. **My Courses** and **Materials** include courses where the account is either the primary instructor or assigned as a co-instructor. PDF, DOCX, PPTX, PNG and JPEG uploads are capped at 50 MB. Tutor rosters filter by student permission so instructor accounts such as `tutor2@mtc.ac.ug` cannot appear as learners.
3. **Live Classes** supports link-provider classes and configured BigBlueButton rooms. Links appear to students only after Start class and instructor admission. The teacher can admit requests one by one or admit all enrolled students, enable self check-in, and end the class.
4. **Attendance** supports start and end roll calls with Present, Late, Absent or Excused marks, plus CSV and PDF exports. It shows in-class and platform-online heartbeats. Teaching assistants can take roll call but cannot mark exams or grades.
5. A student can request entry, raise a hand, and self-check-in during the configured window. In-room microphone and presenter controls depend on the video provider.
6. After a link-provider class, add its replay URL in **Live Classes**. BigBlueButton replay links synchronize through the scheduled job. Students open recordings through **Class replays** with their name and student number watermark.

The Batch B changes require the new database migration. Configure BigBlueButton, Redis, SMS or WhatsApp credentials as needed, and schedule the two routes listed in [CAPACITY.md](CAPACITY.md). Link-provider rooms must still be ended manually in Meet or Zoom. Screenshots cannot be fully prevented.

### 8. Certificate verification

No login needed. Open `/verify/MTC-2026-CERT-00001` - verified certificate details for the completed student.

### 9. Finance: payment proofs and claims

**Account:** `admin@mtc.ac.ug` (Admin collects proof of payment)

1. Dashboard - pending claims. **Payments > Claims** - open claim, collect proof of payment.
2. The Admin forwards the claim to the Principal, who forwards it to the Director for approval.
3. Student enrolment updates after the Director approves.

### 10. Director: approvals and audit

**Account:** `director@mtc.ac.ug`

1. Dashboard: revenue chart, active students, pending approvals.
2. **Approval Inbox** - pending approvals (refunds, waivers, fee changes). Approve one, reject one.
3. **Full Audit Log** - every action timestamped.
4. **Certificates** - certificate register listing all active and revoked certificates with verification links.

### 11. RBAC check

- As Director, visit `/director` - full oversight dashboard.
- As `student.full@example.com`, try `/admin` - redirected to `/dashboard`.

### 12. IT Admin

**Account:** `itadmin@mtc.ac.ug`

1. **Settings** - all platform settings, sensitive keys masked.
2. Change support phone, save - audit log entry created.

### 13. Administrator: front desk and operations

**Account:** `admin@mtc.ac.ug`

**Password:** `Demo1234!`

**Portal:** `/admin`

1. Open `/dev/login`, find the **Administrator** row, and click **Sign in**.
   For manual login, enter `admin@mtc.ac.ug` and `Demo1234!` at `/login`.
2. **Student Lookup** searches by full name or student number and shows only
   course, intake, status, phone, and email. Searches are recorded in the audit
   log. Pending student invites can be resent; password reset links go only to
   the registered email address.
3. **Support** lists tickets, supports assignment, replies, and status changes.
4. **Timetable** manages venues, room bookings, and practical sessions. A room
   booking is rejected when it overlaps another booking or practical session.
5. **Equipment** updates available quantities for each practical checklist.
6. **Notices** sends logistics notices as in-platform notifications or email.
7. **Settings** is limited to contact display, intake label, support categories,
   and reminder templates. Fees, accreditation text, payment keys, student
   creation, staff creation, marks, and audit logs are not available.

### 14. IT Admin: support tickets and system health

**Account:** `itadmin@mtc.ac.ug`

**Password:** `Demo1234!`

**Portal:** `/system`

1. Sign in from `/dev/login` using the **IT Admin** row.
2. **Support Tickets** - all incoming tickets from students and staff. Assign,
   reply, and change status. Tickets are visible to the IT Admin only.
3. **Settings** - all platform settings, sensitive keys masked.
4. Change support phone, save - audit log entry created.

---

## Notes for presenters

- **Payments** are fully simulated. `payment.gateway=demo` in settings.
- **Emails** are captured at `/dev/mail` when no real `RESEND_API_KEY` is set.
- **SMS** goes to console only in demo mode.
- **TOTP** is off for all demo accounts. Enable via `/2fa-setup`.
- **No self-registration.** `/register` redirects to `/apply`. All accounts created by the Registrar.
- **Student numbers** auto-generated at account creation: `MTC-{YYYY}-{NNNNN}`. Pattern configurable in settings (`student.numberPattern`).
- **Role labels** are editable in Site Settings. The role hierarchy is stored in `rbac.roleTree`; permission inheritance follows that hierarchy with explicit denials for restricted actions.
- **Teaching scope** is based on primary course assignment or a co-instructor assignment, then filtered again for each operation.
- **Course PDFs** are streamed through an authenticated, enrolment and payment checked route. The learner UI has no download button and overlays a name watermark. Screenshots and photography cannot be fully prevented.
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
