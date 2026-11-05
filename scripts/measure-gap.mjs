/**
 * scripts/measure-gap.mjs
 * Measures the gap between the navbar bottom and the hero photo top.
 * Usage: node scripts/measure-gap.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768,  height: 1024 },
  { width: 390,  height: 844 },
];

async function measurePage(page, url, vp, scrollY = 0) {
  await page.setViewportSize(vp);
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  if (scrollY > 0) await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    // Find the navbar / header
    const header = document.querySelector("header");
    const navbarRect = header?.getBoundingClientRect();

    // Find the hero image (first <img> or next/image inside hero section)
    const heroSection = document.querySelector(".hero-section, [aria-label='Welcome to Musawo Training Center'], section");
    const heroImg = heroSection?.querySelector("img") ?? document.querySelector("main img");
    const heroRect = heroImg?.getBoundingClientRect();

    // Walk every element from body → hero, collecting spacing info
    function getStyles(el) {
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag:          el.tagName,
        id:           el.id || undefined,
        class:        (el.className || "").toString().slice(0, 80),
        marginTop:    cs.marginTop,
        paddingTop:   cs.paddingTop,
        borderTop:    cs.borderTopWidth,
        position:     cs.position,
        top:          cs.top,
        transform:    cs.transform !== "none" ? cs.transform : undefined,
        height:       cs.height,
        rectTop:      Math.round(rect.top),
        rectBottom:   Math.round(rect.bottom),
      };
    }

    // Collect the chain: body > html > main > first section > hero section
    const chain = [];
    const selectors = [
      "html", "body",
      "#main, main",
      "main > div, main > section, main > article",
      ".hero-section, [aria-label='Welcome to Musawo Training Center']",
      ".hero-section > *, [aria-label='Welcome to Musawo Training Center'] > *",
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        chain.push(getStyles(el));
      });
    }

    return {
      navbarBottom:  navbarRect ? Math.round(navbarRect.bottom) : null,
      heroImageTop:  heroRect   ? Math.round(heroRect.top)      : null,
      gap:           (navbarRect && heroRect) ? Math.round(heroRect.top - navbarRect.bottom) : null,
      chain,
    };
  });

  return data;
}

async function run() {
  const browser = await chromium.launch();
  const page    = await browser.newPage();

  for (const vp of VIEWPORTS) {
    const label = `${vp.width}x${vp.height}`;
    console.log(`\n${"═".repeat(70)}`);
    console.log(`VIEWPORT ${label}  /  scroll=0`);
    console.log("═".repeat(70));

    const data = await measurePage(page, "/", vp, 0);
    console.log(`navbarBottom : ${data.navbarBottom}`);
    console.log(`heroImageTop : ${data.heroImageTop}`);
    console.log(`GAP          : ${data.gap}px  ← must be 0`);
    console.log("\nElement chain:");
    for (const el of data.chain) {
      const hasSpacing =
        el.marginTop  !== "0px" ||
        el.paddingTop !== "0px" ||
        el.borderTop  !== "0px" ||
        el.top        !== "auto" && el.top !== "0px" && el.position !== "static";
      const mark = hasSpacing ? " ◄ SPACING" : "";
      console.log(
        `  ${el.tag}${el.id ? "#" + el.id : ""}  ` +
        `pos=${el.position} top=${el.top} ` +
        `mt=${el.marginTop} pt=${el.paddingTop} ` +
        `rectTop=${el.rectTop} rectBot=${el.rectBottom}` +
        mark
      );
    }
  }

  // Scroll test at 1440
  {
    const vp = VIEWPORTS[0];
    console.log(`\n${"═".repeat(70)}`);
    console.log(`VIEWPORT 1440x900  /  scroll=300`);
    console.log("═".repeat(70));
    const data = await measurePage(page, "/", vp, 300);
    console.log(`navbarBottom : ${data.navbarBottom}`);
    console.log(`heroImageTop : ${data.heroImageTop}`);
    console.log(`GAP          : ${data.gap}px`);
  }

  // Other pages at 1440
  for (const url of ["/about", "/admissions/how-to-enrol", "/impact", "/courses/medical-home-caregiver"]) {
    const vp = VIEWPORTS[0];
    console.log(`\n${"═".repeat(70)}`);
    console.log(`PAGE ${url}  @  1440x900`);
    console.log("═".repeat(70));
    const data = await measurePage(page, url, vp, 0);
    console.log(`navbarBottom : ${data.navbarBottom}`);
    console.log(`heroImageTop : ${data.heroImageTop}`);
    console.log(`GAP          : ${data.gap}px`);
    if (data.chain.length) {
      for (const el of data.chain) {
        const hasSpacing =
          el.marginTop  !== "0px" ||
          el.paddingTop !== "0px" ||
          (el.top !== "auto" && el.top !== "0px" && el.position !== "static");
        if (hasSpacing) {
          console.log(
            `  SPACING ON: ${el.tag}${el.id ? "#" + el.id : ""} ` +
            `pos=${el.position} top=${el.top} mt=${el.marginTop} pt=${el.paddingTop}`
          );
        }
      }
    }
  }

  await browser.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
