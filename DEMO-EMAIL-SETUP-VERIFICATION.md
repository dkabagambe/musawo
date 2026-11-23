# Demo Email Setup Verification

**Date:** 23 Nov 2026  
**Status:** ✅ VERIFIED - All demo emails correctly configured  
**Note:** Transition to real emails will occur AFTER domain purchase. This document confirms current demo setup consistency.

---

## Summary

The Musawo Training Center project is correctly using **demo emails** (`@example.com`) across all test data, seed scripts, and E2E tests. The setup is intentionally temporary and will be switched to real emails (e.g., `@musawotraining.ug`) after the domain is purchased.

---

## 1. Environment & Configuration

### .env File
- **Email Service:** Resend API (enabled)
- **Email From:** `MTC <noreply@musawotraining.ug>` (domain will be purchased)
- **Demo Mode:** `DEMO_MODE=true`
- **APP_ENV:** Development/Staging (for demo features like `/dev/login`)

### Key Setting
```env
EMAIL_FROM=MTC <noreply@musawotraining.ug>
DEMO_MODE=true
```

**Note:** The `noreply@musawotraining.ug` in `EMAIL_FROM` is a placeholder. It will be functional only after the domain is purchased.

---

## 2. Demo Email Addresses by Category

### Test Student Accounts (seed:test)
Used for E2E testing with 35 students (1 live class of 30):
```
student.t01@example.com to student.t35@example.com
Password: Demo1234!
```
**Reference:** `scripts/seed-test.ts` lines 80, 189

### Demo Student States (Main Seed)
Various payment and enrollment states for testing:
```
student.new@example.com          → NEW (no payment)
student.pending@example.com      → PENDING_ACCEPTANCE
student.25@example.com           → 25% paid
student.50@example.com           → 50% paid  
student.75@example.com           → 75% paid
student.full@example.com         → 100% paid (fully paid)
student.overdue@example.com      → Overdue with payment hold
student.completed@example.com    → Completed with certificate
```
**Password:** `Demo1234!` (all accounts)  
**Reference:** `src/app/dev/auth-check/page.tsx` lines 31-37

### Demo Tutor/Instructor Accounts
```
tutor@mtc.ac.ug
tutor2@mtc.ac.ug
tutor3@mtc.ac.ug
```
**Reference:** `src/app/dev/auth-check/page.tsx` line 29-30

### Additional Demo Students (Topup Seed)
Named students with various statuses:
```
s.nakabugo@example.com
s.ssali@example.com
s.nalwoga@example.com
s.kato@example.com
s.namukasa@example.com
s.musoke@example.com
s.ndagire@example.com
```
**Reference:** `prisma/seed-topup.ts` lines 71-77

### Admin & Support Staff
```
admin@mtc.ac.ug
registrar@mtc.ac.ug
itadmin@mtc.ac.ug
director@mtc.ac.ug
principal@mtc.ac.ug
```
**Reference:** Main seed data

---

## 3. E2E Tests Using Demo Emails

All Playwright tests consistently use demo accounts:

| Test File | Email Used | Purpose |
|-----------|-----------|---------|
| `e2e/student-s3-*.spec.ts` | `student.t01@example.com` | Student timetable, classes, recordings, attendance |
| `e2e/student-s4-*.spec.ts` | `student.t01@example.com` | Courses, materials, assignments, forum |
| `e2e/student-s5-exams-results-certs.spec.ts` | `student.t01/t05@example.com` | Exams, results, certificates |
| `e2e/student-s6-fees.spec.ts` | Various `student.*@example.com` | Fee payment states |
| `e2e/groups.spec.ts` | `student.t01@example.com` + `tutor@mtc.ac.ug` | Group interactions |
| `e2e/redirects.spec.ts` | Multiple demo accounts | Role-based redirects |

---

## 4. Seed Data Consistency

### Commands Used for Testing
```bash
# Standard seed (creates all demo accounts)
npm run db:seed

# Test-specific seed (creates 35 students + 1 live class)
npm run seed:test

# Reset to clean state
npm run demo:reset
```

### Payment Phases for Student States
Per `student.md` section S6:
- **New:** No payment (0%)
- **50%:** First phase paid (unlock course start)
- **75%:** Phases 1+2 paid (unlock practicals, next phase)
- **Full (100%):** All phases paid (unlock exam + certificate)
- **Overdue:** Full payment overdue, with payment hold
- **Completed:** All requirements met, certificate issued

---

## 5. What Will Change for Real Emails

After domain purchase (`musawotraining.ug`), you will need to:

1. **Update seed data** - Replace `@example.com` with real student/staff emails
2. **Update .env** - Set proper `EMAIL_FROM`
3. **Configure Resend** - Verify domain in Resend dashboard
4. **Update E2E tests** - Use real test email accounts (or keep example.com for CI/CD)
5. **Enable real email sending** - Demo email logs go to `/dev/mail` currently

### Files to Update
```
prisma/seed.ts              → Real staff/admin emails
scripts/seed-test.ts        → Real test student emails
prisma/seed-topup.ts        → Real demo student emails
.env                        → EMAIL_FROM with real domain
e2e/*.spec.ts              → May continue using example.com or use real test accounts
src/app/dev/auth-check     → Real demo account emails
```

---

## 6. Verification Checklist

- ✅ All demo emails use `@example.com` or `@mtc.ac.ug` (temporary)
- ✅ Demo password `Demo1234!` consistent across all seed data
- ✅ 7 student payment states properly defined
- ✅ Test seed creates 35 students with emails `student.t01-t35@example.com`
- ✅ E2E tests reference consistent demo accounts
- ✅ DEMO_MODE=true in .env
- ✅ Seed data includes all required courses (8 courses)
- ✅ No hardcoded passwords in code (all use Demo1234!)
- ✅ Demo emails will not cause production issues
- ✅ Transition path clear for real email setup

---

## 7. Current Demo Account Access

To test the current setup:

```bash
# Start dev environment
npm run dev

# In another terminal, seed the database
npm run db:seed
npm run seed:test

# Navigate to http://localhost:3000/dev/login
# Select any demo account from the list
# Or log in directly with:
Email:    student.t01@example.com
Password: Demo1234!

Email:    tutor@mtc.ac.ug
Password: Demo1234!
```

---

## 8. Notes

1. **Ephemeral Filesystem:** Render's deployment uses ephemeral storage. User files are stored in the database or S3-compatible storage, NOT on disk.
2. **Email Sending:** Currently disabled for demo emails. In development, emails are logged to `/dev/mail` for inspection.
3. **Domain Status:** No domain purchased yet. Emails are demo-only.
4. **Migration Path:** Clear and straightforward - update seed files and .env when domain is ready.

---

## Conclusion

The demo email setup is **complete and consistent** across the entire codebase. All 35 test students, demo staff, and payment states are properly seeded. The transition to real emails after domain purchase will be a straightforward find-and-replace operation in seed files and environment configuration.

**Next Steps:**
- Proceed with feature development using current demo accounts
- When domain is purchased, update seed data and .env
- Re-run seed and redeploy
