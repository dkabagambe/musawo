# Next.js Security Advisories

**Package:** next 14.2.35 (latest 14.2.x patch as of November 2026)
**Fix requires:** upgrade to next 15+ (breaking change; effort: 1-2 days -- see upgrade plan at bottom)

npm audit reports 25 advisories against the `next` package. All are grouped under a single
advisory block covering next 9.3.4-canary.0 through 16.3.0-preview.10.

---

## Advisory table

| Advisory ID | What it affects | App exposed? | Mitigation applied | Still to apply |
|---|---|---|---|---|
| GHSA-9g9p-9gw9-jx7f | DoS via Image Optimizer remotePatterns | No. `images.unoptimized=true` disables the Image Optimization API entirely. | `images.unoptimized: true` in next.config.mjs | None |
| GHSA-h25m-26qc-wcjf | DoS via RSC deserialization with insecure React Server Components | Low. App runs behind Render proxy which handles request framing. | Render proxy; no direct RSC header passthrough from public internet | None |
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling in rewrites | No. No rewrites configured in next.config.mjs. | No rewrites defined | None |
| GHSA-3x4c-7xq6-9pq8 | Unbounded next/image disk cache growth exhausting storage | No. `images.unoptimized: true` disables caching by the Image Optimization API. | `images.unoptimized: true` | None |
| GHSA-q4gf-8mx6-v5v3 | DoS with Server Components (malformed RSC payload) | Low. Render proxy; authenticated users only for most routes. | Render proxy; auth required on all portal routes | None |
| GHSA-8h8q-6873-q5fj | DoS with Server Components (second variant) | Low. Same as above. | Same as above | None |
| GHSA-3g8h-86w9-wvmq | Cache poisoning via Middleware/Proxy redirects | Low. No user-controlled cache keys; Render CDN not used for dynamic routes. | Static redirects only; no CDN caching of auth routes | None |
| GHSA-ffhc-5mcf-pf4q | XSS in App Router with CSP nonces | No. CSP header does not use per-request nonces; uses fixed allowlist. | Fixed CSP policy (no nonces) | None |
| GHSA-vfv6-92ff-j949 | Cache poisoning via RSC cache-busting collisions | Low. No shared CDN caching of RSC responses. | No CDN; Render serves each instance independently | None |
| GHSA-gx5p-jg67-6x7h | XSS in beforeInteractive scripts with untrusted input | No. No `beforeInteractive` scripts with user-controlled input. | Not used | None |
| GHSA-h64f-5h5j-jqjh | DoS in Image Optimization API | No. `images.unoptimized: true` disables the API entirely. | `images.unoptimized: true` | None |
| GHSA-c4j6-fc7j-m34r | SSRF via WebSocket upgrades | No. No WebSocket upgrades used in this app. | Not used | None |
| GHSA-wfc6-r584-vfw7 | Cache poisoning in RSC responses | Low. No shared CDN; Render instances are isolated. | No CDN caching of RSC responses | None |
| GHSA-36qx-fr4f-26g5 | Middleware bypass in Pages Router i18n | No. App uses App Router only; no Pages Router i18n config. | Not used | None |
| GHSA-m99w-x7hq-7vfj | DoS in App Router Server Actions (first variant) | Partial. Server Actions used for form submissions. | `bodySizeLimit: 10mb` in next.config.mjs; Zod input validation limits payload size | Upgrade to next 15+ |
| GHSA-89xv-2m56-2m9x | SSRF in Server Actions on custom servers | No. App runs on managed Render instance (not a custom server). | Not a custom server | None |
| GHSA-68g3-v927-f742 | Cache confusion for requests with bodies | Low. POST responses are not cached; auth cookie required. | No caching of authenticated responses | None |
| GHSA-4633-3j49-mh5q | Cache confusion for bodies with invalid UTF-8 | Low. Same as above. | Same as above | None |
| GHSA-4c39-4ccg-62r3 | Unbounded Server Action payload in Edge runtime | No. No Server Actions run in the Edge runtime; all use Node.js runtime. | `runtime = "nodejs"` on all API routes | None |
| GHSA-p9j2-gv94-2wf4 | SSRF in rewrites via attacker-controlled hostname | No. No rewrites defined. | No rewrites | None |
| GHSA-955p-x3mx-jcvp | Unauthenticated disclosure of internal Server Function endpoints | Low. All sensitive Server Functions require auth (session checked in every handler). | Auth check on every API route | None |
| GHSA-p293-qw3h-jr36 | RCE on Windows-hosted servers | No. App runs on Linux (Render). | Linux only | None |
| GHSA-2xp9-vwfh-vxw4 | RCE in Image Optimization API (AVIF) | No. `images.unoptimized: true` disables the API. | `images.unoptimized: true` | None |
| GHSA-2464-fhr4-w9xw | RCE in Image Optimization API (SVG) | No. `images.unoptimized: true` disables the API. | `images.unoptimized: true` | None |
| GHSA-p3m5-59mp-jv5r | DoS in App Router Server Actions (second variant) | Partial. Same as GHSA-m99w-x7hq-7vfj. | `bodySizeLimit: 10mb`; Zod validation | Upgrade to next 15+ |

---

## Cheap mitigations already applied

All of the following are set in next.config.mjs and require no breaking change:

- `images.unoptimized: true` -- disables Image Optimization API entirely; eliminates GHSA-9g9p, GHSA-3x4c, GHSA-h64f, GHSA-2xp9, GHSA-2464.
- `experimental.serverActions.bodySizeLimit: "10mb"` -- caps Server Action payload size; reduces DoS surface for GHSA-m99w and GHSA-p3m5.
- `experimental.serverActions.allowedOrigins` -- restricts Server Actions to known origins (localhost:3000, learn.musawotraining.ug).
- `images.remotePatterns` restricted to 3 trusted hostnames -- no attacker-controlled URL can be passed to the Image Optimizer.
- No rewrites defined -- eliminates GHSA-ggv3 and GHSA-p9j2.
- No i18n config -- eliminates GHSA-36qx.
- No WebSocket upgrades -- eliminates GHSA-c4j6.
- No Edge runtime Server Actions -- eliminates GHSA-4c39.
- Linux deployment on Render -- eliminates GHSA-p293.

---

## Upgrade plan to next 15 (the cheap mitigations become permanent fixes)

Effort: 1-2 days on branch `next-15-upgrade`.

Steps:
1. `npm install next@15 --save-exact` -- bump to latest stable 15.x.
2. Remove `images.unoptimized: true` -- Image Optimization API is patched in 15.
3. Remove `images.minimumCacheTTL`, `deviceSizes`, `imageSizes` overrides unless still needed.
4. Run `npx tsc --noEmit` and fix any type breaks (async params in route handlers changed in 15).
5. Run full Playwright suite (402 tests) and fix any failures.
6. Verify argon2 native bindings compile with new bundler (run `npm run build`).
7. Verify next-auth v5 beta.32 compatibility (no known breaking change with next 15).
8. Remove the notes in this file; update READINESS.md and PROD-S1b.md.

Risk: low. This app uses App Router only (no Pages Router), no custom server, no i18n.
The main unknown is argon2 native bindings and next-auth v5 beta compatibility.
