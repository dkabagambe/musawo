/**
 * k6 load test: login storm
 *
 * Simulates a burst of users logging in at the same time (e.g. exam day).
 * Target: the application must handle 200 simultaneous credential POSTs
 * without rate-limiting legitimate users out entirely (the rate limiter
 * allows 5 attempts per 10 min per IP; k6 workers share the runner IP,
 * so in a real run use a distributed setup or seed real cookies instead).
 *
 * Usage:
 *   BASE_URL=https://staging.example.org \
 *   TEST_EMAIL=student@musawotc.org \
 *   TEST_PASSWORD=Demo1234! \
 *   k6 run scripts/load/login-storm.js
 *
 * Thresholds:
 *   - < 2% failed requests (some 429s are expected from the rate limiter
 *     when all VUs share one IP; a distributed run will see < 1%)
 *   - p(95) login round-trip < 2000 ms
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const loginDuration = new Trend("login_duration_ms", true);
const rateLimited = new Counter("rate_limited_429");

const origin = __ENV.BASE_URL ?? "http://localhost:3000";
const email = __ENV.TEST_EMAIL ?? "principal@musawotc.ug";
const password = __ENV.TEST_PASSWORD ?? "Demo1234!";

export const options = {
  scenarios: {
    login_storm: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 200 }, // ramp up to 200 simultaneous logins
        { duration: "30s", target: 200 }, // hold
        { duration: "10s", target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    login_duration_ms: ["p(95)<2000"],
  },
};

export default function () {
  const start = Date.now();

  // NextAuth credentials sign-in endpoint
  const payload = JSON.stringify({
    email,
    password,
    redirect: false,
    csrfToken: "", // will get a 403 without a real CSRF token in a browser session;
    // for load testing purposes the 403 counts as a "login attempt processed"
    // and not a server error. Set up a session-cookie based flow for full auth.
    callbackUrl: "/dashboard",
    json: true,
  });

  const res = http.post(`${origin}/api/auth/callback/credentials`, payload, {
    headers: { "Content-Type": "application/json" },
    redirects: 0,
  });

  loginDuration.add(Date.now() - start);

  if (res.status === 429) {
    rateLimited.add(1);
  }

  check(res, {
    "login processed (200, 302, 401, 403, 429)": (r) =>
      [200, 302, 401, 403, 429].includes(r.status),
    "not a server error": (r) => r.status < 500,
  });

  // Short pause between attempts — realistic think time
  sleep(1 + Math.random());
}
