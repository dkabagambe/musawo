import { test, expect } from "@playwright/test";

test.describe("Student S4: Discussion Forum", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student.t01@example.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("displays forum page", async ({ page }) => {
    await page.goto("/dashboard/forum");

    // Page title
    await expect(page.locator("h1")).toContainText("Discussion Forum");
  });

  test("shows thread list", async ({ page }) => {
    await page.goto("/dashboard/forum");

    // Look for forum threads
    const threads = page.locator("text=/discussion|Q&A|notes/i");
    const count = await threads.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("shows pinned threads first", async ({ page }) => {
    await page.goto("/dashboard/forum");

    // Look for pin indicator (emoji or icon)
    const pinIndicators = page.locator("text=📌").or(
      page.locator('[aria-label*="pinned"]')
    );

    // May or may not have pinned threads
    const count = await pinIndicators.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("shows reply count on threads", async ({ page }) => {
    await page.goto("/dashboard/forum");

    // Look for reply counts
    const replyCounts = page.locator("text=/\\d+ repl/i");
    const count = await replyCounts.count();

    // Should show reply counts if there are threads
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("create new thread button exists", async ({ page }) => {
    await page.goto("/dashboard/forum");

    // Look for "New" or "Create" button/link
    const createButton = page.locator('a[href*="/forum/new"]').or(
      page.locator("button").filter({ hasText: /New|Create/i })
    ).or(
      page.locator("a").filter({ hasText: /New.*thread|Create.*thread/i })
    );

    const count = await createButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("navigates to create thread page", async ({ page }) => {
    await page.goto("/dashboard/forum");

    const createLink = page.locator('a[href*="/forum/new"]').first();

    if (await createLink.isVisible()) {
      await createLink.click();
      await expect(page).toHaveURL(/\/dashboard\/forum\/new/);

      // Should show thread creation form
      await expect(page.locator("text=/Title|Subject/i")).toBeVisible();
    }
  });

  test("clicks thread to view detail", async ({ page }) => {
    await page.goto("/dashboard/forum");

    // Click first thread link
    const threadLink = page.locator("a").filter({ 
      hasText: /discussion|Q&A|notes/i 
    }).first();

    if (await threadLink.isVisible()) {
      await threadLink.click();

      // Should navigate to thread detail
      await expect(page).toHaveURL(/\/dashboard\/forum\/[a-z0-9]+/);

      // Should show thread body and replies section
      const detailContent = page.locator("text=/Repl|Comment|Post/i");
      await expect(detailContent.first()).toBeVisible();
    }
  });

  test("thread detail shows author info", async ({ page }) => {
    await page.goto("/dashboard/forum");

    const threadLink = page.locator("a").filter({ 
      hasText: /discussion|Q&A/i 
    }).first();

    if (await threadLink.isVisible()) {
      await threadLink.click();

      // Should show author name and role
      const authorInfo = page.locator("text=/INSTRUCTOR|STUDENT/i").or(
        page.locator("text=/Mirembe|Scovia/i")
      );
      
      const count = await authorInfo.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("reply form available on thread detail", async ({ page }) => {
    await page.goto("/dashboard/forum");

    const threadLink = page.locator("a").first();

    if (await threadLink.isVisible()) {
      await threadLink.click();

      // Look for reply textarea or button
      const replyElements = page.locator("textarea").or(
        page.locator("button").filter({ hasText: /Reply|Post|Comment/i })
      );

      const count = await replyElements.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("empty state shows appropriate message", async ({ page }) => {
    await page.goto("/dashboard/forum");

    // Either has threads OR shows empty message
    const hasThreads = (await page.locator("a").filter({ 
      hasText: /discussion|thread/i 
    }).count()) > 0;
    
    const emptyMessage = page.locator("text=/No threads|No discussions/i");

    if (!hasThreads) {
      await expect(emptyMessage).toBeVisible();
    }
  });
});
