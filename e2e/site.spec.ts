import { test } from "@playwright/test";
import { trackErrors, expect } from "./helpers";

test.describe("landing page (index.html)", () => {
  test("loads without errors and shows the hero", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/index.html");

    await expect(page).toHaveTitle(/Simple Whiteboard/);
    await expect(page.locator("h1")).toContainText("whiteboard");
    await expect(page.locator(".stat-num").first()).toBeVisible();
    // The 12 feature cards.
    await expect(page.locator(".feature")).toHaveCount(12);
    expect(errors).toEqual([]);
  });

  test("embeds the real, interactive whiteboard in the hero", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => {
      const b = document.getElementById("hero-board") as any;
      return b?.shadowRoot?.querySelectorAll(".tools button").length === 8;
    });

    // The gate keeps the page scrollable until clicked; clicking it reveals the
    // interactive board.
    const gate = page.locator(".board-gate");
    await expect(gate).toBeVisible();
    await expect(gate).not.toHaveClass(/\bhidden\b/);
    await gate.click();
    // The gate fades out (opacity + pointer-events) via the `hidden` class.
    await expect(gate).toHaveClass(/\bhidden\b/);
  });

  test("the primary CTAs point to the app and the docs", async ({ page }) => {
    await page.goto("/index.html");
    await expect(
      page.getByRole("link", { name: /Try the whiteboard/i })
    ).toHaveAttribute("href", "/app.html");
    await expect(page.getByRole("link", { name: "Read the docs" })).toHaveAttribute(
      "href",
      "/api.html"
    );
  });

  test("does not overflow horizontally at any width", async ({ page }) => {
    await page.goto("/index.html");
    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(120);
      const overflows = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1
      );
      expect(overflows, `overflow at ${width}px`).toBe(false);
    }
  });
});

test.describe("404 page", () => {
  test("renders in the landing-page style with working links", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/404.html");

    await expect(page).toHaveTitle(/Page not found/);
    await expect(page.locator(".notfound-code")).toHaveText("404");
    await expect(page.locator("h1")).toContainText("off the canvas");

    // Shares the site chrome, so it looks like the rest of the site.
    await expect(page.locator("header.nav .brand")).toBeVisible();
    await expect(page.locator("footer.footer")).toBeVisible();

    // Escape routes.
    await expect(page.getByRole("link", { name: /Back to home/i })).toHaveAttribute(
      "href",
      "/"
    );
    await expect(
      page.getByRole("link", { name: /Try the whiteboard/i })
    ).toHaveAttribute("href", "/app.html");

    expect(errors).toEqual([]);
  });

  test("is excluded from search indexing", async ({ page }) => {
    await page.goto("/404.html");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex"
    );
  });

  test("does not overflow horizontally on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/404.html");
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1
    );
    expect(overflows).toBe(false);
  });
});

test.describe("API docs (api.html)", () => {
  test("loads without errors and renders the reference tables", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/api.html");

    await expect(page).toHaveTitle(/API Reference/);
    await expect(page.locator("table").first()).toBeVisible();
    // Attributes, methods, events, theming tables (several of them).
    expect(await page.locator("table").count()).toBeGreaterThanOrEqual(5);
    // Documents the new export methods.
    await expect(page.locator("code", { hasText: "downloadFullViewAsPng" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the sidebar table of contents links to sections", async ({ page }) => {
    await page.goto("/api.html");
    await page.locator(".docs-nav a", { hasText: "Events" }).click();
    await expect(page.locator("#events")).toBeInViewport();
  });

  test("the nav links back to the app", async ({ page }) => {
    await page.goto("/api.html");
    await expect(page.getByRole("link", { name: "Try it" })).toHaveAttribute(
      "href",
      "/app.html"
    );
  });
});
