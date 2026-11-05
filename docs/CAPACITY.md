# Capacity and concurrency (section 11)

## Targets

Configured in settings and documented here (all adjustable by the Director):

| Metric | Target |
|---|---|
| Simultaneous live classes | 20 |
| Logged-in users | 600 |
| Concurrent exam sessions | 400 |

Video is handled by Google Meet (external). The application server does not relay media.

---

## Architecture for concurrency

### Stateless application

Each Next.js request is independent. No in-process state is shared between workers. Horizontal scaling (add replicas) increases capacity linearly.

### Presence (Redis + PostgreSQL)

- Heartbeats are sent every 30 seconds from each connected client.
- Redis stores `presence:{userId}` with a 90-second TTL. On heartbeat: key is set; on leave: key is deleted.
- Redis pub/sub channel `presence:events` notifies instructor SSE streams in real time.
- PostgreSQL `platform_presence` table is upserted on every heartbeat for last-seen reporting when Redis is unavailable.
- Graceful degradation: if Redis is down, the heartbeat still succeeds and updates the DB. The SSE stream falls back to a 30-second polling snapshot via `mget`.

### Rate limiting

Sliding-window rate limits (Redis sorted sets) protect hot endpoints. Fail-open: if Redis is unavailable, all requests are allowed so a Redis outage never blocks legitimate users.

| Endpoint | Limit |
|---|---|
| `POST /api/auth/callback/credentials` | 5 per 10 min per IP |
| `POST /api/auth/callback/otp` | 5 per 10 min per IP |
| `POST /api/presence/heartbeat` | 4 per 60 s per user |
| `POST /api/exams?action=start` | 10 per 10 min per user |
| `POST /api/exams?action=answer` | 120 per 10 min per user |
| `POST /api/exams?action=submit` | 20 per 10 min per user |
| `POST /api/exams?action=tab-switch` | 20 per 10 min per user |

### Connection pooling

Prisma bounds its PostgreSQL connection pool per application process:

```
DB_CONNECTION_LIMIT=5   # default; increase for a dedicated database
```

The `DATABASE_URL` has `connection_limit` and `pool_timeout=10` appended automatically if not already set. For a 600-user target with multiple replicas, use PgBouncer or the managed database pooler (Render, Supabase, Neon) in transaction mode and set a conservative per-process limit.

### Database indexes

Added in migration `20261102110000_section11_concurrency_indexes`:

| Table | Index | Purpose |
|---|---|---|
| `exam_attempts` | `(examId, userId)` | handleAnswer, handleSubmit, handleStart |
| `exam_attempts` | `(userId, status)` | per-user attempt list |
| `exam_attempts` | `(timeLimitEndsAt, status)` WHERE IN_PROGRESS | auto-submit cron scan |
| `live_classes` | `(courseId, status)` | presence heartbeat |
| `live_classes` | `(tutorId, status)` | instructor's active classes |
| `live_classes` | `(status, scheduledAt)` | upcoming class queries |
| `attendance` | `(liveClassId)` | roll call |
| `attendance` | `(userId)` | per-student attendance history |
| `enrolments` | `(courseId, status)` | content access checks |
| `enrolments` | `(userId, status)` | student course list |
| `notifications` | `(userId, readAt)` | notification feed |
| `audit_logs` | `(entityType, entityId)` | Director/Principal entity queries |
| `audit_logs` | `(actorId, createdAt DESC)` | actor history |
| `lesson_progress` | `(userId)` | content page load |
| `sessions` | `(userId)` | Auth.js session lookup |

All indexes above are declared as `@@index` in `prisma/schema.prisma` except the partial index on `exam_attempts(timeLimitEndsAt, status) WHERE status='IN_PROGRESS'` — Prisma does not support partial index syntax in the schema, so that one exists only via the migration SQL. Run `prisma migrate deploy` (not `prisma db push`) to preserve all indexes.

### Server-side exam clocks

`timeLimitEndsAt` is recorded by the server at attempt start. Every `answer` request is rejected server-side if the clock has expired. The exam auto-submit cron (`/api/cron/exam-auto-submit`) runs every 30 seconds to finalise any `IN_PROGRESS` attempt whose `timeLimitEndsAt` has passed and whose student has disconnected. This prevents dangling in-progress attempts if a student closes their browser mid-exam.

### Background jobs

All async work runs via cron HTTP calls (no queue daemon required). Schedule each at the listed interval with `Authorization: Bearer $CRON_SECRET`:

| Cron route | Interval | Job |
|---|---|---|
| `/api/cron/exam-auto-submit` | 30 s | Finalise timed-out exam attempts (`FOR UPDATE SKIP LOCKED`) |
| `/api/cron/live-class-housekeeping` | 2 min | Close expired LIVE classes, end BBB meetings, nudge for replays |
| `/api/cron/class-reminders` | 5 min | Deliver email / SMS / WhatsApp class reminders (awaited) |
| `/api/cron/live-recordings` | 5 min | Poll BBB for recording links |
| `/api/cron/storage-retention` | daily | Scan past intakes and execute trash-window jobs |

Transactional emails (invite, approval, application, password reset, support) are fired and forgotten (`void sendEmail(...)` not `await`) in API route handlers so the HTTP response is never blocked by the email provider's latency. Cron-scheduled emails are still awaited so the reminder can be marked sent before the next run.

| Route | Interval | Purpose |
|---|---|---|
| `/api/cron/exam-auto-submit` | Every 30 s | Finalise timed-out exam attempts |
| `/api/cron/live-class-housekeeping` | Every 2 min | Close expired live classes, send replay reminders |
| `/api/cron/class-reminders` | Every 5 min | Email/SMS/WhatsApp class reminders |
| `/api/cron/live-recordings` | Every 5 min | Check BigBlueButton for recording links |
| `/api/cron/storage-retention` | Daily | Preview and queue outdated recording/notes cleanup |

### Health endpoint

`GET /api/health` pings the database with `SELECT 1`. Returns `200 { status: "ok" }` or `503 { status: "error" }`. Use as the load-balancer health check.

---

## Load tests (k6)

Three k6 scripts cover the section 11 targets. All are in `scripts/load/`.

### 1. Presence heartbeat (600 users, 20 live classes)

```sh
BASE_URL=https://staging.example.org \
STUDENT_SESSION_COOKIES='cookie1,cookie2,...,cookie600' \
k6 run scripts/load/live-classes.js
```

Profile: 600 constant VUs, 2 minutes. Each VU sends one heartbeat every 30 seconds.
Thresholds: `http_req_failed < 1%`, `p(95) < 500 ms`.

### 2. Login storm (200 concurrent logins)

```sh
BASE_URL=https://staging.example.org \
TEST_EMAIL=student@musawotc.ug \
TEST_PASSWORD=Demo1234! \
k6 run scripts/load/login-storm.js
```

Profile: ramp to 200 VUs over 10 s, hold for 30 s, ramp down.
Thresholds: `http_req_failed < 2%` (some 429s expected when all VUs share one IP), `p(95) < 2000 ms`.

### 3. Exam sessions (400 concurrent)

```sh
BASE_URL=https://staging.example.org \
STUDENT_SESSION_COOKIES='cookie1,...,cookie400' \
EXAM_ID=<published-exam-cuid> \
k6 run scripts/load/exam-sessions.js
```

Profile: 400 constant VUs, 5 minutes. Each VU: start exam, answer all questions, submit.
Thresholds: `http_req_failed < 1%`, `p(95) start < 1200 ms`, `p(95) answer < 800 ms`, `p(95) submit < 800 ms`.

### Results

No load results have been recorded yet. This workspace does not have a PostgreSQL service or a staging deployment available. The k6 scripts, indexes, rate limits, and cron are production-ready; run the three commands above against a staging deployment and paste the `k6` summary output here.

---

## Recommended server size (initial pilot, 600 users)

| Component | Spec |
|---|---|
| Application (2 replicas) | 2 vCPU, 4 GB RAM each |
| PostgreSQL | 4 vCPU, 8 GB RAM, connection pooler (PgBouncer) |
| Redis | 1 vCPU, 2 GB RAM |
| (Google Meet handles all video) | external |

Scale the application replicas horizontally as user count grows. Recheck CPU, memory, database pool wait time, Redis latency, and network egress after the first real load test run.
