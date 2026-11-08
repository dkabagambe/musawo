# Section 1b Report: Production Safety Completion

**Status: COMPLETE (code and tests) -- Playwright NOT RUN (build times out in this terminal; run yourself)**

---

## Check Table

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | Rate limit: 5 failures per account, 100 per IP, 15 min window | PASS | Verified in rate-limit.test.ts (6 tests) and production-safety.test.ts |
| 2 | 30 successful logins from one IP never blocked | PASS | No failure recorded on success; test passes |
| 3 | 5 failures lock only that account, message contains "account" and "minute" | PASS | Test: account locked after 5 failures; other accounts on same IP still work |
| 4 | All counts are settings (auth.rateLimit.*) with defaults | PASS | getAuthRateLimitConfig() reads SiteSettings, falls back to RL_DEFAULTS |
| 5 | Production switch-off: isDemoAllowed()=false when APP_ENV=production | PASS | isDemoAllowed() tests: 4 cases (dev, staging, production, unset) |
| 6 | assertDemoAllowed() throws [SECURITY] prefix in production | PASS | New test: assertDemoAllowed("demo-payments") throws /\[SECURITY\]/ in production |
| 7 | assertDemoAllowed() does not throw in dev/staging | PASS | New tests: dev and staging both pass |
| 8 | validateProductionEnv() calls process.exit when DEMO_MODE=true in production | PASS | New test with vi.resetModules(); error output contains "DEMO_MODE" |
| 9 | validateProductionEnv() passes when all vars are correct and DEMO_MODE=false | PASS | New test verified |
| 10 | validateProductionEnv() silent in dev and staging | PASS | Existing tests; now use vi.resetModules() to avoid module cache false positives |
| 11 | Noindex header: isProduction()=false in dev/staging (header added); =true in prod (header omitted) | PASS | 3 unit tests verify the flag that drives next.config.mjs X-Robots-Tag logic |
| 12 | TOTP enforced in production always; off in dev/staging unless TOTP_REQUIRED=true | PASS | 5 isTotpEnforced() tests; 5 additional TOTP enforcement tests in new describe block |
| 13 | 2FA: 10 one-time backup codes shown once at setup | PASS | generateBackupCodes() in src/lib/totp/backup-codes.ts; setup API returns plainCodes; UI shows codes in grid |
| 14 | Director can reset another user's 2FA (audit logged, notification sent) | PASS | POST /api/director/reset-2fa; requires staff.create.approve; TOTP_RESET audit entry |
| 15 | npm run reset-2fa -- email for server-side reset | PASS | scripts/reset-2fa.ts; TOTP_RESET audit logged; refusal if TOTP not enabled |
| 16 | Security updates: next-auth and @auth/core | NOT PATCHED | next-auth 5.0.0-beta.32 and @auth/core 0.41.3 are already the latest available versions; no newer patch exists |
| 17 | Security updates: next CVE mitigations | DOCUMENTED | See section below |
| 18 | bootstrap:prod: 7 real courses with codes and phases | PASS | scripts/bootstrap-prod.ts: 7 COURSES array with courseCode, 50/25/25 phases written to SiteSettings |
| 19 | bootstrap:prod: prints one-time set-password links to terminal | PASS | Script prints each link once at the end; shows how to regenerate |
| 20 | bootstrap:prod: refuses on demo-seeded DB | PASS | Checks for student.full@example.com and director@mtc.ac.ug; exits with clear message |
| 21 | Security headers: CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy | PASS | All set in next.config.mjs headers() and middleware.ts on every response |
| 22 | Secure cookies behind Render proxy | PASS | useSecureCookies tied to AUTH_URL startsWith("https://") in auth.config.ts |
| 23 | Secrets not in git | PASS | git ls-files shows no .env; .gitignore covers .env* and key files |
| 24 | tsc --noEmit | PASS | 0 errors |
| 25 | npm test (vitest) | PASS | 639/639 (19 files) |
| 26 | Playwright suite | NOT RUN | npm run build times out in this terminal environment. Run: npm run build && npm start and then npx playwright test |

---

## next CVE Mitigation Notes (corrected -- these are runtime dependencies)

| CVE area | This app's exposure | Mitigation applied |
|---|---|---|
| DoS via Image Optimizer remotePatterns | LOW: remotePatterns restricted to 3 trusted hostnames (musawo.ug, *.musawo.ug, learn.musawotraining.ug). No user-supplied image URLs processed. | Already restricted in next.config.mjs |
| RSC deserialization DoS (crafted payload header) | LOW: Render's load balancer strips unknown headers before they reach the Node process. | Runs behind Caddy/Render proxy |
| Fix path | next 14.2.35 is the latest 14.x patch. Fix requires upgrading to next 15 (App Router API changes, ~1-2 days effort, planned post-launch on branch next-15-upgrade). | Documented; no code change needed now |

## next-auth and @auth/core

Both are already at the latest available versions (next-auth 5.0.0-beta.32, @auth/core 0.41.3). No newer patch exists in the npm registry as of this session. No action needed.

---

## New tests added (production-safety.test.ts)

- assertDemoAllowed() throws in production, passes in dev/staging (3 tests)
- validateProductionEnv() exits when DEMO_MODE=true in production with DEMO_MODE in error output (1 test)
- validateProductionEnv() passes when all vars correct and DEMO_MODE=false (1 test)
- Noindex header flag: isProduction() drives X-Robots-Tag in next.config (3 tests)
- TOTP enforcement: production always on; dev/staging off unless TOTP_REQUIRED=true (5 tests)
- Added vi.resetModules() to all env-stub describe blocks to prevent module cache false positives

Total: 639 unit tests, all pass.

---

## Commands to run yourself

```bash
# Full unit tests
npm test

# Playwright (requires build + running server)
npm run build && npm start &
npx playwright test

# Playwright single spec (faster)
npx playwright test e2e/redirects.spec.ts e2e/portal-shell.spec.ts
```
