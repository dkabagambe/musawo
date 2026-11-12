/**
 * k6 load test: N students studying concurrently (remarks.md SECTION 5).
 *
 * Scenario (remarks.md SECTION 4 FINAL TESTING):
 *   Ramp 0 -> N VUs over 30 s, hold 5 min, ramp down 15 s.
 *   Each VU logs in ONCE, then: dashboard -> read 3 lessons -> timetable ->
 *   forum (one post) -> join live class (admission request) -> heartbeat every
 *   ~30 s for the hold. The first 10 VUs also take the exam (start, answer all
 *   questions in order, submit) with autosave via the forward-only flow.
 *
 * Targets (remarks.md SECTION 11):
 *   error rate  < 1 %
 *   p95 pages  < 1 000 ms
 *   p95 login  < 2 000 ms
 *   no 5xx
 *
 * A second run at 60 VUs (VUS=60) confirms headroom.
 *
 * The npm run load:30 orchestrator (scripts/load-30.ts) discovers the seeded
 * students, exam and live class from the database and passes them in as env so
 * you do not have to supply STUDENT_EMAILS / EXAM_ID / LIVE_CLASS_ID by hand.
 *
 * Usage (standalone):
 *   BASE_URL=http://localhost:3000 \
 *   STUDENT_EMAILS="s1@example.com,s2@example.com,..." \
 *   STUDENT_PASSWORD=Demo1234! \
 *   EXAM_ID=<cuid-of-a-published-exam> \
 *   LIVE_CLASS_ID=<cuid-of-a-live-class> \
 *   COURSE_ID=<cuid-of-the-course-for-forum-posts> \
 *   SUMMARY_JSON=/abs/path/to/summary.json \
 *   k6 run --summary-trend-stats="avg,p(50),p(95),p(99),min,max" load/students-30.js
 *
 *   # 60-user headroom run
 *   k6 run --env VUS=60 ... load/students-30.js
 *
 * Optional gate (Render staging behind HTTP basic auth):
 *   GATE_USER=demo GATE_PASSWORD=secret
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

// ── config ───────────────────────────────────────────────────────────────────
const origin   = __ENV.BASE_URL      ?? "http://localhost:3000";
const password = __ENV.STUDENT_PASSWORD ?? "Demo1234!";
const emails   = (__ENV.STUDENT_EMAILS ?? "student.full@example.com")
  .split(",").map((s) => s.trim()).filter(Boolean);
const examId   = __ENV.EXAM_ID       ?? "";
const classId  = __ENV.LIVE_CLASS_ID ?? "";
const courseId = __ENV.COURSE_ID     ?? "";
const vus      = parseInt(__ENV.VUS  ?? "30", 10);

// HTTP basic auth for the Render demo gate (optional).
const gateUser = __ENV.GATE_USER ?? "";
const gatePass = __ENV.GATE_PASSWORD ?? "";
const basicAuth = gateUser || gatePass
  ? { Authorization: "Basic " + basicAuthHeader(gateUser, gatePass) }
  : {};

// ── per-step metrics ───────────────────────────────────────────────────────
// One Trend (latency), one Rate (error) and one Counter (5xx) per logical step.
const STEPS = [
  "login", "dashboard", "materials", "timetable", "forum",
  "join", "heartbeat", "examStart", "examAnswer", "examSubmit",
];
const T = {}; // Trends (ms)
const E = {}; // Rates (error)
const F = {}; // Counters (5xx)
for (const s of STEPS) {
  T[s] = new Trend(`m_${s}`, true);
  E[s] = new Rate(`e_${s}`);
  F[s] = new Counter(`f5xx_${s}`);
}

export const options = {
  scenarios: {
    students: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: vus },
        { duration: "5m",  target: vus },
        { duration: "15s", target: 0   },
      ],
    },
  },
  thresholds: {
    // Targets. Crossing these does not abort the run; k6 reports them in the
    // summary and the orchestrator reads them for the verdict.
    e_login:     ["rate<0.01"],
    e_dashboard: ["rate<0.01"],
    e_materials: ["rate<0.01"],
    e_heartbeat:  ["rate<0.01"],
    m_login:     ["p(95)<2000"],
    m_dashboard: ["p(95)<1000"],
    m_materials: ["p(95)<1000"],
    m_timetable: ["p(95)<1000"],
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────
function basicAuthHeader(user, pass) {
  // k6's goja supports btoa().
  return btoa(`${user}:${pass}`);
}

// Record a single request into the per-step metrics.
function track(step, res) {
  const ms = res.timings ? (res.timings.duration || 0) : 0;
  if (ms > 0) T[step].add(ms);
  const isErr = res.status >= 400 && res.status !== 401 && res.status !== 403;
  E[step].add(isErr);
  if (res.status >= 500) F[step].add(1);
  return res;
}

function jsonHeaders(extra) {
  return { "Content-Type": "application/json", ...basicAuth, ...(extra || {}) };
}

// Log in once per VU and cache the session cookie.
function login(email) {
  const csrf = http.get(`${origin}/api/auth/csrf`, { headers: basicAuth });
  const csrfToken = (csrf.json() || {}).csrfToken || "";

  // NextAuth v5 credentials provider reads `identifier`, NOT `email`.
  const body =
    `identifier=${encodeURIComponent(email)}` +
    `&password=${encodeURIComponent(password)}` +
    `&csrfToken=${encodeURIComponent(csrfToken)}` +
    `&callbackUrl=${encodeURIComponent("/dashboard")}&json=true`;

  const res = http.post(`${origin}/api/auth/callback/credentials`, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...basicAuth },
    redirects: 0,
  });
  track("login", res);
  check(res, {
    "login accepted (200|302)": (r) => r.status === 200 || r.status === 302,
    "no server error on login": (r) => r.status < 500,
  });

  // Extract the session cookie (handles both HTTP and __Secure- prefixes).
  const setCookies = res.headers["Set-Cookie"] || "";
  const match = setCookies.match(/(?:__Secure-)?next-auth\.session-token=[^;]+/);
  return match ? match[0] : "";
}

function browse(cookie, vu) {
  const auth = { Cookie: cookie, ...basicAuth };

  // Dashboard
  track("dashboard", http.get(`${origin}/dashboard`, { headers: auth }));

  // Read 3 lessons (materials pages)
  for (let i = 0; i < 3; i++) {
    track("materials", http.get(`${origin}/dashboard/materials`, { headers: auth }));
    sleep(2 + Math.random() * 3);
  }

  // Timetable
  track("timetable", http.get(`${origin}/dashboard/timetable`, { headers: auth }));

  sleep(1);

  // Forum: list threads for the course, then post one thread.
  if (courseId) {
    const listRes = http.get(`${origin}/api/forum?courseId=${encodeURIComponent(courseId)}`, { headers: auth });
    track("forum", listRes);
    if (listRes.status < 500) {
      const postRes = http.post(
        `${origin}/api/forum`,
        JSON.stringify({
          courseId,
          title: `Load test thread (VU ${vu})`,
          body: `Auto-generated by the k6 load test at ${new Date().toISOString()}.`,
        }),
        { headers: jsonHeaders({ Cookie: cookie }) },
      );
      track("forum", postRes);
    }
  }

  sleep(1);

  // Join live class (admission request). Real route is /join (returns 202 waiting).
  if (classId) {
    const joinRes = http.post(
      `${origin}/api/live-classes/${classId}/join`,
      "{}",
      { headers: jsonHeaders({ Cookie: cookie }) },
    );
    track("join", joinRes);
    check(joinRes, {
      "join request accepted": (r) => [200, 201, 202, 409].includes(r.status),
    });
  }
}

function takeExam(cookie) {
  if (!examId) return;
  const auth = { Cookie: cookie, ...basicAuth };

  // Start
  const startRes = http.post(
    `${origin}/api/exams?action=start`,
    JSON.stringify({ examId }),
    { headers: jsonHeaders({ Cookie: cookie }) },
  );
  track("examStart", startRes);
  if (startRes.status !== 200) return;

  const body = startRes.json() || {};
  const attemptId = body.attemptId;
  const questions = body.questions || [];
  if (!attemptId || !questions.length) return;

  // Answer every question in the server-returned order (forward-only flow).
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const answer = Array.isArray(q.options) && q.options.length > 0
      ? String(q.options[0])
      : "A";
    const ansRes = http.post(
      `${origin}/api/exams?action=answer`,
      JSON.stringify({ attemptId, questionId: q.id, answer, index: i }),
      { headers: jsonHeaders({ Cookie: cookie }) },
    );
    track("examAnswer", ansRes);
    if (ansRes.status !== 200) break;
    sleep(0.5 + Math.random() * 1.5);
  }

  // Submit
  const submitRes = http.post(
    `${origin}/api/exams?action=submit`,
    JSON.stringify({ attemptId }),
    { headers: jsonHeaders({ Cookie: cookie }) },
  );
  track("examSubmit", submitRes);
}

function heartbeat(cookie) {
  const res = http.post(
    `${origin}/api/presence/heartbeat`,
    "{}",
    { headers: jsonHeaders({ Cookie: cookie }) },
  );
  track("heartbeat", res);
  check(res, { "heartbeat ok": (r) => r.status === 200 || r.status === 204 });
}

// Per-VU session state (login once, browse once, then heartbeat loop).
const state = new Map();

export default function () {
  const email = emails[(__VU - 1) % emails.length];

  let st = state.get(__VU);
  if (!st) {
    const cookie = login(email);
    if (!cookie) { sleep(5); return; }
    st = { cookie, browsed: false, examDone: false };
    state.set(__VU, st);
  }

  if (!st.browsed) {
    browse(st.cookie, __VU);
    st.browsed = true;
    // The first 10 VUs take the exam once.
    if (__VU <= 10) {
      takeExam(st.cookie);
      st.examDone = true;
    }
  }

  heartbeat(st.cookie);
  // Cadence: presence heartbeat every ~30 s for the hold duration.
  sleep(25 + Math.random() * 10);
}

// ── summary ──────────────────────────────────────────────────────────────────
// Write a JSON file the orchestrator parses into docs/LOAD-RESULTS.md.
// Returning only a file mapping keeps k6's default text summary on stdout.
function pct(vals, p) {
  if (!vals) return null;
  if (vals[`p(${p})`] != null) return vals[`p(${p})`];
  if (p === 50 && vals.med != null) return vals.med;
  return null;
}

export function handleSummary(data) {
  const m = data.metrics || {};
  const vals = (name) => (m[name] ? m[name].values : null);

  const stepsOut = {};
  for (const s of STEPS) {
    const tv = vals(`m_${s}`);
    const ev = vals(`e_${s}`);
    const fv = vals(`f5xx_${s}`);
    stepsOut[s] = {
      p50: pct(tv, 50),
      p95: pct(tv, 95),
      p99: pct(tv, 99),
      error_rate: ev ? ev.rate : null,
      errors: ev ? ev.count : 0,
      f5xx: fv ? fv.count : 0,
    };
  }

  const dur = vals("http_req_duration");
  const failed = vals("http_req_failed");
  const thresholdsOut = {};
  for (const name of Object.keys(m)) {
    const ths = m[name] && m[name].thresholds;
    if (ths && ths.length) {
      thresholdsOut[name] = ths.map((t) => ({
        expr: t.threshold || t.name || null,
        ok: t.ok != null ? t.ok : (t.failures != null ? t.failures === 0 : true),
      }));
    }
  }

  const summary = {
    vus,
    base_url: origin,
    generated_at: new Date().toISOString(),
    steps: stepsOut,
    overall: {
      http_req_failed_rate: failed ? failed.rate : null,
      http_req_duration_p50: pct(dur, 50),
      http_req_duration_p95: pct(dur, 95),
      http_req_duration_p99: pct(dur, 99),
      iterations: vals("iterations") ? vals("iterations").count : null,
    },
    thresholds: thresholdsOut,
  };

  const out = __ENV.SUMMARY_JSON;
  const result = {};
  if (out) result[out] = JSON.stringify(summary, null, 2);
  return result;
}
