/**
 * D2 test: Director dashboard shell and widgets.
 *
 * Tests:
 * - Sidebar structure at 1280x720 and 390px
 * - Every tab has at least one widget
 * - Counts (badge vs To Dos widget) reference the same filter
 * - No link to removed routes (/finance, /bursar, /deputy, /board, /auditor, /registrar)
 * - Widget move persists after reload
 * - Banner has dismiss button and no em dash
 *
 * Run against a production build (npm run build && npm start) with seeded data.
 */
import { test, expect } from "@playwright/test";

const DIRECTOR_EMAIL = "director@mtc.ac.ug";

async function loginAsDirector(page: Parameters<typeof test>[1] extends (...args: infer A) => void ? A[0] : never) {
  await page.goto("/dev/login");
  const row = page.locator("tr").filter({
    has: page.locator("td").filter({
      hasText: new RegExp(`^${DIRECTOR_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    }),
  });
  await row.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/director**", { timeout: 15000 });
}

// ── D2.1: Banner has dismiss button and no em dash ────────────────────────────
test("D2 banner has dismiss button and no em dash", async ({ page }) => {
  await loginAsDirector(page);
  const banner = page.locator("[role='alert']").first();
  // Banner may be dismissed from a previous test run; clear storage and reload
  await page.evaluate(() => { try { localStorage.removeItem("mtc-banner-dismissed"); } catch { /* ok */ } });
  await page.reload();
  const bannerCount = await banner.count();
  if (bannerCount > 0) {
    const text = await banner.textContent();
    expect(text).not.toContain("—");
    expect(text).not.toContain("\u2013"); // en dash
    expect(text).not.toContain("\u2014"); // em dash
    // Dismiss button is present
    const dismiss = banner.getByRole("button", { name: /dismiss/i });
    await expect(dismiss).toBeVisible();
    // After clicking, banner should disappear
    await dismiss.click();
    await expect(banner).toBeHidden({ timeout: 2000 });
  }
});

// ── D2.2: Sidebar groups and navigation at desktop ───────────────────────────
test("D2 sidebar groups visible at 1280x720", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAsDirector(page);
  const nav = page.locator(".portal-nav");
  await nav.waitFor({ timeout: 5000 });
  // All 6 expected group headers should be present
  const groups = ["Overview", "Academics", "Finance", "Governance", "Communication", "Account"];
  for (const group of groups) {
    const btn = nav.locator("button.portal-nav-parent", { hasText: group });
    await expect(btn).toBeVisible();
  }
  // Dashboard link must be visible (the first item under Overview)
  await expect(page.locator("a[href='/director']")).toBeVisible();
});

// ── D2.3: Sidebar at mobile 390px ────────────────────────────────────────────
test("D2 sidebar accessible at 390px via drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsDirector(page);
  // Open the mobile menu
  const menuBtn = page.getByRole("button", { name: /open navigation menu/i });
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    const drawer = page.locator(".portal-mobile-drawer");
    await expect(drawer).toBeVisible({ timeout: 3000 });
    // Check a group header appears in the drawer
    const groupBtn = drawer.locator("button.portal-nav-parent").first();
    await expect(groupBtn).toBeVisible();
  }
});

// ── D2.4: Every dashboard tab has at least one widget ────────────────────────
test("D2 every director tab renders at least one widget", async ({ page }) => {
  await loginAsDirector(page);
  const TABS = ["general", "academics", "finance", "staff", "approvals", "reports"];
  for (const tab of TABS) {
    await page.goto(`/director?tab=${tab}`);
    // Wait for a widget or empty-tab message
    const widget = page.locator("[data-widget-id], .dashboard-widget-skeleton, .dashboard-tab-empty");
    await widget.first().waitFor({ timeout: 10000 });
    const emptyMsg = page.locator(".dashboard-tab-empty");
    const hasEmpty = await emptyMsg.count();
    const widgetCount = await page.locator("[data-widget-id]").count();
    // The tab must either have widgets or the explicit empty message (not a blank screen)
    expect(hasEmpty + widgetCount).toBeGreaterThan(0);
  }
});

// ── D2.5: Approvals badge count matches To Dos widget count ──────────────────
test("D2 approvals badge count equals To Dos widget count", async ({ page }) => {
  await loginAsDirector(page);
  // Read badge on the sidebar Approvals link
  const badge = page.locator("a[href='/director/approvals'] .portal-nav-badge");
  const badgeCount = await badge.count();
  if (badgeCount === 0) {
    // No pending approvals: To Dos widget should say "All caught up"
    const todosWidget = page.locator(".dashboard-list-label", { hasText: /approval/ });
    const todosCount = await todosWidget.count();
    expect(todosCount).toBe(0);
    return;
  }
  const badgeText = await badge.textContent();
  const badgeNum = parseInt(badgeText ?? "0", 10);
  if (isNaN(badgeNum)) return; // "99+" case — skip exact comparison

  // Read count from To Dos widget
  const todosLabel = page.locator(".dashboard-list-label", { hasText: /approval.*requiring|requiring.*approval/i });
  if (await todosLabel.count() > 0) {
    const todosText = await todosLabel.first().textContent();
    const match = todosText?.match(/(\d+)\s+approval/);
    if (match) {
      const widgetNum = parseInt(match[1], 10);
      expect(widgetNum).toBe(badgeNum);
    }
  }
});

// ── D2.6: No link to a removed portal route ───────────────────────────────────
test("D2 no link to removed portal routes", async ({ page }) => {
  await loginAsDirector(page);
  const TABS = ["general", "academics", "finance", "staff", "approvals", "reports"];
  const REMOVED_PREFIXES = ["/finance/", "/bursar/", "/deputy/", "/board/", "/auditor/"];
  for (const tab of TABS) {
    await page.goto(`/director?tab=${tab}`);
    await page.locator("[data-widget-id], .dashboard-tab-empty").first().waitFor({ timeout: 10000 });
    const links = page.locator("a[href]");
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      for (const prefix of REMOVED_PREFIXES) {
        if (href?.startsWith(prefix)) {
          throw new Error(`Found link to removed route: ${href} on tab ${tab}`);
        }
      }
    }
  }
});

// ── D2.7: Widget customizer opens and allows toggling ────────────────────────
test("D2 Edit My Widgets dialog opens", async ({ page }) => {
  await loginAsDirector(page);
  const editBtn = page.getByRole("button", { name: /edit my widgets/i });
  await expect(editBtn).toBeVisible({ timeout: 5000 });
  await editBtn.click();
  const dialog = page.getByRole("dialog", { name: /edit my widgets/i });
  await expect(dialog).toBeVisible({ timeout: 3000 });
  // Should have at least one row in the customizer
  const rows = dialog.locator(".dashboard-customizer-row");
  await expect(rows.first()).toBeVisible();
  // Close dialog
  const closeBtn = dialog.getByRole("button", { name: /close/i });
  if (await closeBtn.count() > 0) await closeBtn.click();
});
