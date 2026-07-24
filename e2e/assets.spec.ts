import { test } from "@playwright/test";
import { expect } from "./helpers";

const SITE = "https://simple-whiteboard.ludovicm67.fr";
const PAGES = ["/index.html", "/app.html", "/api.html", "/404.html"];

test.describe("static site assets", () => {
  test("serves the SVG favicon", async ({ request }) => {
    const res = await request.get("/favicon.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
    const body = await res.text();
    expect(body).toContain("<svg");
    // The brand gradient (accent blue -> violet).
    expect(body).toContain("#135aa0");
    expect(body).toContain("#7c3aed");
  });

  test("serves a multi-resolution ICO favicon", async ({ request }) => {
    const res = await request.get("/favicon.ico");
    expect(res.status()).toBe(200);
    const buf = await res.body();
    // ICO header: reserved(0), type(1 = icon), then the image count.
    expect([buf[0], buf[1], buf[2], buf[3]]).toEqual([0, 0, 1, 0]);
    expect(buf.readUInt16LE(4)).toBeGreaterThanOrEqual(3);
  });

  test("serves a 180x180 apple-touch-icon", async ({ request }) => {
    const res = await request.get("/apple-touch-icon.png");
    expect(res.status()).toBe(200);
    const buf = await res.body();
    // PNG signature, then the IHDR width/height (big-endian).
    expect([buf[0], buf[1], buf[2], buf[3]]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(buf.readUInt32BE(16)).toBe(180);
    expect(buf.readUInt32BE(20)).toBe(180);
  });

  test("serves robots.txt pointing at the sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  test("serves a sitemap listing every page with generated dates", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<urlset");

    for (const path of ["/", "/app.html", "/api.html"]) {
      expect(xml, `sitemap lists ${path}`).toContain(`<loc>${SITE}${path}</loc>`);
    }
    // Exactly the three public pages (the 404 page must not be listed).
    expect(xml.match(/<url>/g)?.length).toBe(3);
    expect(xml).not.toContain("404");

    // Every lastmod is a real, build-time generated ISO date.
    const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(
      (m) => m[1]
    );
    expect(lastmods).toHaveLength(3);
    for (const date of lastmods) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(date))).toBe(false);
    }
  });

  for (const path of PAGES) {
    test(`${path} links the favicons and touch icon`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.locator('link[rel="icon"][href="/favicon.svg"]')
      ).toHaveCount(1);
      await expect(
        page.locator('link[rel="icon"][href="/favicon.ico"]')
      ).toHaveCount(1);
      await expect(
        page.locator('link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]')
      ).toHaveCount(1);
    });
  }
});
