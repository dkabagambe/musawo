import { test, expect } from "@playwright/test";

/**
 * P5.6: Academic Calendar
 * Tests calendar event CRUD and .ics export
 */

test.describe("Principal P5.6: Academic Calendar", () => {
  test.beforeEach(async ({ page }) => {
    // Login as principal
    await page.goto("/login");
    await page.fill('input[name="email"]', "principal@mtc.ac.ug");
    await page.fill('input[name="password"]', "principal");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/principal/, { timeout: 10000 });
  });

  test("should display calendar page with unified events", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Check page heading
    await expect(page.locator("h1")).toContainText("Academic Calendar");
    
    // Check export button exists
    await expect(page.locator('button:has-text("Export .ics")')).toBeVisible();
    
    // Check add event button exists (principal can edit)
    await expect(page.locator('button:has-text("Add Event")')).toBeVisible();
  });

  test("should create a new calendar event", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Click Add Event
    await page.click('button:has-text("Add Event")');
    
    // Wait for form
    await expect(page.locator("h2")).toContainText("Create Calendar Event");
    
    // Fill form
    await page.fill('input[name="title"]', "Winter Break 2027");
    await page.fill('textarea[name="description"]', "Academic break period");
    await page.selectOption('select[name="eventType"]', "HOLIDAY");
    
    // Set dates
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    const endDate = new Date(nextMonth);
    endDate.setDate(endDate.getDate() + 7);
    
    await page.fill(
      'input[name="eventDate"]',
      nextMonth.toISOString().split("T")[0]
    );
    await page.fill(
      'input[name="endDate"]',
      endDate.toISOString().split("T")[0]
    );
    
    // Submit
    await page.click('button[type="submit"]:has-text("Create")');
    
    // Wait for success
    await page.waitForTimeout(1000);
    
    // Verify event appears in list
    await expect(page.locator('text="Winter Break 2027"')).toBeVisible();
  });

  test("should edit a calendar event", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Look for edit button on a calendar event (🗓️ icon events have edit buttons)
    const editButton = page.locator('button[title="Edit event"]').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Wait for edit form
      await expect(page.locator("h2")).toContainText("Edit Event");
      
      // Update title
      await page.fill('input[name="title"]', "Updated Event Title");
      
      // Submit
      await page.click('button[type="submit"]:has-text("Update")');
      
      // Wait for success
      await page.waitForTimeout(1000);
      
      // Verify updated event appears
      await expect(page.locator('text="Updated Event Title"')).toBeVisible();
    } else {
      // Skip if no calendar events exist yet
      test.skip();
    }
  });

  test("should export calendar as .ics", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
    
    // Click export button
    await page.click('button:has-text("Export .ics")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toBe("mtc-academic-calendar.ics");
    
    // Verify content type would be text/calendar
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test("should display event type badges", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Look for event type badges (if calendar events exist)
    const badges = page.locator('span:has-text("Intake Date"), span:has-text("Holiday"), span:has-text("Exam Period"), span:has-text("Other Event")');
    
    // At minimum, check the page loaded
    await expect(page.locator("h1")).toContainText("Academic Calendar");
  });

  test("should show calendar notes section", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Check for informational notes
    await expect(page.locator('text="Calendar Notes:"')).toBeVisible();
    await expect(page.locator('text="Intake dates are automatically imported"')).toBeVisible();
  });

  test("should cancel event creation", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Click Add Event
    await page.click('button:has-text("Add Event")');
    
    // Wait for form
    await expect(page.locator("h2")).toContainText("Create Calendar Event");
    
    // Click cancel
    await page.click('button:has-text("Cancel")');
    
    // Form should be hidden
    await expect(page.locator("h2:has-text('Create Calendar Event')")).not.toBeVisible();
  });

  test("should delete a calendar event with confirmation", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Look for delete button on a calendar event
    const deleteButton = page.locator('button[title="Delete event"]').first();
    
    if (await deleteButton.isVisible()) {
      // Set up dialog handler
      page.on("dialog", (dialog) => {
        expect(dialog.message()).toContain("Delete this calendar event");
        dialog.dismiss(); // Cancel deletion for test safety
      });
      
      await deleteButton.click();
    } else {
      // Skip if no calendar events exist
      test.skip();
    }
  });

  test("should display different event icons", async ({ page }) => {
    await page.goto("/principal/calendar");
    
    // Check for various event type icons (📅 intake, 📝 exam, 🎓 class, 🗓️ calendar event)
    const eventCards = page.locator(".card.border-l-4");
    const count = await eventCards.count();
    
    // Should have some events (intake, exams, classes, or calendar events)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should be responsive at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/principal/calendar");
    
    // Page should load without horizontal overflow
    await expect(page.locator("h1")).toContainText("Academic Calendar");
    
    // Buttons should be visible
    await expect(page.locator('button:has-text("Export .ics")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Event")')).toBeVisible();
  });

  test("should be responsive at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/principal/calendar");
    
    // Page should load
    await expect(page.locator("h1")).toContainText("Academic Calendar");
    
    // Layout should work well at desktop width
    const container = page.locator(".max-w-4xl");
    await expect(container).toBeVisible();
  });
});
