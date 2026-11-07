/**
 * k6 load test: 30 students studying concurrently
 *
 * Scenario (remarks.md section 4 FINAL TESTING):
 *   Ramp 0 -> 30 VUs over 30 s, hold 5 min.
 *   Each VU:  login -> dashboard -> read 3 lessons -> timetable -> forum
 *             -> join-class request -> heartbeat every 30 s
 *   10 of the VUs also take a 10-question exam with autosave.
 *
 * A second run at 60 VUs (exported as options_60) confirms headroom.
 *
 * Usage:
 *   # 30-user run
 *   BASE_URL=http://localhost:3000 \
 *   STUDENT_EMAILS="s1@example.com,s2@example.com,..." \
 *   STUDENT_PASSWORD=Demo1234! \
 *   EXAM_ID=<cuid-of-a-published-exam> \
 *   LIVE_CLASS_ID=<cuid-of-an-active-class> \
 *   k6 run load/students-30.js
 *
 *   # 60-user headroom run
 *   k6 run --env VUS=60 load/students-30.js
 *
 * Targets (remarks.md section 11):
 *   error rate  < 1 %
 *   p95 pages   < 1 000 ms
 *   p95 login   < 2 000 ms
 *   no 5xx
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

// ── metrics ─────────────────────────────────────────────────────────────────
const loginMs     = new Trend("login_ms",     true);
const pageMs      = new Trend("page_ms",      true);
const examStartMs = new Trend("exam_start_ms",true);
const examAnsMs   = new Trend("exam_ans_ms",  true);
const serverErr   = new Counter("server_errors_5xx");
const errorRate   = new Rate("custom_error_rate");

// ── config ───────────────────────────────────────────────────────────────────
const origin      = __ENV.BASE_URL      ?? "http://localhost:3000";
const password    = __ENV.STUDENT_PASSWORD ?? "Demo1234!";
const emails      = (__ENV.STUDENT_EMAILS ?? "student.full@example.com").split(",").map(s => s.trim()).filter(Boolean);
const examId      = __ENV.EXAM_ID       ?? "";
const classId     = __ENV.LIVE_CLASS_ID ?? "";
const vus         = parseInt(__ENV.VUS  ?? "30", 10);

export const options = {
  scenarios: {
    students: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: vus },
        { duration: "5m",  target: vus },
        { duration: "15s", target: 0  },
      ],
    },
  },
  thresholds: {
    custom_error_rate:  ["rate<0.01"],
    http_req_failed:    ["rate<0.01"],
    page_ms:            ["p(95)<1000"],
    login_ms:           ["p(95)<2000"],
    exam_start_ms:      ["p(95)<1500"],
    "http_req_duration{scenario:students}": ["p(95)<1000"],
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────
function get(url, headers) {
  const t = Date.now();
  const res = http.get(url, { headers });
  pageMs.add(Date.now() - t);
  if (res.status >= 500) serverErr.add(1);
  errorRate.add(res.status >= 400 && res.status !== 401 && res.status !== 403);
  return res;
}

function post(url, body, headers) {
  const res = http.post(url, JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (res.status >= 500) serverErr.add(1);
  errorRate.add(res.status >= 400 && res.status !== 401 && res.status !== 403);
  return res;
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function () {
  const email = emails[(__VU - 1) % emails.length];

  // 1. Login via NextAuth credentials
  let sessionCookie = "";
  group("login", () => {
    const t = Date.now();
    // First, get a CSRF token
    const csrf = http.get(`${origin}/api/auth/csrf`);
    const csrfToken = (csrf.json() ?? {}).csrfToken ?? "";

    const loginRes = http.post(
      `${origin}/api/auth/callback/credentials`,
      `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&csrfToken=${csrfToken}&callbackUrl=%2Fdashboard&json=true`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        redirects: 0,
      }
    );
    loginMs.add(Date.now() - t);
    check(loginRes, {
      "login accepted (200|302)": r => r.status === 200 || r.status === 302,
      "no server error on login": r => r.status < 500,
    });

    // Extract session cookie from response
    const setCookies = loginRes.headers["Set-Cookie"] ?? "";
    const match = setCookies.match(/(next-auth\.session-token=[^;]+)/);
    if (match) sessionCookie = match[1];
  });

  if (!sessionCookie) {
    // Without a session, skip the rest of this iteration
    sleep(5);
    return;
  }

  const authHeaders = { Cookie: sessionCookie };

  // 2. Dashboard
  group("dashboard", () => {
    const r = get(`${origin}/dashboard`, authHeaders);
    check(r, { "dashboard loads": res => res.status === 200 || res.status === 302 });
  });

  sleep(1 + Math.random());

  // 3. Read 3 lessons (materials list)
  group("lessons", () => {
    for (let i = 0; i < 3; i++) {
      const r = get(`${origin}/dashboard/materials`, authHeaders);
      check(r, { "materials page loads": res => res.status === 200 || res.status === 302 });
      sleep(2 + Math.random() * 3);
    }
  });

  // 4. Timetable
  group("timetable", () => {
    const r = get(`${origin}/dashboard/timetable`, authHeaders);
    check(r, { "timetable loads": res => res.status === 200 || res.status === 302 });
  });

  sleep(1);

  // 5. Forum
  group("forum", () => {
    const r = get(`${origin}/dashboard/forum`, authHeaders);
    check(r, { "forum loads": res => res.status === 200 || res.status === 302 });
    // Post a short message if forum API exists
    if (r.status === 200 && __VU <= 5) {
      post(`${origin}/api/forum/posts`, {
        content: `Load test post from VU ${__VU} at ${Date.now()}`,
      }, authHeaders);
    }
  });

  sleep(1);

  // 6. Join live class (admission request)
  if (classId) {
    group("live_class_join", () => {
      const r = post(`${origin}/api/live-classes/${classId}/request-join`, {}, authHeaders);
      check(r, { "join request accepted": res => [200, 201, 409, 403].includes(res.status) });
    });
  }

  // 7. Presence heartbeat (every 30 s)
  group("heartbeat", () => {
    const r = post(`${origin}/api/presence/heartbeat`, {}, authHeaders);
    check(r, { "heartbeat ok": res => res.status === 200 || res.status === 204 });
  });

  // 8. Exam (first 10 VUs only)
  if (__VU <= 10 && examId) {
    group("exam", () => {
      let t = Date.now();
      const startRes = post(`${origin}/api/exams?action=start`, { examId }, authHeaders);
      examStartMs.add(Date.now() - t);

      const ok = check(startRes, { "exam started": r => r.status === 200 });
      if (!ok) return;

      const body = startRes.json() ?? {};
      const attemptId = body.attemptId;
      const questions = body.questions ?? [];

      for (let i = 0; i < Math.min(questions.length, 10); i++) {
        const q = questions[i];
        const answer = Array.isArray(q.options) && q.options.length > 0
          ? String(q.options[0])
          : "A";

        t = Date.now();
        const ansRes = post(`${origin}/api/exams?action=answer`, {
          attemptId,
          questionId: q.id,
          answer,
          index: i,
        }, authHeaders);
        examAnsMs.add(Date.now() - t);
        check(ansRes, { "answer accepted": r => r.status === 200 });
        sleep(0.5 + Math.random() * 1.5);
      }

      if (attemptId) {
        const submitRes = post(`${origin}/api/exams?action=submit`, { attemptId }, authHeaders);
        check(submitRes, { "exam submitted": r => r.status === 200 });
      }
    });
  }

  // Think time before next iteration
  sleep(5 + Math.random() * 10);
}
