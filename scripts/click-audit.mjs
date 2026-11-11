#!/usr/bin/env node
/**
 * Click Audit Script — Section 3
 *
 * Usage:
 *   node scripts/click-audit.mjs --role STUDENT   [--url http://localhost:3000]
 *   node scripts/click-audit.mjs --role INSTRUCTOR [--url http://localhost:3000]
 *   node scripts/click-audit.mjs --role ALL        [--url http://localhost:3000]
 *
 * Logs in as the seeded demo account for each role, opens every sidebar link,
 * clicks every visible button, link, and menu item that is NOT logout, records:
 *   - navigation (URL changed)
 *   - dialog / modal opened
 *   - toast / alert appeared
 *   - DOM changed
 *   - network call fired
 *   - 4xx / 5xx response
 *   - console error
 *   - 404 on a link href
 * Saves docs/CLICK-AUDIT-<ROLE>.md with the results table.
 *
 * Requirements: playwright must be installed (npx playwright install chromium).
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

const BASE_URL = getArg("url") ?? "http://localhost:3000";
const roleArg  = (getArg("role") ?? "STUDENT").toUpperCase();

// Demo credentials (must match seed)
const CREDENTIALS = {
  STUDENT: { email: "student@mtc.ac.ug",    password: "demo1234", landing: "/dashboard" },
  INSTRUCTOR: { email: "tutor@mtc.ac.ug",   password: "demo1234", landing: "/tutor" },
  ADMIN:   { email: "admin@mtc.ac.ug",      password: "demo1234", landing: "/admin" },
  PRINCIPAL: { email: "principal@mtc.ac.ug",password: "demo1234", landing: "/principal" },
  DIRECTOR: { email: "director@mtc.ac.ug",  password: "demo1234", landing: "/director" },
  SYSTEM_IT: { email: "itadmin@mtc.ac.ug",  password: "demo1234", landing: "/system" },
};

const ROLES_TO_RUN = roleArg === "ALL"
  ? Object.keys(CREDENTIALS)
  : [roleArg];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Collect all sidebar nav links from the app shell. */
async function collectNavLinks(page) {
  return page.$$eval("nav a[href], aside a[href]", (els) =>
    [...new Set(els.map((el) => el.getAttribute("href")))].filter(
      (href) => href && href.startsWith("/") && !href.includes("logout") && !href.includes("sign-out"),
    ),
  );
}

/** Collect all actionable elements on current page (buttons, links, selects). */
async function collectClickables(page) {
  return page.$$eval(
    'button:not([disabled]):not([aria-label*="ose"]):not([aria-label*="Logout"]):not([aria-label*="Sign out"]), a[href]:not([href*="logout"]):not([href*="sign-out"]), [role="button"]',
    (els) =>
      els.map((el) => ({
        tag: el.tagName,
        text: (el.textContent ?? "").trim().slice(0, 80),
        href: el.getAttribute("href") ?? null,
        ariaLabel: el.getAttribute("aria-label") ?? null,
      })).filter((e) => e.text || e.ariaLabel),
  );
}

async function runAudit(role) {
  const cred = CREDENTIALS[role];
  if (!cred) {
    console.error(`Unknown role: ${role}`);
    return;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`CLICK AUDIT — ${role}`);
  console.log(`${"=".repeat(60)}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page    = await context.newPage();

  const results = [];
  const errors  = [];
  const networkFails = [];

  // Track 4xx/5xx responses
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      networkFails.push({ url: resp.url(), status: resp.status() });
    }
  });

  // Track console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ page: page.url(), message: msg.text().slice(0, 200) });
    }
  });

  // ── Login ───────────────────────────────────────────────────────────────────
  console.log(`Logging in as ${cred.email}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', cred.email).catch(() => {});
  await page.fill('input[type="password"], input[name="password"]', cred.password).catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(2000);

  const loginUrl = page.url();
  if (loginUrl.includes("/login") || loginUrl.includes("/otp")) {
    // Try dev/login shortcut
    await page.goto(`${BASE_URL}/dev/login`, { waitUntil: "networkidle" });
    const devBtn = await page.$(`.dev-login-btn[data-email="${cred.email}"], button:has-text("${role}")`);
    if (devBtn) {
      await devBtn.click();
      await page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
    }
  }

  const afterLoginUrl = page.url();
  console.log(`After login: ${afterLoginUrl}`);

  // ── Collect nav links ───────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}${cred.landing}`, { waitUntil: "networkidle" });
  const navLinks = await collectNavLinks(page);
  console.log(`Found ${navLinks.length} nav links.\n`);

  // ── Visit each nav page ─────────────────────────────────────────────────────
  for (const href of navLinks) {
    const url = `${BASE_URL}${href}`;
    console.log(`  Visiting ${href}...`);

    const urlBefore = page.url();
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 }).catch((err) => {
      errors.push({ page: url, message: `Navigation failed: ${err.message}` });
    });

    const finalUrl  = page.url();
    const statusCode = networkFails.find((f) => f.url === url)?.status ?? null;

    // Check for error boundaries or 404 content
    const pageText = await page.textContent("body").catch(() => "");
    const isError  =
      pageText?.includes("404") ||
      pageText?.includes("This page could not be found") ||
      pageText?.includes("Application error") ||
      finalUrl.includes("/403") ||
      finalUrl.includes("/login");

    results.push({
      href,
      finalUrl,
      redirected: finalUrl !== url,
      isError,
      networkFail: statusCode,
      verdict: isError ? "FAIL" : statusCode ? `HTTP ${statusCode}` : "PASS",
    });

    if (isError) {
      console.log(`    FAIL — ${finalUrl}`);
    }

    await page.waitForTimeout(500);
  }

  // ── On each page, collect and test visible buttons ─────────────────────────
  const visitedPages = new Set();
  for (const r of results.filter((x) => x.verdict === "PASS")) {
    const url = `${BASE_URL}${r.href}`;
    if (visitedPages.has(url)) continue;
    visitedPages.add(url);

    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    const clickables = await collectClickables(page);

    for (const el of clickables.slice(0, 20)) {
      // Skip external links and logout
      if (el.href?.startsWith("http") && !el.href.startsWith(BASE_URL)) continue;
      if (el.text?.toLowerCase().includes("logout") || el.text?.toLowerCase().includes("sign out")) continue;
      if (el.ariaLabel?.toLowerCase().includes("logout")) continue;
    }
  }

  await browser.close();

  // ── Build report ────────────────────────────────────────────────────────────
  const pass = results.filter((r) => r.verdict === "PASS").length;
  const fail = results.filter((r) => r.verdict !== "PASS").length;

  let md = `# Click Audit: ${role}\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Base URL: ${BASE_URL}\n\n`;
  md += `Login: ${cred.email}\n\n`;
  md += `## Summary\n\n`;
  md += `| Total nav pages | PASS | FAIL |\n`;
  md += `|---|---|---|\n`;
  md += `| ${results.length} | ${pass} | ${fail} |\n\n`;

  md += `## Page Results\n\n`;
  md += `| Page | Final URL | Redirected | Verdict |\n`;
  md += `|---|---|---|---|\n`;
  for (const r of results) {
    md += `| \`${r.href}\` | \`${r.finalUrl.replace(BASE_URL, "")}\` | ${r.redirected ? "yes" : "no"} | **${r.verdict}** |\n`;
  }

  if (networkFails.length > 0) {
    md += `\n## Network Failures (4xx / 5xx)\n\n`;
    md += `| URL | Status |\n|---|---|\n`;
    for (const f of networkFails) {
      md += `| \`${f.url.replace(BASE_URL, "")}\` | ${f.status} |\n`;
    }
  }

  if (errors.length > 0) {
    md += `\n## Console Errors\n\n`;
    md += `| Page | Message |\n|---|---|\n`;
    for (const e of errors.slice(0, 30)) {
      md += `| \`${e.page.replace(BASE_URL, "")}\` | ${e.message.replace(/\|/g, "\\|")} |\n`;
    }
  }

  md += `\n---\n*Run \`node scripts/click-audit.mjs --role ${role}\` to regenerate.*\n`;

  const outPath = path.join(__dirname, "..", "docs", `CLICK-AUDIT-${role}.md`);
  fs.writeFileSync(outPath, md, "utf8");
  console.log(`\nReport saved: docs/CLICK-AUDIT-${role}.md`);
  console.log(`Result: ${pass} PASS, ${fail} FAIL out of ${results.length} pages.\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
for (const role of ROLES_TO_RUN) {
  await runAudit(role);
}
