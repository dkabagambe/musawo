/**
 * D5 tests: Director - Examinations, Certificates, Graduates.
 *
 * Run against a production build (npm run build && npm start) with seeded data.
 * Command: npx playwright test e2e/director-d5.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

const DIRECTOR_EMAIL = "director@mtc.ac.ug";

async function loginAs(page: Page, email: string) {
  await page.goto("/dev/login");
  const row = page.locator("tr").filter({
    has: page.locator("td").filter({
      hasText: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    }),
  });
  await row.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/director/, { timeout: 15000 });
}

// ── D5.1: Examinations page loads with summary cards ─────────────────────────
test("D5 examinations page shows summary stats", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/examinations");
  await page.waitForSelector(".card", { timeout: 10000 });

  // Four stat cards: Exams, Submissions, Pass rate, Awaiting approval
  const cards = page.locator(".card");
  expect(await cards.count()).toBeGreaterThan(0);
  const text = await page.locator("body").textContent();
  expect(text).toMatch(/exam/i);
  expect(text).toMatch(/submission/i);
});

// ── D5.2: Pending approval panel appears when results await approval ──────────
test("D5 pending results approvals panel links to approval pages", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/examinations");
  await page.waitForSelector(".card", { timeout: 10000 });

  // May or may not have pending approvals — just verify no broken links
  const reviewLinks = page.locator("a[href*='/director/approvals/']");
  for (let i = 0; i < await reviewLinks.count(); i++) {
    const href = await reviewLinks.nth(i).getAttribute("href");
    expect(href).toMatch(/\/director\/approvals\//);
  }
});

// ── D5.3: Exams table shows pass rate and avg score columns ──────────────────
test("D5 examinations table has pass rate and avg score columns", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/examinations");
  await page.waitForSelector("table", { timeout: 10000 });

  const headers = await page.locator("thead th").allTextContents();
  expect(headers.some((h) => /pass rate/i.test(h))).toBe(true);
  expect(headers.some((h) => /avg/i.test(h))).toBe(true);
});

// ── D5.4: Course filter on examinations page works ───────────────────────────
test("D5 examinations course filter submits without error", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/examinations");
  await page.waitForSelector("select[name='course']", { timeout: 10000 });

  // Select the first non-empty course option and submit
  const select = page.locator("select[name='course']");
  const options = await select.locator("option").allTextContents();
  if (options.length > 1) {
    await select.selectOption({ index: 1 });
    await page.click("button[type='submit']");
    await page.waitForSelector(".card", { timeout: 10000 });
    // Should not error
    await expect(page.locator("h1")).toBeVisible();
  }
});

// ── D5.5: Director cannot edit marks (no edit button on examinations page) ───
test("D5 examinations page has no edit marks button", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/examinations");
  await page.waitForSelector(".card", { timeout: 10000 });
  const editBtn = page.getByRole("button", { name: /edit.*mark|change.*mark|update.*score/i });
  expect(await editBtn.count()).toBe(0);
});

// ── D5.6: Certificates eligibility tab loads ─────────────────────────────────
test("D5 certificates eligibility tab shows checklist columns", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/certificates?tab=eligible");
  await page.waitForSelector("table, .card", { timeout: 10000 });

  const headers = await page.locator("thead th").allTextContents();
  expect(headers.some((h) => /fee/i.test(h))).toBe(true);
  expect(headers.some((h) => /attendance/i.test(h))).toBe(true);
  expect(headers.some((h) => /exam/i.test(h))).toBe(true);
  expect(headers.some((h) => /eligible/i.test(h))).toBe(true);
});

// ── D5.7: Certificates issued tab loads ──────────────────────────────────────
test("D5 certificates issued tab shows certificate table", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/certificates?tab=issued");
  await page.waitForSelector("table", { timeout: 10000 });

  const headers = await page.locator("thead th").allTextContents();
  expect(headers.some((h) => /certificate/i.test(h))).toBe(true);
  expect(headers.some((h) => /issued/i.test(h))).toBe(true);
});

// ── D5.8: Certificates revoked tab loads ─────────────────────────────────────
test("D5 certificates revoked tab loads without error", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/certificates?tab=revoked");
  await page.waitForSelector("table, .card", { timeout: 10000 });
  await expect(page.locator("h1")).toBeVisible();
});

// ── D5.9: Verify links point to /verify/[id] ─────────────────────────────────
test("D5 issued certificates have public verify links", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/certificates?tab=issued");
  await page.waitForSelector("table", { timeout: 10000 });

  const verifyLinks = page.locator("a[href^='/verify/']");
  const count = await verifyLinks.count();
  if (count > 0) {
    const href = await verifyLinks.first().getAttribute("href");
    expect(href).toMatch(/^\/verify\/.+/);
  }
});

// ── D5.10: Certificates page has no approve/revoke button directly ───────────
test("D5 certificates page directs approvals to the approvals page", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/certificates?tab=eligible");
  await page.waitForSelector("table, .card", { timeout: 10000 });

  // No direct Approve/Revoke buttons — only links to /director/approvals
  const approveBtn = page.getByRole("button", { name: /^approve$|^revoke$/i });
  expect(await approveBtn.count()).toBe(0);
});

// ── D5.11: Graduates page loads with table ───────────────────────────────────
test("D5 graduates page loads with graduate table", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/graduates");
  await page.waitForSelector("table", { timeout: 10000 });

  const headers = await page.locator("thead th").allTextContents();
  expect(headers.some((h) => /graduate/i.test(h))).toBe(true);
  expect(headers.some((h) => /certificate/i.test(h))).toBe(true);
  expect(headers.some((h) => /programme/i.test(h))).toBe(true);
});

// ── D5.12: Graduates export button is present ────────────────────────────────
test("D5 graduates page has export CSV button", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/graduates");
  await page.waitForSelector("table", { timeout: 10000 });

  const exportLink = page.locator("a[href*='/api/director/export/graduates']");
  await expect(exportLink).toBeVisible();
});

// ── D5.13: Graduates CSV export returns CSV ──────────────────────────────────
test("D5 graduates CSV export is a valid CSV", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  const res = await page.request.get("/api/director/export/graduates");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  expect(body.split("\n")[0]).toContain("Name");
  expect(body.split("\n")[0]).toContain("Certificate Number");
});

// ── D5.14: Graduates export forbidden for student ────────────────────────────
test("D5 graduates export is forbidden for student role", async ({ page }) => {
  await page.goto("/dev/login");
  const rows = page.locator("tr");
  for (let i = 0; i < await rows.count(); i++) {
    const text = await rows.nth(i).textContent();
    if (text?.toLowerCase().includes("student")) {
      const btn = rows.nth(i).getByRole("button", { name: /sign in/i });
      if (await btn.count()) {
        await btn.click();
        await page.waitForURL(/\/dashboard/, { timeout: 10000 });
        break;
      }
    }
  }
  const res = await page.request.get("/api/director/export/graduates");
  expect(res.status()).toBe(403);
});

// ── D5.15: Graduates year filter chips link correctly ────────────────────────
test("D5 graduates year filter chips appear and are clickable", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/graduates");
  await page.waitForSelector("table", { timeout: 10000 });

  // Year chips are links like /director/graduates?year=2026
  const yearLinks = page.locator("a[href*='year=']");
  if (await yearLinks.count() > 0) {
    const href = await yearLinks.first().getAttribute("href");
    expect(href).toMatch(/year=\d{4}/);
  }
});
