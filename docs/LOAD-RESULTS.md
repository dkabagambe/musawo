# LOAD RESULTS (remarks.md SECTION 5)

Generated: 2026-11-12T14:13:32.727Z

## Target

30 users studying at the same time (reading materials, joining a live class,
taking an exam, posting, heartbeating) with no errors and quick pages. A second
run at 60 users checks headroom.

## Discovered data

- Server: http://localhost:3000
- Course: Certificate in Medical Home Care Course (cmwdkeeie0029lw1j2pe8uzkl)
- Exam: cmwdkeooc00gjlw1jcl47pe21
- Live class: cmwdkfjej00943kyml2b87o5r
- Students: 59 (54 ACTIVE-enrolled, can take the exam)
- Password: Demo1234!

## Run 1: 30 users (5 min)

Exit code: 99

| Step | p50 | p95 | p99 | error rate | 5xx |
|---|---|---|---|---|---|
| login | 1370 ms | 2947 ms | 4288 ms | 0.00% | 0 |
| dashboard | 0 ms | 0 ms | 0 ms | 0.00% | 0 |
| materials | 0 ms | 0 ms | 0 ms | 0.00% | 0 |
| timetable | 0 ms | 0 ms | 0 ms | - | 0 |
| forum | - | - | - | - | 0 |
| join | - | - | - | - | 0 |
| heartbeat | - | - | - | 0.00% | 0 |
| examStart | - | - | - | - | 0 |
| examAnswer | - | - | - | - | 0 |
| examSubmit | - | - | - | - | 0 |


Overall: http_req_failed 0.00% | req p50 690 ms | p95 2493 ms | p99 3722 ms | iterations 1433

Thresholds:

_No thresholds recorded._


Verdict: **FAIL**

- PASS  error rate < 1% (max per step 0.00%)
- PASS  p95 page < 1 s (max 0 ms)
- FAIL  login p95 < 2 s (2947 ms)
- PASS  no 5xx (total 0)

## Run 2: 60 users (headroom)

_Skipped (--only-30)._

## Notes and recommendations

- Video is handled by Google Meet (external); this test exercises only the
  application server (presence, exam, forum, materials, login).
- Rate limits fail open when Redis is down; presence degrades to the database
  when Redis is down (see docs/CAPACITY.md).
- To run against Render staging, set BASE_URL, GATE_USER and GATE_PASSWORD and
  re-run: `BASE_URL=https://staging... GATE_USER=... GATE_PASSWORD=... npm run load:30`.
- Recommended plan sizes: fill in from the CPU / memory and p95 measurements of
  the Render run. Initial pilot guidance is in docs/CAPACITY.md.

## Rerun

```bash
npm run load:30            # build + start local prod server, 30 then 60 users
npm run load:30 -- --only-30
BASE_URL=https://staging.example.org GATE_USER=demo GATE_PASSWORD=secret npm run load:30
```
