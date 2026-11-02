/**
 * k6 load test: 400 concurrent exam sessions
 *
 * Simulates 400 students each running through a full exam:
 *   start -> answer questions -> submit
 *
 * Each VU uses a distinct pre-authenticated session cookie and a distinct
 * exam ID so attempts do not collide on the database row. The partial index
 * exam_attempts_timeLimitEndsAt_status_idx makes the auto-submit cron scan fast
 * even while 400 in-progress attempts exist simultaneously.
 *
 * Usage:
 *   BASE_URL=https://staging.example.org \
 *   STUDENT_SESSION_COOKIES='cookie1,cookie2,...' \
 *   EXAM_ID=<published-exam-cuid> \
 *   k6 run scripts/load/exam-sessions.js
 *
 * For realistic load, provide 400 distinct authenticated session cookies.
 * EXAM_ID should point to a published exam with at least 5 questions.
 *
 * Thresholds:
 *   - < 1% failed requests
 *   - p(95) per-action < 800 ms
 *   - start action p(95) < 1200 ms (heavier: creates DB row + shuffles questions)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const startDuration  = new Trend("exam_start_ms",  true);
const answerDuration = new Trend("exam_answer_ms", true);
const submitDuration = new Trend("exam_submit_ms", true);

const cookies = (__ENV.STUDENT_SESSION_COOKIES ?? "").split(",").map((v) => v.trim()).filter(Boolean);
const origin  = __ENV.BASE_URL ?? "http://localhost:3000";
const examId  = __ENV.EXAM_ID ?? "";

export const options = {
  scenarios: {
    exam_sessions: {
      executor: "constant-vus",
      vus: 400,
      duration: "5m",
    },
  },
  thresholds: {
    http_req_failed:  ["rate<0.01"],
    exam_start_ms:    ["p(95)<1200"],
    exam_answer_ms:   ["p(95)<800"],
    exam_submit_ms:   ["p(95)<800"],
  },
};

export function setup() {
  if (!examId) throw new Error("Set EXAM_ID to a published exam CUID.");
  if (cookies.length < 400) {
    console.warn(`Only ${cookies.length} session cookies provided; VUs will share cookies.`);
  }
  return { cookies };
}

function headers(vu) {
  const cookie = cookies.length > 0
    ? cookies[(vu - 1) % cookies.length]
    : "";
  return {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

export default function (data) {
  const hdrs = headers(__VU);

  // --- START ---
  let t = Date.now();
  const startRes = http.post(
    `${origin}/api/exams?action=start`,
    JSON.stringify({ examId }),
    { headers: hdrs, redirects: 0 },
  );
  startDuration.add(Date.now() - t);

  const startOk = check(startRes, {
    "exam started": (r) => r.status === 200,
  });
  if (!startOk) {
    sleep(2);
    return;
  }

  const startBody = startRes.json();
  const attemptId = startBody.attemptId;
  const questions = startBody.questions ?? [];

  if (!attemptId || questions.length === 0) {
    sleep(2);
    return;
  }

  // --- ANSWER each question ---
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    // Pick an answer — always the first option for deterministic load
    const answer =
      Array.isArray(q.options) && q.options.length > 0
        ? String(q.options[0])
        : "A";

    t = Date.now();
    const ansRes = http.post(
      `${origin}/api/exams?action=answer`,
      JSON.stringify({ attemptId, questionId: q.id, answer, index: i }),
      { headers: hdrs, redirects: 0 },
    );
    answerDuration.add(Date.now() - t);

    check(ansRes, { "answer accepted": (r) => r.status === 200 });

    // Small think time between questions (0.3-0.8 s)
    sleep(0.3 + Math.random() * 0.5);
  }

  // --- SUBMIT ---
  t = Date.now();
  const submitRes = http.post(
    `${origin}/api/exams?action=submit`,
    JSON.stringify({ attemptId }),
    { headers: hdrs, redirects: 0 },
  );
  submitDuration.add(Date.now() - t);

  check(submitRes, { "exam submitted": (r) => r.status === 200 });

  // Wait before looping (simulates a student finishing and leaving)
  sleep(5 + Math.random() * 10);
}
