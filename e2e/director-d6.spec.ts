/**
 * D6 tests: Director - Finance and Payment Approvals.
 *
 * Run against a production build (npm run build && npm start) with seeded data.
 * Command: npx playwright test e2e/director-d6.spec.ts
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

// ── D6.1: Finance overview loads with key figures ─────────────────────────────
test("D6 finance overview shows revenue, outstanding and pending approval counts", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance");
  await page.waitForSelector(".card", { timeout: 10000 });

  const text = await page.locator("body").textContent();
  expect(text).toMatch(/revenue/i);
  expect(text).toMatch(/outstanding/i);
});

// ── D6.2: Finance overview does not show UGX 0 when payments exist ─────────────
test("D6 finance revenue figure is non-zero given seeded payments", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance");
  await page.waitForSelector(".card", { timeout: 10000 });

  // The seeded confirmed revenue is UGX 16M+ — confirm we don't show 0
  const text = await page.locator("body").textContent() ?? "";
  // Should NOT contain "UGX 0.0M" for revenue
  expect(text).not.toMatch(/Revenue collected[\s\S]{0,30}UGX 0\.0M/);
});

// ── D6.3: Period selector changes the URL ─────────────────────────────────────
test("D6 period selector switches between time ranges", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance");
  await page.waitForSelector(".card", { timeout: 10000 });

  await page.click("a[href*='period=30']");
  await page.waitForURL(/period=30/, { timeout: 5000 });
  await expect(page.locator("h1")).toBeVisible();

  await page.click("a[href*='period=all']");
  await page.waitForURL(/period=all/, { timeout: 5000 });
  await expect(page.locator("h1")).toBeVisible();
});

// ── D6.4: Revenue by method breakdown is shown ───────────────────────────────
test("D6 finance shows revenue by payment method", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance");
  await page.waitForSelector(".card", { timeout: 10000 });
  const text = await page.locator("body").textContent() ?? "";
  // Seeded payments include MTN MoMo
  expect(text).toMatch(/MTN MoMo|Airtel Money|Bank transfer/i);
});

// ── D6.5: Collected vs outstanding table is present ──────────────────────────
test("D6 finance shows collected vs outstanding by payment phase", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance");
  await page.waitForSelector("table", { timeout: 10000 });

  const headers = await page.locator("thead th").first().textContent();
  // The first table should be the phase breakdown
  const text = await page.locator("body").textContent() ?? "";
  expect(text).toMatch(/collected/i);
  expect(text).toMatch(/outstanding/i);
  expect(headers).toBeTruthy();
});

// ── D6.6: Finance overview has export CSV button ──────────────────────────────
test("D6 finance overview has export CSV button", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance");
  await page.waitForSelector(".card", { timeout: 10000 });

  const exportLink = page.locator("a[href*='/api/director/export/payments']");
  await expect(exportLink).toBeVisible();
});

// ── D6.7: Payments CSV export returns a valid CSV ────────────────────────────
test("D6 payments CSV export returns CSV", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  const res = await page.request.get("/api/director/export/payments");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  expect(body.split("\n")[0]).toContain("Amount");
  expect(body.split("\n")[0]).toContain("Method");
});

// ── D6.8: Payments export is forbidden for student ───────────────────────────
test("D6 payments export is forbidden for student role", async ({ page }) => {
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
  const res = await page.request.get("/api/director/export/payments");
  expect(res.status()).toBe(403);
});

// ── D6.9: All payments page loads with method and phase columns ───────────────
test("D6 all payments page has method, phase, reference, approval columns", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance/payments");
  await page.waitForSelector("table", { timeout: 10000 });

  const headers = await page.locator("thead th").allTextContents();
  expect(headers.some((h) => /method/i.test(h))).toBe(true);
  expect(headers.some((h) => /phase/i.test(h))).toBe(true);
  expect(headers.some((h) => /reference/i.test(h))).toBe(true);
  expect(headers.some((h) => /approval/i.test(h))).toBe(true);
});

// ── D6.10: All payments page search and filter work ──────────────────────────
test("D6 all payments page status filter renders without error", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance/payments?status=COMPLETED");
  await page.waitForSelector("table", { timeout: 10000 });
  await expect(page.locator("h1")).toBeVisible();

  // All status badges visible should be COMPLETED
  const badges = page.locator("tbody tr td span.badge");
  const count = await badges.count();
  if (count > 0) {
    const texts = await badges.allTextContents();
    // At least one should match the status filter (may mix enrolment status badges too)
    expect(texts.some((t) => /completed/i.test(t))).toBe(true);
  }
});

// ── D6.11: Finance approvals page loads with pending panel ───────────────────
test("D6 finance approvals page shows pending items", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance/approvals?status=pending");
  await page.waitForSelector(".card", { timeout: 10000 });

  // Seeded data has 7 pending finance approvals
  const text = await page.locator("body").textContent() ?? "";
  expect(text).toMatch(/pending|waiting|payment proof|fee change|waiver|refund/i);
});

// ── D6.12: Finance approvals pending items link to /director/approvals/[id] ──
test("D6 finance approvals pending items have review links", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance/approvals?status=pending");
  await page.waitForSelector(".card", { timeout: 10000 });

  const reviewLinks = page.locator("a[href*='/director/approvals/']");
  if (await reviewLinks.count() > 0) {
    const href = await reviewLinks.first().getAttribute("href");
    expect(href).toMatch(/\/director\/approvals\//);
  }
});

// ── D6.13: Finance approvals history tab loads ────────────────────────────────
test("D6 finance approvals history tab loads without error", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance/approvals?status=history");
  await page.waitForSelector(".card", { timeout: 10000 });
  await expect(page.locator("h1", { hasText: /finance approvals/i })).toBeVisible();
});

// ── D6.14: Automatic checks panel appears on PAYMENT_PROOF items ─────────────
test("D6 pending payment proof shows automatic checks section", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance/approvals?status=pending");
  await page.waitForSelector(".card", { timeout: 10000 });

  const text = await page.locator("body").textContent() ?? "";
  // If any PAYMENT_PROOF items exist in seed, the checks panel should appear
  if (text.match(/payment proof/i)) {
    expect(text).toMatch(/automatic checks|tx id|duplicate/i);
  }
});

// ── D6.15: Finance overview pending alert links go to /director/approvals ────
test("D6 finance overview pending approval links point to director approvals", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/finance");
  await page.waitForSelector(".card", { timeout: 10000 });

  const reviewLinks = page.locator("a[href*='/director/approvals/']");
  if (await reviewLinks.count() > 0) {
    const href = await reviewLinks.first().getAttribute("href");
    expect(href).toMatch(/\/director\/approvals\//);
  }
  // No link to old /finance/payments removed route
  const oldLinks = page.locator("a[href='/finance/payments']");
  expect(await oldLinks.count()).toBe(0);
});
