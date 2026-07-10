import { test } from "@playwright/test";
import { openApp, drawShape, setTool, expect } from "./helpers";
import type { Page } from "@playwright/test";

/**
 * Record every relevant CustomEvent the component dispatches. Installed *before*
 * page scripts run so load-time events (`ready`, `tool-registered`) are caught.
 */
async function recordEvents(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tracked = [
      "ready",
      "tool-registered",
      "tool-updated",
      "items-updated",
      "history-changed",
    ];
    (window as any).__events = [];
    const orig = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (e: Event) {
      if (e && tracked.includes(e.type)) {
        let detail: unknown = null;
        try {
          detail = JSON.parse(JSON.stringify((e as CustomEvent).detail ?? null));
        } catch {
          detail = null;
        }
        (window as any).__events.push({ type: e.type, detail });
      }
      return orig.call(this, e);
    };
  });
}

const events = (page: Page) =>
  page.evaluate(() => (window as any).__events as { type: string; detail: any }[]);

test("dispatches ready and one tool-registered per tool on load", async ({ page }) => {
  await recordEvents(page);
  await openApp(page);

  const evs = await events(page);
  expect(evs.filter((e) => e.type === "ready").length).toBeGreaterThanOrEqual(1);
  expect(evs.filter((e) => e.type === "tool-registered").length).toBe(12);
});

test("dispatches tool-updated when the tool changes", async ({ page }) => {
  await recordEvents(page);
  await openApp(page);
  await setTool(page, "rect");

  const evs = await events(page);
  const toolUpdates = evs.filter((e) => e.type === "tool-updated");
  expect(toolUpdates.at(-1)?.detail?.name).toBe("rect");
});

test("dispatches items-updated (add) and history-changed when drawing", async ({
  page,
}) => {
  await recordEvents(page);
  await openApp(page);
  await drawShape(page, "rect", -80, -40, 40, 40);

  const evs = await events(page);
  const itemEvents = evs
    .filter((e) => e.type === "items-updated")
    .map((e) => e.detail?.type);
  expect(itemEvents).toContain("add");
  expect(evs.some((e) => e.type === "history-changed")).toBe(true);
});

test("dispatches items-updated (remove) when deleting", async ({ page }) => {
  await recordEvents(page);
  await openApp(page);
  await drawShape(page, "rect", -80, -40, 40, 40);
  await page.evaluate(() => {
    const app = document.getElementById("app") as any;
    app.removeItemById(app.getItems()[0].getId(), true);
  });

  const removed = (await events(page))
    .filter((e) => e.type === "items-updated")
    .some((e) => e.detail?.type === "remove");
  expect(removed).toBe(true);
});

test("history-changed reports canUndo/canRedo across undo & redo", async ({ page }) => {
  await recordEvents(page);
  await openApp(page);
  await drawShape(page, "rect", -80, -40, 40, 40);
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+Shift+z");

  const historyEvents = (await events(page)).filter(
    (e) => e.type === "history-changed"
  );
  // At some point undo was available, and at some point redo was available.
  expect(historyEvents.some((e) => e.detail?.canUndo === true)).toBe(true);
  expect(historyEvents.some((e) => e.detail?.canRedo === true)).toBe(true);
});
