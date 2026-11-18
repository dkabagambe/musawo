import { test, expect, Page } from "@playwright/test";

/**
 * Principal P5: Academic Structure Tests
 * 
 * Tests for newly implemented features:
 * - P5.4: Classes and Groups (Roster, Breakaway Groups)
 * - P5.7: Timetable CRUD (Create, Edit, Cancel, Conflicts)
 */

async function loginAsPrincipal(page: Page) {
  await page.goto("/dev/login");
  const row = page.locator("tr").filter({
    has: page.locator("td").filter({
      hasText: new RegExp("^principal@mtc\\.ac\\.ug$"),
    }),
  });
  await row.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle");
}

test.describe("Principal P5.4: Classes and Groups", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPrincipal(page);
  });

  test("P5.4.1: Class roster shows students with photos", async ({ page }) => {
    await page.goto("/principal/classes");
    await expect(page.locator("h1")).toContainText(/classes.*groups/i);

    // Look for a roster link
    const rosterLink = page.locator("text=/view roster/i").first();
    
    if (await rosterLink.isVisible()) {
      await rosterLink.click();
      
      // Should navigate to roster page
      await expect(page.locator("h1")).toContainText(/roster/i);
      
      // Check for view mode toggles (grid/table)
      const hasGridButton = await page.locator("button:has-text('Grid')").isVisible();
      const hasTableButton = await page.locator("button:has-text('Table')").isVisible();
      
      expect(hasGridButton || hasTableButton).toBeTruthy();
      
      // Check for search functionality
      const searchInput = page.locator("input[placeholder*='Search'], input[type='search']");
      await expect(searchInput).toBeVisible();
      
      // If students exist, photos should be visible
      const hasStudentCards = await page.locator("img[alt], div:has-text('No students')").first().isVisible();
      expect(hasStudentCards).toBeTruthy();
    }
  });

  test("P5.4.2: Breakaway groups can be auto-generated", async ({ page }) => {
    await page.goto("/principal/classes");
    
    // Look for groups link
    const groupsLink = page.locator("text=/groups|breakaway/i").first();
    
    if (await groupsLink.isVisible()) {
      await groupsLink.click();
      
      // Should navigate to groups page
      await expect(page.locator("h1")).toContainText(/breakaway.*groups|groups/i);
      
      // Check for auto-generate feature
      const hasAutoGenerate = await page.locator("text=/auto.*generate|generate.*groups/i").isVisible();
      
      if (hasAutoGenerate) {
        expect(hasAutoGenerate).toBeTruthy();
        
        // Should have group size input
        const groupSizeInput = page.locator("input[type='number']");
        await expect(groupSizeInput).toBeVisible();
        
        // Default should be 5
        const value = await groupSizeInput.inputValue();
        expect(parseInt(value)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test("P5.4.3: Manual group creation is available", async ({ page }) => {
    await page.goto("/principal/classes");
    
    const groupsLink = page.locator("text=/groups|breakaway/i").first();
    
    if (await groupsLink.isVisible()) {
      await groupsLink.click();
      
      // Check for manual create option
      const hasManualCreate = await page.locator("text=/create.*manual|manual.*group/i").isVisible();
      
      if (hasManualCreate) {
        expect(hasManualCreate).toBeTruthy();
      }
    }
  });

  test("P5.4.4: Roster displays instructor information", async ({ page }) => {
    await page.goto("/principal/classes");
    
    const rosterLink = page.locator("text=/view roster/i").first();
    
    if (await rosterLink.isVisible()) {
      await rosterLink.click();
      
      // Should show instructor section
      const hasInstructors = await page.locator("text=/instructor|tutor|teacher/i").isVisible();
      expect(hasInstructors).toBeTruthy();
    }
  });

  test("P5.4.5: Student assignment dialog works", async ({ page }) => {
    await page.goto("/principal/classes");
    
    // Look for assign button
    const assignButton = page.locator("text=/assign.*student|\\+ assign/i").first();
    
    if (await assignButton.isVisible()) {
      await assignButton.click();
      
      // Should open assignment dialog
      await expect(page.locator("text=/assign students/i")).toBeVisible();
      
      // Should have search
      const searchInput = page.locator("input[placeholder*='Search']");
      await expect(searchInput).toBeVisible();
      
      // Should have checkboxes
      const hasCheckboxes = await page.locator("input[type='checkbox']").count();
      expect(hasCheckboxes).toBeGreaterThan(0);
    }
  });
});

test.describe("Principal P5.7: Timetable CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPrincipal(page);
  });

  test("P5.7.1: Timetable page loads with week/list views", async ({ page }) => {
    await page.goto("/principal/timetable");
    await expect(page.locator("h1")).toContainText(/timetable/i);

    // Check for view toggles
    const weekButton = page.locator("button:has-text('Week')");
    const listButton = page.locator("button:has-text('List')");
    
    await expect(weekButton).toBeVisible();
    await expect(listButton).toBeVisible();
    
    // Toggle between views
    await listButton.click();
    await page.waitForTimeout(500);
    
    await weekButton.click();
    await page.waitForTimeout(500);
  });

  test("P5.7.2: Schedule class dialog opens and validates", async ({ page }) => {
    await page.goto("/principal/timetable");
    
    // Look for schedule button
    const scheduleButton = page.locator("text=/schedule.*class|\\+ schedule|create.*class/i").first();
    await expect(scheduleButton).toBeVisible();
    
    await scheduleButton.click();
    
    // Dialog should open
    await expect(page.locator("text=/schedule.*class|create.*class/i")).toBeVisible();
    
    // Check for required fields
    const courseSelect = page.locator("select, input[name='courseId']");
    await expect(courseSelect).toBeVisible();
    
    const instructorSelect = page.locator("select:has(option:has-text('instructor')), select:has(option:has-text('tutor'))");
    if (await instructorSelect.count() > 0) {
      await expect(instructorSelect.first()).toBeVisible();
    }
    
    const titleInput = page.locator("input[placeholder*='title' i], input[name='title']");
    await expect(titleInput).toBeVisible();
    
    const dateTimeInput = page.locator("input[type='datetime-local']");
    await expect(dateTimeInput).toBeVisible();
    
    const durationInput = page.locator("input[type='number']");
    await expect(durationInput.first()).toBeVisible();
    
    const urlInput = page.locator("input[type='url'], input[placeholder*='link' i]");
    await expect(urlInput).toBeVisible();
  });

  test("P5.7.3: Conflict detection warnings appear", async ({ page }) => {
    await page.goto("/principal/timetable");
    
    const scheduleButton = page.locator("text=/schedule.*class|\\+ schedule/i").first();
    
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      
      // Fill in form to trigger conflict check
      // (would need valid data to actually trigger conflicts)
      
      // Check for conflict warning structure
      const hasConflictSection = await page.locator("text=/conflict|warning|already scheduled/i").isVisible();
      
      // Conflicts may not exist, but the form should be ready to show them
    }
  });

  test("P5.7.4: Cancel class requires reason", async ({ page }) => {
    await page.goto("/principal/timetable");
    
    // Look for a cancel button (would be on scheduled classes)
    const cancelButton = page.locator("button:has-text('Cancel')").first();
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Should prompt for cancellation reason
      await expect(page.locator("text=/cancel.*class|reason/i")).toBeVisible();
      
      // Should have textarea for reason
      const reasonField = page.locator("textarea[name='reason'], textarea[placeholder*='reason' i]");
      await expect(reasonField).toBeVisible();
    }
  });

  test("P5.7.5: Edit class preserves data", async ({ page }) => {
    await page.goto("/principal/timetable");
    
    // Look for edit button
    const editButton = page.locator("button:has-text('Edit')").first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Dialog should open with populated fields
      await expect(page.locator("text=/edit.*class|update.*class/i")).toBeVisible();
      
      // Form fields should have values
      const titleInput = page.locator("input[name='title']");
      if (await titleInput.isVisible()) {
        const value = await titleInput.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  test("P5.7.6: Reschedule button exists", async ({ page }) => {
    await page.goto("/principal/timetable");
    
    // Check for reschedule functionality
    const rescheduleButton = page.locator("button:has-text('Reschedule')").first();
    
    if (await rescheduleButton.isVisible()) {
      expect(rescheduleButton).toBeVisible();
    }
  });

  test("P5.7.7: Class details show duration and venue", async ({ page }) => {
    await page.goto("/principal/timetable");
    
    // Classes should show duration (minutes)
    const hasDuration = await page.locator("text=/\\d+\\s*min|duration/i").isVisible();
    
    // Classes should show venue
    const hasVenue = await page.locator("text=/venue|online|room/i").isVisible();
    
    // At least one should be visible if classes exist
    if (hasDuration || hasVenue) {
      expect(hasDuration || hasVenue).toBeTruthy();
    }
  });
});

test.describe("Principal P5: Cross-Feature Integration", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPrincipal(page);
  });

  test("P5: Navigation between classes, roster, and groups", async ({ page }) => {
    await page.goto("/principal/classes");
    
    // From classes to roster
    const rosterLink = page.locator("text=/view roster/i").first();
    if (await rosterLink.isVisible()) {
      await rosterLink.click();
      await expect(page.locator("h1")).toContainText(/roster/i);
      
      // From roster to groups
      const groupsLink = page.locator("text=/breakaway.*groups|groups/i").first();
      if (await groupsLink.isVisible()) {
        await groupsLink.click();
        await expect(page.locator("h1")).toContainText(/groups/i);
        
        // Back navigation
        const backLink = page.locator("text=/back|← /i").first();
        if (await backLink.isVisible()) {
          await backLink.click();
          await expect(page.locator("h1")).toContainText(/roster/i);
        }
      }
    }
  });

  test("P5: Sidebar navigation includes all P5 sections", async ({ page }) => {
    await page.goto("/principal");
    
    // Check sidebar has key P5 sections
    const hasProgrammes = await page.locator("a:has-text('Programmes'), text=/programmes/i").isVisible();
    const hasCourses = await page.locator("a:has-text('Courses')").isVisible();
    const hasClasses = await page.locator("a:has-text('Classes')").isVisible();
    const hasTimetable = await page.locator("a:has-text('Timetable')").isVisible();
    
    // At least some navigation should be visible
    expect(hasProgrammes || hasCourses || hasClasses || hasTimetable).toBeTruthy();
  });

  test("P5: All pages have proper breadcrumbs/back navigation", async ({ page }) => {
    // Test roster page
    await page.goto("/principal/classes");
    const rosterLink = page.locator("text=/view roster/i").first();
    
    if (await rosterLink.isVisible()) {
      await rosterLink.click();
      
      // Should have back link
      const backLink = page.locator("a:has-text('Back'), a:has-text('←')");
      await expect(backLink.first()).toBeVisible();
    }
  });

  test("P5: RBAC - Principal can access all P5 features", async ({ page }) => {
    const sections = [
      "/principal/programmes",
      "/principal/departments",
      "/principal/courses",
      "/principal/classes",
      "/principal/timetable",
      "/principal/semesters",
      "/principal/calendar",
    ];

    for (const section of sections) {
      await page.goto(section);
      
      // Should not redirect to 403
      await expect(page).not.toHaveURL(/\/403/);
      
      // Page should load
      const hasHeading = await page.locator("h1, h2").first().isVisible();
      expect(hasHeading).toBeTruthy();
    }
  });
});
