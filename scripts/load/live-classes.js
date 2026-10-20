import http from "k6/http";
import { check, sleep } from "k6";

const cookies = (__ENV.STUDENT_SESSION_COOKIES ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const origin = __ENV.BASE_URL ?? "http://localhost:3000";
export const options = {
  scenarios: { logged_in_presence: { executor: "constant-vus", vus: 500, duration: "2m" } },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<500"] },
};
export function setup() {
  if (cookies.length < 500) throw new Error("Provide 500 distinct authenticated session cookies in STUDENT_SESSION_COOKIES.");
  return { cookies };
}
export default function (data) {
  const cookie = data.cookies[(__VU - 1) % data.cookies.length];
  const response = http.post(`${origin}/api/presence/heartbeat`, "{}", { headers: { "Content-Type": "application/json", Cookie: cookie } });
  check(response, { "heartbeat accepted": (res) => res.status === 200 });
  sleep(30);
}
