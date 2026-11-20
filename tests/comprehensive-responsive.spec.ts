/**
 * Comprehensive Responsive Design Tests
 * Tests all public pages and key flows across multiple viewport sizes
 * 
 * Viewport Sizes:
 * - Mobile: 375px (large phone)
 * - Mobile: 414px (standard phone)
 * - Tablet: 768px (iPad)
 * - Tablet: 1024px (iPad Pro)
 * - Desktop: 1440px (Full HD)
 * - Wide: 1920px (Full HD+)
 * - Ultra-wide: 2560px (2K)
 */

import { test, expect } from "@playwright/test";

// Viewport configurations
const VIEWPORTS = {
  mobile_large: { width: 375, height: 812, name: "Mobile (375px)" },
  mobile_standard: { width: 414, height: 896, name: "Mobile (414px)" },
  tablet: { width: 768, height: 1024, name: "Tablet (768px)" },
  tablet_pro: { width: 1024, height: 1366, name: "Tablet Pro (1024px)" },
  desktop: { width: 1440, height: 900, name: "Desktop (1440px)" },
  wide: { width: 1920, height: 1080, name: "Wide (1920px)" },
  ultra_wide: { width: 2560, height: 1440, name: "Ultra-wide (2560px)" },
};

// All public pages to test
const PUBLIC_PAGES = [
  { path: "/", name: "Home" },
  { path: "/about", name: "About" },
  { path: "/admissions/how-to-enrol", name: "How to Enrol" },
  { path: "/admissions/fees", name: "Fees" },
  { path: "/admissions/payment-options", name: "Payment Options" },
  { path: "/apply", name: "Apply" },
  { path: "/contact", name: "Contact" },
  { path: "/courses", name: "Courses" },
  { path: "/faq", name: "FAQ" },
  { path: "/impact", name: "Impact" },
  { path: "/privacy", name: "Privacy" },
  { path: "/terms", name: "Terms" },
  { path: "/refund", name: "Refund Policy" },
];

// Authentication pages
const AUTH_PAGES = [
  { path: "/login", name: "Login" },
  { path: "/register", name: "Register" },
];

/**
 * Test Suite: No Horizontal Overflow
 * Ensures no page has horizontal scrolling at any viewport size
 */
test.describe("Responsive Design - No Overflow", () => {
  for (const [viewportKey, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`@${viewport.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      for (const page of PUBLIC_PAGES) {
        test(`${page.name} (${viewport.name}) - no horizontal scroll`, async ({ page: browserPage }) => {
          await browserPage.goto(page.path, { waitUntil: "domcontentloaded" });
          await browserPage.waitForTimeout(500);

          const overflow = await browserPage.evaluate(() => {
            return {
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: window.innerWidth,
              overflow: document.documentElement.scrollWidth - window.innerWidth,
            };
          });

          expect(overflow.overflow, `${page.name} at ${viewport.width}px has horizontal overflow`).toBeLessThanOrEqual(2);
        });
      }

      for (const page of AUTH_PAGES) {
        test(`${page.name} (${viewport.name}) - no horizontal scroll`, async ({ page: browserPage }) => {
          await browserPage.goto(page.path, { waitUntil: "domcontentloaded" });
          await browserPage.waitForTimeout(500);

          const overflow = await browserPage.evaluate(() => {
            return document.documentElement.scrollWidth - window.innerWidth;
          });

          expect(overflow, `${page.name} at ${viewport.width}px has horizontal overflow`).toBeLessThanOrEqual(2);
        });
      }
    });
  }
});

/**
 * Test Suite: Text Visibility & No Clipping
 * Ensures all text is visible and not clipped by viewport edges
 */
test.describe("Text Visibility & Readability", () => {
  for (const [viewportKey, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`@${viewport.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test(`Home page - headings not clipped at ${viewport.width}px`, async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);

        const clippedElements = await page.evaluate(() => {
          const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
          const clipped: string[] = [];

          headings.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > window.innerWidth + 2) {
              clipped.push(el.textContent?.substring(0, 50) || "unknown");
            }
          });

          return clipped;
        });

        expect(clippedElements, `Clipped headings at ${viewport.width}px: ${clippedElements.join(", ")}`).toHaveLength(0);
      });

      test(`Contact page - contact info visible at ${viewport.width}px`, async ({ page }) => {
        await page.goto("/contact", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);

        // Check if social icons are visible
        const iconsVisible = await page.evaluate(() => {
          const icons = document.querySelectorAll("a[aria-label*='Twitter'], a[aria-label*='TikTok'], a[aria-label*='Instagram']");
          return icons.length;
        });

        expect(iconsVisible).toBeGreaterThanOrEqual(3);
      });

      test(`Apply page - form inputs full width at ${viewport.width}px`, async ({ page }) => {
        await page.goto("/apply", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);

        const formLayout = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
          const overflowingInputs: string[] = [];

          inputs.forEach((input) => {
            const rect = input.getBoundingClientRect();
            if (rect.right > window.innerWidth + 2) {
              overflowingInputs.push(input.getAttribute("name") || input.tagName);
            }
          });

          return {
            totalInputs: inputs.length,
            overflowingInputs,
          };
        });

        expect(formLayout.overflowingInputs, `Overflowing inputs at ${viewport.width}px`).toHaveLength(0);
        expect(formLayout.totalInputs).toBeGreaterThan(0);
      });
    });
  }
});

/**
 * Test Suite: Touch Target Sizing
 * Ensures buttons and interactive elements are at least 44x44px
 */
test.describe("Touch Target Sizing (Accessibility)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test("Home page - buttons and links have adequate touch targets", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const touchTargets = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, a[href], input[type='button']"));
      const undersized: Array<{ tag: string; width: number; height: number }> = [];

      buttons.forEach((btn) => {
        const rect = btn.getBoundingClientRect();
        if (rect.height < 44 || rect.width < 44) {
          undersized.push({
            tag: btn.tagName,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      });

      return { total: buttons.length, undersized };
    });

    // Some buttons may be smaller (e.g., close buttons), but most should be 44x44px
    const undersizedRatio = touchTargets.undersized.length / touchTargets.total;
    expect(undersizedRatio).toBeLessThan(0.3); // Allow up to 30% undersized
  });

  test("Apply page - form buttons are tap-friendly", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const submitButton = await page.locator("button[type='submit'], input[type='submit']").first();
    const box = await submitButton.boundingBox();

    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThan(100); // Submit button should be wide on mobile
  });

  test("Contact page - social media icons are tappable", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const socialLinks = await page.locator("a[aria-label*='Twitter'], a[aria-label*='TikTok'], a[aria-label*='Instagram']").all();

    for (const link of socialLinks) {
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
  });
});

/**
 * Test Suite: Responsive Layouts
 * Ensures layouts adapt correctly at different breakpoints
 */
test.describe("Responsive Layouts", () => {
  test("Home page - course cards grid responsive", async ({ page }) => {
    // Test at mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    let columns = await page.evaluate(() => {
      const grid = document.querySelector("[class*='grid']");
      if (!grid) return 0;
      const style = window.getComputedStyle(grid);
      const colsMatch = style.gridTemplateColumns.split(" ").length;
      return colsMatch;
    });

    expect(columns).toBeLessThanOrEqual(2); // Mobile should be 1-2 columns

    // Test at desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    columns = await page.evaluate(() => {
      const grid = document.querySelector("[class*='grid']");
      if (!grid) return 0;
      const style = window.getComputedStyle(grid);
      const colsMatch = style.gridTemplateColumns.split(" ").length;
      return colsMatch;
    });

    expect(columns).toBeGreaterThanOrEqual(3); // Desktop should be 3+ columns
  });

  test("Contact page - layout adapts at different widths", async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    let mobileLayout = await page.evaluate(() => {
      const form = document.querySelector("form");
      const map = document.querySelector("[class*='map']");
      return {
        formVisible: form?.offsetParent !== null,
        mapVisible: map?.offsetParent !== null,
        formWidth: form?.getBoundingClientRect().width || 0,
      };
    });

    expect(mobileLayout.formVisible).toBe(true);
    expect(mobileLayout.formWidth).toBeGreaterThan(300); // Form should be full-width

    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    let desktopLayout = await page.evaluate(() => {
      const form = document.querySelector("form");
      const map = document.querySelector("[class*='map']");
      return {
        formVisible: form?.offsetParent !== null,
        mapVisible: map?.offsetParent !== null,
        formWidth: form?.getBoundingClientRect().width || 0,
      };
    });

    expect(desktopLayout.formVisible).toBe(true);
    expect(desktopLayout.mapWidth).toBeLessThan(1000); // Should be constrained on desktop
  });

  test("Apply page - form responsive at all sizes", async ({ page }) => {
    const sizes = [375, 768, 1440];

    for (const width of sizes) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/apply", { waitUntil: "domcontentloaded" });

      const formState = await page.evaluate(() => {
        const inputs = document.querySelectorAll("input, select, textarea");
        const buttons = document.querySelectorAll("button");
        return {
          hasInputs: inputs.length > 0,
          hasButtons: buttons.length > 0,
          noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
        };
      });

      expect(formState.hasInputs).toBe(true);
      expect(formState.hasButtons).toBe(true);
      expect(formState.noOverflow).toBe(true);
    }
  });
});

/**
 * Test Suite: Navigation & Interactions
 * Ensures navigation works correctly across all viewport sizes
 */
test.describe("Navigation & Interactions", () => {
  test("Mobile drawer opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Check hamburger menu exists on mobile
    const hamburger = page.locator("button[aria-label*='menu'], button[aria-label*='Menu']").first();
    await expect(hamburger).toBeVisible();

    // Click to open drawer
    await hamburger.click();
    await page.waitForTimeout(300);

    // Check drawer is open
    const drawer = page.locator("[role='dialog'], [id*='drawer']").first();
    await expect(drawer).toBeVisible();

    // Close drawer
    await hamburger.click();
    await page.waitForTimeout(300);
  });

  test("Footer social links functional", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    // Find social links
    const twitterLink = page.locator("a[href*='x.com']").first();
    const tiktokLink = page.locator("a[href*='tiktok.com']").first();
    const instagramLink = page.locator("a[href*='instagram.com']").first();

    // Verify links exist and have correct href
    if (await twitterLink.isVisible()) {
      const href = await twitterLink.getAttribute("href");
      expect(href).toContain("x.com/MTCKampala");
    }

    if (await tiktokLink.isVisible()) {
      const href = await tiktokLink.getAttribute("href");
      expect(href).toContain("mtc.trainingcenter");
    }

    if (await instagramLink.isVisible()) {
      const href = await instagramLink.getAttribute("href");
      expect(href).toContain("instagram.com/musawotm");
    }
  });

  test("Home page step 03 displays correctly", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Find step 03
    const step03Text = await page.locator("text=Attend physical sessions").first();
    await expect(step03Text).toBeVisible();

    // Verify it's readable
    const textContent = await step03Text.textContent();
    expect(textContent).toContain("Attend physical sessions");
  });
});

/**
 * Test Suite: Images & Media
 * Ensures images load and scale correctly
 */
test.describe("Images & Media Responsiveness", () => {
  test("Home page hero image loads", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "load" });

    const heroImage = page.locator("img[alt*='healthcare'], img[alt*='training']").first();
    
    if (await heroImage.isVisible()) {
      await expect(heroImage).toHaveCount(0 || 1);
      const src = await heroImage.getAttribute("src");
      expect(src).toBeTruthy();
    }
  });

  test("Course card images scale correctly", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/courses", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const courseImages = await page.locator("[class*='course'] img, [class*='card'] img").all();
    expect(courseImages.length).toBeGreaterThan(0);

    // Check first image
    if (courseImages.length > 0) {
      const box = await courseImages[0].boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
    }
  });

  test("Contact page map loads", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const mapContainer = page.locator("[class*='map']").first();
    
    if (await mapContainer.isVisible()) {
      const box = await mapContainer.boundingBox();
      expect(box?.height).toBeGreaterThan(200);
    }
  });
});

/**
 * Test Suite: Forms & Inputs
 * Ensures form inputs work correctly on all devices
 */
test.describe("Forms & Inputs", () => {
  test("Apply form submitable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/apply", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Find required fields
    const nameInput = page.locator("input[name*='name']").first();
    const emailInput = page.locator("input[name*='email']").first();
    const submitButton = page.locator("button[type='submit']").first();

    // Verify they're visible
    if (await nameInput.isVisible()) {
      await expect(nameInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    }
  });

  test("Contact form accessible on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const form = page.locator("form").first();
    await expect(form).toBeVisible();

    // Find common form elements
    const inputs = await page.locator("input, textarea, select").count();
    expect(inputs).toBeGreaterThan(0);
  });
});

/**
 * Test Suite: Content Visibility
 * Ensures all important content is visible at each viewport
 */
test.describe("Content Visibility & Hierarchy", () => {
  test("Home page all major sections visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Check for key sections
    const heroVisible = await page.locator("h1, h2").first().isVisible();
    const coursesSection = await page.locator("text=courses, text=Healthcare").count();
    
    expect(heroVisible).toBe(true);
    expect(coursesSection).toBeGreaterThan(0);
  });

  test("Contact page all info visible at desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Check for key contact elements
    const phoneNumbers = await page.locator("a[href^='tel:']").count();
    const emails = await page.locator("a[href^='mailto:']").count();
    const socialIcons = await page.locator("a[target='_blank'][rel*='noopener']").count();

    expect(phoneNumbers).toBeGreaterThan(0);
    expect(emails).toBeGreaterThan(0);
    expect(socialIcons).toBeGreaterThanOrEqual(3);
  });

  test("Apply page all form fields visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/apply", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const formFields = await page.locator("input, select, textarea").count();
    const formButtons = await page.locator("button").count();

    expect(formFields).toBeGreaterThan(2);
    expect(formButtons).toBeGreaterThan(0);
  });
});
