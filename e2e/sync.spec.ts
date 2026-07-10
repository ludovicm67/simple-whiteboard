import { test } from "@playwright/test";
import { openApp, drawShape, itemTypes, itemCount, expect } from "./helpers";
import type { Page } from "@playwright/test";

const idsOf = (page: Page) =>
  page.evaluate(() =>
    (document.getElementById("app") as any).getItems().map((i: any) => i.getId())
  );

test("two tabs stay in sync over the BroadcastChannel", async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await openApp(a);
  await openApp(b);

  // 1. Adds propagate A -> B.
  await drawShape(a, "rect", -200, -60, -80, 40);
  await drawShape(a, "arrow", 40, 80, 200, -40, { strokeWidth: 3 });
  await expect.poll(() => itemTypes(b)).toEqual(["rect", "arrow"]);

  // 2. Reorder propagates.
  const rectId = (await idsOf(a))[0];
  await a.evaluate((id) => {
    (document.getElementById("app") as any).bringItemToFront(id, true);
  }, rectId);
  await expect.poll(async () => (await idsOf(b)).at(-1)).toBe(rectId);

  // 3. Removal propagates.
  await a.evaluate((id) => {
    (document.getElementById("app") as any).removeItemById(id, true);
  }, rectId);
  await expect.poll(() => itemCount(b)).toBe(1);
  expect(await itemTypes(b)).toEqual(["arrow"]);
});

test("a tab joining later receives the existing board", async ({ context }) => {
  const a = await context.newPage();
  await openApp(a);
  await drawShape(a, "rect", -120, -40, 20, 60);

  // A second tab opens after content already exists -> it should sync on join.
  const b = await context.newPage();
  await openApp(b);
  await expect.poll(() => itemTypes(b)).toEqual(["rect"]);
});
