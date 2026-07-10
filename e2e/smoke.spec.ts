import { test, expect } from "@playwright/test";

test("app boots with the whiteboard element and its toolbar", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/app.html");
  await page.waitForFunction(() => !!customElements.get("simple-whiteboard"));

  const toolCount = await page.evaluate(() => {
    const app = document.getElementById("app") as any;
    return app.shadowRoot.querySelectorAll(".tools button").length;
  });
  expect(toolCount).toBe(12);
  expect(errors).toEqual([]);
});
