# Section 1 Report: Production Safety and Configuration

**Status: READY WITH RISKS**

---

## Check Table

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | APP_ENV=production disables demo banner | PASS | DemoBanner.tsx returns null when APP_ENV=production |
| 2 | /dev/login 404 in production | PASS | isDemoAllowed() guards; returns notFound() |
| 3 | /dev/mail blocked in production | PASS | Fixed: was using NODE_ENV, now uses isDemoAllowed() |
| 4 | /dev/auth-check blocked in production | PASS | Fixed: was using NODE_ENV, now uses isDemoAllowed() |
| 5 | Demo payments blocked in production | PASS | Fixed: DEMO_MODE=true now ignored when isDemoAllowed()=false |
| 6 | Login rate limit - failed attempts only | PASS | 5/15min per account, 100/15min per IP; success never counted |
| 7 | Login rate limit - 30 successful logins from one IP | PASS | All 30 allowed (test in rate-limit.test.ts) |
| 8 | Login rate limit - 5 failures locks account | PASS | 6th attempt rejected with message |
| 9 | Sign-out fixed | PASS | Now uses Server Action (doSignOut); no CSRF hang |
| 10 | TOTP mandatory for DIRECTOR/PRINCIPAL on first login | PASS | Middleware redirects to /2fa-setup?required=1 if totpEnabled=false |
| 11 | 2FA setup page shows "required" message and correct flow | PASS | useSearchParams reads ?required=1; back button hidden |
| 12 | Startup env validation fails loud in production | PASS | src/lib/env-validate.ts; called in instrumentation.ts on boot |
| 13 | TOTP_ENCRYPTION_KEY added to .env.example | PASS | Documented with generation instructions |
| 14 | npm run bootstrap:prod added | PASS | scripts/bootstrap-prod.ts; refuses on demo-seeded DB |
| 15 | Input size limits on Zod validators | PASS | max on strings, answers capped at 200, server actions 10MB |
| 16 | vitest/tinypool CRITICAL patched | PASS | vitest + @vitest/coverage-v8 bumped to 2.1.9 |
| 17 | next CRITICAL CVE | RISK | next 14.2.35 is latest 14.2.x; fix requires next v16 (major break) |
| 18 | next-auth/zod security | NOT RUN | next-auth 5.0.0-beta.32 is latest beta; zod v4 is breaking |
| 19 | Security headers | PASS | HSTS, X-Frame-Options, CSP, noindex in non-production |
| 20 | Secure cookies behind proxy | PASS | useSecureCookies tied to AUTH_URL starting with https:// |
| 21 | Secrets not in git | PASS | git ls-files shows no .env or key files |
| 22 | tsc --noEmit | PASS | 0 errors |
| 23 | npm test (vitest) | PASS | 19 files, 614 tests, all pass |
| 24 | Playwright redirects.spec.ts | PASS | 19/19 (DIRECTOR/PRINCIPAL correctly land on /2fa-setup) |
| 25 | Playwright portal-shell.spec.ts | PASS | 17/17 (2fa-setup check for DIRECTOR/PRINCIPAL) |
| 26 | npm run bootstrap:prod refuses on demo DB | PASS | Checks for student.full@example.com and director@mtc.ac.ug |

---

## Remaining Risks

| Risk | Severity | Action Required |
|------|----------|-----------------|
| next CRITICAL CVE (DoS via Image Optimizer / RSC deserialization) | HIGH | Upgrade to next v16 after Section 3 stabilisation. App is behind Caddy/Render proxy which mitigates the RSC vector. |
| Email service not configured | LOW | Emails use demo/console mode. Real domain and RESEND_API_KEY needed before production. Set RESEND_API_KEY when domain is ready. |
| bootstrap:prod /reset-password flow | LOW | One-time set-password links use /reset-password?token=... Reuses existing forgot-password flow. Works now. |

---

## Commands to Rerun

```bash
# Type check
npx tsc --noEmit

# Unit tests
npm test

# Playwright (requires server running)
node .next/standalone/server.js &
npx playwright test e2e/redirects.spec.ts e2e/portal-shell.spec.ts

# Bootstrap production (with real emails when domain is ready)
APP_ENV=production \
BOOTSTRAP_DIRECTOR_EMAIL=director@yourdomain.com \
BOOTSTRAP_PRINCIPAL_EMAIL=principal@yourdomain.com \
BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.com \
BOOTSTRAP_REGISTRAR_EMAIL=registrar@yourdomain.com \
BOOTSTRAP_ITADMIN_EMAIL=itadmin@yourdomain.com \
npm run bootstrap:prod
```
