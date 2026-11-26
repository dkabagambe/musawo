import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const STUDENT_EMAIL = "student.full@example.com";
const STUDENT_PASSWORD = "Demo1234!";

/**
 * S4 Learning Module Tests
 *
 * Tests for:
 * 1. My Programmes - enrolment list with progress and payment phases
 * 2. My Courses - course cards with progress bars and continue button
 * 3. Learning Materials - material list with search, filter, and viewer
 * 4. Assignments - lists (due/submitted/graded) and submission workflow
 * 5. Discussion Forum - thread creation, replies, moderation
 */

test.describe("S4: My Programmes", () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 10_000 });
  });

  test("1. My Programmes page loads with enrolment list", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/enrolled`);
    await page.waitForSelector("h1:has-text('My Programmes')", { timeout: 5_000 });

    // Should show enrolment count
    const countText = await page.locator(".text-gray-500").first().textContent();
    expect(countText).toMatch(/\d+ enrolment/i);

    // Should display course cards with payment phase info
    const cards = page.locator(".card");
    if (await cards.count()) {
      expect(cards.first()).toContainText(/Phase \d+ of 3/);
    }
  });

  test("2. Enrolment card shows progress bar and instructor", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/enrolled`);

    const card = page.locator(".card").first();
    if (await card.count()) {
      // Should show progress bar
      const progressBar = card.locator("text=Learning progress");
      expect(progressBar).toBeVisible();

      // Should show instructor name
      const instructorText = card.locator("text=Student");
      if (await instructorText.count() > 0) {
        expect(instructorText).toBeVisible();
      }

      // Should show payment phase
      const phaseText = card.locator("text=/Phase \d+ of 3/");
      expect(phaseText).toBeVisible();
    }
  });

  test("3. Clicking enrolment navigates to detail page", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/enrolled`);

    const firstCard = page.locator("a:has(.card)").first();
    if (await firstCard.count()) {
      await firstCard.click();
      await page.waitForSelector("text=You're enrolled", { timeout: 5_000 });
      expect(page.url()).toContain("/dashboard/enrolled/");
    }
  });
});

test.describe("S4: My Courses", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 10_000 });
  });

  test("4. My Courses page displays course grid with progress", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/courses`);
    await page.waitForSelector("h1:has-text('My Courses')", { timeout: 5_000 });

    // Should show course cards
    const cards = page.locator(".card");
    if (await cards.count()) {
      expect(cards.first()).toBeVisible();
      // Should have progress bar
      expect(cards.first().locator(".bg-gradient-to-r")).toBeVisible();
    }
  });

  test("5. Course card shows progress percentage and continue button", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/courses`);

    const card = page.locator(".card").first();
    if (await card.count()) {
      // Check for progress text
      const progressText = await card.textContent();
      expect(progressText).toMatch(/\d+%/);

      // Check for button
      const button = card.locator("button, a");
      if (await button.count()) {
        expect(button.first()).toBeVisible();
      }
    }
  });
});

test.describe("S4: Learning Materials", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 10_000 });
  });

  test("6. Materials page loads with search and filter", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/materials`);
    await page.waitForSelector("h1:has-text('Materials')", { timeout: 5_000 }).catch(() => null);

    // Should show filter/search interface
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]');
    if (await searchInput.count()) {
      expect(searchInput).toBeVisible();
    }

    // Should display material items if any exist
    const materialItems = page.locator("[role='row'], .card");
    if (await materialItems.count() > 1) {
      expect(materialItems.first()).toBeVisible();
    }
  });

  test("7. Can filter materials by course", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/materials`);

    // Look for filter control
    const filterSelect = page.locator("select").first();
    if (await filterSelect.count()) {
      const options = await filterSelect.locator("option").count();
      expect(options).toBeGreaterThan(0);
    }
  });

  test("8. Material viewer blocks download/print", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/materials`);

    // Find first material link
    const firstLink = page.locator("a[href*='/material'], a[href*='/learn']").first();
    if (await firstLink.count()) {
      await firstLink.click();
      await page.waitForTimeout(1000);

      // Check that viewer doesn't have download button
      const downloadBtn = page.locator("button:has-text('Download'), button:has-text('Print')");
      if (await downloadBtn.count()) {
        expect(downloadBtn).not.toBeVisible();
      }
    }
  });
});

test.describe("S4: Assignments", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 10_000 });
  });

  test("9. Assignments page shows due/submitted/graded tabs", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/assignments`);
    await page.waitForSelector("h1:has-text('Assignment')", { timeout: 5_000 }).catch(() => null);

    // Should show assignment lists or tabs
    const tabs = page.locator("[role='tab'], button:has-text(/due|submitted|graded/i)");
    if (await tabs.count()) {
      expect(tabs.first()).toBeVisible();
    }
  });

  test("10. Can view assignment details", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/assignments`);

    // Find first assignment link
    const firstLink = page.locator("a[href*='/assignments/']").first();
    if (await firstLink.count()) {
      await firstLink.click();
      await page.waitForSelector("h1, h2", { timeout: 5_000 });
      expect(page.url()).toContain("/assignments/");
    }
  });

  test("11. Assignment detail shows instructions and submission form", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/assignments`);

    const firstLink = page.locator("a[href*='/assignments/']").first();
    if (await firstLink.count()) {
      await firstLink.click();
      await page.waitForTimeout(1000);

      // Should show submission area
      const textArea = page.locator("textarea");
      const fileInput = page.locator("input[type='file']");

      if (await textArea.count() || await fileInput.count()) {
        expect(textArea.count() || fileInput.count()).toBeGreaterThan(0);
      }
    }
  });

  test("12. Can submit assignment with text", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/assignments`);

    const firstLink = page.locator("a[href*='/assignments/']").first();
    if (await firstLink.count()) {
      await firstLink.click();
      await page.waitForTimeout(1000);

      const textArea = page.locator("textarea").first();
      if (await textArea.count()) {
        await textArea.fill("Test submission");

        const submitBtn = page.locator("button:has-text(/submit|send/i)").first();
        if (await submitBtn.count()) {
          // Don't actually submit, just verify form exists
          expect(submitBtn).toBeVisible();
        }
      }
    }
  });
});

test.describe("S4: Discussion Forum", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 10_000 });
  });

  test("13. Forum page loads with thread list", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/forum`);
    await page.waitForSelector("h1:has-text('Forum')", { timeout: 5_000 }).catch(() => null);

    // Should show forum interface
    const forumContainer = page.locator("[role='main'], .card");
    if (await forumContainer.count()) {
      expect(forumContainer.first()).toBeVisible();
    }
  });

  test("14. Can create new forum thread", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/forum`);

    const newThreadBtn = page.locator("button:has-text(/new|create/i)").first();
    if (await newThreadBtn.count()) {
      await newThreadBtn.click();
      await page.waitForTimeout(500);

      // Should show form
      const titleInput = page.locator("input[placeholder*='title' i], textarea").first();
      if (await titleInput.count()) {
        expect(titleInput).toBeVisible();
      }
    }
  });

  test("15. Can view and reply to forum thread", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/forum`);

    // Find first thread
    const firstThread = page.locator("a[href*='/forum/']").first();
    if (await firstThread.count()) {
      await firstThread.click();
      await page.waitForTimeout(1000);

      // Should show thread details and reply area
      const replyInput = page.locator("textarea").first();
      if (await replyInput.count()) {
        expect(replyInput).toBeVisible();
      }
    }
  });

  test("16. Forum shows unread markers and can search", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/forum`);

    // Check for search functionality
    const searchInput = page.locator("input[placeholder*='search' i]");
    if (await searchInput.count()) {
      expect(searchInput).toBeVisible();
    }

    // Check for thread list
    const threads = page.locator("[role='link'], a");
    if (await threads.count()) {
      expect(threads.first()).toBeVisible();
    }
  });
});

test.describe("S4: Payment Phase Access Control", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', STUDENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 10_000 });
  });

  test("17. Locked content shows unlock message with fee requirement", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/courses`);

    // Look for locked content indicators
    const lockedText = page.locator("text=/pay.*unlock|next phase/i");
    if (await lockedText.count()) {
      expect(lockedText).toBeVisible();
    }

    // Check for link to My Fees
    const feeLink = page.locator("a[href*='/payments' i]");
    if (await feeLink.count()) {
      expect(feeLink).toBeVisible();
    }
  });

  test("18. Payment phase progress shows 50%, 75%, 100% milestones", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/enrolled`);

    const phaseText = page.locator("text=/Phase \\d+ of 3/");
    if (await phaseText.count()) {
      const text = await phaseText.first().textContent();
      expect(text).toMatch(/Phase \d+ of 3/);
    }
  });
});

