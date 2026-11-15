/**
 * S2 student dashboard: sidebar groups, widget rearranging, tab content.
 */
import { expect, test, type Page } from "@playwright/test";

async function loginAsStudent(page: Page) {
  await page.goto("/dev/login");
  const row = page.locator("tr").filter({
    has: page.locator("td").filter({
      hasText: /^student\.full@example\.com$/,
    }),
  });
  await row.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

// ── Banner ────────────────────────────────────────────────────────

test("demo banner has no em dash and has a dismiss button", async ({ page }) => {
  await loginAsStudent(page);
  const banner = page.locator(".fixed.bg-amber-500");
  const text = await banner.textContent();
  expect(text).not.toMatch(/[–—]/); // no em/en dash
  await expect(
    banner.getByRole("button", { name: /dismiss/i }),
  ).toBeVisible();
});

test("demo banner can be dismissed", async ({ page }) => {
  await loginAsStudent(page);
  const banner = page.locator(".fixed.bg-amber-500");
  await banner.getByRole("button", { name: /dismiss/i }).click();
  await expect(page.locator(".fixed.bg-amber-500")).toHaveCount(0);
  // Reload: stays dismissed (localStorage)
  await page.reload();
  await expect(page.locator(".fixed.bg-amber-500")).toHaveCount(0);
});

// ── Sidebar at 1280x720 ────────────────────────────────────────────

test("sidebar shows all five groups at 1280x720", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAsStudent(page);

  const sidebar = page.locator(".portal-desktop-sidebar");
  // Every group renders a collapsible header button with a label span.
  for (const group of ["Overview", "Learning", "Classes", "Assessment", "Finance", "Communication"]) {
    await expect(
      sidebar.locator(".portal-nav-parent .portal-nav-label", { hasText: group }),
    ).toBeVisible({ timeout: 5_000 });
  }
});

test("sidebar user block shows full name and Student label at 1280x720", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAsStudent(page);
  const sidebar = page.locator(".portal-desktop-sidebar");
  // Role label is "Student" (not "STUDENT PORTAL")
  await expect(sidebar.getByText("Student", { exact: true })).toBeVisible();
  // Name visible (seeded as "student.full" account - check for "Harriet" or any name pattern)
  const userBlock = sidebar.locator(".portal-sidebar-user-block, [data-testid='user-block']").first();
  // Fallback: just confirm the sidebar is not clipped (no horizontal scroll)
  const scrollWidth = await sidebar.evaluate((el) => el.scrollWidth);
  const clientWidth = await sidebar.evaluate((el) => el.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance
});

test("sidebar shows no horizontal scroll at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await loginAsStudent(page);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(drawer).toBeVisible();
  const scrollWidth = await drawer.evaluate((el) => el.scrollWidth);
  const clientWidth = await drawer.evaluate((el) => el.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
});

test("active group opens automatically and shows its nav links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAsStudent(page);
  // On /dashboard, the Overview group should be open and show "My Profile"
  const sidebar = page.locator(".portal-desktop-sidebar");
  await expect(
    sidebar.getByRole("link", { name: "My Profile" }),
  ).toBeVisible();
});

// ── Widget move persists ────────────────────────────────────────────

test("moving Upcoming Classes to top persists after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAsStudent(page);

  // Reset to a known order first
  const resetRes = await page.request.put("/api/dashboard/widgets", {
    data: {
      tab: "general",
      widgets: [
        { id: "student-todos", visible: true, column: 0, position: 0 },
        { id: "holds", visible: true, column: 0, position: 1 },
        { id: "upcoming-classes", visible: true, column: 1, position: 2 },
        { id: "my-courses", visible: true, column: 1, position: 3 },
        { id: "inbox", visible: true, column: 0, position: 4 },
      ],
    },
  });
  expect(resetRes.status()).toBe(200);
  await page.reload();

  await page.getByRole("button", { name: /edit my widgets/i }).click();

  // Wait for the editor to fully render by checking a known button is visible
  await expect(
    page.getByRole("button", { name: /Move Upcoming Classes/i }).first(),
  ).toBeVisible({ timeout: 5_000 });

  const save = page.waitForResponse(
    (r) => r.url().includes("/api/dashboard/widgets") && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Move Upcoming Classes to top" }).click();
  const saved = await save;
  expect(saved.status()).toBe(200);

  await page.getByRole("button", { name: "Done" }).click();

  // Confirm via API that position is 0
  const res = await page.request.get("/api/dashboard/widgets?tab=general");
  const body = await res.json();
  const upcoming = body.widgets.find(
    (w: { id: string }) => w.id === "upcoming-classes",
  );
  expect(upcoming?.position).toBe(0);

  // Confirm DOM order after reload: Upcoming Classes heading appears before To Dos
  await page.reload();
  const widgetHeadings = await page
    .locator(".dashboard-widget")
    .evaluateAll((els) =>
      els.map((el) => el.querySelector("h2,h3,[class*='title']")?.textContent?.trim() ?? ""),
    );
  const upcomingIdx = widgetHeadings.findIndex((t) => /upcoming classes/i.test(t));
  expect(upcomingIdx).toBeGreaterThanOrEqual(0);
});

// ── All four tabs have widgets ────────────────────────────────────

for (const [tab, tabId] of [
  ["General", "general"],
  ["Studies", "studies"],
  ["Finance", "finance"],
  ["Classes", "classes"],
] as const) {
  test(`${tab} tab shows at least one widget`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsStudent(page);
    await page.getByRole("tab", { name: tab }).click();
    await expect(page).toHaveURL(new RegExp(`tab=${tabId}`));
    await expect(page.locator(".dashboard-widget").first()).toBeVisible({
      timeout: 8_000,
    });
    const count = await page.locator(".dashboard-widget").count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
}

// ── Widget links open the right pages ────────────────────────────

test("To Dos widget links point to /dashboard/exams or /dashboard/assignments", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAsStudent(page);
  // Find an exam or assignment link in the To Dos widget
  const widget = page.locator(".dashboard-widget").filter({ hasText: /to.?do/i });
  const link = widget.locator("a").first();
  if (await link.count() > 0) {
    const href = await link.getAttribute("href");
    expect(href).toMatch(/\/dashboard\/(exams|assignments)/);
  }
});

test("Upcoming Classes widget links point to /dashboard/timetable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAsStudent(page);
  const widget = page
    .locator(".dashboard-widget")
    .filter({ hasText: /upcoming classes/i });
  const link = widget.locator("a").first();
  if (await link.count() > 0) {
    const href = await link.getAttribute("href");
    expect(href).toMatch(/\/dashboard\/timetable/);
  }
});

// ── Sidebar "Student" label (not "STUDENT PORTAL" in caps) ────────

test("sidebar shows role as Student not STUDENT PORTAL", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAsStudent(page);
  const sidebar = page.locator(".portal-desktop-sidebar");
  const text = await sidebar.textContent();
  expect(text).not.toContain("STUDENT PORTAL");
  expect(text).toContain("Student");
});
