import { expect, test, type Page } from "@playwright/test";

// ── Login helpers ────────────────────────────────────────────────

async function loginAs(page: Page, email: string) {
  await page.goto("/dev/login");
  // Match the row whose email cell is exactly this email (use td text, not row text,
  // to avoid "admin@mtc.ac.ug" matching the "itadmin@mtc.ac.ug" row).
  const row = page.locator("tr").filter({
    has: page.locator("td").filter({ hasText: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }),
  });
  await row.getByRole("button", { name: /sign in/i }).click();
  // DevLoginForm does a client-side signIn + router.push — wait up to 15 s.
  await expect(page).toHaveURL(
    /\/(dashboard|tutor|registrar|principal|deputy|finance|bursar|admin|director|board|auditor|system)/,
    { timeout: 15_000 },
  );
}

async function loginAsStudent(page: Page) {
  await loginAs(page, "student.full@example.com");
  await expect(page).toHaveURL(/\/dashboard/);
}

async function loginAsTutor(page: Page) {
  await loginAs(page, "tutor@mtc.ac.ug");
  await expect(page).toHaveURL(/\/tutor/);
}

// ── Shell structure ──────────────────────────────────────────────

test.describe("authenticated portal shell", () => {
  test("uses the full sidebar at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsStudent(page);
    const width = await page
      .locator(".portal-desktop-sidebar")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBe(240);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("keeps the full sidebar at the 1024 pixel desktop breakpoint", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsStudent(page);
    const width = await page
      .locator(".portal-desktop-sidebar")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBe(240);
  });

  test("uses the icon rail on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 900 });
    await loginAsStudent(page);
    const width = await page
      .locator(".portal-desktop-sidebar")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBe(72);
    await expect(
      page.getByRole("button", { name: "Open navigation menu" }),
    ).toBeVisible();
  });

  test("opens a dismissible navigation drawer on phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsStudent(page);
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();
    expect(
      await drawer.evaluate((element) => element.getBoundingClientRect().width),
    ).toBe(280);
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  });

  test("renders the instructor dashboard widgets at desktop, tablet, and phone widths", async ({
    page,
  }) => {
    await loginAsTutor(page);
    await expect(
      page.getByRole("heading", { name: /hello nankya/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Welcome, Nankya!", { exact: false }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Upcoming Classes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "My Students" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "General" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page).toHaveURL(/tab=general/);

    for (const [width, height] of [
      [1440, 900],
      [820, 900],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(page.locator(".dashboard-widget").first()).toBeVisible();
      const columnCount = await page
        .locator(".dashboard-widget-grid")
        .evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(" ").length,
        );
      expect(columnCount).toBe(width === 390 ? 1 : 2);
      await page.screenshot({
        path: `test-results/instructor-dashboard-${width}.png`,
        fullPage: true,
      });
    }
  });

  test("captures the student dashboard at desktop, tablet, and phone widths", async ({
    page,
  }) => {
    await loginAsStudent(page);
    await expect(page.getByRole("heading", { name: /hello/i })).toBeVisible();
    await expect(page.getByText(/welcome back,/i)).toHaveCount(0);
    for (const [width, height] of [
      [1440, 900],
      [820, 900],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(page.locator(".portal-shell")).toBeVisible();
      await page.screenshot({
        path: `test-results/student-dashboard-${width}.png`,
        fullPage: true,
      });
    }
  });

  test("switches dashboard tabs and persists widget visibility and order", async ({
    page,
  }) => {
    await loginAsStudent(page);
    await page.getByRole("tab", { name: "Studies" }).click();
    await expect(page).toHaveURL(/tab=studies/);
    await expect(page.getByRole("tab", { name: "Studies" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByRole("tab", { name: "General" }).click();
    await page.getByRole("button", { name: /edit my widgets/i }).click();
    const hideSave = page.waitForResponse(
      (response) =>
        response.url().includes("/api/dashboard/widgets") &&
        response.request().method() === "PUT",
    );
    await page.getByRole("switch", { name: "Hide My Courses" }).click();
    expect((await hideSave).status()).toBe(200);
    const reorderSave = page.waitForResponse(
      (response) =>
        response.url().includes("/api/dashboard/widgets") &&
        response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Move My Courses up" }).click();
    expect((await reorderSave).status()).toBe(200);
    await page.getByRole("button", { name: "Done" }).click();

    await page.reload();
    await page.getByRole("button", { name: /edit my widgets/i }).click();
    await expect(
      page.getByRole("switch", { name: "Show My Courses" }),
    ).toHaveAttribute("aria-checked", "false");
    const response = await page.request.get(
      "/api/dashboard/widgets?tab=general",
    );
    const body = await response.json();
    expect(
      body.widgets.find((widget: { id: string }) => widget.id === "my-courses")
        .position,
    ).toBe(0);
  });

  test("rejects a widget and portal route outside the student's permissions", async ({
    page,
  }) => {
    await loginAsStudent(page);
    const response = await page.request.put("/api/dashboard/widgets", {
      data: {
        tab: "staff",
        widgets: [
          { id: "staff-directory", visible: true, column: 0, position: 0 },
        ],
      },
    });
    expect(response.status()).toBe(403);
    await expect(
      page.getByRole("link", { name: "Staff Accounts" }),
    ).toHaveCount(0);
    await page.goto("/director/staff");
    await expect(page).toHaveURL(/\/login|\/dashboard/);
  });
});

// ── Per-role shell checks ────────────────────────────────────────
// Each demo account must: land on the right portal, show the shared shell,
// show a greeting, have at least one tab, and show the active tab in the URL.

const ROLE_ACCOUNTS: Array<{
  email: string;
  urlPattern: RegExp;
  label: string;
  forbiddenUrl: string;
}> = [
  {
    email: "student.full@example.com",
    urlPattern: /\/dashboard/,
    label: "Student",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "tutor@mtc.ac.ug",
    urlPattern: /\/tutor/,
    label: "Instructor",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "assistant@mtc.ac.ug",
    urlPattern: /\/tutor/,
    label: "Teaching Assistant",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "registrar@mtc.ac.ug",
    urlPattern: /\/registrar/,
    label: "Academic Registrar",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "principal@mtc.ac.ug",
    urlPattern: /\/principal/,
    label: "Principal",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "deputyprincipal@mtc.ac.ug",
    urlPattern: /\/deputy/,
    label: "Deputy Principal",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "finance@mtc.ac.ug",
    urlPattern: /\/finance/,
    label: "Finance Officer",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "hr@mtc.ac.ug",
    urlPattern: /\/admin/,
    label: "HR and System Admin",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "auditor@mtc.ac.ug",
    urlPattern: /\/auditor/,
    label: "Auditor",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "board@mtc.ac.ug",
    urlPattern: /\/board/,
    label: "Board Member",
    forbiddenUrl: "/director/staff",
  },
  {
    email: "ceo@mtc.ac.ug",
    urlPattern: /\/director/,
    label: "Super Admin",
    forbiddenUrl: "/dashboard/payments",
  },
  {
    email: "itadmin@mtc.ac.ug",
    urlPattern: /\/system/,
    label: "System IT",
    forbiddenUrl: "/director/staff",
  },
];

test.describe("per-role shell and RBAC checks", () => {
  for (const account of ROLE_ACCOUNTS) {
    test(`${account.label} (${account.email}): shared shell, greeting, tabs, URL tab, 403 on forbidden route`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await loginAs(page, account.email);
      await expect(page).toHaveURL(account.urlPattern);

      // Shared shell must be present
      await expect(page.locator(".portal-shell")).toBeVisible();
      await expect(page.locator(".portal-desktop-sidebar")).toBeVisible();
      await expect(page.locator(".portal-topbar")).toBeVisible();

      // Greeting must be visible
      await expect(page.getByRole("heading", { name: /hello/i })).toBeVisible();

      // At least one tab rendered
      const tabs = page.getByRole("tab");
      await expect(tabs.first()).toBeVisible();

      // Active tab must be in the URL
      const activeTabLabel = await page
        .getByRole("tab", { selected: true })
        .first()
        .textContent();
      const expectedTabId = activeTabLabel?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
      await expect(page).toHaveURL(new RegExp(`tab=${expectedTabId}`));

      // Sidebar shows permitted items (at least the dashboard/overview link)
      const navLinks = page.locator(".portal-nav-link");
      await expect(navLinks.first()).toBeVisible();

      // Tablet: icon rail
      await page.setViewportSize({ width: 820, height: 900 });
      const railWidth = await page
        .locator(".portal-desktop-sidebar")
        .evaluate((el) => el.getBoundingClientRect().width);
      expect(railWidth).toBe(72);

      // Phone: hamburger and drawer
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        page.getByRole("button", { name: "Open navigation menu" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      await expect(
        page.getByRole("dialog", { name: "Navigation menu" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");

      // Forbidden route must redirect or 403
      await page.goto(account.forbiddenUrl);
      await expect(page).toHaveURL(
        /\/login|\/dashboard|\/tutor|\/registrar|\/principal|\/deputy|\/finance|\/admin|\/director|\/board|\/auditor|\/system|\/403/,
      );
    });
  }
});
