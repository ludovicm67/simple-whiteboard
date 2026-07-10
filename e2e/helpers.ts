import { Page, expect } from "@playwright/test";

/** Open the whiteboard demo page and wait until all 12 tools are registered. */
export async function openApp(page: Page, url = "/app.html"): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => !!customElements.get("simple-whiteboard"));
  await page.waitForFunction(() => {
    const app = document.getElementById("app") as any;
    return app?.shadowRoot?.querySelectorAll(".tools button").length === 12;
  });
}

/** The exported item types currently on the board, in stacking order. */
export async function itemTypes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const app = document.getElementById("app") as any;
    return app.getItems().map((i: any) => i.getType());
  });
}

/** How many items are on the board. */
export async function itemCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const app = document.getElementById("app") as any;
    return app.getItems().length;
  });
}

/** Activate a tool by name via the public API. */
export async function setTool(page: Page, tool: string): Promise<void> {
  await page.evaluate((t) => {
    (document.getElementById("app") as any).setCurrentTool(t);
  }, tool);
}

/** Convert world coordinates to viewport (client) coordinates. */
export async function worldToClient(
  page: Page,
  wx: number,
  wy: number
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([x, y]) => {
      const app = document.getElementById("app") as any;
      const canvas = app.shadowRoot.querySelector("canvas") as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const p = app.getCoordsContext().convertToCanvas(x, y);
      return { x: rect.left + p.x, y: rect.top + p.y };
    },
    [wx, wy]
  );
}

/**
 * Draw a shape by pressing and dragging on the canvas with the real mouse
 * (world coordinates), so the whole event → tool → item pipeline is exercised.
 */
export async function drawShape(
  page: Page,
  tool: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: Record<string, unknown>
): Promise<void> {
  await setTool(page, tool);
  if (options) {
    await page.evaluate(
      ([t, o]) => {
        const inst = (document.getElementById("app") as any).getToolInstance(t);
        inst?.updateCurrentOptions?.(o);
      },
      [tool, options] as const
    );
  }
  const a = await worldToClient(page, x1, y1);
  const b = await worldToClient(page, x2, y2);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
}

/** Select the item under a world-space point using the pointer tool. */
export async function selectAt(page: Page, wx: number, wy: number): Promise<void> {
  await setTool(page, "pointer");
  const p = await worldToClient(page, wx, wy);
  await page.mouse.click(p.x, p.y);
}

/** Read the currently selected item's id (or null). */
export async function selectedId(page: Page): Promise<string | null> {
  return page.evaluate(() =>
    (document.getElementById("app") as any).getSelectedItemId()
  );
}

/** Assert the page produced no uncaught errors during the test. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

export { expect };
