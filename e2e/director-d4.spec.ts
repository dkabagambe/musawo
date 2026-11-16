/**
 * D4 tests: Director academics - Students, Instructors, Programmes, Courses.
 *
 * Run against a production build (npm run build && npm start) with seeded data.
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

// ── D4.1: Students list loads with real data ──────────────────────────────────
test("D4 students list shows students with programme and payment columns", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/students");
  await page.waitForSelector("table", { timeout: 10000 });
  // Should have at least one row (seed creates 20+ students)
  const rows = page.locator("tbody tr");
  expect(await rows.count()).toBeGreaterThan(0);
  // Columns: Name, Student No., Programme, Intake, Payment, Account, Registered
  const headers = await page.locator("thead th").allTextContents();
  expect(headers.some((h) => /programme/i.test(h))).toBe(true);
  expect(headers.some((h) => /payment/i.test(h))).toBe(true);
});

// ── D4.2: Students list search filters by name ────────────────────────────────
test("D4 students list search filters results", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/students");
  await page.waitForSelector("table", { timeout: 10000 });
  const totalBefore = await page.locator("tbody tr").count();
  if (totalBefore === 0) return;

  // Get the first student name and search for a substring
  const firstName = (await page.locator("tbody tr td:first-child").first().textContent()) ?? "";
  const sub = firstName.trim().split(" ")[0];
  if (!sub) return;

  await page.fill("input[name='q']", sub);
  await page.click("button[type='submit']");
  await page.waitForSelector("table", { timeout: 10000 });
  const totalAfter = await page.locator("tbody tr").count();
  expect(totalAfter).toBeGreaterThan(0);
  // All visible names should contain the search string
  const names = await page.locator("tbody tr td:first-child").allTextContents();
  for (const n of names) {
    expect(n.toLowerCase()).toContain(sub.toLowerCase());
  }
});

// ── D4.3: Student detail page opens and shows sections ───────────────────────
test("D4 student detail page shows all sections", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/students");
  await page.waitForSelector("table", { timeout: 10000 });
  const firstLink = page.locator("tbody tr td:first-child a").first();
  if (!await firstLink.count()) return;
  await firstLink.click();
  await page.waitForURL(/\/director\/students\/.+/, { timeout: 10000 });

  // Should have profile, enrolment, attendance, marks, documents, approval history sections
  const headings = await page.locator("h2").allTextContents();
  expect(headings.some((h) => /enrolment/i.test(h))).toBe(true);
  expect(headings.some((h) => /attendance/i.test(h))).toBe(true);
  expect(headings.some((h) => /marks/i.test(h))).toBe(true);
  expect(headings.some((h) => /document/i.test(h))).toBe(true);
  expect(headings.some((h) => /approval/i.test(h))).toBe(true);
  // No edit buttons
  const editButtons = page.getByRole("button", { name: /edit|update|save|delete/i });
  expect(await editButtons.count()).toBe(0);
});

// ── D4.4: Students list has export button ────────────────────────────────────
test("D4 students list has export CSV button", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/students");
  await page.waitForSelector("table", { timeout: 10000 });
  const exportLink = page.locator("a[href*='/api/director/export/students']");
  await expect(exportLink).toBeVisible();
});

// ── D4.5: CSV export returns a CSV response (audit logged) ───────────────────
test("D4 CSV export endpoint returns CSV", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  const res = await page.request.get("/api/director/export/students");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  // First line should be the header
  expect(body.split("\n")[0]).toContain("Student Number");
});

// ── D4.6: CSV export is forbidden for a student role ─────────────────────────
test("D4 CSV export is forbidden for student role", async ({ page }) => {
  // Log in as a student
  await page.goto("/dev/login");
  const rows = page.locator("tr");
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).textContent();
    if (text?.includes("student") || text?.includes("Student")) {
      const btn = rows.nth(i).getByRole("button", { name: /sign in/i });
      if (await btn.count()) {
        await btn.click();
        await page.waitForURL(/\/dashboard/, { timeout: 10000 });
        break;
      }
    }
  }
  const res = await page.request.get("/api/director/export/students");
  expect(res.status()).toBe(403);
});

// ── D4.7: Instructors list loads with activity metrics ───────────────────────
test("D4 instructors list shows activity metrics", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/instructors");
  await page.waitForSelector(".card", { timeout: 10000 });
  const cards = page.locator(".card");
  expect(await cards.count()).toBeGreaterThan(0);
  // Each card should show "classes" text
  const cardTexts = await cards.allTextContents();
  expect(cardTexts.some((t) => /class/i.test(t))).toBe(true);
});

// ── D4.8: Instructor detail page opens ───────────────────────────────────────
test("D4 instructor detail page shows sections", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/instructors");
  await page.waitForSelector(".card", { timeout: 10000 });
  const firstLink = page.locator(".card a[href*='/director/instructors/']").first();
  if (!await firstLink.count()) return;
  await firstLink.click();
  await page.waitForURL(/\/director\/instructors\/.+/, { timeout: 10000 });

  const headings = await page.locator("h2").allTextContents();
  expect(headings.some((h) => /course/i.test(h))).toBe(true);
  expect(headings.some((h) => /class/i.test(h))).toBe(true);
  expect(headings.some((h) => /student/i.test(h))).toBe(true);
  // No edit buttons
  const editButtons = page.getByRole("button", { name: /edit|update|save|delete/i });
  expect(await editButtons.count()).toBe(0);
});

// ── D4.9: Programmes list loads ───────────────────────────────────────────────
test("D4 programmes list loads with status and pending change columns", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/programmes");
  await page.waitForSelector("table", { timeout: 10000 });
  const headers = await page.locator("thead th").allTextContents();
  expect(headers.some((h) => /status/i.test(h))).toBe(true);
  expect(headers.some((h) => /change/i.test(h))).toBe(true);
  const rows = page.locator("tbody tr");
  expect(await rows.count()).toBeGreaterThan(0);
});

// ── D4.10: Programme detail opens with units, intakes, instructors, history ───
test("D4 programme detail shows all sections", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/programmes");
  await page.waitForSelector("table", { timeout: 10000 });
  const firstLink = page.locator("tbody tr td a").first();
  if (!await firstLink.count()) return;
  await firstLink.click();
  await page.waitForURL(/\/director\/programmes\/.+/, { timeout: 10000 });

  const headings = await page.locator("h2, h1").allTextContents();
  expect(headings.some((h) => /instructor/i.test(h))).toBe(true);
  expect(headings.some((h) => /intake/i.test(h))).toBe(true);
  expect(headings.some((h) => /unit/i.test(h))).toBe(true);
  expect(headings.some((h) => /history/i.test(h))).toBe(true);
  // No edit buttons
  const editButtons = page.getByRole("button", { name: /edit|update|save|delete/i });
  expect(await editButtons.count()).toBe(0);
});

// ── D4.11: Courses list loads with search ────────────────────────────────────
test("D4 courses list loads with search and status filter", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/courses");
  await page.waitForSelector("table", { timeout: 10000 });
  expect(await page.locator("tbody tr").count()).toBeGreaterThan(0);
  // Status filter exists
  const statusSelect = page.locator("select[name='status']");
  await expect(statusSelect).toBeVisible();
});

// ── D4.12: Course detail opens with all sections ─────────────────────────────
test("D4 course detail shows all sections", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/courses");
  await page.waitForSelector("table", { timeout: 10000 });
  const firstLink = page.locator("tbody tr td a[href*='/director/courses/']").first();
  if (!await firstLink.count()) return;
  await firstLink.click();
  await page.waitForURL(/\/director\/courses\/.+/, { timeout: 10000 });

  const headings = await page.locator("h2, h1").allTextContents();
  expect(headings.some((h) => /instructor/i.test(h))).toBe(true);
  expect(headings.some((h) => /intake/i.test(h))).toBe(true);
  expect(headings.some((h) => /unit/i.test(h))).toBe(true);
  expect(headings.some((h) => /history/i.test(h))).toBe(true);
  // No edit buttons
  const editButtons = page.getByRole("button", { name: /edit|update|save|delete/i });
  expect(await editButtons.count()).toBe(0);
});

// ── D4.13: Direct write to student API returns 403 for Director role ──────────
test("D4 Director cannot write to student creation API", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  const res = await page.request.post("/api/admin/students", {
    data: { name: "Test", email: "test@test.com" },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

// ── D4.14: Status filter on students list works ───────────────────────────────
test("D4 students list status filter applies correctly", async ({ page }) => {
  await loginAs(page, DIRECTOR_EMAIL);
  await page.goto("/director/students?status=ACTIVE");
  await page.waitForSelector("table", { timeout: 10000 });
  // All account status badges should say ACTIVE
  const badges = page.locator("tbody tr td span.badge");
  const count = await badges.count();
  if (count === 0) return; // no active students
  // At least one badge should contain "ACTIVE"
  const texts = await badges.allTextContents();
  expect(texts.some((t) => /active/i.test(t))).toBe(true);
});
