/**
 * E2E tests: contact page map and favicon.
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *
 * Run: npx playwright test e2e/contact-map-favicon.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("Contact page map", () => {
  test("renders Leaflet map or fallback without CSP/WebGL errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          text.includes("Content Security Policy") ||
          text.includes("frame-src") ||
          text.includes("Refused to frame") ||
          text.toLowerCase().includes("webgl")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto(`${BASE}/contact`);
    // Wait for map or fallback to appear
    await page.waitForTimeout(2000);

    // One of: Leaflet map container, OSM iframe, or address card fallback
    const leaflet   = page.locator('[aria-label*="Interactive map"]');
    const osmIframe = page.locator('iframe[title*="Musawo Training Center location"]');
    const addrCard  = page.locator('text=Plot 5, ADFA Building');

    const hasLeaflet = await leaflet.isVisible().catch(() => false);
    const hasIframe  = await osmIframe.isVisible().catch(() => false);
    const hasCard    = await addrCard.isVisible().catch(() => false);

    expect(hasLeaflet || hasIframe || hasCard).toBe(true);

    // No WebGL or CSP errors
    expect(consoleErrors).toHaveLength(0);

    // Action buttons always present regardless of map level
    await expect(page.locator('a:has-text("Open in Google Maps")')).toBeVisible();
    await expect(page.locator('a:has-text("Get directions")')).toBeVisible();
  });

  test("no WebGL-dependent library is imported on /contact", async ({ page }) => {
    const webglResources: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("mapbox") || url.includes("maplibre") || url.includes("mapbox-gl")) {
        webglResources.push(url);
      }
    });
    await page.goto(`${BASE}/contact`);
    await page.waitForTimeout(1500);
    expect(webglResources).toHaveLength(0);
  });

  test("contact page has no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${BASE}/contact`);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(320);
  });

  test("contact page renders at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/contact`);
    await expect(page.locator("h1")).toContainText("Contact");
  });

  test("contact page renders at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/contact`);
    await expect(page.locator("h1")).toContainText("Contact");
  });
});

test.describe("Favicon", () => {
  test("/favicon.ico returns an image", async ({ request }) => {
    const response = await request.get(`${BASE}/favicon.ico`);
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"];
    expect(
      contentType?.includes("image") || contentType?.includes("octet-stream")
    ).toBe(true);
    const body = await response.body();
    // ICO magic bytes: 00 00 01 00
    expect(body[0]).toBe(0x00);
    expect(body[1]).toBe(0x00);
    expect(body[2]).toBe(0x01);
    expect(body[3]).toBe(0x00);
  });

  test("/icon.png returns a PNG image", async ({ request }) => {
    const response = await request.get(`${BASE}/icon.png`);
    expect(response.status()).toBe(200);
    const body = await response.body();
    // PNG magic bytes
    expect(body[0]).toBe(0x89);
    expect(body[1]).toBe(0x50); // P
    expect(body[2]).toBe(0x4e); // N
    expect(body[3]).toBe(0x47); // G
  });

  test("homepage <head> contains correct icon link tags", async ({ page }) => {
    await page.goto(`${BASE}/`);
    // favicon.ico link
    const faviconLink = await page.$('link[rel="icon"][href="/favicon.ico"]');
    expect(faviconLink).not.toBeNull();
    // apple-touch-icon
    const appleLink = await page.$('link[rel="apple-touch-icon"]');
    expect(appleLink).not.toBeNull();
  });
});
