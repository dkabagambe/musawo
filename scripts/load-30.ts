#!/usr/bin/env ts-node
/**
 * scripts/load-30.ts  ->  npm run load:30
 *
 * One command for the remarks.md SECTION 5 load test.
 *
 * What it does:
 *   1. Checks k6 is installed (prints the install command if not).
 *   2. Makes sure a server is reachable at BASE_URL (default
 *      http://localhost:3000). If not reachable and BASE_URL was not set
 *      explicitly, it builds and starts a local production server itself and
 *      stops it at the end. Use --no-start to skip auto-start.
 *   3. Discovers the seeded students, a PUBLISHED exam and a LIVE class from
 *      the database (so you never pass them by hand). If the 30-student cohort
 *      or a LIVE class is missing it runs `npm run db:seed-topup` once
 *      (idempotent). Use --no-seed to skip.
 *   4. Runs k6 at 30 users for ~5 min, then 60 users for headroom, printing the
 *      live k6 summary and capturing a per-step JSON summary.
 *   5. Writes docs/LOAD-RESULTS.md with per-step p50, p95, p99, error rate and
 *      5xx counts plus a verdict against the targets.
 *
 * Run it yourself on a machine where Docker + the database are up:
 *   npm run load:30
 *
 * Optional environment:
 *   BASE_URL=http://localhost:3000   target server (auto-started if unset and down)
 *   GATE_USER=... GATE_PASSWORD=...   HTTP basic auth for a Render staging gate
 *   STUDENT_PASSWORD=Demo1234!        override the seeded demo password
 *   SKIP_BUILD=1                      skip `npm run build` when auto-starting
 *
 * Flags: --no-start (do not auto-build/start a server), --no-seed (do not
 * run db:seed-topup), --build (force a rebuild), --only-30 (skip the 60 run).
 */

import { spawn, spawnSync, type ChildProcess } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { resolve, join } from "path";
import { PrismaClient } from "@prisma/client";

// ── .env loader (so DATABASE_URL is available when run as a plain script) ────
function loadEnv() {
  try {
    const text = readFileSync(".env", "utf-8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* .env optional; env may already be exported */
  }
}
loadEnv();

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const USER_SET_BASE_URL = process.env.BASE_URL !== undefined;
const PASSWORD = process.env.STUDENT_PASSWORD ?? "Demo1234!";
const GATE_USER = process.env.GATE_USER ?? "";
const GATE_PASSWORD = process.env.GATE_PASSWORD ?? "";

const argv = process.argv.slice(2);
const FLAG = (f: string) => argv.includes(f);
const NO_START = FLAG("--no-start");
const NO_SEED = FLAG("--no-seed");
const FORCE_BUILD = FLAG("--build");
const ONLY_30 = FLAG("--only-30");
const SKIP_BUILD = process.env.SKIP_BUILD === "1" || process.env.SKIP_DB_MIGRATE === "1";

const SCRIPT_DIR = resolve(__dirname);
const ROOT = resolve(SCRIPT_DIR, "..");
const K6_SCRIPT = join(ROOT, "load", "students-30.js");
const DOCS_DIR = join(ROOT, "docs");
const RESULTS_MD = join(DOCS_DIR, "LOAD-RESULTS.md");
const SUMMARY_30 = join(ROOT, ".k6-summary-30.json");
const SUMMARY_60 = join(ROOT, ".k6-summary-60.json");

main().catch((e) => {
  console.error("\n[load:30] fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});

// ── entry point ──────────────────────────────────────────────────────────────
async function main() {
  console.log("[load:30] SECTION 5 load and performance proof\n");

  ensureK6();

  const server = NO_START ? await expectServerUp() : await ensureServer();
  try {
    const prisma = new PrismaClient();
    const data = await discover(prisma);
    await prisma.$disconnect();

    const run30 = await runK6(server.url, data, 30, SUMMARY_30, "30 users (5 min)");
    const run60 = ONLY_30
      ? null
      : await runK6(server.url, data, 60, SUMMARY_60, "60 users (headroom)");

    writeResults(data, run30, run60);
    console.log(`\n[load:30] done. Results written to ${RESULTS_MD}`);
  } finally {
    if (server.stop) server.stop();
  }
}

// ── k6 availability ───────────────────────────────────────────────────────────
function ensureK6() {
  const r = spawnSync("k6", ["version"], { stdio: "pipe" });
  if (r.error || r.status !== 0) {
    console.error(
      "k6 is not installed. Install it, then re-run npm run load:30:\n\n" +
        "  Linux:   sudo snap install k6\n" +
        "           # or: sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C94784B8AC && echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt update && sudo apt install k6\n" +
        "  macOS:   brew install k6\n" +
        "  Windows: choco install k6\n" +
        "  Docker:  docker run --rm -i grafana/k6 run - < load/students-30.js\n",
    );
    process.exit(1);
  }
  console.log("[load:30] k6:", (r.stdout ? r.stdout.toString().trim() : "installed"));
}

// ── server ────────────────────────────────────────────────────────────────────
function healthUrl() {
  return `${BASE_URL}/api/health`;
}

async function probe(timeoutMs = 4000): Promise<boolean> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(healthUrl(), { signal: ac.signal });
    return res.ok || res.status === 503; // 503 means the app is up, DB down
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function expectServerUp() {
  if (await probe()) return { url: BASE_URL, stop: null };
  throw new Error(
    `Could not reach ${healthUrl()}. Start the server (npm run build && npm start) or remove --no-start to auto-start.`,
  );
}

async function ensureServer(): Promise<{ url: string; stop: (() => void) | null }> {
  if (await probe()) {
    console.log(`[load:30] server already up at ${BASE_URL}`);
    return { url: BASE_URL, stop: null };
  }
  if (USER_SET_BASE_URL) {
    throw new Error(
      `Could not reach ${healthUrl()} (BASE_URL was set explicitly). Start the server or unset BASE_URL to auto-start.`,
    );
  }

  console.log(`[load:30] no server at ${BASE_URL}; building + starting a production server`);
  if (!existsSync(join(ROOT, ".next", "BUILD_ID")) || FORCE_BUILD) {
    if (SKIP_BUILD) {
      console.log("[load:30] SKIP_BUILD set; skipping build");
    } else {
      console.log("[load:30] running production build (SKIP_DB_MIGRATE=1)...");
      const build = spawnSync(
        "npm",
        ["run", "build"],
        { cwd: ROOT, stdio: "inherit", env: { ...process.env, SKIP_DB_MIGRATE: "1" } },
      );
      if (build.error || build.status !== 0) {
        throw new Error("Production build failed. Run `npm run build` and fix errors first.");
      }
    }
  } else {
    console.log("[load:30] .next build exists; skipping build (use --build to force)");
  }

  const child = spawn("npm", ["start"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", PORT: "3000" },
    // Own process group so we can stop the whole tree (npm + next start) at once.
    detached: true,
  });
  let stderrTail = "";
  child.stdout?.on("data", () => {}); // keep the stdout pipe draining
  child.stderr?.on("data", (d: Buffer) => {
    stderrTail = (stderrTail + d.toString()).slice(-3000);
  });

  const stop = () => {
    const pid = child.pid;
    if (!pid) return;
    try {
      // Kill the child's process group (npm + next start grandchild).
      process.kill(-pid, "SIGTERM");
    } catch {
      try { child.kill("SIGTERM"); } catch { /* already gone */ }
    }
    // Hard-stop anything still alive after a grace period.
    setTimeout(() => {
      try { process.kill(-pid, "SIGKILL"); } catch { /* gone */ }
    }, 4000);
  };

  console.log("[load:30] waiting for the server to become healthy...");
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    if (await probe(3000)) {
      console.log(`[load:30] server up at ${BASE_URL} (started by this run; will be stopped at the end)`);
      return { url: BASE_URL, stop };
    }
  }
  stop();
  if (stderrTail.trim()) console.error("[load:30] server stderr (tail):\n" + stderrTail);
  throw new Error(`Server did not become healthy at ${healthUrl()} within 180 s`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── discovery ────────────────────────────────────────────────────────────────
interface Discovered {
  examId: string | null;
  liveClassId: string | null;
  courseId: string | null;
  courseTitle: string;
  studentEmails: string[];   // ACTIVE-enrolled first, then others, capped at 60
  activeCount: number;
}

async function discover(prisma: PrismaClient): Promise<Discovered> {
  // Ensure the 30-student cohort + LIVE classes exist (seed-topup is idempotent).
  const liveCount = await prisma.liveClass.count({ where: { status: "LIVE" } });
  const studentCount = await prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } });
  if (!NO_SEED && (liveCount === 0 || studentCount < 30)) {
    console.log(
      `[load:30] only ${studentCount} ACTIVE students / ${liveCount} LIVE classes found; running db:seed-topup to add the 30-student cohort and live classes`,
    );
    const seed = spawnSync("npm", ["run", "db:seed-topup"], { cwd: ROOT, stdio: "inherit" });
    if (seed.error || seed.status !== 0) {
      console.warn("[load:30] db:seed-topup failed; continuing with what is seeded");
    }
  }

  const exams = await prisma.exam.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, courseId: true, title: true, course: { select: { title: true } } },
  });
  const liveClasses = await prisma.liveClass.findMany({
    where: { status: "LIVE" },
    select: { id: true, courseId: true, title: true },
  });

  if (exams.length === 0) {
    throw new Error("No PUBLISHED exam found in the database. Run npm run demo:reset and npm run db:seed-topup first.");
  }

  // Prefer a course that has BOTH a published exam and a LIVE class, with the
  // most ACTIVE-enrolled students.
  const examCourseIds = new Set(exams.map((e) => e.courseId));
  const liveCourseIds = new Set(liveClasses.map((l) => l.courseId));
  const candidateCourseIds = Array.from(examCourseIds).filter((c) => liveCourseIds.has(c));
  const courseIdsToScore = candidateCourseIds.length > 0 ? candidateCourseIds : Array.from(examCourseIds);

  let bestCourseId = exams[0].courseId;
  let bestScore = -1;
  for (const courseId of courseIdsToScore) {
    const score = await prisma.enrolment.count({
      where: { courseId, status: "ACTIVE" },
    });
    if (score > bestScore) {
      bestScore = score;
      bestCourseId = courseId;
    }
  }

  const exam = exams.find((e) => e.courseId === bestCourseId) || exams[0];
  const liveClass = liveClasses.find((l) => l.courseId === bestCourseId) || liveClasses[0] || null;
  const courseTitle = exam.course?.title ?? "(unknown course)";

  // ACTIVE-enrolled students first (they can take the exam + join + browse),
  // then PARTIALLY_PAID / COMPLETED-enrolled students to fill up to 60.
  const active = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
      enrolments: { some: { courseId: bestCourseId, status: "ACTIVE" } },
    },
    select: { email: true },
    take: 60,
  });
  const activeEmails = active.map((u) => u.email).filter((e): e is string => !!e);

  let extras: { email: string }[] = [];
  if (activeEmails.length < 60) {
    const raw = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        status: "ACTIVE",
        email: { notIn: activeEmails.length ? activeEmails : ["__none__"] },
        enrolments: { some: { courseId: bestCourseId, status: { in: ["PARTIALLY_PAID", "COMPLETED"] } } },
      },
      select: { email: true },
      take: 60 - activeEmails.length,
    });
    extras = raw.map((u) => ({ email: u.email })).filter((u): u is { email: string } => !!u.email);
  }
  const studentEmails = [...activeEmails, ...extras.map((u) => u.email)];

  if (studentEmails.length < 30) {
    console.warn(
      `[load:30] only ${studentEmails.length} usable students found (need 30). The k6 script will cycle the available accounts; results may be skewed.`,
    );
  }

  console.log(
    `[load:30] discovered: course="${courseTitle}" exam=${exam.id} liveClass=${liveClass?.id ?? "none"} students=${studentEmails.length} (active ${activeEmails.length})`,
  );

  return {
    examId: exam.id,
    liveClassId: liveClass?.id ?? null,
    courseId: bestCourseId,
    courseTitle,
    studentEmails,
    activeCount: activeEmails.length,
  };
}

// ── run k6 ────────────────────────────────────────────────────────────────────
interface RunResult {
  vus: number;
  exitCode: number | null;
  stdout: string;
  summaryPath: string;
  summaryJson: Record<string, unknown> | null;
}

function runK6(
  baseUrl: string,
  data: Discovered,
  vus: number,
  summaryPath: string,
  label: string,
): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      BASE_URL: baseUrl,
      STUDENT_EMAILS: data.studentEmails.join(","),
      STUDENT_PASSWORD: PASSWORD,
      EXAM_ID: data.examId ?? "",
      LIVE_CLASS_ID: data.liveClassId ?? "",
      COURSE_ID: data.courseId ?? "",
      VUS: String(vus),
      SUMMARY_JSON: summaryPath,
      GATE_USER,
      GATE_PASSWORD,
    };

    console.log(`\n[load:30] >>> ${label}: k6 run ${vus} VUs against ${baseUrl}`);
    let stdout = "";
    const child = spawn(
      "k6",
      ["run", "--summary-trend-stats=avg,p(50),p(95),p(99),min,max", K6_SCRIPT],
      { cwd: ROOT, env, stdio: ["inherit", "pipe", "inherit"] },
    );
    child.stdout?.on("data", (d: Buffer) => {
      process.stdout.write(d);
      stdout += d.toString();
    });
    child.on("close", (code) => {
      let summaryJson: Record<string, unknown> | null = null;
      try {
        summaryJson = JSON.parse(readFileSync(summaryPath, "utf-8"));
      } catch {
        summaryJson = null;
      }
      resolvePromise({ vus, exitCode: code, stdout, summaryPath, summaryJson });
    });
  });
}

// ── report ────────────────────────────────────────────────────────────────────
function fmtMs(v: unknown): string {
  if (v == null) return "-";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!isFinite(n)) return "-";
  return `${Math.round(n)} ms`;
}
function fmtPct(v: unknown): string {
  if (v == null) return "-";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!isFinite(n)) return "-";
  return `${(n * 100).toFixed(2)}%`;
}
function fmtNum(v: unknown): string {
  if (v == null) return "-";
  return String(v);
}

function stepRows(summary: Record<string, unknown> | null): string {
  if (!summary) return "  (no summary captured)\n";
  const steps = (summary.steps as Record<string, any>) || {};
  const lines: string[] = [
    "| Step | p50 | p95 | p99 | error rate | 5xx |",
    "|---|---|---|---|---|---|",
  ];
  for (const s of [
    "login", "dashboard", "materials", "timetable", "forum",
    "join", "heartbeat", "examStart", "examAnswer", "examSubmit",
  ]) {
    const d = steps[s] || {};
    lines.push(
      `| ${s} | ${fmtMs(d.p50)} | ${fmtMs(d.p95)} | ${fmtMs(d.p99)} | ${fmtPct(d.error_rate)} | ${fmtNum(d.f5xx)} |`,
    );
  }
  return lines.join("\n") + "\n";
}

function verdict(summary: Record<string, unknown> | null): { pass: boolean; lines: string[] } {
  if (!summary) return { pass: false, lines: ["no summary captured"] };
  const steps = (summary.steps as Record<string, any>) || {};
  const overall = (summary.overall as any) || {};

  const loginP95 = steps.login?.p95 ?? null;
  const pageP95s = ["dashboard", "materials", "timetable", "forum", "heartbeat", "examStart", "examAnswer", "examSubmit"]
    .map((s) => steps[s]?.p95)
    .filter((v) => v != null) as number[];
  const maxPageP95 = pageP95s.length ? Math.max(...pageP95s) : null;

  // error rate = highest per-step error rate (excluding expected 401/403).
  const errRates = Object.values(steps)
    .map((d: any) => d?.error_rate)
    .filter((v) => v != null) as number[];
  const maxErr = errRates.length ? Math.max(...errRates) : null;

  // 5xx = sum of per-step 5xx counts.
  const fiveSum = Object.values(steps)
    .reduce((acc: number, d: any) => acc + (d?.f5xx || 0), 0);

  const lines: string[] = [];
  const c = (ok: boolean, label: string) => `${ok ? "PASS" : "FAIL"}  ${label}`;
  const e1 = maxErr != null && maxErr < 0.01;
  const e2 = maxPageP95 != null && maxPageP95 < 1000;
  const e3 = loginP95 != null && loginP95 < 2000;
  const e4 = fiveSum === 0;
  lines.push(c(e1, `error rate < 1% (max per step ${fmtPct(maxErr)})`));
  lines.push(c(e2, `p95 page < 1 s (max ${fmtMs(maxPageP95)})`));
  lines.push(c(e3, `login p95 < 2 s (${fmtMs(loginP95)})`));
  lines.push(c(e4, `no 5xx (total ${fiveSum})`));
  const pass = e1 && e2 && e3 && e4;
  return { pass, lines };
}

function thresholdsBlock(summary: Record<string, unknown> | null): string {
  if (!summary) return "";
  const ths = (summary.thresholds as Record<string, any>) || {};
  const rows = Object.entries(ths).flatMap(([name, arr]) =>
    (arr as any[]).map((t) => `| ${name} | ${t.expr ?? "?"} | ${t.ok ? "PASS" : "FAIL"} |`),
  );
  if (!rows.length) return "_No thresholds recorded._\n";
  return `| Metric | Threshold | Result |\n|---|---|---|\n` + rows.join("\n") + "\n";
}

function writeResults(data: Discovered, run30: RunResult, run60: RunResult | null) {
  if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });

  const v30 = verdict(run30.summaryJson);
  const v60 = run60 ? verdict(run60.summaryJson) : null;
  const overall30 = ((run30.summaryJson as any)?.overall) || {};

  const md = `# LOAD RESULTS (remarks.md SECTION 5)

Generated: ${new Date().toISOString()}

## Target

30 users studying at the same time (reading materials, joining a live class,
taking an exam, posting, heartbeating) with no errors and quick pages. A second
run at 60 users checks headroom.

## Discovered data

- Server: ${BASE_URL}
- Course: ${data.courseTitle} (${data.courseId ?? "-"})
- Exam: ${data.examId ?? "-"}
- Live class: ${data.liveClassId ?? "- (none LIVE; join step skipped)"}
- Students: ${data.studentEmails.length} (${data.activeCount} ACTIVE-enrolled, can take the exam)
- Password: ${PASSWORD}

## Run 1: 30 users (5 min)

Exit code: ${run30.exitCode}

${stepRows(run30.summaryJson)}

Overall: http_req_failed ${fmtPct(overall30.http_req_failed_rate)} | req p50 ${fmtMs(overall30.http_req_duration_p50)} | p95 ${fmtMs(overall30.http_req_duration_p95)} | p99 ${fmtMs(overall30.http_req_duration_p99)} | iterations ${fmtNum(overall30.iterations)}

Thresholds:

${thresholdsBlock(run30.summaryJson)}

Verdict: **${v30.pass ? "PASS" : "FAIL"}**

${v30.lines.map((l) => `- ${l}`).join("\n")}

## Run 2: 60 users (headroom)

${run60 ? `Exit code: ${run60.exitCode}\n\n${stepRows(run60.summaryJson)}Verdict: **${v60?.pass ? "PASS" : "FAIL"}**\n\n${v60?.lines.map((l) => `- ${l}`).join("\n")}` : "_Skipped (--only-30)._"}

## Notes and recommendations

- Video is handled by Google Meet (external); this test exercises only the
  application server (presence, exam, forum, materials, login).
- Rate limits fail open when Redis is down; presence degrades to the database
  when Redis is down (see docs/CAPACITY.md).
- To run against Render staging, set BASE_URL, GATE_USER and GATE_PASSWORD and
  re-run: \`BASE_URL=https://staging... GATE_USER=... GATE_PASSWORD=... npm run load:30\`.
- Recommended plan sizes: fill in from the CPU / memory and p95 measurements of
  the Render run. Initial pilot guidance is in docs/CAPACITY.md.

## Rerun

\`\`\`bash
npm run load:30            # build + start local prod server, 30 then 60 users
npm run load:30 -- --only-30
BASE_URL=https://staging.example.org GATE_USER=demo GATE_PASSWORD=secret npm run load:30
\`\`\`
`;

  writeFileSync(RESULTS_MD, md);
  // Also print the verdicts to the console.
  console.log(`\n[load:30] 30-user verdict: ${v30.pass ? "PASS" : "FAIL"}`);
  v30.lines.forEach((l) => console.log(`  - ${l}`));
  if (run60 && v60) {
    console.log(`[load:30] 60-user verdict: ${v60.pass ? "PASS" : "FAIL"}`);
    v60.lines.forEach((l) => console.log(`  - ${l}`));
  }

  // Clean up the temp JSON files.
  for (const p of [SUMMARY_30, SUMMARY_60]) {
    try { unlinkSync(p); } catch { /* already gone */ }
  }
}
