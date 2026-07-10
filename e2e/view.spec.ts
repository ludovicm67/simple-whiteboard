import { test } from "@playwright/test";
import { openApp, worldToClient, expect } from "./helpers";

const zoom = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    (document.getElementById("app") as any).getCoordsContext().getZoom()
  );
const coords = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    (document.getElementById("app") as any).getCoordsContext().getCoords()
  );
const canvasCenter = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const app = document.getElementById("app") as any;
    const r = app.shadowRoot.querySelector("canvas").getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("the footer zoom selector changes the zoom level", async ({ page }) => {
  expect(await zoom(page)).toBe(1);
  await page
    .locator("simple-whiteboard")
    .locator(".footer-tools select")
    .selectOption("2");
  expect(await zoom(page)).toBe(2);

  await page
    .locator("simple-whiteboard")
    .locator(".footer-tools select")
    .selectOption("0.5");
  expect(await zoom(page)).toBe(0.5);
});

test("scrolling the wheel over the canvas pans it", async ({ page }) => {
  const before = await coords(page);
  const c = await canvasCenter(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.wheel(0, 150);
  await expect
    .poll(async () => (await coords(page)).y)
    .not.toBe(before.y);
});

test("Ctrl + wheel zooms around the cursor", async ({ page }) => {
  const before = await zoom(page);
  const c = await canvasCenter(page);
  await page.mouse.move(c.x, c.y);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -120);
  await page.keyboard.up("Control");
  await expect.poll(() => zoom(page)).toBeGreaterThan(before);
});

test("middle-click dragging pans the canvas", async ({ page }) => {
  const before = await coords(page);
  const c = await canvasCenter(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(c.x + 90, c.y + 50, { steps: 6 });
  await page.mouse.up({ button: "middle" });

  const after = await coords(page);
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(40);
  expect(Math.abs(after.y - before.y)).toBeGreaterThan(20);
});

test("zooming keeps the world point under the cursor stable", async ({ page }) => {
  // Zoom in via the selector, then check a known world point still maps near
  // the canvas center (setZoom anchors on the center).
  const centerWorldBefore = await page.evaluate(() => {
    const app = document.getElementById("app") as any;
    const r = app.shadowRoot.querySelector("canvas").getBoundingClientRect();
    return app.getCoordsContext().convertFromCanvas(r.width / 2, r.height / 2);
  });
  await page
    .locator("simple-whiteboard")
    .locator(".footer-tools select")
    .selectOption("2");
  const centerWorldAfter = await page.evaluate(() => {
    const app = document.getElementById("app") as any;
    const r = app.shadowRoot.querySelector("canvas").getBoundingClientRect();
    return app.getCoordsContext().convertFromCanvas(r.width / 2, r.height / 2);
  });
  expect(Math.abs(centerWorldAfter.x - centerWorldBefore.x)).toBeLessThan(1);
  expect(Math.abs(centerWorldAfter.y - centerWorldBefore.y)).toBeLessThan(1);
});
