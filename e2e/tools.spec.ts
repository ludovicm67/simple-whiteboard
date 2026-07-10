import { test } from "@playwright/test";
import {
  openApp,
  drawShape,
  setTool,
  itemTypes,
  itemCount,
  worldToClient,
  trackErrors,
  expect,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("registers the 12 default tools in the toolbar", async ({ page }) => {
  const count = await page.evaluate(
    () =>
      (document.getElementById("app") as any).shadowRoot.querySelectorAll(
        ".tools button"
      ).length
  );
  expect(count).toBe(12);
});

test("clicking a toolbar button activates the matching tool", async ({ page }) => {
  // The default toolbar order (see tools/defaults.ts).
  const order = [
    "move",
    "pointer",
    "rect",
    "circle",
    "line",
    "arrow",
    "pen",
    "text",
    "sticky",
    "picture",
    "eraser",
    // "clear" is an action, tested separately.
  ];
  const buttons = page.locator("simple-whiteboard").locator(".tools button");
  for (let i = 0; i < order.length; i++) {
    await buttons.nth(i).click();
    const current = await page.evaluate(() =>
      (document.getElementById("app") as any).getCurrentTool()
    );
    expect(current, `button #${i}`).toBe(order[i]);
  }
});

test("draws each shape tool as its own item type", async ({ page }) => {
  const errors = trackErrors(page);

  await drawShape(page, "rect", -260, -90, -120, 20, { strokeWidth: 3 });
  await drawShape(page, "circle", -40, -80, 90, 30);
  await drawShape(page, "line", 160, -70, 300, 40);
  await drawShape(page, "arrow", -260, 90, -120, 180, { strokeWidth: 3 });
  await drawShape(page, "pen", 40, 100, 180, 170);

  expect(await itemTypes(page)).toEqual([
    "rect",
    "circle",
    "line",
    "arrow",
    "pen",
  ]);
  expect(errors).toEqual([]);
});

test("creates a text item by clicking with the text tool", async ({ page }) => {
  await setTool(page, "text");
  const p = await worldToClient(page, 60, -20);
  await page.mouse.click(p.x, p.y);

  expect(await itemTypes(page)).toEqual(["text"]);

  // The text tool opens an inline editor; type into it and confirm the content
  // is stored on the item.
  const editor = page.locator("#simple-whiteboard-text-tool-edit-zone");
  await editor.waitFor({ state: "visible" });
  await editor.fill("hello");

  await expect
    .poll(() =>
      page.evaluate(
        () => (document.getElementById("app") as any).getItems()[0].getContent()
      )
    )
    .toBe("hello");
});

test("creates a sticky note by clicking with the sticky tool", async ({ page }) => {
  await setTool(page, "sticky");
  const p = await worldToClient(page, 80, 0);
  await page.mouse.click(p.x, p.y);
  expect(await itemTypes(page)).toEqual(["sticky"]);
});

test("the object eraser removes items it is dragged across", async ({ page }) => {
  await drawShape(page, "rect", -200, -60, -80, 40);
  await drawShape(page, "rect", 40, -60, 160, 40);
  expect(await itemCount(page)).toBe(2);

  // Sweep the eraser across both rectangles.
  await setTool(page, "eraser");
  const a = await worldToClient(page, -220, -10);
  const b = await worldToClient(page, 180, -10);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, a.y, { steps: 6 });
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();

  expect(await itemCount(page)).toBe(0);
});

test("the eraser only removes a line when it actually touches it", async ({
  page,
}) => {
  // A diagonal line from (-120,-120) to (120,120): the point (110,-110) is in
  // the empty corner of its bounding box, far from the line itself.
  await drawShape(page, "line", -120, -120, 120, 120, { strokeWidth: 2 });
  expect(await itemCount(page)).toBe(1);

  await setTool(page, "eraser");

  // Click the empty bbox corner -> the line must survive.
  const corner = await worldToClient(page, 110, -110);
  await page.mouse.move(corner.x, corner.y);
  await page.mouse.down();
  await page.mouse.up();
  expect(await itemCount(page)).toBe(1);

  // Click on the line itself -> removed.
  const onLine = await worldToClient(page, 0, 0);
  await page.mouse.move(onLine.x, onLine.y);
  await page.mouse.down();
  await page.mouse.up();
  expect(await itemCount(page)).toBe(0);
});
