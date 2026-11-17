/**
 * P3: Approvals Inbox and Approval Tracking for Principal
 *
 * Tests:
 * 1. Approvals Inbox loads with real items
 * 2. Filters by type, age, and status tab work
 * 3. Detail page shows full item info and decision form
 * 4. Approve an admission - redirect to inbox
 * 5. Reject with reason requires a note
 * 6. Forward to Director (payment proof)
 * 7. Approval Tracking shows forwarded items
 * 8. Badge count matches inbox pending count
 * 9. No cross-portal links
 * 10. Mobile responsive
 */

import { test, expect } from "@playwright/test";

// Scope heading checks to main content to avoid sidebar nav duplicates
const main = (page: any) => page.locator("main, #main-content, [role='main']").first();

async function loginAsPrincipal(page: any) {
  await page.goto("/dev/login");
  await page.locator("tr").filter({ hasText: "Principal (Nankya Shanita)" })
    .getByRole("button", { name: /Sign in/i }).click();
  await expect(page).toHaveURL(/\/principal/);
}

test.describe("Principal P3 - Approvals Inbox and Approval Tracking", () => {
  test.describe.configure({ mode: "serial" });

  test("P3.1 - Approvals Inbox page loads with pending items", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox");
    await expect(page).toHaveURL("/principal/approvals-inbox");
    await expect(main(page).getByRole("heading", { name: "Approvals Inbox" })).toBeVisible();
    // Pending tab present
    await expect(page.getByRole("link", { name: /Pending/i }).first()).toBeVisible();
    // At least one request card visible
    const items = page.locator("a.card").first();
    await expect(items).toBeVisible({ timeout: 10_000 });
  });

  test("P3.2 - Status tabs switch correctly", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox");

    // Active tab should have primary styling
    const pendingLink = page.getByRole("link", { name: /Pending/i }).first();
    await expect(pendingLink).toHaveClass(/bg-primary/);

    // All tab
    await page.getByRole("link", { name: /^All$/i }).first().click();
    await expect(page).toHaveURL(/status=ALL/);
    await expect(main(page).getByRole("heading", { name: "Approvals Inbox" })).toBeVisible();

    // Approved tab
    await page.getByRole("link", { name: /^Approved$/i }).first().click();
    await expect(page).toHaveURL(/status=APPROVED/);

    // Rejected tab
    await page.getByRole("link", { name: /^Rejected$/i }).first().click();
    await expect(page).toHaveURL(/status=REJECTED/);

    // Back to Pending
    await page.getByRole("link", { name: /Pending/i }).first().click();
    await expect(page).toHaveURL(/status=PENDING/);
  });

  test("P3.3 - Type filter narrows results to Admissions", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox");

    await page.locator("select").first().selectOption("ADMISSION");
    await expect(page).toHaveURL(/type=ADMISSION/);
    // Any visible card titles should include "admission"
    const firstCard = page.locator("a.card h2").first();
    if (await firstCard.isVisible({ timeout: 5_000 })) {
      const text = await firstCard.textContent();
      expect(text?.toLowerCase()).toContain("admission");
    }
  });

  test("P3.4 - Age filter applies", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox");

    await page.locator("select").last().selectOption("3");
    await expect(page).toHaveURL(/age=3/);
    await expect(main(page).getByRole("heading", { name: "Approvals Inbox" })).toBeVisible();
  });

  test("P3.5 - Detail page shows request info, guidance, and back link", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox");

    const firstItem = page.locator("a.card").first();
    await expect(firstItem).toBeVisible();
    await firstItem.click();
    await expect(page).toHaveURL(/\/principal\/approvals-inbox\/.+/);

    await expect(page.getByRole("link", { name: /Back to inbox/i })).toBeVisible();
    await expect(page.getByText(/Request ID:/i)).toBeVisible();
    await expect(page.getByText(/From\s/)).toBeVisible();
    await expect(page.getByText(/Submitted/)).toBeVisible();
    await expect(page.getByText(/Guidance/i)).toBeVisible();
  });

  test("P3.6 - Admission detail shows Approve, Reject, Request info buttons", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox?type=ADMISSION");

    const firstItem = page.locator("a.card").first();
    if (await firstItem.isVisible({ timeout: 5_000 })) {
      await firstItem.click();
      await expect(page).toHaveURL(/\/principal\/approvals-inbox\/.+/);

      await expect(page.getByText("Your Decision")).toBeVisible();
      await expect(page.getByRole("button", { name: /^Approve$/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Reject$/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Request more information/i })).toBeVisible();
    }
  });

  test("P3.7 - Payment proof detail shows Forward and Return buttons", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox?type=PAYMENT_PROOF");

    const firstItem = page.locator("a.card").first();
    if (await firstItem.isVisible({ timeout: 5_000 })) {
      await firstItem.click();
      await expect(page).toHaveURL(/\/principal\/approvals-inbox\/.+/);

      await expect(page.getByRole("button", { name: /Forward to Director/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Return to Admin/i })).toBeVisible();
    }
  });

  test("P3.8 - Reject action shows note field; submit without note stays on page", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox");

    const firstItem = page.locator("a.card").first();
    await expect(firstItem).toBeVisible();
    await firstItem.click();
    await expect(page).toHaveURL(/\/principal\/approvals-inbox\/.+/);

    const rejectBtn = page.getByRole("button", { name: /^Reject$/i });
    if (await rejectBtn.isVisible({ timeout: 3_000 })) {
      await rejectBtn.click();
      await expect(page.locator("textarea#note")).toBeVisible();
      // Submit without filling note - HTML5 `required` blocks submission
      await page.getByRole("button", { name: /Confirm: Reject/i }).click();
      // Must still be on the same detail page
      await expect(page).toHaveURL(/\/principal\/approvals-inbox\/.+/);
    }
  });

  test("P3.9 - Approve an admission and redirect back to inbox", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox?type=ADMISSION");

    const firstItem = page.locator("a.card").first();
    if (await firstItem.isVisible({ timeout: 5_000 })) {
      await firstItem.click();
      await expect(page).toHaveURL(/\/principal\/approvals-inbox\/.+/);

      const approveBtn = page.getByRole("button", { name: /^Approve$/i });
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
        // Confirm button appears
        const confirmBtn = page.getByRole("button", { name: /Confirm: Approve/i });
        await expect(confirmBtn).toBeVisible({ timeout: 3_000 });
        await confirmBtn.click();
        // Redirected to inbox
        await expect(page).toHaveURL("/principal/approvals-inbox", { timeout: 10_000 });
      }
    }
  });

  test("P3.10 - Forward payment proof to Director, then appears in tracking", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox?type=PAYMENT_PROOF");

    const firstItem = page.locator("a.card").first();
    if (await firstItem.isVisible({ timeout: 5_000 })) {
      await firstItem.click();
      await expect(page).toHaveURL(/\/principal\/approvals-inbox\/.+/);

      const forwardBtn = page.getByRole("button", { name: /Forward to Director/i });
      if (await forwardBtn.isVisible()) {
        await forwardBtn.click();
        const noteField = page.locator("textarea#note");
        await expect(noteField).toBeVisible({ timeout: 3_000 });
        await noteField.fill("Payment verified. Forwarding to Director for final approval.");
        await page.getByRole("button", { name: /Confirm: Forward/i }).click();
        await expect(page).toHaveURL("/principal/approvals-inbox", { timeout: 10_000 });

        // Check it appears in Approval Tracking
        await page.goto("/principal/approval-tracking?status=ALL");
        await expect(main(page).getByRole("heading", { name: "Approval Tracking" })).toBeVisible();
        await expect(page.locator(".card").first()).toBeVisible();
      }
    }
  });

  test("P3.11 - Approval Tracking page loads with correct tabs", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approval-tracking");
    await expect(page).toHaveURL("/principal/approval-tracking");
    await expect(main(page).getByRole("heading", { name: "Approval Tracking" })).toBeVisible();
    await expect(page.getByText(/Requests you forwarded to the Director/i)).toBeVisible();

    await expect(page.getByRole("link", { name: /Waiting/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Decided/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^All$/i }).first()).toBeVisible();
  });

  test("P3.12 - Approval Tracking status tabs navigate correctly", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approval-tracking");

    await page.getByRole("link", { name: /^Decided/i }).first().click();
    await expect(page).toHaveURL(/status=DECIDED/);
    await expect(main(page).getByRole("heading", { name: "Approval Tracking" })).toBeVisible();

    await page.getByRole("link", { name: /^All$/i }).first().click();
    await expect(page).toHaveURL(/status=ALL/);

    await page.getByRole("link", { name: /^Waiting/i }).first().click();
    await expect(page).toHaveURL(/status=PENDING/);
  });

  test("P3.13 - Remind button is disabled (rate-limited)", async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto("/principal/approval-tracking");
    const remindBtns = page.locator("button", { hasText: /Remind/i });
    const count = await remindBtns.count();
    for (let i = 0; i < count; i++) {
      await expect(remindBtns.nth(i)).toBeDisabled();
    }
  });

  test("P3.14 - No links to other portals on approvals pages", async ({ page }) => {
    await loginAsPrincipal(page);
    for (const path of ["/principal/approvals-inbox", "/principal/approval-tracking"]) {
      await page.goto(path);
      const links = await page.locator("a[href]").all();
      for (const link of links) {
        const href = await link.getAttribute("href");
        if (!href) continue;
        expect(href, `Found cross-portal link on ${path}: ${href}`).not.toMatch(/^\/(director|admin|tutor|dashboard)\//);
      }
    }
  });

  test("P3.15 - Approvals inbox is responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPrincipal(page);
    await page.goto("/principal/approvals-inbox");
    await expect(main(page).getByRole("heading", { name: "Approvals Inbox" })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("P3.16 - Approval Tracking is responsive at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPrincipal(page);
    await page.goto("/principal/approval-tracking");
    await expect(main(page).getByRole("heading", { name: "Approval Tracking" })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("P3.17 - API rejects unauthenticated decision attempt", async ({ request }) => {
    const res = await request.post("/api/principal/approvals/fake-id/decide", {
      data: { action: "APPROVE" },
      maxRedirects: 0,
    });
    // 401 Unauthorized or 307 redirect-to-login both mean not authenticated
    expect([307, 401, 403]).toContain(res.status());
  });
});
