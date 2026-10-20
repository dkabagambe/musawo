# Capacity and live class operations

## Current design

- The Next.js application is stateless. Presence heartbeats are sent every 30 seconds, stored in Redis with a 90 second expiry, and persisted in PostgreSQL for last-seen reporting. Course rosters and attendance use indexed database queries.
- Instructor presence screens receive Redis events over Server-Sent Events, with a 30 second expiry snapshot. A polling request refreshes the full list as a fallback.
- Prisma connection pooling must be bounded per application process. Production should use PgBouncer or the managed database pooler and set a conservative `connection_limit` on `DATABASE_URL`.
- Live video runs on the selected external provider. The application server does not relay media. BigBlueButton capacity depends on its own CPU, bandwidth, recording storage, and concurrent camera and audio usage.

## Load target

The configured k6 profile targets 500 authenticated browser sessions sending one presence heartbeat every 30 seconds for two minutes. The thresholds are less than 1 percent failed requests and a 500 ms p95 heartbeat response. Run it with 500 distinct session cookies:

```sh
BASE_URL=https://staging.example.org STUDENT_SESSION_COOKIES='cookie1,cookie2,...' k6 run scripts/load/live-classes.js
```

No load results are recorded yet. This workspace had no available PostgreSQL service, and k6 plus a staging deployment were not available during implementation. Treat the target as unverified until the command is run and its output is added here. Exam sessions are not included in this profile.

## Initial sizing estimate

For an initial 500 logged-in user pilot, start with two application instances at 4 vCPU and 8 GB RAM each, PostgreSQL at 8 vCPU and 16 GB RAM with connection pooling, and Redis at 2 vCPU and 4 GB RAM. Keep the BBB server separate and size it using a provider load test with the expected number of simultaneous cameras, microphones, recordings, and regional bandwidth. These are planning estimates, not benchmark results. Recheck CPU, memory, database pool wait, Redis latency, and network egress during a staged ramp.

## Scheduled jobs

Call these authenticated POST routes from a scheduler at least once per minute:

- `/api/cron/class-reminders` sends due email reminders, and SMS or WhatsApp where credentials and a message template are configured.
- `/api/cron/live-recordings` checks completed BigBlueButton sessions for playback links.
- `/api/cron/live-class-housekeeping` closes expired live classes and sends the instructor a replay reminder.

Send `Authorization: Bearer $CRON_SECRET`. Configure a scheduler with retries and alert on non-2xx responses. Link-provider meetings need an instructor to add the replay link after class. Screenshots and external provider links cannot be fully prevented from being copied.

## Provider limits

The link adapter can hide links before class start and stop new admissions when the class ends. It cannot remotely end a Google Meet, Zoom, or other external meeting, or apply microphone and presenter controls. The instructor must end and manage those controls in the provider room. BigBlueButton can create and end rooms and starts recording by default. Participant mute and presenter controls are reflected in the Musawo roster; instructors use the room controls when the provider does not expose those actions through its API.
