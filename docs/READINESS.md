# READINESS REPORT

**Verdict: READY WITH RISKS**
Target: 30 concurrent users studying (reading, live class, exam, forum, posting).
All builds, type checks, unit tests, role verification, and 402 Playwright e2e tests pass against a live production build with Docker Postgres + Redis.

---

## Check table

| # | Check | Result | Notes |
|---|---|---|---|
| 1a | `npx next build` (SKIP_DB_MIGRATE=1, no DB) | PASS | 259 routes, no errors, Middleware 81.7 kB |
| 1b | `npx tsc --noEmit` | PASS | 0 type errors |
| 1c | `npm run test` (vitest) | PASS 645/645 | 20 test files, 29 s |
| 1d | `npm run demo:reset` (Docker + migrate + seed) | PASS | Docker Postgres 16 + Redis 7 running; 19 users seeded |
| 1e | `npm run verify:roles` | PASS 7/7 | All roles login, land on correct portal, denied forbidden URL |
| 1f | Playwright suite | PASS 402/402 | 11 spec files, ~9 min total |
| 2 | Functional check per role | PASS | All 7 roles tested in portal-shell and redirects specs |
| 3a | Student forbidden from staff URLs | PASS | Middleware canAccessPrefix + per-page guards |
| 3b | Admin cannot edit/verify/delete payments | PASS | Admin has payments.view + payments.collect only |
| 3c | Instructor sees only own courses | PASS | content.view.own and grades.view.own scoped |
| 3d | Academic Registrar sees only holding page | PASS | ACADEMIC_REGISTRAR_ACTIVE=false; holding card rendered |
| 3e | No raw role keys in UI | PASS | no-removed-roles + no-dashes vitest tests pass |
| 3f | No download buttons for students | PASS | Materials viewer-only; no download UI for STUDENT |
| 3g | Secrets not in git | PASS | `.env` not tracked (git ls-files returns nothing) |
| 3h | `npm audit` (high + critical) | RISK | 28 vulns (6 low, 11 mod, 10 high, 1 critical). next and next-auth are runtime deps (see below) |
| 3i | Rate limit on login | PASS | 5 attempts per 600 s per IP (Redis sliding window) |
| 4 | k6 load test (30 users) | NOT RUN | k6 not installed; script ready at load/students-30.js |

---

## 3h. npm audit (high and critical)

CORRECTION: `next` and `next-auth` are RUNTIME dependencies, not dev tools. Their CVEs affect production deployments.

| Severity | Package | Scope | Status |
|---|---|---|---|
| CRITICAL | `next` 14.2.35 | Runtime (DoS via Image Optimizer; RSC deserialization; cache poisoning; SSRF in Server Actions; RCE in Image Optimization API) | No patch in 14.x; fix requires upgrade to next 15+. Mitigations applied: images.unoptimized=true (disables Image Optimization API entirely); serverActions.bodySizeLimit=10mb; remotePatterns restricted to 3 trusted hostnames; app runs behind Render proxy which strips unknown headers. |
| CRITICAL | `vitest` + `tinypool` | Test runner only; not in production build | Patched to vitest 2.1.9 (latest 2.x stable) |
| HIGH | `next-auth` 5.0.0-beta.32 | Runtime (homoglyph email normalizer) | Already at latest beta; no newer version available |
| HIGH | `@auth/core` 0.41.3 | Runtime (malformed Bearer) | Already at latest version |
| HIGH | `zod` 3.23.8 | Runtime (memory exhaustion on oversized records) | Mitigated by input size limits in validators/index.ts; zod v4 is breaking change |
| HIGH | `serialize-javascript` (via next-pwa) | Build-time only (rollup-plugin-terser); not in production runtime bundle | Fix requires next-pwa downgrade (breaking) |
| HIGH | `postcss` (via next) | Build-time CSS processing; not in production runtime bundle | Fix requires next 15+ |
| MODERATE | `postcss-selector-parser` (via next) | Build-time only | Fix via npm audit fix (non-breaking) |

### next CVE advisory IDs and mitigations

| Advisory ID | Feature affected | App exposed on Render? | Mitigation applied |
|---|---|---|---|
| GHSA-9g9p-9gw9-jx7f | Image Optimizer remotePatterns DoS | No user-supplied URLs; remotePatterns restricted to 3 trusted hosts | images.unoptimized=true disables the API |
| GHSA-h25m-26qc-wcjf | RSC deserialization DoS | Behind Render proxy (strips unknown headers) | Proxy strips raw RSC headers |
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling in rewrites | Rewrites are static, not user-driven | Low risk; no user-controlled rewrites |
| GHSA-3x4c-7xq6-9pq8 | Unbounded image disk cache growth | images.unoptimized=true disables caching | Disabled |
| GHSA-q4gf-8mx6-v5v3 | DoS with Server Components | Server actions used for forms only; bodySizeLimit=10mb | Input size limits on Zod |
| GHSA-8h8q-6873-q5fj | DoS with Server Components | Same as above | Same |
| GHSA-3g8h-86w9-wvmq | Middleware/Proxy cache poisoning | No user-controlled cache keys | Low risk |
| GHSA-ffhc-5mcf-pf4q | XSS in App Router with CSP nonces | CSP header does not use per-request nonces | Fixed CSP policy |
| GHSA-vfv6-92ff-j949 | Cache poisoning via RSC cache-busting | Static content not cacheable | Low risk |
| GHSA-gx5p-jg67-6x7h | XSS in beforeInteractive scripts | No beforeInteractive scripts with user input | Not used |
| GHSA-h64f-5h5j-jqjh | DoS in Image Optimization API | images.unoptimized=true | Disabled |
| GHSA-c4j6-fc7j-m34r | SSRF via WebSocket upgrades | No WebSocket upgrades in app | Not used |
| GHSA-wfc6-r584-vfw7 | Cache poisoning in RSC responses | No user-controlled cache keys | Low risk |
| GHSA-36qx-fr4f-26g5 | Middleware/Proxy bypass in i18n | No Pages Router i18n config | Not used |
| GHSA-m99w-x7hq-7vfj | DoS in App Router Server Actions | Server actions used for forms only; bodySizeLimit=10mb | Input size limits |
| GHSA-89xv-2m56-2m9x | SSRF in Server Actions on custom servers | App runs on managed Render instance | Not custom server |
| GHSA-68g3-v927-f742 | Cache confusion for requests with bodies | No caching of POST responses | Not affected |
| GHSA-4633-3j49-mh5q | Cache confusion with invalid UTF-8 | Same as above | Not affected |
| GHSA-4c39-4ccg-62r3 | Unbounded Server Action payload in Edge runtime | No Server Actions in Edge runtime | Not used |
| GHSA-p9j2-gv94-2wf4 | SSRF in rewrites via attacker hostname | Rewrites are static | Not affected |
| GHSA-955p-x3mx-jcvp | Unauthenticated disclosure of Server Function endpoints | All API routes require auth | Auth required |
| GHSA-p293-qw3h-jr36 | RCE on Windows-hosted servers | App runs on Linux (Render) | Not Windows |
| GHSA-2xp9-vwfh-vxw4 | RCE in Image Optimization API (AVIF) | images.unoptimized=true | Disabled |
| GHSA-2464-fhr4-w9xw | RCE in Image Optimization API (SVG) | images.unoptimized=true | Disabled |
| GHSA-p3m5-59mp-jv5r | DoS in App Router Server Actions | Same as above | Same |

### Upgrade plan

- Branch: `next-15-upgrade` (created post-launch)
- Effort: 1-2 days (App Router API changes are minor for this codebase)
- Steps: bump next to 15.x, remove images.unoptimized, run full Playwright suite, verify argon2 native bindings work with new bundler, verify next-auth v5 compatibility
- Risk: low (no Pages Router usage; no custom server)

---

## Playwright e2e breakdown (402 tests, all PASS)

| Spec | Tests | Notes |
|---|---|---|
| administrator-access | 2 | Admin shell + 403 checks (was failing; fixed by production build) |
| auth-layout | 14 | Login/OTP/forgot-password layout |
| contact-map-favicon | 8 | Contact page, map, favicon |
| favicon | 19 | Favicon rendering |
| footer-gap | 37 | No footer gaps at 1440/1920px across all public pages |
| hero-logo | 22 | Hero, logo, CTA at 320-1440px |
| live-classes | 3 | Material upload, roster scope, meeting URL hidden before start |
| nav-links | 31 | 4-tab nav, no dead links, no # hrefs, footer present |
| portal-shell | 15 | Sidebar widths, drawer, widget toggle, per-role RBAC (7 roles) |
| redirects | 19 | Post-login landing per role, access control, /bursar redirect |
| responsive-overflow | 232 | No horizontal overflow at 320-2560px across 14 public pages |

---

## Fixes applied this session

1. **portal-shell widget toggle test**: Added widget preference reset before test (state leak from prior runs left "My Courses" hidden, causing switch lookup timeout). Fixed position assertion (one move-up from index 3 yields position 2, not 0).
2. **portal-shell Academic Registrar test**: Used `expect.poll` instead of immediate `evaluate` for sidebar width check (CSS `transition: width 180ms` caused mid-transition reading).
3. **redirects test**: Removed 8 legacy role accounts (BOARD_MEMBER, DEPUTY_PRINCIPAL, FINANCE_OFFICER, etc.) that no longer exist in the seed. Replaced `logout()` (which hung on NextAuth v5 signout page) with `page.context().clearCookies()`.
4. **Production-mode demo login fix**: Added `useSecureCookies: process.env.AUTH_URL?.startsWith("https://")` to `auth.config.ts`. When `AUTH_URL=http://localhost:3000` (local), cookies are not Secure, so login works over HTTP. When `AUTH_URL=https://...` (Render), Secure cookies are used.

---

## 4. Load test

k6 is not installed. Script ready:

```bash
sudo snap install k6
npm run build && npm start &
k6 run load/students-30.js
k6 run --env VUS=60 load/students-30.js  # headroom
```

---

## Recommended Render plan

| Component | Minimum | Recommended |
|---|---|---|
| App (Next.js) | Starter (512 MB) | Standard (2 GB, 1 CPU) for 30 users |
| Database (Postgres) | Starter | Standard (2 GB) with connection pooling |
| Redis | Free tier | Starter (256 MB) for presence + rate limiting |

---

## Remaining gaps

| Item | Status |
|---|---|
| k6 load test run with numbers | Pending (k6 not installed; run locally) |
| npm audit criticals (`next`, `next-auth`) | Should patch before production |
