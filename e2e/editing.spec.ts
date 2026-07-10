import { test } from "@playwright/test";
import {
  openApp,
  drawShape,
  setTool,
  itemCount,
  itemTypes,
  selectedId,
  worldToClient,
  expect,
} from "./helpers";

const bbox = (page: import("@playwright/test").Page, index = 0) =>
  page.evaluate(
    (i) => (document.getElementById("app") as any).getItems()[i].getBoundingBox(),
    index
  );

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("selecting an item shows the tool-options panel", async ({ page }) => {
  await drawShape(page, "rect", -100, -50, 40, 60);
  await setTool(page, "pointer");
  const c = await worldToClient(page, -30, 5);
  await page.mouse.click(c.x, c.y);

  expect(await selectedId(page)).not.toBeNull();
  await expect(page.locator("simple-whiteboard").locator(".tools-options")).toBeVisible();
});

test("dragging a selected item moves it", async ({ page }) => {
  await drawShape(page, "rect", -100, -50, 20, 50);
  const before = await bbox(page);

  await setTool(page, "pointer");
  const c = await worldToClient(page, -40, 0);
  await page.mouse.click(c.x, c.y); // select
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  const target = await worldToClient(page, 80, 90);
  await page.mouse.move(target.x, target.y, { steps: 6 });
  await page.mouse.up();

  const after = await bbox(page);
  expect(after.x).toBeGreaterThan(before.x + 50);
  expect(after.y).toBeGreaterThan(before.y + 50);
});

test("dragging a resize handle resizes the item", async ({ page }) => {
  await drawShape(page, "rect", -80, -50, 40, 40);
  const before = await bbox(page);

  await setTool(page, "pointer");
  // Select the rect first so its handles become active.
  const center = await worldToClient(page, -20, -5);
  await page.mouse.click(center.x, center.y);

  const handle = await page.evaluate(() => {
    const hs = (document.getElementById("app") as any).getItems()[0].getResizeHandles();
    return hs[hs.length - 1]; // bottom-right / point-2
  });
  const from = await worldToClient(page, handle.x, handle.y);
  const to = await worldToClient(page, handle.x + 120, handle.y + 120);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();

  const after = await bbox(page);
  expect(after.width).toBeGreaterThan(before.width + 50);
  expect(after.height).toBeGreaterThan(before.height + 50);
});

test("Backspace deletes the selected item", async ({ page }) => {
  await drawShape(page, "rect", -60, -40, 40, 40);
  await setTool(page, "pointer");
  const c = await worldToClient(page, -10, 0);
  await page.mouse.click(c.x, c.y);
  expect(await selectedId(page)).not.toBeNull();

  await page.keyboard.press("Backspace");
  expect(await itemCount(page)).toBe(0);
});

test("the Delete button in the options panel removes the item", async ({ page }) => {
  await drawShape(page, "rect", -60, -40, 40, 40);
  await setTool(page, "pointer");
  const c = await worldToClient(page, -10, 0);
  await page.mouse.click(c.x, c.y);

  await page
    .locator("simple-whiteboard")
    .locator(".tools-options button", { hasText: "Delete" })
    .click();
  expect(await itemCount(page)).toBe(0);
});

test("z-order: bring-to-front reorders and buttons reflect the position", async ({
  page,
}) => {
  // Two non-overlapping rectangles so a click unambiguously hits one of them.
  await drawShape(page, "rect", -220, -50, -100, 50); // back  (index 0)
  await drawShape(page, "rect", 80, -50, 200, 50); // front (index 1)

  const backId = await page.evaluate(
    () => (document.getElementById("app") as any).getItems()[0].getId()
  );

  await setTool(page, "pointer");
  const c = await worldToClient(page, -160, 0);
  await page.mouse.click(c.x, c.y); // select the back rect

  // Sanity check: the selected item really is the back one.
  expect(await selectedId(page)).toBe(backId);

  const layerButtons = page.locator("simple-whiteboard").locator(".layer-button");
  // Back item: send-to-back / send-backward disabled; forward / to-front enabled.
  await expect(layerButtons.nth(0)).toBeDisabled();
  await expect(layerButtons.nth(1)).toBeDisabled();
  await expect(layerButtons.nth(3)).toBeEnabled();

  await layerButtons.nth(3).click(); // bring to front
  const order = await page.evaluate(() =>
    (document.getElementById("app") as any).getItems().map((i: any) => i.getId())
  );
  expect(order[order.length - 1]).toBe(backId);
});

test("undo / redo via keyboard shortcuts", async ({ page }) => {
  await drawShape(page, "rect", -80, -40, 40, 40);
  expect(await itemCount(page)).toBe(1);

  await page.keyboard.press("Control+z");
  expect(await itemCount(page)).toBe(0);

  await page.keyboard.press("Control+Shift+z");
  expect(await itemCount(page)).toBe(1);
});

test("undo / redo via the footer buttons", async ({ page }) => {
  await drawShape(page, "rect", -80, -40, 40, 40);

  const buttons = page.locator("simple-whiteboard").locator(".history-button");
  await buttons.nth(0).click(); // undo
  expect(await itemCount(page)).toBe(0);
  await buttons.nth(1).click(); // redo
  expect(await itemCount(page)).toBe(1);
});

test("the clear tool empties the board", async ({ page }) => {
  await drawShape(page, "rect", -120, -40, -20, 40);
  await drawShape(page, "circle", 40, -40, 140, 40);
  expect(await itemCount(page)).toBe(2);

  // The clear tool is the last toolbar button.
  await page.locator("simple-whiteboard").locator(".tools button").last().click();
  expect(await itemTypes(page)).toEqual([]);
});
