import { test } from "@playwright/test";
import { openApp, expect } from "./helpers";
import type { Page } from "@playwright/test";

test.describe("menu & i18n (app.html)", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test("the hamburger menu opens and closes", async ({ page }) => {
    const menu = page.locator("simple-whiteboard-menu");
    const dropdown = menu.locator(".dropdown");
    await expect(dropdown).toBeHidden();
    await menu.locator(".menu-button").click();
    await expect(dropdown).toBeVisible();
    await menu.locator(".menu-button").click();
    await expect(dropdown).toBeHidden();
  });

  test("the Export submenu offers exactly three options", async ({ page }) => {
    const menu = page.locator("simple-whiteboard-menu");
    await menu.locator(".menu-button").click();
    const exportItem = menu.locator(".menu-item", { hasText: "Export" }).first();
    await exportItem.hover();
    await expect(exportItem.locator(".submenu-item")).toHaveCount(3);
  });

  test("switching the language translates the menu labels", async ({ page }) => {
    const menu = page.locator("simple-whiteboard-menu");
    await menu.locator(".menu-button").click();
    await expect(menu.locator(".menu-item", { hasText: "Export" })).toBeVisible();

    // Open the Language submenu and pick French.
    await menu.locator(".menu-item", { hasText: "Language" }).hover();
    await menu.locator(".submenu-item", { hasText: "Français" }).first().click();

    // Re-open the menu: labels should now be in French.
    await menu.locator(".menu-button").click();
    await expect(menu.locator(".menu-item", { hasText: "Exporter" })).toBeVisible();
  });

  test("the language picker is present by default", async ({ page }) => {
    const menu = page.locator("simple-whiteboard-menu");
    await menu.locator(".menu-button").click();
    await expect(menu.locator(".menu-item", { hasText: "Language" })).toHaveCount(1);
  });

  test("debug mode shows the pointer-coordinate readout", async ({ page }) => {
    // app.html sets the `debug` attribute.
    await expect(
      page.locator("simple-whiteboard").locator(".footer-tools pre")
    ).toBeVisible();
  });

  test("the dotted-background attribute round-trips to the property", async ({
    page,
  }) => {
    const read = () =>
      page.evaluate(() => (document.getElementById("app") as any).dottedBackground);
    expect(await read()).toBe(true);

    await page.evaluate(() =>
      document.getElementById("app")!.setAttribute("dotted-background", "false")
    );
    await expect.poll(read).toBe(false);

    await page.evaluate(() =>
      document.getElementById("app")!.setAttribute("dotted-background", "")
    );
    await expect.poll(read).toBe(true);
  });
});

test.describe("board attributes (index.html hero)", () => {
  const openHero = async (page: Page) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => {
      const b = document.getElementById("hero-board") as any;
      return !!b && b.getItems && b.shadowRoot?.querySelector(".tools button");
    });
  };

  test("hide-tool-options keeps the options panel from rendering", async ({
    page,
  }) => {
    await openHero(page);

    // The attribute must have bound to the property.
    expect(
      await page.evaluate(
        () => (document.getElementById("hero-board") as any).hideToolOptions
      )
    ).toBe(true);

    // Draw and select an item; the options panel must still be absent.
    await page.evaluate(() => {
      const b = document.getElementById("hero-board") as any;
      const cc = b.getCoordsContext();
      b.setCurrentTool("rect");
      const a = cc.convertToCanvas(-60, -30);
      const c = cc.convertToCanvas(60, 30);
      b.handleDrawingStart(a.x, a.y);
      b.handleDrawingMove(c.x, c.y);
      b.handleDrawingEnd();
      b.setCurrentTool("pointer");
      b.setSelectedItemId(b.getItems()[0].getId());
    });

    const hasPanel = await page.evaluate(
      () =>
        !!(document.getElementById("hero-board") as any).shadowRoot.querySelector(
          ".tools-options"
        )
    );
    expect(hasPanel).toBe(false);
  });

  test("hide-locale-picker binds and removes the Language menu item", async ({
    page,
  }) => {
    await openHero(page);

    expect(
      await page.evaluate(
        () => (document.getElementById("hero-board") as any).hideLocalePicker
      )
    ).toBe(true);

    const heroMenu = page.locator("#hero-board").locator("simple-whiteboard-menu");
    await expect(heroMenu.locator(".menu-item", { hasText: "Language" })).toHaveCount(
      0
    );
  });
});
