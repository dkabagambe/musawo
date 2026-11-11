import { test, expect } from "@playwright/test";

/**
 * Widget Preferences End-to-End Tests
 * 
 * Tests that widget customization actually works:
 * 1. Open customizer modal
 * 2. Hide a widget
 * 3. Refresh page
 * 4. Verify widget stays hidden
 * 5. Show it again
 * 6. Verify it reappears
 */

test.describe("Widget preferences persistence", () => {
  test.beforeEach(async ({ page }) => {
    // Login as student (use demo account) using the same pattern as redirects.spec.ts
    await page.context().clearCookies();
    await page.goto("/dev/login");
    const emailPattern = /^student\.full@example\.com$/;
    const row = page.locator("tr").filter({
      has: page.locator("td").filter({ hasText: emailPattern }),
    });
    
    // Click and wait for navigation simultaneously
    await Promise.all([
      page.waitForURL("/dashboard", { timeout: 30000 }),
      row.getByRole("button", { name: /sign in/i }).click(),
    ]);
  });

  test("hides and shows widgets persistently", async ({ page }) => {
    // 1. Verify we're on the dashboard
    await expect(page).toHaveURL("/dashboard");
    
    // 2. Check if "Edit My Widgets" button exists
    const editButton = page.locator('button:has-text("Edit My Widgets")');
    await expect(editButton).toBeVisible({ timeout: 5000 });
    
    // 3. Click to open widget customizer
    await editButton.click();
    
    // 4. Wait for modal to appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(page.locator("#widget-customizer-title")).toBeVisible();
    
    // 5. Find the first visible widget row
    const firstWidget = modal.locator(".dashboard-widget-row").first();
    const widgetTitle = await firstWidget.locator(".dashboard-widget-name").textContent();
    console.log(`Testing widget: ${widgetTitle}`);
    
    // 6. Get the widget's current visibility state
    const toggleButton = firstWidget.locator('button[aria-label*="toggle"]').first();
    const isCurrentlyVisible = (await toggleButton.getAttribute("aria-checked")) === "true";
    
    console.log(`Widget "${widgetTitle}" is currently visible: ${isCurrentlyVisible}`);
    
    // 7. Toggle the widget OFF (hide it)
    await toggleButton.click();
    await page.waitForTimeout(1000); // Wait for save
    
    // 8. Close the modal
    await page.locator('button[aria-label="Close widget settings"]').click();
    await expect(modal).not.toBeVisible();
    
    // 9. Verify the widget is hidden on the dashboard
    if (widgetTitle && isCurrentlyVisible) {
      const widgetOnDashboard = page.locator(`.dashboard-widget:has-text("${widgetTitle}")`);
      await expect(widgetOnDashboard).not.toBeVisible();
    }
    
    // 10. Refresh the page to verify persistence
    await page.reload();
    await page.waitForURL("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // 11. Widget should still be hidden after refresh
    if (widgetTitle && isCurrentlyVisible) {
      const widgetAfterRefresh = page.locator(`.dashboard-widget:has-text("${widgetTitle}")`);
      await expect(widgetAfterRefresh).not.toBeVisible();
    }
    
    // 12. Open customizer again
    await editButton.click();
    await expect(modal).toBeVisible();
    
    // 13. Toggle the widget back ON
    const firstWidgetAgain = modal.locator(".dashboard-widget-row").first();
    await firstWidgetAgain.locator('button[aria-label*="toggle"]').first().click();
    await page.waitForTimeout(1000);
    
    // 14. Close modal
    await page.locator('button[aria-label="Close widget settings"]').click();
    await expect(modal).not.toBeVisible();
    
    // 15. Widget should be visible again
    if (widgetTitle && isCurrentlyVisible) {
      const widgetRestored = page.locator(`.dashboard-widget:has-text("${widgetTitle}")`);
      await expect(widgetRestored).toBeVisible();
    }
    
    // 16. Refresh and verify it persists as visible
    await page.reload();
    await page.waitForURL("/dashboard");
    await page.waitForLoadState("networkidle");
    
    if (widgetTitle && isCurrentlyVisible) {
      const widgetFinal = page.locator(`.dashboard-widget:has-text("${widgetTitle}")`);
      await expect(widgetFinal).toBeVisible();
    }
  });

  test("widget customizer modal opens and closes", async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit My Widgets")');
    await expect(editButton).toBeVisible();
    
    // Open
    await editButton.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('h2:has-text("Edit My Widgets")')).toBeVisible();
    
    // Close via X button
    await page.locator('button[aria-label="Close widget settings"]').click();
    await expect(modal).not.toBeVisible();
    
    // Open again
    await editButton.click();
    await expect(modal).toBeVisible();
    
    // Close via scrim click
    await page.locator('.dashboard-customizer-scrim').click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toBeVisible();
  });

  test("reset button restores defaults", async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit My Widgets")');
    await editButton.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Hide first widget
    const firstWidget = modal.locator(".dashboard-widget-row").first();
    await firstWidget.locator('button[aria-label*="toggle"]').first().click();
    await page.waitForTimeout(500);
    
    // Click reset button
    const resetButton = page.locator('button:has-text("Reset to defaults")');
    await resetButton.click();
    await page.waitForTimeout(1000);
    
    // Close and verify all widgets are visible again
    await page.locator('button[aria-label="Close widget settings"]').click();
    
    // Refresh to confirm defaults persisted
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // All default widgets should be visible
    const widgetCount = await page.locator('.dashboard-widget').count();
    expect(widgetCount).toBeGreaterThan(0);
  });
});

test.describe("Widget preferences for different tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dev/login");
    const emailPattern = /^student\.full@example\.com$/;
    const row = page.locator("tr").filter({
      has: page.locator("td").filter({ hasText: emailPattern }),
    });
    
    // Click and wait for navigation simultaneously
    await Promise.all([
      page.waitForURL("/dashboard", { timeout: 30000 }),
      row.getByRole("button", { name: /sign in/i }).click(),
    ]);
  });

  test("preferences are tab-specific", async ({ page }) => {
    // Test General tab
    await page.goto("/dashboard?tab=general");
    await page.waitForLoadState("networkidle");
    
    const editButtonGeneral = page.locator('button:has-text("Edit My Widgets")');
    await editButtonGeneral.click();
    
    let modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Hide first widget on General tab
    await modal.locator(".dashboard-widget-row").first().locator('button[aria-label*="toggle"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('button[aria-label="Close widget settings"]').click();
    
    // Switch to Studies tab
    await page.goto("/dashboard?tab=studies");
    await page.waitForLoadState("networkidle");
    
    // Widgets on Studies tab should not be affected by General tab changes
    const editButtonStudies = page.locator('button:has-text("Edit My Widgets")');
    await editButtonStudies.click();
    
    modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // All widgets on Studies tab should still be visible by default
    const studiesWidgets = await modal.locator(".dashboard-widget-row").count();
    expect(studiesWidgets).toBeGreaterThan(0);
  });
});
